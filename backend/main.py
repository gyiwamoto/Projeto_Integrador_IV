"""
Backend do Projeto Integrador IV (FastAPI).

Rotas:
  POST /api/credito/      -> análise simples por renda (versão original)
  POST /api/simulacao/    -> usada pela tela de Simulação do frontend
  GET  /api/dashboard/    -> usada pela tela de Dashboard do frontend
  GET  /api/inadimplencia/{codigo} -> teste rápido de qualquer série SGS

Os dados vêm da API SGS do Banco Central e ficam só em memória (cache),
sem banco de dados, mantendo a arquitetura stateless.
"""
import os
import re
import time
import unicodedata
from datetime import date
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# =====================================================================
# CORS: quem pode chamar este backend
# =====================================================================
origens = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:5173",      # Vite (frontend em desenvolvimento)
    "http://127.0.0.1:5173",
    "https://gyiwamoto.github.io",  # GitHub Pages
]
# Endereços extras (ex.: domínio da Vercel) podem ser passados pela
# variável de ambiente ALLOWED_ORIGINS, separados por vírgula.
origens += [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens,
    allow_origin_regex=r"https://.*\.vercel\.app",  # qualquer deploy da Vercel
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# Conexão com a API SGS do Banco Central
# =====================================================================
URL_SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}"
TTL_CACHE = 6 * 60 * 60  # 6 horas
_cache: dict = {}

# Séries confirmadas no catálogo de dados abertos do BACEN.
SERIE_INADIMPLENCIA_GERAL = 13685   # carteira, bancos privados, total (mensal)
SERIE_SALDO_CARTEIRA = 20539        # saldo da carteira de crédito, total (mensal)
SERIE_INADIMPLENCIA_PJ_PEQUENO = 26203  # PJ pequeno porte, nacional (trimestral)

# Inadimplência PJ pequeno porte por estado (trimestral).
# Só estão aqui os códigos que foram conferidos. Para completar, procure
# no site dadosabertos.bcb.gov.br por "Taxa de inadimplência de pessoa
# jurídica por estado - pequeno porte - <estado>" e acrescente o código.
SERIE_PJ_PEQUENO_POR_UF = {
    "BA": 26252,
    "PI": 26265,
}

# ATENÇÃO: a página da série 20539 informa "unidades monetárias correntes",
# sem deixar claro se é R$ ou R$ milhões (a série irmã 20540 é em milhões).
# Confira o primeiro valor retornado: se for algo como 6.000.000, é milhões
# e o multiplicador abaixo está certo; se for ~6.000.000.000.000, use 1.
SALDO_CARTEIRA_MULTIPLICADOR = 1_000_000

# Regra PROVISÓRIA de classificação (em % de inadimplência). O grupo deve
# definir/justificar estes limites no relatório.
LIMITE_RISCO_BAIXO = 3.0
LIMITE_RISCO_ALTO = 6.0


async def buscar_serie(codigo: int, ultimos: int = 12) -> list[dict]:
    """Devolve [{'data': '01/03/2026', 'valor': 3.52}, ...] (cache de 6h)."""
    chave = (codigo, ultimos)
    em_cache = _cache.get(chave)
    if em_cache and time.time() - em_cache["t"] < TTL_CACHE:
        return em_cache["dados"]

    url = URL_SGS.format(codigo=codigo, n=ultimos)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params={"formato": "json"})
            resp.raise_for_status()
            bruto = resp.json()
    except (httpx.HTTPError, ValueError) as erro:
        raise HTTPException(status_code=502, detail=f"Falha ao consultar o BACEN: {erro}")

    dados = []
    for item in bruto:
        try:
            dados.append({"data": item["data"], "valor": float(item["valor"])})
        except (KeyError, TypeError, ValueError):
            continue  # ignora linhas vazias/inválidas

    if not dados:
        raise HTTPException(status_code=502, detail=f"O BACEN não devolveu dados da série {codigo}.")

    _cache[chave] = {"t": time.time(), "dados": dados}
    return dados


def data_para_periodo(data_br: str) -> str:
    """'01/03/2026' -> '2026-03' (formato que o frontend espera)."""
    _, mes, ano = data_br.split("/")
    return f"{ano}-{mes}"


@app.get("/api/inadimplencia/{codigo}")
async def inadimplencia(codigo: int, ultimos: int = 12):
    """Rota de teste: mostra qualquer série SGS."""
    return await buscar_serie(codigo, min(max(ultimos, 1), 120))


# =====================================================================
# Dashboard
# =====================================================================
@app.get("/api/dashboard/")
async def dashboard():
    inadimplencia = await buscar_serie(SERIE_INADIMPLENCIA_GERAL, 12)
    saldo = await buscar_serie(SERIE_SALDO_CARTEIRA, 1)

    media = round(sum(i["valor"] for i in inadimplencia) / len(inadimplencia), 2)
    carteira = saldo[-1]["valor"] * SALDO_CARTEIRA_MULTIPLICADOR

    return {
        # O sistema é stateless: não guarda análises, então não há contagem.
        "total_analises": 0,
        "baixo_risco": 0,
        "medio_risco": 0,
        "alto_risco": 0,
        # Dados reais do BACEN:
        "inadimplencia_media": media,
        "volume_credito_total": carteira,
        "carteira_ativa": carteira,
        "evolucao_inadimplencia": [
            {"periodo": data_para_periodo(i["data"]), "taxa_inadimplencia": i["valor"]}
            for i in inadimplencia
        ],
        # numero_operacoes e distribuicao_modalidade ficam de fora de propósito:
        # a API SGS não fornece esses dados (viriam do arquivo SCR.data).
    }


# =====================================================================
# Simulação
# =====================================================================
class DadosSimulacao(BaseModel):
    tipoCliente: str  # "PF" ou "PJ"
    nome: Optional[str] = None
    profissao: Optional[str] = None
    faixaRenda: Optional[str] = None
    porteEmpresa: Optional[str] = None
    setorEconomico: Optional[str] = None
    cnae: Optional[str] = None
    modalidadeCredito: str
    valorPretendido: Optional[float] = None
    estado: str
    cidade: Optional[str] = None
    dataBase: Optional[str] = None


UFS = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas", "BA": "Bahia",
    "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
    "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro",
    "RN": "Rio Grande do Norte", "RS": "Rio Grande do Sul", "RO": "Rondônia",
    "RR": "Roraima", "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe",
    "TO": "Tocantins",
}


def _sem_acento(texto: str) -> str:
    base = unicodedata.normalize("NFD", texto)
    return "".join(c for c in base if unicodedata.category(c) != "Mn").lower().strip()


def normalizar_uf(estado: str) -> Optional[str]:
    """Aceita 'SP', 'sp' ou 'São Paulo' e devolve 'SP'."""
    alvo = _sem_acento(estado)
    for sigla, nome in UFS.items():
        if alvo == sigla.lower() or alvo == _sem_acento(nome):
            return sigla
    return None


# Séries com dado mais antigo que isto (em meses) são descartadas e a
# simulação usa a série geral. Várias séries por porte/UF do BACEN pararam
# de ser atualizadas (ex.: 26203 e 26252 terminam em abril de 2023).
MAX_IDADE_MESES = 18


def meses_desde(data_br: str) -> int:
    """'01/04/2023' -> quantos meses se passaram até hoje."""
    _, mes, ano = (int(x) for x in data_br.split("/"))
    hoje = date.today()
    return (hoje.year - ano) * 12 + (hoje.month - mes)


def classificar(inadimplencia_pct: float) -> str:
    if inadimplencia_pct < LIMITE_RISCO_BAIXO:
        return "Baixo risco"
    if inadimplencia_pct <= LIMITE_RISCO_ALTO:
        return "Médio risco"
    return "Alto risco"


@app.post("/api/simulacao/")
async def simulacao(dados: DadosSimulacao):
    uf = normalizar_uf(dados.estado)
    pequeno_porte = (dados.porteEmpresa or "") in ("MEI", "Microempresa", "Pequena Empresa")

    # Lista de séries, da mais específica para a mais geral.
    candidatas = []
    if dados.tipoCliente == "PJ" and pequeno_porte:
        if uf in SERIE_PJ_PEQUENO_POR_UF:
            candidatas.append((SERIE_PJ_PEQUENO_POR_UF[uf], f"inadimplência PJ pequeno porte ({uf})"))
        candidatas.append((SERIE_INADIMPLENCIA_PJ_PEQUENO, "inadimplência PJ pequeno porte (nacional)"))
    candidatas.append((SERIE_INADIMPLENCIA_GERAL, "inadimplência geral da carteira (referência nacional)"))

    descartadas = []
    escolhida = None
    for i, (codigo, nome) in enumerate(candidatas):
        ultima = i == len(candidatas) - 1
        try:
            serie = await buscar_serie(codigo, 1)
        except HTTPException:
            if ultima:
                raise          # nem a série geral respondeu: devolve erro
            descartadas.append(f"SGS {codigo} (indisponível)")
            continue
        data = serie[-1]["data"]
        if meses_desde(data) <= MAX_IDADE_MESES or ultima:
            escolhida = (codigo, nome, serie[-1])
            break
        descartadas.append(f"SGS {codigo} (último dado: {data})")

    codigo, nome, ponto = escolhida
    taxa = round(ponto["valor"], 2)
    aviso = None
    if descartadas:
        aviso = ("Séries mais específicas descartadas por estarem desatualizadas ou "
                 "indisponíveis: " + "; ".join(descartadas) + ". Usada a série geral.")

    return {
        "risco": classificar(taxa),
        "inadimplenciaEstimada": taxa,
        # Indicadores que a API SGS não fornece por perfil: ficam como "Não disponível".
        "carteiraAtivaMedia": None,
        "operacoesSemelhantes": None,
        # Extras (o frontend atual ignora; úteis para transparência):
        "fonteSerie": f"BACEN SGS {codigo} - {nome}",
        "dataReferencia": ponto["data"],
        "aviso": aviso,
    }


# =====================================================================
# Análise simples por renda (versão original do protótipo)
# =====================================================================
class Cliente(BaseModel):
    nome: str
    renda: float
    setor: str
    profissao: str
    prazo: int
    estado: str


@app.post("/api/credito/")
def analisar_credito(cliente: Cliente):
    taxa_media = 8.0
    taxa_cliente = round(cliente.renda / 1000, 2)

    if cliente.renda > 5000:
        risco = "Baixo risco"
        perfil = "Provável bom pagador"
    elif 2000 <= cliente.renda <= 5000:
        risco = "Médio risco"
        perfil = "Pagador regular"
    else:
        risco = "Alto risco"
        perfil = "Risco elevado"

    return {
        "nome": cliente.nome,
        "renda": cliente.renda,
        "setor": cliente.setor,
        "profissao": cliente.profissao,
        "prazo": cliente.prazo,
        "estado": cliente.estado,
        "taxa_media": taxa_media,
        "taxa_cliente": taxa_cliente,
        "risco": risco,
        "perfil": perfil,
    }
