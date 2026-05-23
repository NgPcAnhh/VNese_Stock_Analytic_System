"""
Performance middleware cho FastAPI — bảo vệ hạ tầng với nhiều user.

1. RateLimitMiddleware  — Token-bucket rate limiting per IP
2. CacheControlMiddleware — Thêm Cache-Control header cho GET responses
3. TimeoutMiddleware    — Cancel request nếu quá lâu
4. DBSemaphoreMiddleware — Giới hạn concurrent DB-heavy requests
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from typing import Dict, Tuple

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# 1. Rate Limiter — Token bucket per IP
# ────────────────────────────────────────────────────────────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory token bucket rate limiter.
    - max_requests: số request tối đa trong window
    - window_seconds: khoảng thời gian (giây)
    Ví dụ: max_requests=60, window=60 → 60 req/min/IP
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window_seconds
        # {ip: (token_count, last_refill_time)}
        self._buckets: Dict[str, Tuple[float, float]] = defaultdict(
            lambda: (float(max_requests), time.monotonic())
        )
        self._lock = asyncio.Lock()

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        ip = self._get_client_ip(request)
        now = time.monotonic()

        async with self._lock:
            tokens, last_refill = self._buckets[ip]
            # Refill tokens based on elapsed time
            elapsed = now - last_refill
            tokens = min(
                float(self.max_requests),
                tokens + elapsed * (self.max_requests / self.window),
            )

            if tokens < 1.0:
                retry_after = int((1.0 - tokens) * (self.window / self.max_requests)) + 1
                self._buckets[ip] = (tokens, now)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": str(retry_after)},
                )

            self._buckets[ip] = (tokens - 1.0, now)

        response = await call_next(request)
        return response


# ────────────────────────────────────────────────────────────────────
# 2. Cache-Control — Thêm header cho browser cache GET responses
# ────────────────────────────────────────────────────────────────────
# Cấu hình TTL cho từng path prefix
_CACHE_RULES: list[Tuple[str, int]] = [
    # (path_prefix, max-age in seconds)
    ("/api/v1/market/heatmap", 60),
    ("/api/v1/market/cash-flow", 60),
    ("/api/v1/market/index-impact", 60),
    ("/api/v1/market/foreign-flow", 60),
    ("/api/v1/market/sector-overview", 120),
    ("/api/v1/market/sector-analysis", 300),
    ("/api/v1/market/sector-watchlist", 120),
    ("/api/v1/tong-quan/market-heatmap", 60),
    ("/api/v1/tong-quan/market-index-cards", 30),
    ("/api/v1/tong-quan/sector-performance", 120),
    ("/api/v1/tong-quan/market-breadth", 60),
    ("/api/v1/tong-quan/top-stocks", 60),
    ("/api/v1/tong-quan/ticker-slide", 60),
    ("/api/v1/tong-quan/macro-data", 600),
    ("/api/v1/news/latest", 120),
    ("/api/v1/indices/market", 300),
    ("/api/v1/indices/macro-yearly", 3600),
    ("/api/v1/stock-list/sectors", 600),
    # Stock Detail endpoints
    ("/api/v1/stock/", 60),
]


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Add Cache-Control + stale-while-revalidate headers for GET requests."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        if request.method != "GET" or response.status_code != 200:
            return response

        path = request.url.path
        for prefix, max_age in _CACHE_RULES:
            if path.startswith(prefix):
                # stale-while-revalidate: cho phép dùng cache cũ trong khi refetch
                response.headers["Cache-Control"] = (
                    f"public, max-age={max_age}, stale-while-revalidate={max_age * 2}"
                )
                break

        return response


# ────────────────────────────────────────────────────────────────────
# 3. Request Timeout — Cancel nếu request quá lâu
# ────────────────────────────────────────────────────────────────────
class TimeoutMiddleware(BaseHTTPMiddleware):
    """Abort request if it takes longer than timeout_seconds."""

    def __init__(self, app, timeout_seconds: float = 30.0):
        super().__init__(app)
        self.timeout = timeout_seconds
        self.chatbot_timeout = None  # VÃ´ hiá»‡u hoÃ¡ timeout cho chatbot (#AnalystMode)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        timeout = self.chatbot_timeout if request.url.path.startswith("/api/v1/chat") else self.timeout
        
        if timeout is None:
            return await call_next(request)
            
        try:
            return await asyncio.wait_for(
                call_next(request), timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.warning("Request timeout: %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=504,
                content={"detail": "Request timed out. Please try again."},
            )


# ────────────────────────────────────────────────────────────────────
# 4. DB Semaphore — Giới hạn concurrent heavy requests
# ────────────────────────────────────────────────────────────────────
class DBSemaphoreMiddleware(BaseHTTPMiddleware):
    """
    Limit concurrent DB-heavy API requests to prevent pool exhaustion.
    Chỉ áp dụng cho /api/ paths.
    """

    def __init__(self, app, max_concurrent: int = 50):
        super().__init__(app)
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        if self._semaphore._value == 0:  # noqa: SLF001
            return JSONResponse(
                status_code=503,
                content={"detail": "Server busy. Please retry shortly."},
                headers={"Retry-After": "2"},
            )

        async with self._semaphore:
            return await call_next(request)
