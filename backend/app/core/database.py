import logging
import socket
from urllib.parse import urlparse
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.app.core.config import settings

logger = logging.getLogger("agentos.database")

Base = declarative_base()

def can_reach_host(url: str, timeout: float = 0.5) -> bool:
    """Quick socket check to avoid long asyncpg TCP connection hangs when Postgres is not running."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        if host == "localhost":
            host = "127.0.0.1"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, socket.timeout):
        return False

# Determine active database URL
primary_url = settings.DATABASE_URL.replace("@localhost:", "@127.0.0.1:")
active_url = settings.SQLITE_FALLBACK_URL

if "postgresql" in primary_url:
    if can_reach_host(primary_url, timeout=0.5):
        active_url = primary_url
        logger.info(f"PostgreSQL detected and reachable: {active_url.split('@')[-1]}")
    else:
        logger.info(f"PostgreSQL not reachable at {primary_url.split('@')[-1]}. Using local SQLite fallback: {active_url}")
else:
    active_url = primary_url

connect_args = {}
if "sqlite" in active_url:
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    active_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def init_db():
    """Initializes database tables on active engine."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema initialized successfully.")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
