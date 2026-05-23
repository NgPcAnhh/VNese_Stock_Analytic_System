"""API Router for the News module."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.news import logic
from app.modules.news.schemas import (
    HotSearchItem,
    MostClickedArticle,
    NewsArticle,
    NewsPaginatedResponse,
    TrackClickRequest,
    TrackResponse,
    TrackSearchRequest,
)

router = APIRouter(prefix="/news", tags=["Tin tức"])


def _client_ip(request: Request) -> str:
    """Extract client IP from request (supports X-Forwarded-For)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── 1. Latest news (hero section) ─────────────────────────────────
@router.get("/latest", response_model=List[NewsArticle])
async def latest_news(
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Bài viết mới nhất (hero slider)."""
    return await logic.get_latest_news(db, limit=limit)


# ── 2. Paginated list with search & filter ─────────────────────────
@router.get("/list", response_model=NewsPaginatedResponse)
async def news_list(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(10, ge=1, le=50, description="Số bài / trang"),
    search: Optional[str] = Query(None, max_length=255, description="Tìm theo tiêu đề"),
    source: Optional[str] = Query(None, max_length=100, description="Lọc theo nguồn"),
    date_from: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """Danh sách bài viết phân trang, hỗ trợ tìm kiếm & lọc thời gian."""
    return await logic.get_news_list(
        db,
        page=page,
        page_size=page_size,
        search=search,
        source=source,
        date_from=date_from,
        date_to=date_to,
    )


# ── 3. Most clicked articles ──────────────────────────────────────
@router.get("/most-clicked", response_model=List[MostClickedArticle])
async def most_clicked(
    limit: int = Query(10, ge=1, le=20),
    days: int = Query(30, ge=1, le=365, description="Thống kê trong N ngày gần nhất"),
    db: AsyncSession = Depends(get_db),
):
    """Bài viết được click nhiều nhất."""
    return await logic.get_most_clicked(db, limit=limit, days=days)


# ── 4. Hot search keywords ────────────────────────────────────────
@router.get("/hot-search", response_model=List[HotSearchItem])
async def hot_search(
    limit: int = Query(12, ge=1, le=30),
    days: int = Query(7, ge=1, le=90, description="Thống kê trong N ngày gần nhất"),
    db: AsyncSession = Depends(get_db),
):
    """Từ khóa tìm kiếm nổi bật."""
    return await logic.get_hot_search(db, limit=limit, days=days)


# ── 5. Track click ────────────────────────────────────────────────
@router.post("/track-click", response_model=TrackResponse)
async def track_click(
    body: TrackClickRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Ghi nhận lượt click vào bài báo."""
    ok = await logic.track_click(
        db,
        article_id=body.article_id,
        session_id=body.session_id,
        ip_address=_client_ip(request),
    )
    if ok:
        return TrackResponse(success=True, message="Click tracked")
    return TrackResponse(success=False, message="Failed to track click")


# ── 6. Track search ───────────────────────────────────────────────
@router.post("/track-search", response_model=TrackResponse)
async def track_search(
    body: TrackSearchRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Ghi nhận từ khóa tìm kiếm."""
    ok = await logic.track_search(
        db,
        keyword=body.keyword,
        session_id=body.session_id,
        ip_address=_client_ip(request),
    )
    if ok:
        return TrackResponse(success=True, message="Search tracked")
    return TrackResponse(success=False, message="Failed to track search")


# ── 7. News sources (for filter dropdown) ─────────────────────────
@router.get("/sources", response_model=List[str])
async def news_sources(db: AsyncSession = Depends(get_db)):
    """Danh sách các nguồn tin để lọc."""
    return await logic.get_sources(db)


# ── 8. Sentiment summary (Gauges) ─────────────────────────────────
@router.get("/sentiment-summary")
async def sentiment_summary(db: AsyncSession = Depends(get_db)):
    """Tóm tắt tâm lý thị trường qua tin tức (ngày/tháng)."""
    return await logic.get_sentiment_summary(db)


# ── 9. Sector sentiment (Day/Week/Month) ──────────────────────────
@router.get("/sector-sentiment")
async def sector_sentiment(
    time_range: str = Query("month", description="day | week | month"),
    db: AsyncSession = Depends(get_db),
):
    """Tâm lý trung bình theo ngành trong khoảng thời gian chọn."""
    return await logic.get_sector_sentiment(db, time_range=time_range)
