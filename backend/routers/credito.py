from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Cliente

router = APIRouter(prefix="/credito", tags=["Crédito"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(Cliente).all()

@router.post("/")
def adicionar_cliente(nome: str, renda: float, setor: str, db: Session = Depends(get_db)):
    risco = "Alto" if renda < 2000 else "Baixo"
    cliente = Cliente(nome=nome, renda=renda, setor=setor, risco=risco)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente

