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
    
    # Strict CORS Policy
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

