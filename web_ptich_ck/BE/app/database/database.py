"""
Async database module — sử dụng asyncpg + SQLAlchemy AsyncSession.

Chuyển từ sync psycopg2 sang async asyncpg để:
  - Không block event loop khi query DB
  - Hỗ trợ hàng ngàn request đồng thời mà không nghẽn threadpool
"""
from typing import AsyncGenerator
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# ── Chuyển URL từ psycopg2 sang asyncpg ──
_db_url = settings.DATABASE_URL
if "+psycopg2" in _db_url:
    _db_url = _db_url.replace("+psycopg2", "+asyncpg")
elif "postgresql://" in _db_url and "+asyncpg" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://")

# ── Async engine ──
# Local Postgres often runs without SSL; forcing SSL handshake can fail on dev machines.
_db_host = (urlparse(_db_url).hostname or "").lower()
_is_local_db = _db_host in {"localhost", "127.0.0.1"}

_connect_args = {
    "statement_cache_size": 100,  # cache 100 prepared statements / conn
    "command_timeout": 20,  # abort query sau 20s
}
if _is_local_db:
    _connect_args["ssl"] = False

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    pool_size=20,          # số connection giữ sẵn
    max_overflow=20,       # thêm 20 connection khi peak → tổng max 40
    pool_pre_ping=True,    # kiểm tra connection còn sống trước khi dùng
    pool_recycle=1800,     # tái tạo connection sau 30 phút (tránh timeout)
    pool_timeout=10,       # timeout chờ connection từ pool (giây)
    # asyncpg performance: cache prepared statements per connection
    connect_args=_connect_args,
)

# ── Async session factory ──
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency cung cấp async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Tạo tables (development only)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Đóng engine khi shutdown."""
    await engine.dispose()
