interface ResultadoAnaliseProps {
  tipoCliente?: string
  porteEmpresa?: string
  setorEconomico?: string
  risco?: string | null
  inadimplenciaEstimada?: number | null
  carteiraAtivaMedia?: number | null
  operacoesSemelhantes?: number | null
  fonteSerie?: string | null
  dataReferencia?: string | null
  aviso?: string | null
  modoDemonstracao?: boolean
  onVerDashboard: () => void
}

function ResultadoAnalise({
  tipoCliente,
  porteEmpresa,
  setorEconomico,
  risco,
  inadimplenciaEstimada,
  carteiraAtivaMedia,
  operacoesSemelhantes,
  fonteSerie,
  dataReferencia,
  aviso,
  modoDemonstracao = false,
  onVerDashboard,
}: ResultadoAnaliseProps) {
  // '01/08/2026' -> 'agosto de 2026'
  function descreverReferencia(data?: string | null) {
    const partes = data ? data.split('/') : []

    if (partes.length !== 3) {
      return null
    }

    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ]
    const mes = Number(partes[1]) - 1

    if (!Number.isInteger(mes) || mes < 0 || mes > 11) {
      return null
    }

    return `${meses[mes]} de ${partes[2]}`
  }

  const referencia = descreverReferencia(dataReferencia)

  function formatarMoeda(valor?: number | null) {
    if (valor == null || !Number.isFinite(valor)) {
      return 'Não disponível'
    }

    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatarPercentual(valor?: number | null) {
    if (valor == null || !Number.isFinite(valor)) {
      return 'Não disponível'
    }

    return `${valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`
  }

  function formatarNumero(valor?: number | null) {
    if (valor == null || !Number.isFinite(valor)) {
      return 'Não disponível'
    }

    return valor.toLocaleString('pt-BR')
  }

  const perfilSelecionado =
    tipoCliente === 'PF'
      ? 'Pessoa Física'
      : tipoCliente === 'PJ'
        ? 'Pessoa Jurídica'
        : 'Não disponível'

  const riscoExibido = risco?.trim() || 'Não disponível'
  const riscoDisponivel = riscoExibido !== 'Não disponível'

  const indicadores = [
    {
      titulo: 'Risco de crédito',
      valor: riscoExibido,
      descricao: 'Classificação de risco, quando disponível',
    },
    {
      titulo: 'Inadimplência estimada',
      valor: formatarPercentual(inadimplenciaEstimada),
      descricao: 'Percentual estimado de inadimplência',
    },
    {
      titulo: 'Carteira ativa média',
      valor: formatarMoeda(carteiraAtivaMedia),
      descricao: 'Valor médio da carteira de crédito',
    },
    {
      titulo: 'Operações semelhantes',
      valor: formatarNumero(operacoesSemelhantes),
      descricao: 'Quantidade de operações comparáveis',
    },
  ]

  return (
    <section className="card resultado-analise-card">
      <div className="resultado-analise-cabecalho">
        <span className="identificacao-etapa">
          ETAPA 6 DE 6
        </span>

        <h2>{modoDemonstracao ? 'Resumo da Simulação' : 'Resultado da Análise'}</h2>

        <p>
          {modoDemonstracao
            ? 'Confira o perfil informado. Os indicadores de risco não são calculados no modo demonstração.'
            : 'Confira o perfil informado e os indicadores disponibilizados pelo serviço de análise.'}
        </p>
      </div>

      <section
        className="resultado-perfil"
        aria-labelledby="resultado-perfil-titulo"
      >
        <h3 id="resultado-perfil-titulo">
          Perfil selecionado
        </h3>

        <strong>{perfilSelecionado}</strong>

        {tipoCliente === 'PJ' && (
          <div className="resultado-perfil-detalhes">
            <p>
              <span>Porte da empresa:</span>{' '}
              {porteEmpresa || 'Não informado'}
            </p>
            <p>
              <span>Setor econômico:</span>{' '}
              {setorEconomico || 'Não informado'}
            </p>
          </div>
        )}
      </section>

      <div className="resultado-indicadores">
        {indicadores.map((indicador) => (
          <section
            className="resultado-indicador"
            key={indicador.titulo}
          >
            <h3>{indicador.titulo}</h3>
            <p
              className={`resultado-indicador-valor ${
                indicador.valor === 'Não disponível'
                  ? 'resultado-indicador-indisponivel'
                  : ''
              }`}
            >
              {indicador.valor}
            </p>
            <small>{indicador.descricao}</small>
          </section>
        ))}
      </div>

      {riscoDisponivel && !modoDemonstracao && (
        <div className="resultado-aviso" role="note">
          <strong>Como interpretar este resultado</strong>

          <p>
            Os indicadores são uma referência de inadimplência
            baseada em dados públicos do Banco Central do
            Brasil. Não são uma previsão individual para o
            perfil informado.
          </p>

          {fonteSerie && (
            <p>
              Fonte: {fonteSerie}
              {referencia ? ` (dado de ${referencia})` : ''}.
            </p>
          )}

          {aviso && (
            <p>
              Não havia dado recente do Banco Central para o
              porte ou a região informados; por isso foi usada
              a referência nacional geral.
            </p>
          )}
        </div>
      )}

      {!riscoDisponivel && (
        <div className="resultado-aviso" role="status">
          <strong>
            {modoDemonstracao
              ? 'Indicadores não calculados'
              : 'Indicadores ainda não disponíveis'}
          </strong>
          <p>
            {modoDemonstracao
              ? 'O fluxo demonstrativo foi concluído sem consultar a API. Nenhum indicador financeiro ou classificação de risco foi calculado. O Dashboard demonstra a interface com dados fictícios independentes desta simulação.'
              : 'A API não forneceu uma classificação de risco nesta resposta. Verifique a disponibilidade dos indicadores no serviço de análise.'}
          </p>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onVerDashboard}>
          Ver Dashboard →
        </button>
      </div>
    </section>
  )
}

export default ResultadoAnalise
