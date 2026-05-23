"""API v1 router — aggregates all module routers."""

from fastapi import APIRouter

from app.modules.tong_quan.router import router as tong_quan_router
from app.modules.news.router import router as news_router
from app.modules.indices.router import router as indices_router
from app.modules.stock_list.router import router as stock_list_router
from app.modules.portfolio_assumption.router import router as portfolio_assumption_router

api_v1_router = APIRouter()

# Register module routers
api_v1_router.include_router(tong_quan_router)
api_v1_router.include_router(news_router)
api_v1_router.include_router(indices_router)
api_v1_router.include_router(stock_list_router)
api_v1_router.include_router(portfolio_assumption_router)
