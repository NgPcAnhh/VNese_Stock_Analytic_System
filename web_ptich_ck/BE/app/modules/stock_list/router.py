"""API Router for the Stock List module."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.stock_list import logic
from app.modules.stock_list.schemas import (
    HotStockSearchItem,
    MostViewedStock,
    ScreenerResponse,
    SectorItem,
    StockOverviewPaginatedResponse,
    TrackResponse,
    TrackStockClickRequest,
    TrackStockSearchRequest,
)

router = APIRouter(prefix="/stock-list", tags=["Danh sách cổ phiếu"])


def _client_ip(request: Request) -> str:
    """Extract client IP from request (supports X-Forwarded-For)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── 0. Stock Screener (full dataset) ──────────────────────────────
@router.get("/screener", response_model=ScreenerResponse)
async def screener(db: AsyncSession = Depends(get_db)):
    """Bộ lọc cổ phiếu — trả về toàn bộ dataset với đầy đủ chỉ số tài chính & kỹ thuật."""
    return await logic.get_screener_data(db)


# ── 1. Stock overview list (paginated, 30 records default) ─────────
@router.get("/overview", response_model=StockOverviewPaginatedResponse)
async def stock_overview(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(30, ge=1, le=100, description="Số bản ghi / trang (mặc định 30)"),
    search: Optional[str] = Query(None, max_length=255, description="Tìm theo mã CK hoặc tên công ty"),
    sector: Optional[str] = Query(None, max_length=100, description="Lọc theo ngành (icb_name2)"),
    exchange: Optional[str] = Query(None, max_length=20, description="Lọc theo sàn (HOSE, HNX, UPCOM)"),
    sort_by: Optional[str] = Query("market_cap", description="Cột sắp xếp"),
    sort_dir: Optional[str] = Query("desc", description="Hướng sắp xếp: asc | desc"),
    db: AsyncSession = Depends(get_db),
):
    """Danh sách tổng quan cổ phiếu — phân trang, tìm kiếm, lọc & sắp xếp."""
    return await logic.get_stock_overview(
        db,
        page=page,
        page_size=page_size,
        search=search,
        sector=sector,
        exchange=exchange,
        sort_by=sort_by or "market_cap",
        sort_dir=sort_dir or "desc",
    )


# ── 2. Sectors list ───────────────────────────────────────────────
@router.get("/sectors", response_model=List[SectorItem])
async def sectors(db: AsyncSession = Depends(get_db)):
    """Danh sách ngành (icb_name2) và số mã cổ phiếu."""
    return await logic.get_sectors(db)


# ── 3. Most viewed stocks ─────────────────────────────────────────
@router.get("/most-viewed", response_model=List[MostViewedStock])
async def most_viewed(
    limit: int = Query(10, ge=1, le=30),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Top mã cổ phiếu được click nhiều nhất."""
    return await logic.get_most_viewed(db, limit=limit, days=days)


# ── 4. Hot stock search keywords ──────────────────────────────────
@router.get("/hot-search", response_model=List[HotStockSearchItem])
async def hot_search(
    limit: int = Query(12, ge=1, le=30),
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Từ khóa tìm kiếm cổ phiếu nổi bật."""
    return await logic.get_hot_stock_search(db, limit=limit, days=days)


# ── 5. Track stock click ──────────────────────────────────────────
@router.post("/track-click", response_model=TrackResponse)
async def track_click(
    body: TrackStockClickRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Ghi nhận lượt click vào mã cổ phiếu."""
    ok = await logic.track_stock_click(
        db,
        ticker=body.ticker,
        session_id=body.session_id,
        ip_address=_client_ip(request),
    )
    if ok:
        return TrackResponse(success=True, message="Stock click tracked")
    return TrackResponse(success=False, message="Failed to track stock click")


# ── 6. Track stock search ─────────────────────────────────────────
@router.post("/track-search", response_model=TrackResponse)
async def track_search(
    body: TrackStockSearchRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Ghi nhận từ khóa tìm kiếm cổ phiếu."""
    ok = await logic.track_stock_search(
        db,
        keyword=body.keyword,
        session_id=body.session_id,
        ip_address=_client_ip(request),
    )
    if ok:
        return TrackResponse(success=True, message="Stock search tracked")
    return TrackResponse(success=False, message="Failed to track stock search")
