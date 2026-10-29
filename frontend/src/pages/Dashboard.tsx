import { useCallback, useEffect, useRef, useState } from 'react'

import GraficoRisco from '../components/GraficoRisco/GraficoRisco'
import EvolucaoInadimplencia from '../components/EvolucaoInadimplencia/EvolucaoInadimplencia'
import DistribuicaoModalidade from '../components/DistribuicaoModalidade/DistribuicaoModalidade'
import RecomendacoesCredito from '../components/RecomendacoesCredito/RecomendacoesCredito'

import { buscarDashboard } from '../services/dashboardApi'

import type { DashboardCompleto } from '../types/dashboard'

// =========================================
// DADOS EXCLUSIVOS DE DEMONSTRAÇÃO
// =========================================

// Valores fictícios. Não representam dados
// reais do Banco Central ou de instituições.
const dadosDemonstracao: DashboardCompleto = {
  total_analises: 120,
  baixo_risco: 70,
  medio_risco: 35,
  alto_risco: 15,

  inadimplencia_media: 3.96,
  volume_credito_total: 18200000,

  carteira_ativa: 18200000,
  numero_operacoes: 1000,

  evolucao_inadimplencia: [
    {
      periodo: '2026-04',
      taxa_inadimplencia: 4.32,
    },
    {
      periodo: '2026-05',
      taxa_inadimplencia: 4.18,
    },
    {
      periodo: '2026-06',
      taxa_inadimplencia: 4.07,
    },
    {
      periodo: '2026-07',
      taxa_inadimplencia: 4.12,
    },
    {
      periodo: '2026-08',
      taxa_inadimplencia: 3.99,
    },
    {
      periodo: '2026-09',
      taxa_inadimplencia: 3.96,
    },
  ],

  distribuicao_modalidade: [
    {
      modalidade: 'Capital de Giro',
      quantidade: 420,
      percentual: 42,
    },
    {
      modalidade: 'Financiamentos',
      quantidade: 280,
      percentual: 28,
    },
    {
      modalidade: 'Cartão de Crédito',
      quantidade: 100,
      percentual: 10,
    },
    {
      modalidade: 'Outros',
      quantidade: 200,
      percentual: 20,
    },
  ],
}

// Usa o mesmo controle de modo da página Simulação.
// Apenas VITE_SIMULACAO_MODO=api ativa a consulta automática.
const MODO_DEMONSTRACAO =
  import.meta.env.VITE_SIMULACAO_MODO !== 'api'

const MENSAGEM_ERRO =
  'Os dados do Dashboard ainda não estão disponíveis pela API.'

// =========================================
// FORMATAÇÃO DE VALORES
// =========================================

const formatadorNumero = new Intl.NumberFormat('pt-BR')

const formatadorPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Formato compacto para valores grandes (ex.: R$ 7,4 tri).
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  compactDisplay: 'short',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

function Dashboard() {
  const [dados, setDados] = useState<DashboardCompleto | null>(
    MODO_DEMONSTRACAO ? dadosDemonstracao : null
  )

  const [carregando, setCarregando] = useState(
    !MODO_DEMONSTRACAO
  )

  const [erro, setErro] = useState<string | null>(null)

  const [modoDemonstracao, setModoDemonstracao] =
    useState(MODO_DEMONSTRACAO)

  // Identifica a requisição válida mais recente.
  const requisicaoAtual = useRef(0)

  // =========================================
  // CONSULTA INICIAL DA API (somente no modo API)
  // =========================================

  useEffect(() => {
    if (MODO_DEMONSTRACAO) {
      return
    }

    const identificador = ++requisicaoAtual.current

    void buscarDashboard()
      .then((resultado) => {
        if (identificador !== requisicaoAtual.current) {
          return
        }

        setDados(resultado)
        setErro(null)
      })
      .catch((error: unknown) => {
        if (identificador !== requisicaoAtual.current) {
          return
        }

        console.error(
          'Erro ao carregar dashboard:',
          error
        )

        setErro(MENSAGEM_ERRO)
        setDados(null)
      })
      .finally(() => {
        if (identificador === requisicaoAtual.current) {
          setCarregando(false)
        }
      })

    return () => {
      requisicaoAtual.current += 1
    }
  }, [])

  // =========================================
  // NOVA CONSULTA MANUAL
  // =========================================

  const carregarDashboard = useCallback(async () => {
    const identificador = ++requisicaoAtual.current

    setCarregando(true)
    setErro(null)
    setModoDemonstracao(false)
    setDados(null)

    try {
      const resultado = await buscarDashboard()

      if (identificador !== requisicaoAtual.current) {
        return
      }

      setDados(resultado)
    } catch (error: unknown) {
      if (identificador !== requisicaoAtual.current) {
        return
      }

      console.error(
        'Erro ao carregar dashboard:',
        error
      )

      setErro(MENSAGEM_ERRO)
    } finally {
      if (identificador === requisicaoAtual.current) {
        setCarregando(false)
      }
    }
  }, [])

  // =========================================
  // ATIVAR MODO DEMONSTRAÇÃO
  // =========================================

  function ativarDemonstracao() {
    // Invalida consultas que ainda estão pendentes.
    requisicaoAtual.current += 1

    setDados(dadosDemonstracao)
    setModoDemonstracao(true)
    setCarregando(false)
    setErro(null)
  }

  // =========================================
  // ESTADO DE CARREGAMENTO
  // =========================================

  if (carregando) {
    return (
      <section className="card dashboard-principal">
        <div className="dashboard-cabecalho">
          <span className="dashboard-sobretitulo">
            PAINEL DE INDICADORES
          </span>

          <h2>Dashboard de Crédito</h2>

          <p>
            Consultando a disponibilidade dos dados...
          </p>
        </div>

        <div
          className="dashboard-carregamento"
          role="status"
        >
          <span
            className="dashboard-spinner"
            aria-hidden="true"
          />

          <span>Aguarde um momento.</span>
        </div>
      </section>
    )
  }

  // =========================================
  // ESTADO DE ERRO DA API
  // =========================================

  if (erro && !modoDemonstracao) {
    return (
      <section className="card dashboard-principal">
        <div className="dashboard-cabecalho">
          <span className="dashboard-sobretitulo">
            PAINEL DE INDICADORES
          </span>

          <h2>Dashboard de Crédito</h2>

          <p>
            Acompanhe os indicadores agregados
            das análises de crédito.
          </p>
        </div>

        <div className="dashboard-mensagem">
          <strong>Dados indisponíveis</strong>

          <p role="alert">{erro}</p>

          <p>
            Você pode tentar novamente ou visualizar
            uma demonstração com valores fictícios.
          </p>
        </div>

        <div className="dashboard-acoes">
          <button
            type="button"
            onClick={() => void carregarDashboard()}
          >
            Tentar novamente
          </button>

          <button
            type="button"
            onClick={ativarDemonstracao}
          >
            Visualizar demonstração
          </button>
        </div>
      </section>
    )
  }

  // =========================================
  // ESTADO SEM DADOS
  // =========================================

  if (!dados) {
    return (
      <section className="card dashboard-principal">
        <div className="dashboard-cabecalho">
          <span className="dashboard-sobretitulo">
            PAINEL DE INDICADORES
          </span>

          <h2>Dashboard de Crédito</h2>

          <p>Nenhum dado disponível.</p>
        </div>

        <div className="dashboard-acoes">
          <button
            type="button"
            onClick={() => void carregarDashboard()}
          >
            Tentar novamente
          </button>

          <button
            type="button"
            onClick={ativarDemonstracao}
          >
            Visualizar demonstração
          </button>
        </div>
      </section>
    )
  }

  // =========================================
  // INDICADORES DO DASHBOARD
  // =========================================

  // O sistema é stateless (LGPD): quando a API informa 0 análises,
  // isso significa "não armazenado", e não "nenhuma análise feita".
  const semHistorico =
    !modoDemonstracao && dados.total_analises === 0

  const textoNaoArmazenado = 'Não armazenado (LGPD)'

  // Evita mostrar dois cartões idênticos (volume e carteira ativa).
  const carteiraRepetida =
    dados.carteira_ativa === dados.volume_credito_total

  const indicadores = [
    {
      titulo: 'Total de análises',
      valor: semHistorico
        ? '—'
        : formatadorNumero.format(dados.total_analises),
      descricao: semHistorico
        ? textoNaoArmazenado
        : 'Quantidade de análises registradas',
    },
    {
      titulo: 'Baixo risco',
      valor: semHistorico
        ? '—'
        : formatadorNumero.format(dados.baixo_risco),
      descricao: semHistorico
        ? textoNaoArmazenado
        : 'Análises classificadas como baixo risco',
    },
    {
      titulo: 'Médio risco',
      valor: semHistorico
        ? '—'
        : formatadorNumero.format(dados.medio_risco),
      descricao: semHistorico
        ? textoNaoArmazenado
        : 'Análises classificadas como médio risco',
    },
    {
      titulo: 'Alto risco',
      valor: semHistorico
        ? '—'
        : formatadorNumero.format(dados.alto_risco),
      descricao: semHistorico
        ? textoNaoArmazenado
        : 'Análises classificadas como alto risco',
    },
    {
      titulo: 'Inadimplência média',
      valor: `${formatadorPercentual.format(
        dados.inadimplencia_media
      )}%`,
      descricao: 'Percentual médio de inadimplência',
    },
    {
      titulo: 'Volume total de crédito',
      valor: formatadorMoeda.format(
        dados.volume_credito_total
      ),
      descricao: modoDemonstracao
        ? 'Volume financeiro ilustrativo — dados fictícios'
        : 'Saldo da carteira de crédito do Sistema Financeiro Nacional (fonte: BACEN)',
    },
    {
      titulo: 'Carteira ativa',
      valor:
        dados.carteira_ativa !== undefined
          ? formatadorMoeda.format(dados.carteira_ativa)
          : 'Não disponível',
      descricao: 'Valor da carteira ativa de crédito',
    },
    {
      titulo: 'Número de operações',
      valor:
        dados.numero_operacoes !== undefined
          ? formatadorNumero.format(dados.numero_operacoes)
          : 'Não disponível',
      descricao: 'Quantidade de operações de crédito',
    },
  ]

  // =========================================
  // DADOS DOS GRÁFICOS ADICIONAIS
  // =========================================

  const evolucaoInadimplencia =
    dados.evolucao_inadimplencia ?? []

  const distribuicaoModalidade =
    dados.distribuicao_modalidade ?? []

  // =========================================
  // DASHBOARD COM DADOS DISPONÍVEIS
  // =========================================

  return (
    <>
      <section className="card dashboard-principal">
        <div className="dashboard-cabecalho">
          <span className="dashboard-sobretitulo">
            PAINEL DE INDICADORES
          </span>

          <h2>Dashboard de Crédito</h2>

          <p>
            Visão geral dos indicadores agregados
            das análises de crédito.
          </p>
        </div>

        {modoDemonstracao && (
          <div
            className="dashboard-demonstracao"
            role="status"
          >
            <strong>MODO DEMONSTRAÇÃO</strong>

            <p>
              Todos os valores e gráficos deste
              painel são fictícios e utilizados
              exclusivamente para demonstrar
              a interface do sistema. Não representam
              dados reais do Banco Central.
            </p>

            <button
              type="button"
              onClick={() => void carregarDashboard()}
            >
              Consultar dados da API
            </button>
          </div>
        )}

        <div className="dashboard-grid">
          {indicadores
            .filter(
              (indicador) =>
                !(
                  carteiraRepetida &&
                  indicador.titulo === 'Carteira ativa'
                )
            )
            .map((indicador) => (
            <div
              className="dashboard-card"
              key={indicador.titulo}
            >
              <strong>{indicador.titulo}</strong>

              <span>{indicador.valor}</span>

              <small>{indicador.descricao}</small>
            </div>
          ))}
        </div>

        {semHistorico && (
          <div className="dashboard-aviso-lgpd" role="note">
            <strong>Por que não há contagem de análises?</strong>

            <p>
              Por privacidade e em conformidade com a LGPD,
              este sistema não armazena as simulações
              realizadas nem os dados informados pelos
              usuários. Por isso não existe contagem de
              análises nem distribuição por faixa de risco.
              Os indicadores de inadimplência e de volume de
              crédito vêm de dados públicos do Banco Central
              do Brasil.
            </p>
          </div>
        )}
      </section>

      {/* Gráfico de distribuição de risco: só faz sentido
          quando existem análises armazenadas */}
      {!semHistorico && (
        <GraficoRisco
          baixoRisco={dados.baixo_risco}
          medioRisco={dados.medio_risco}
          altoRisco={dados.alto_risco}
          modoDemonstracao={modoDemonstracao}
        />
      )}

      {/* Novos gráficos previstos na Figura 11 */}
      <div className="dashboard-graficos-grid">
        <EvolucaoInadimplencia
          dados={evolucaoInadimplencia}
          modoDemonstracao={modoDemonstracao}
        />

        <DistribuicaoModalidade
          dados={distribuicaoModalidade}
          modoDemonstracao={modoDemonstracao}
        />
      </div>

      {/* Orientações gerais, não personalizadas */}
      <RecomendacoesCredito
        modoDemonstracao={modoDemonstracao}
      />
    </>
  )
}

export default Dashboard
