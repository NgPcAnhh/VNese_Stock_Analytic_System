import asyncio
import logging
from typing import Optional
from urllib.parse import urlparse

import asyncpg

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_REFRESH_SQL = "REFRESH MATERIALIZED VIEW CONCURRENTLY hethong_phantich_chungkhoan.mv_stock_screener_base"


def _normalize_dsn(raw: str) -> str:
    dsn = raw.strip()
    if "+psycopg2" in dsn:
        dsn = dsn.replace("+psycopg2", "")
    if "+asyncpg" in dsn:
        dsn = dsn.replace("+asyncpg", "")
    return dsn


async def refresh_stock_screener_mv_once() -> None:
    """Refresh stock screener materialized view once."""
    settings = get_settings()
    dsn = _normalize_dsn(settings.DATABASE_URL)
    host = (urlparse(dsn).hostname or "").lower()
    use_ssl = host not in {"localhost", "127.0.0.1"}

    conn = await asyncpg.connect(dsn=dsn, command_timeout=3600, ssl=use_ssl)
    try:
        await conn.execute(_REFRESH_SQL)
    finally:
        await conn.close()


async def _refresh_loop(interval_seconds: int, run_on_startup: bool) -> None:
    if run_on_startup:
        try:
            await refresh_stock_screener_mv_once()
            logger.info("stock MV refresh: startup refresh completed")
        except Exception:
            logger.exception("stock MV refresh: startup refresh failed")

    while True:
        await asyncio.sleep(interval_seconds)
        try:
            await refresh_stock_screener_mv_once()
            logger.info("stock MV refresh: periodic refresh completed")
        except Exception:
            logger.exception("stock MV refresh: periodic refresh failed")


def start_stock_mv_refresh_task(interval_seconds: int = 3600, run_on_startup: bool = True) -> asyncio.Task:
    """Start background task that refreshes stock screener MV periodically."""
    return asyncio.create_task(_refresh_loop(interval_seconds, run_on_startup))


async def stop_stock_mv_refresh_task(task: Optional[asyncio.Task]) -> None:
    """Stop MV refresh background task gracefully."""
    if task is None:
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
