from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import secrets
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentOS Backend"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Server Binding (Strictly 127.0.0.1 for local-first host protection)
    HOST: str = "127.0.0.1"
    PORT: int = 8005
    
    # Database URL: Supports PostgreSQL (Docker on 5433 / Supabase) with SQLite local fallback
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", 
            "postgresql+asyncpg://agentos:agentos@127.0.0.1:5433/agentos"
        )
    )
    
    # Fallback SQLite DB for tests / zero-dependency mode
    SQLITE_FALLBACK_URL: str = "sqlite+aiosqlite:///./agentos.db"

    # Cloud AI Model Credentials (Google AI Studio Gemini)
    GEMINI_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY")
    )
    
    # Local Model Runtime (Native Ollama probe first, Docker fallback)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_CONTAINER_NAME: str = "agentos-ollama"
    DEFAULT_LOCAL_MODEL: str = "qwen3.5:4b"
    MAX_CONCURRENT_INFERENCES: int = 2
    
    # Security: Ephemeral Token for localhost process protection
    API_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_hex(32))
    REQUIRE_AUTH: bool = False  # Set to True in production desktop builds
    
    # Default SMTP Mail Credentials (Preconfigured with user override option)
    SMTP_HOST: str = Field(default_factory=lambda: os.getenv("SMTP_HOST", "smtp.gmail.com"))
    SMTP_PORT: int = Field(default_factory=lambda: int(os.getenv("SMTP_PORT", "587")))
    SMTP_USER: str = Field(default_factory=lambda: os.getenv("SMTP_USER", "ritikmistry712@gmail.com"))
    SMTP_PASSWORD: str = Field(default_factory=lambda: os.getenv("SMTP_PASSWORD", "iyee rgha bskt fslp"))
    SMTP_FROM: str = Field(default_factory=lambda: os.getenv("SMTP_FROM", "ritikmistry712@gmail.com"))
    SMTP_USE_SSL: bool = Field(default_factory=lambda: os.getenv("SMTP_USE_SSL", "false").lower() == "true")
    SMTP_DELIVERY_MODE: str = Field(default_factory=lambda: os.getenv("SMTP_DELIVERY_MODE", "smtp"))

    # Strict CORS Policy
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    model_config = SettingsConfigDict(
        env_file=[
            ".env",
            "backend/.env",
            os.path.abspath("./backend/.env"),
            os.path.abspath("./.env"),
            os.path.join(os.path.dirname(__file__), "../../.env"),
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

