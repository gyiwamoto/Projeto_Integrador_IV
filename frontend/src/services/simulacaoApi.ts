
import type { DadosSimulacao } from '../types/simulacao'

export interface ResultadoSimulacao {
  risco: string | null
  inadimplenciaEstimada: number | null
  carteiraAtivaMedia: number | null
  operacoesSemelhantes: number | null
}

// Em desenvolvimento, utiliza o FastAPI local.
// Em produção, utiliza o mesmo domínio da aplicação,
// salvo quando VITE_API_URL estiver configurada.
const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/+$/, '')

function validarResultado(
  valor: unknown
): valor is ResultadoSimulacao {
  if (
    typeof valor !== 'object' ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return false
  }

  const dados = valor as Record<string, unknown>

  const riscoValido =
    dados.risco === null ||
    typeof dados.risco === 'string'

  const numeroOuNulo = (item: unknown): boolean =>
    item === null ||
    (
      typeof item === 'number' &&
      Number.isFinite(item)
    )

  return (
    riscoValido &&
    numeroOuNulo(dados.inadimplenciaEstimada) &&
    numeroOuNulo(dados.carteiraAtivaMedia) &&
    numeroOuNulo(dados.operacoesSemelhantes)
  )
}

export async function analisarSimulacao(
  dados: DadosSimulacao
): Promise<ResultadoSimulacao> {
  let response: Response

  try {
    response = await fetch(
      `${API_URL}/api/simulacao/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      }
    )
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. ' +
      'Verifique se a API de simulação está disponível.'
    )
  }

  if (!response.ok) {
    throw new Error(
      'Não foi possível concluir a simulação. ' +
      `O servidor retornou HTTP ${response.status}.`
    )
  }

  let resultado: unknown

  try {
    resultado = await response.json()
  } catch {
    throw new Error(
      'A API de simulação retornou uma resposta JSON inválida.'
    )
  }

  if (!validarResultado(resultado)) {
    throw new Error(
      'A API retornou dados incompatíveis ' +
      'com o formato esperado pela simulação.'
    )
  }

  return resultado
}
