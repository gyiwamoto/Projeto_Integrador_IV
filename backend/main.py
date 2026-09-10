from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# 🔑 Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],  # libera seu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de entrada
class Cliente(BaseModel):
    nome: str
    renda: float
    setor: str
    profissao: str
    prazo: int
    estado: str

# Endpoint de análise de crédito
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
        "perfil": perfil
    }
