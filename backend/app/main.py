import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.api_router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
)

# Configuração de CORS
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
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
