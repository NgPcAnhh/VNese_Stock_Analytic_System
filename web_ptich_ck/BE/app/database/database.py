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
_is_local_db = _db_host in {"localhost", "127.0.0.1", "dwh-postgres"}

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


from sqlalchemy import text

async def init_bi_db() -> None:
    """Khởi tạo schema bi_hub và system, các bảng của BI, và seed workspace mặc định."""
    async with engine.begin() as conn:
        # 1. Tạo các schema cần thiết
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS bi_hub;"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS system;"))
        
        # 1.1. Tự động chạy file SQL khởi tạo bảng chat history
        import os
        migration_file = os.path.join(os.path.dirname(__file__), "migration_chat_history.sql")
        if os.path.exists(migration_file):
            with open(migration_file, "r", encoding="utf-8") as f:
                sql_content = f.read()
                # Tách các câu lệnh và thực thi
                statements = [s.strip() for s in sql_content.split(";") if s.strip()]
                for stmt in statements:
                    await conn.execute(text(stmt))
                    
        # Import toàn bộ model của BI để đăng ký vào Base.metadata
        import app.modules.bi.models.workspace
        import app.modules.bi.models.data_source
        import app.modules.bi.models.query
        import app.modules.bi.models.dataset
        import app.modules.bi.models.dataset_folder
        import app.modules.bi.models.chart
        import app.modules.bi.models.dashboard
        import app.modules.bi.models.permission
        
        # 2. Tạo bảng
        await conn.run_sync(Base.metadata.create_all)

        # 2.1. Kiểm tra cột folder_id trong bảng bi_hub.datasets, nếu chưa có thì ALTER TABLE
        check_col = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema='bi_hub' AND table_name='datasets' AND column_name='folder_id'
        """)
        res_col = await conn.execute(check_col)
        if not res_col.fetchone():
            await conn.execute(text("""
                ALTER TABLE bi_hub.datasets 
                ADD COLUMN folder_id UUID REFERENCES bi_hub.dataset_folders(id) ON DELETE SET NULL;
            """))
        
        # 3. Seed default workspace '00000000-0000-0000-0000-000000000000' nếu chưa có

        default_ws_id = "00000000-0000-0000-0000-000000000000"
        check_query = text("SELECT id FROM bi_hub.workspaces WHERE id = :id")
        result = await conn.execute(check_query, {"id": default_ws_id})
        if not result.fetchone():
            insert_query = text(
                "INSERT INTO bi_hub.workspaces (id, name, slug) VALUES (:id, :name, :slug)"
            )
            await conn.execute(insert_query, {
                "id": default_ws_id,
                "name": "Default Workspace",
                "slug": "default"
            })


async def close_db() -> None:
    """Đóng engine khi shutdown."""
    await engine.dispose()
