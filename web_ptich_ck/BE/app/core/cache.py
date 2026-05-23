"""
Async Redis cache utility — sử dụng redis.asyncio để không block event loop.

Features:
  - Connection pooling (singleton) with hiredis parser
  - @cached decorator: tự động cache kết quả của async function
  - In-flight dedup: nhiều request cùng lúc chỉ query DB 1 lần
  - Graceful degradation: Redis down → fallback về DB trực tiếp
"""
from __future__ import annotations

import asyncio
import functools
import json
import logging
from datetime import date, datetime
from typing import Any, Callable, Optional

import redis.asyncio as aioredis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ────────────────────────────────────────────────────────────────────
# Async Redis connection pool (singleton)
# ────────────────────────────────────────────────────────────────────
_pool: Optional[aioredis.ConnectionPool] = None


def _get_pool() -> aioredis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=80,        # đủ cho pool_size=20 + burst
            socket_connect_timeout=2,  # fail-fast nếu Redis chậm
            socket_timeout=3,
            retry_on_timeout=True,
        )
    return _pool


# Singleton Redis client — tái sử dụng thay vì tạo mới mỗi request
_redis_client: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    """Return a singleton async Redis client from the connection pool."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.Redis(connection_pool=_get_pool())
    return _redis_client


async def close_redis() -> None:
    """Đóng connection pool khi shutdown."""
    global _pool, _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
    if _pool is not None:
        await _pool.aclose()
        _pool = None


# ────────────────────────────────────────────────────────────────────
# JSON encoder hỗ trợ date / datetime
# ────────────────────────────────────────────────────────────────────
class _DateEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


# ────────────────────────────────────────────────────────────────────
# In-flight deduplication — tránh N request đồng thời cùng query DB
# ────────────────────────────────────────────────────────────────────
_inflight: dict[str, asyncio.Future[Any]] = {}


# ────────────────────────────────────────────────────────────────────
# Async Cache helpers
# ────────────────────────────────────────────────────────────────────
async def cache_get(key: str) -> Optional[Any]:
    """Lấy dữ liệu từ Redis cache (async). Trả về None nếu miss hoặc lỗi."""
    try:
        r = get_redis()
        raw = await r.get(key)
        if raw is not None:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis GET error (%s): %s", key, exc)
    return None


async def cache_set(key: str, data: Any, ttl: Optional[int] = None) -> None:
    """Lưu dữ liệu vào Redis cache với TTL (giây) — async."""
    if ttl is None:
        ttl = settings.REDIS_CACHE_TTL
    try:
        r = get_redis()
        await r.setex(key, ttl, json.dumps(data, cls=_DateEncoder))
    except Exception as exc:
        logger.warning("Redis SET error (%s): %s", key, exc)


async def cache_delete_pattern(pattern: str) -> int:
    """Xoá tất cả key khớp pattern (ví dụ 'market_chart:*'). Trả về số key đã xoá."""
    try:
        r = get_redis()
        keys = []
        async for key in r.scan_iter(match=pattern, count=100):
            keys.append(key)
        if keys:
            return await r.delete(*keys)
    except Exception as exc:
        logger.warning("Redis DELETE pattern error (%s): %s", pattern, exc)
    return 0


# ────────────────────────────────────────────────────────────────────
# @cached decorator — tự động cache + in-flight dedup
# ────────────────────────────────────────────────────────────────────
def cached(key_prefix: str, ttl: int = 120):
    """
    Decorator cho async function: tự động cache kết quả vào Redis.

    Sử dụng:
        @cached("market:heatmap", ttl=120)
        async def get_market_heatmap(db, exchange="all"):
            ...

    Features:
      - Redis cache với TTL
      - In-flight dedup: nếu 100 user cùng gọi 1 endpoint lúc cache miss,
        chỉ 1 request query DB, 99 request còn lại chờ kết quả
      - Graceful: nếu Redis chết → vẫn chạy bình thường (mỗi request query DB)
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Build cache key from prefix + all kwargs
            suffix = ":".join(f"{v}" for v in kwargs.values()) if kwargs else "default"
            cache_key = f"{key_prefix}:{suffix}"

            # 1. Try Redis cache first
            data = await cache_get(cache_key)
            if data is not None:
                return data

            # 2. In-flight dedup — chỉ 1 coroutine query DB
            if cache_key in _inflight:
                return await _inflight[cache_key]

            loop = asyncio.get_event_loop()
            future: asyncio.Future[Any] = loop.create_future()
            _inflight[cache_key] = future

            try:
                result = await fn(*args, **kwargs)
                future.set_result(result)
                # 3. Cache result
                await cache_set(cache_key, result, ttl=ttl)
                return result
            except Exception as exc:
                future.set_exception(exc)
                raise
            finally:
                _inflight.pop(cache_key, None)

        return wrapper
    return decorator

