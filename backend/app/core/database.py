from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

# Ajuste de argumentos de conexão conforme o tipo de banco (MySQL vs SQLite de teste)
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600 if not settings.DATABASE_URL.startswith("sqlite") else -1,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency do FastAPI para gerenciamento de sessão do banco de dados."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
