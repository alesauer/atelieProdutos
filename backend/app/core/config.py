import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Casa Luma Estoque"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Banco de Dados
    DATABASE_URL: str = "mysql+pymysql://casaluma_user:casaluma_password@db:3306/casaluma_estoque?charset=utf8mb4"

    # Segurança e JWT
    SECRET_KEY: str = "chave_secreta_padrao_para_desenvolvimento_trocar_em_producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Armazenamento e Limites de Mídias
    MEDIA_DIR: str = "/app/media"
    MAX_IMAGE_SIZE_MB: int = 15
    MAX_IMAGES_PER_PRODUCT: int = 10

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:6700",
        "http://127.0.0.1:6700",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    # E-mail
    EMAIL_DRIVER: str = "log"
    EMAIL_FROM: str = "estoque@casaluma.com.br"
    EMAIL_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
