
import type { Cliente, ResultadoCredito } from '../types/credito'

// Em desenvolvimento, utiliza o FastAPI local.
// Em produção, utiliza o mesmo domínio da aplicação,
// salvo quando VITE_API_URL estiver configurada.
const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/+$/, '')

export async function analisarCredito(
  cliente: Cliente
): Promise<ResultadoCredito> {
  let response: Response

  try {
    response = await fetch(`${API_URL}/api/credito/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cliente),
    })
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. ' +
      'Verifique se a API de crédito está disponível.'
    )
  }

  if (!response.ok) {
    throw new Error(
      'Não foi possível concluir a análise de crédito. ' +
      `O servidor retornou HTTP ${response.status}.`
    )
  }

  let resultado: unknown

  try {
    resultado = await response.json()
  } catch {
    throw new Error(
      'A API de crédito retornou uma resposta JSON inválida.'
    )
  }

  if (
    typeof resultado !== 'object' ||
    resultado === null ||
    Array.isArray(resultado)
  ) {
    throw new Error(
      'A API de crédito retornou um formato de resposta inválido.'
    )
  }

  return resultado as ResultadoCredito
}
