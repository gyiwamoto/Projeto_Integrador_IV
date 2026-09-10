from sqlalchemy import Column, Integer, String, Float
from database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    renda = Column(Float)
    setor = Column(String)
    risco = Column(String)
