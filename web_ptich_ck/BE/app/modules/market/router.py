"""Market module API routes."""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.market import logic
from app.modules.market.schemas import (
    CashFlowData,
    ForeignFlowItem,
    HeatmapSector,
    IndexImpactItem,
    SectorAnalysisItem,
    SectorDetailData,
    SectorOverviewItem,
    SectorWatchlistData,
)

router = APIRouter(prefix="/market", tags=["Thị trường"])


# ── 1. Market Heatmap ─────────────────────────────────────────────
@router.get("/heatmap", response_model=List[HeatmapSector])
async def market_heatmap(
    exchange: str = Query("all", pattern="^(all|HOSE|HNX|UPCOM)$"),
    db: AsyncSession = Depends(get_db),
):
    """Bản đồ nhiệt thị trường — treemap theo ngành & mã."""
    return await logic.get_market_heatmap(db, exchange=exchange)


# ── 2. Cash Flow Distribution ─────────────────────────────────────
@router.get("/cash-flow", response_model=CashFlowData)
async def cash_flow(db: AsyncSession = Depends(get_db)):
    """Phân bố dòng tiền — giá trị giao dịch tăng / giảm / đứng giá."""
    return await logic.get_cash_flow(db)


# ── 3. Index Impact ───────────────────────────────────────────────
@router.get("/index-impact", response_model=List[IndexImpactItem])
async def index_impact(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Top cổ phiếu tác động mạnh nhất tới chỉ số."""
    return await logic.get_index_impact(db, limit=limit)


# ── 4. Foreign Flow ───────────────────────────────────────────────
@router.get("/foreign-flow", response_model=List[ForeignFlowItem])
async def foreign_flow(
    days: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Dòng tiền khối ngoại (net buy/sell) theo ngày."""
    return await logic.get_foreign_flow(db, days=days)


# ── 5. Sector Overview ────────────────────────────────────────────
@router.get("/sector-overview", response_model=List[SectorOverviewItem])
async def sector_overview(db: AsyncSession = Depends(get_db)):
    """Biến động ngành — % thay đổi + khối lượng + giá trị giao dịch."""
    return await logic.get_sector_overview(db)


# ── 6. Sector Analysis Table ──────────────────────────────────────
@router.get("/sector-analysis", response_model=List[SectorAnalysisItem])
async def sector_analysis(db: AsyncSession = Depends(get_db)):
    """Bảng phân tích ngành — P/E, P/B, thay đổi giá đa kỳ."""
    return await logic.get_sector_analysis(db)


# ── 7. Sector Watchlist ───────────────────────────────────────────
@router.get("/sector-watchlist", response_model=SectorWatchlistData)
async def sector_watchlist(db: AsyncSession = Depends(get_db)):
    """Bảng giá chi tiết theo ngành — danh sách ngành + cổ phiếu."""
    return await logic.get_sector_watchlist(db)
# ── 8. Sector Detail ────────────────────────────────────────────────
@router.get("/sector-detail", response_model=SectorDetailData)
async def sector_detail(
    sector_slug: str = Query(..., description="Slug of the sector (e.g., bat_dong_san)"),
    db: AsyncSession = Depends(get_db)
):
    """Chi tiết về 1 ngành: KPI, line chart, treemap, thanh khoản, định giá..."""
    return await logic.get_sector_detail(db, sector_slug=sector_slug)
