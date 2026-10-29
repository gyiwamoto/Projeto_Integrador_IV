import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import IdentificacaoPerfil from '../components/IdentificacaoPerfil/IdentificacaoPerfil'
import PessoaFisica from '../components/PessoaFisica/PessoaFisica'
import PessoaJuridica from '../components/PessoaJuridica/PessoaJuridica'
import ModalidadeCredito from '../components/ModalidadeCredito/ModalidadeCredito'
import Localidade from '../components/Localidade/Localidade'
import Diagnostico from '../components/Diagnostico/Diagnostico'
import ResultadoAnalise from '../components/ResultadoAnalise/ResultadoAnalise'

import {
  analisarSimulacao,
  type ResultadoSimulacao,
} from '../services/simulacaoApi'

import type { DadosSimulacao } from '../types/simulacao'

// Por padrão, a simulação é demonstrativa e não depende do backend.
// Para usar o endpoint real em outro ambiente, defina
// VITE_SIMULACAO_MODO=api antes de compilar o frontend.
const MODO_DEMONSTRACAO =
  import.meta.env.VITE_SIMULACAO_MODO !== 'api'

function Simulacao() {
  const navigate = useNavigate()

  // =========================================
  // ESTADOS DA SIMULAÇÃO
  // =========================================

  const [etapa, setEtapa] = useState(1)

  const [dados, setDados] =
    useState<Partial<DadosSimulacao>>({})

  const [resultado, setResultado] =
    useState<ResultadoSimulacao | null>(null)

  const [erro, setErro] =
    useState<string | null>(null)

  const [carregando, setCarregando] =
    useState(false)

  // Impede requisições simultâneas.
  const requisicaoEmAndamento = useRef(false)

  // =========================================
  // NAVEGAÇÃO ENTRE ETAPAS
  // =========================================

  function voltarPara(etapaAnterior: number) {
    if (requisicaoEmAndamento.current) {
      return
    }

    if (etapaAnterior < 1 || etapaAnterior > 4) {
      return
    }

    setErro(null)
    setResultado(null)
    setEtapa(etapaAnterior)
  }

  // =========================================
  // ETAPA 1 - IDENTIFICAÇÃO DO PERFIL
  // =========================================

  function handleTipoCliente(
    tipoCliente: DadosSimulacao['tipoCliente']
  ) {
    setDados((dadosAtuais) => {
      if (dadosAtuais.tipoCliente === tipoCliente) {
        // Preserva os dados do mesmo perfil.
        return {
          ...dadosAtuais,
          tipoCliente,
        }
      }

      // Na troca PF/PJ, limpa os campos do
      // perfil anterior e mantém os dados comuns.
      return {
        tipoCliente,
        nome: dadosAtuais.nome,
        modalidadeCredito:
          dadosAtuais.modalidadeCredito,
        valorPretendido:
          dadosAtuais.valorPretendido,
        estado: dadosAtuais.estado,
        cidade: dadosAtuais.cidade,
        dataBase: dadosAtuais.dataBase,
      }
    })

    setResultado(null)
    setErro(null)
    setEtapa(2)
  }

  // =========================================
  // ETAPA 2 - PESSOA FÍSICA
  // =========================================

  function handlePessoaFisica(
    profissao: string,
    faixaRenda: string
  ) {
    setDados((dadosAtuais) => ({
      ...dadosAtuais,
      profissao: profissao.trim(),
      faixaRenda,
      porteEmpresa: undefined,
      setorEconomico: undefined,
      cnae: undefined,
    }))

    setResultado(null)
    setErro(null)
    setEtapa(3)
  }

  // =========================================
  // ETAPA 2 - PESSOA JURÍDICA
  // =========================================

  function handlePessoaJuridica(
    porteEmpresa: string,
    setorEconomico: string,
    cnae: string
  ) {
    setDados((dadosAtuais) => ({
      ...dadosAtuais,
      porteEmpresa,
      setorEconomico: setorEconomico.trim(),
      cnae: cnae.trim(),
      profissao: undefined,
      faixaRenda: undefined,
    }))

    setResultado(null)
    setErro(null)
    setEtapa(3)
  }

  // =========================================
  // ETAPA 3 - MODALIDADE DE CRÉDITO
  // =========================================

  function handleModalidade(
    modalidadeCredito: string,
    valorPretendido?: number
  ) {
    setDados((dadosAtuais) => ({
      ...dadosAtuais,
      modalidadeCredito,
      valorPretendido,
    }))

    setResultado(null)
    setErro(null)
    setEtapa(4)
  }

  // =========================================
  // ETAPA 4 - LOCALIDADE
  // =========================================

  function handleLocalidade(
    estado: string,
    cidade: string,
    dataBase: string
  ) {
    setDados((dadosAtuais) => ({
      ...dadosAtuais,
      estado: estado.trim(),
      cidade: cidade.trim(),
      dataBase,
    }))

    setResultado(null)
    setErro(null)
    setEtapa(5)
  }

  // =========================================
  // ETAPA 5 - CONCLUSÃO DEMONSTRATIVA OU CONSULTA À API
  // =========================================

  async function handleDiagnosticoConcluido() {
    if (requisicaoEmAndamento.current) {
      return
    }

    requisicaoEmAndamento.current = true
    setErro(null)
    setCarregando(!MODO_DEMONSTRACAO)

    try {
      // Campos comuns obrigatórios.
      if (
        !dados.tipoCliente ||
        !dados.modalidadeCredito?.trim() ||
        !dados.estado?.trim() ||
        !dados.dataBase?.trim()
      ) {
        throw new Error(
          'Preencha os dados obrigatórios da simulação.'
        )
      }

      // Campos obrigatórios para Pessoa Física.
      if (
        dados.tipoCliente === 'PF' &&
        (
          !dados.profissao?.trim() ||
          !dados.faixaRenda?.trim()
        )
      ) {
        throw new Error(
          'Informe a profissão e a faixa de renda.'
        )
      }

      // Campos obrigatórios para Pessoa Jurídica.
      if (
        dados.tipoCliente === 'PJ' &&
        (
          !dados.porteEmpresa?.trim() ||
          !dados.setorEconomico?.trim()
        )
      ) {
        throw new Error(
          'Informe o porte e o setor econômico da empresa.'
        )
      }

      const dadosSimulacao: DadosSimulacao = {
        tipoCliente: dados.tipoCliente,

        nome: dados.nome,

        profissao: dados.profissao,
        faixaRenda: dados.faixaRenda,

        porteEmpresa: dados.porteEmpresa,
        setorEconomico: dados.setorEconomico,
        cnae: dados.cnae,

        modalidadeCredito: dados.modalidadeCredito,
        valorPretendido: dados.valorPretendido,

        estado: dados.estado,
        cidade: dados.cidade,
        dataBase: dados.dataBase,
      }

      // Demonstração: conclui o fluxo sem consultar a API.
      // Os indicadores não calculados ficam indisponíveis.
      // Modo API: mantém a integração original para uso futuro.
      const resultadoSimulacao: ResultadoSimulacao =
        MODO_DEMONSTRACAO
          ? {
              risco: null,
              inadimplenciaEstimada: null,
              carteiraAtivaMedia: null,
              operacoesSemelhantes: null,
            }
          : await analisarSimulacao(dadosSimulacao)

      setResultado(resultadoSimulacao)
      setEtapa(6)
    } catch (error) {
      console.error('Erro na simulação:', error)

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível realizar a análise.'
      )
    } finally {
      requisicaoEmAndamento.current = false
      setCarregando(false)
    }
  }

  // =========================================
  // NOVA TENTATIVA APÓS ERRO
  // =========================================

  function handleTentarNovamente() {
    if (requisicaoEmAndamento.current) {
      return
    }

    // Repete a chamada à API sem reiniciar
    // a animação de preparação.
    void handleDiagnosticoConcluido()
  }

  // =========================================
  // DASHBOARD
  // =========================================

  function handleVerDashboard() {
    navigate('/dashboard')
  }

  // =========================================
  // RENDERIZAÇÃO DAS ETAPAS
  // =========================================

  return (
    <div>
      {/* ETAPA 1 - IDENTIFICAÇÃO */}

      {etapa === 1 && (
        <IdentificacaoPerfil
          onContinuar={handleTipoCliente}
        />
      )}

      {/* ETAPA 2 - PESSOA FÍSICA */}

      {etapa === 2 &&
        dados.tipoCliente === 'PF' && (
          <PessoaFisica
            onContinuar={handlePessoaFisica}
            onVoltar={() => voltarPara(1)}
            profissaoInicial={
              dados.profissao ?? ''
            }
            faixaRendaInicial={
              dados.faixaRenda ?? ''
            }
          />
        )}

      {/* ETAPA 2 - PESSOA JURÍDICA */}

      {etapa === 2 &&
        dados.tipoCliente === 'PJ' && (
          <PessoaJuridica
            onContinuar={handlePessoaJuridica}
            onVoltar={() => voltarPara(1)}
            porteEmpresaInicial={
              dados.porteEmpresa ?? ''
            }
            setorEconomicoInicial={
              dados.setorEconomico ?? ''
            }
            cnaeInicial={
              dados.cnae ?? ''
            }
          />
        )}

      {/* ETAPA 3 - MODALIDADE DE CRÉDITO */}

      {etapa === 3 && (
        <ModalidadeCredito
          onContinuar={handleModalidade}
          onVoltar={() => voltarPara(2)}
          modalidadeInicial={
            dados.modalidadeCredito ?? ''
          }
          valorPretendidoInicial={
            dados.valorPretendido
          }
        />
      )}

      {/* ETAPA 4 - LOCALIDADE */}

      {etapa === 4 && (
        <Localidade
          onAnalisar={handleLocalidade}
          onVoltar={() => voltarPara(3)}
          estadoInicial={dados.estado ?? ''}
          cidadeInicial={dados.cidade ?? ''}
          dataBaseInicial={dados.dataBase ?? ''}
        />
      )}

      {/* ETAPA 5 - DIAGNÓSTICO */}

      {etapa === 5 && (
        <>
          {erro ? (
            <div className="card" role="alert">
              <h3>
                Não foi possível concluir a análise
              </h3>

              <p>{erro}</p>

              <div className="form-actions form-actions-navegacao">
                <button
                  type="button"
                  className="botao-voltar"
                  onClick={() => voltarPara(4)}
                  disabled={carregando}
                >
                  ← Revisar dados
                </button>

                <button
                  type="button"
                  className="botao-continuar"
                  onClick={handleTentarNovamente}
                  disabled={carregando}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : carregando ? (
            <div className="card" role="status">
              <h2>
                Consultando análise de crédito
              </h2>

              <p>
                A solicitação foi enviada ao serviço.
                Aguarde a resposta da API.
              </p>
            </div>
          ) : (
            <Diagnostico
              onConcluir={handleDiagnosticoConcluido}
            />
          )}
        </>
      )}

      {/* ETAPA 6 - RESULTADO */}

      {etapa === 6 && resultado && (
        <>
          {MODO_DEMONSTRACAO && (
            <div className="card" role="note">
              <h3>Modo demonstração</h3>
              <p>
                Este resultado demonstra o funcionamento da interface.
                Nenhuma análise de risco de crédito foi realizada.
                Os indicadores permanecem indisponíveis até a
                integração com uma API compatível.
              </p>
            </div>
          )}

          <ResultadoAnalise
            modoDemonstracao={MODO_DEMONSTRACAO}
            tipoCliente={dados.tipoCliente}
            porteEmpresa={dados.porteEmpresa}
            setorEconomico={dados.setorEconomico}
            risco={resultado.risco ?? undefined}
            inadimplenciaEstimada={
              resultado.inadimplenciaEstimada ??
              undefined
            }
            carteiraAtivaMedia={
              resultado.carteiraAtivaMedia ??
              undefined
            }
            operacoesSemelhantes={
              resultado.operacoesSemelhantes ??
              undefined
            }
            fonteSerie={resultado.fonteSerie}
            dataReferencia={resultado.dataReferencia}
            aviso={resultado.aviso}
            onVerDashboard={handleVerDashboard}
          />
        </>
      )}
    </div>
  )
}

export default Simulacao
