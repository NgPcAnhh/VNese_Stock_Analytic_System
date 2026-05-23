"""
Async connection pool dùng chung cho toàn bộ chatbot module.

Thay vì tạo asyncpg.connect() mới mỗi request (tốn ~5-50ms handshake),
module này giữ sẵn pool connections, tái sử dụng liên tục.
"""

import asyncpg
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Lấy connection pool, tạo mới nếu chưa có (lazy init)."""
    global _pool
    if _pool is None or _pool._closed:
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL_SYNC,
            min_size=2,
            max_size=10,
            command_timeout=20,
            statement_cache_size=100,
        )
        logger.info("Chatbot asyncpg pool created (min=2, max=10)")
    return _pool


async def close_pool() -> None:
    """Đóng pool khi shutdown app."""
    global _pool
    if _pool is not None and not _pool._closed:
        await _pool.close()
        logger.info("Chatbot asyncpg pool closed")
        _pool = None
