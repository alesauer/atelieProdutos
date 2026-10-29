import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models import Base
from app.api.v1.api_router import api_router
from app.services.financial_service import financial_service


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
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN sales_links TEXT NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN color VARCHAR(50) NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN material VARCHAR(100) NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE production_orders ADD COLUMN color VARCHAR(80) NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE sales ADD COLUMN payment_method VARCHAR(50) NULL;"))
                conn.commit()
            except Exception:
                pass
            # Migrações seguras da tabela products para subprodutos e variações estilo Shopee
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN parent_id INT NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN variation_name VARCHAR(100) NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN weight DECIMAL(10, 3) NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN is_kit BOOLEAN NOT NULL DEFAULT FALSE;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN size VARCHAR(50) NULL;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE products ADD CONSTRAINT fk_products_parent FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE;"))
                conn.commit()
            except Exception:
                pass
            # Migrações seguras da tabela customers para CRM e Gestão de Clientes
            for col_sql in [
                "ALTER TABLE customers ADD COLUMN nickname VARCHAR(80) NULL;",
                "ALTER TABLE customers ADD COLUMN city VARCHAR(100) NULL;",
                "ALTER TABLE customers ADD COLUMN state VARCHAR(2) NULL;",
                "ALTER TABLE customers ADD COLUMN zip_code VARCHAR(15) NULL;",
                "ALTER TABLE customers ADD COLUMN address_line VARCHAR(255) NULL;",
                "ALTER TABLE customers ADD COLUMN neighborhood VARCHAR(100) NULL;",
                "ALTER TABLE customers ADD COLUMN birth_date VARCHAR(20) NULL;",
                "ALTER TABLE customers ADD COLUMN origin_channel VARCHAR(60) NULL;",
                "ALTER TABLE customers ADD COLUMN tags VARCHAR(255) NULL;",
                "ALTER TABLE customers ADD COLUMN updated_at DATETIME NULL;",
            ]:
                try:
                    conn.execute(text(col_sql))
                    conn.commit()
                except Exception:
                    pass
        # Popula categorias financeiras padrão se vazio
        try:
            with SessionLocal() as db:
                financial_service.seed_default_categories(db)
        except Exception as seed_err:
            print(f"[!] Aviso no seed de categorias financeiras: {seed_err}")
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

# Servir mídias estáticas de forma controlada (tanto em /api/v1/media quanto /media)
app.mount(
    f"{settings.API_V1_PREFIX}/media",
    StaticFiles(directory=settings.MEDIA_DIR),
    name="media",
)
app.mount(
    "/media",
    StaticFiles(directory=settings.MEDIA_DIR),
    name="media_root",
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
