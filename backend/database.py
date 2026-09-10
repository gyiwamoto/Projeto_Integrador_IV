from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# URL do banco de dados (será configurada como variável de ambiente na Vercel)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/credito")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()
 
