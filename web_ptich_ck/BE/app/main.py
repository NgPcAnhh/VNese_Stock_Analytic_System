from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import get_settings
from app.core.middleware import (
    CacheControlMiddleware,
    DBSemaphoreMiddleware,
    RateLimitMiddleware,
    TimeoutMiddleware,
)
from app.database.database import close_db, init_bi_db
from app.modules.chatbot.db.pool import close_pool as close_chatbot_pool
from app.core.cache import close_redis
from app.modules.tong_quan.router import router as tong_quan_router
from app.modules.news.router import router as news_router
from app.modules.indices.router import router as indices_router
from app.modules.stock_list.router import router as stock_list_router
from app.modules.stock_list.mv_refresh import (
    start_stock_mv_refresh_task,
    stop_stock_mv_refresh_task,
)
from app.modules.market.router import router as market_router
from app.modules.stock.router import router as stock_router
from app.modules.analysis.router import router as analysis_router
from app.modules.auth.router import router as auth_router
from app.modules.tracking.router import router as tracking_router
from app.modules.admin.router import router as admin_router
from app.modules.alerts.router import router as alerts_router
from app.modules.portfolio.router import router as portfolio_router
from app.modules.chatbot.api.routes import router as chatbot_router

settings = get_settings()


# ── Lifecycle: startup / shutdown ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — các connection pool đã lazy-init, không cần gì thêm
    await init_bi_db()
    mv_refresh_task = None
    if settings.STOCK_MV_REFRESH_ENABLED:
        mv_refresh_task = start_stock_mv_refresh_task(
            interval_seconds=settings.STOCK_MV_REFRESH_INTERVAL_SECONDS,
            run_on_startup=settings.STOCK_MV_REFRESH_RUN_ON_STARTUP,
        )
    yield
    # Shutdown — đóng sạch connection pools
    await stop_stock_mv_refresh_task(mv_refresh_task)
    await close_chatbot_pool()
    await close_db()
    await close_redis()


from app.core.responses import SafeJSONResponse

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
    default_response_class=SafeJSONResponse,
)

#  Middleware xử lý trùng lặp và CORS ở Backend
from fastapi import Request
@app.middleware("http")
async def fix_double_api_v1(request: Request, call_next):
    # Tự động sửa lỗi trùng lặp URL /api/v1/api/v1 từ Frontend gửi về
    if request.url.path.startswith("/api/v1/api/v1"):
        request.scope["path"] = request.url.path.replace("/api/v1/api/v1", "/api/v1", 1)
    response = await call_next(request)
    return response
    
# ── GZip middleware — nén response > 500 bytes (giảm ~70% cho JSON lớn) ──
app.add_middleware(GZipMiddleware, minimum_size=500)

# ── Cache-Control headers cho browser caching ──
app.add_middleware(CacheControlMiddleware)

# ── Rate limiting — 120 requests/phút/IP ──
app.add_middleware(RateLimitMiddleware, max_requests=120, window_seconds=60)

# ── Request timeout — 30 giây ──
app.add_middleware(TimeoutMiddleware, timeout_seconds=30.0)

# ── DB concurrency guard — max 50 concurrent DB requests ──
app.add_middleware(DBSemaphoreMiddleware, max_concurrent=50)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include BI routers
from app.modules.bi.data_sources.router import router as data_sources_router
from app.modules.bi.queries.router import router as queries_router
from app.modules.bi.datasets.router import router as datasets_router
from app.modules.bi.charts.router import router as charts_router
from app.modules.bi.dashboards.router import router as dashboards_router
from app.modules.bi.permissions.router import router as permissions_router

# Include routers
app.include_router(tong_quan_router, prefix="/api/v1")
app.include_router(news_router, prefix="/api/v1")
app.include_router(indices_router, prefix="/api/v1")
app.include_router(stock_list_router, prefix="/api/v1")
app.include_router(market_router, prefix="/api/v1")
app.include_router(stock_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(tracking_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(portfolio_router, prefix="/api/v1")
app.include_router(chatbot_router, prefix="/api/v1")
app.include_router(data_sources_router, prefix="/api/v1/data-sources", tags=["data-sources"])
app.include_router(queries_router, prefix="/api/v1/queries", tags=["queries"])
app.include_router(datasets_router, prefix="/api/v1/datasets", tags=["datasets"])
app.include_router(charts_router, prefix="/api/v1/charts", tags=["charts"])
app.include_router(dashboards_router, prefix="/api/v1/dashboards", tags=["dashboards"])
app.include_router(permissions_router, prefix="/api/v1/permissions", tags=["chart-permissions"])

@app.get("/")
async def read_root():
    return {"message": "Welcome to Stock Analysis API"}