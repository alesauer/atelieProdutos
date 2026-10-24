import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from sqlalchemy import text
from app.core.database import engine
from app.models import Base
from app.api.v1.api_router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN cost_breakdown TEXT NULL;"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        print(f"[!] Aviso durante criacao das tabelas no startup: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# Configuração de CORS flexível e segura (suporta localhost, IP do VPS e domínios)
if settings.CORS_ORIGINS:
    origins = [str(origin) for origin in settings.CORS_ORIGINS]
    allow_all = "*" in origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if (allow_all and False) else origins,
        allow_origin_regex=r"^https?://.*$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Criação do diretório de mídia se não existir
os.makedirs(settings.MEDIA_DIR, exist_ok=True)

# Servir mídias estáticas de forma controlada
app.mount(
    f"{settings.API_V1_PREFIX}/media",
    StaticFiles(directory=settings.MEDIA_DIR),
    name="media",
)

# Inclusão das rotas da API v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Sistema"])
def health_check():
    """Endpoint de verificação de integridade da API."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.get("/", tags=["Sistema"])
def root():
    return {
        "message": f"Bem-vindo à API do {settings.PROJECT_NAME}",
        "docs": f"{settings.API_V1_PREFIX}/docs",
    }
