import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    APP_NAME: str = "StockPro Analysis System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DATABASE_URL_SYNC: str | None = None

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300

    SSI_IBOARD_BASE_URL: str | None = None
    SIMPLIZE_WS_URL: str | None = None

    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str | None = None

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    STOCK_MV_REFRESH_ENABLED: bool = True
    STOCK_MV_REFRESH_INTERVAL_SECONDS: int = 3600
    STOCK_MV_REFRESH_RUN_ON_STARTUP: bool = True

    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@stockpro.vn"
    FRONTEND_URL: str = "http://localhost:3000"

    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_EMBEDDING_DIMENSIONS: int = 1024

    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = "gpt-5.4-mini"
    OPENAI_FINETUNED_MODEL: str | None = None

    # Gemini settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env" if os.path.exists(".env") else ".env.example",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()

    