"""API Router for Tracking module — theo dõi hành vi người dùng."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.tracking import logic
from app.modules.tracking.schemas import (
    SessionEndRequest,
    SessionHeartbeatRequest,
    SessionStartRequest,
    ToggleFavoriteRequest,
    TrackResponse,
    TrackSearchRequest,
    TrackSidebarClickRequest,
    TrackStockSearchRequest,
    TrackPageViewRequest,
    TrackAnalysisViewRequest,
    TrackErrorRequest,
    TrackingStatsResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tracking", tags=["Tracking"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── 1. Tìm kiếm tin tức / từ khoá chung ──────────────────────────

@router.post("/search", response_model=TrackResponse)
async def track_search(
    body: TrackSearchRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ghi log mỗi lần user tìm kiếm tin tức hoặc từ khoá chung."""
    background_tasks.add_task(
        logic.track_search,
        db,
        keyword=body.keyword,
        session_id=body.session_id,
        ip_address=_client_ip(request),
    )
    return TrackResponse(success=True)


# ── 9. Favorite stocks ───────────────────────────────────────────

@router.post("/favorite", response_model=TrackResponse)
async def toggle_favorite(
    body: ToggleFavoriteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Thêm/xóa mã cổ phiếu khỏi danh sách yêu thích."""
    user_id = getattr(request.state, "user_id", None)
    is_favorite = await logic.toggle_favorite(
        db=db,
        ticker=body.ticker,
        user_id=user_id,
        session_id=body.session_id,
    )
    message = "Đã thêm vào yêu thích" if is_favorite else "Đã xóa khỏi yêu thích"
    return TrackResponse(success=True, message=message)


@router.get("/favorite", response_model=list[str])
async def get_favorites(
    request: Request,
    session_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách mã cổ phiếu yêu thích."""
    user_id = getattr(request.state, "user_id", None)
    return await logic.get_favorites(db=db, user_id=user_id, session_id=session_id)


# ── 2. Tìm kiếm mã cổ phiếu ──────────────────────────────────────

@router.post("/stock-search", response_model=TrackResponse)
async def track_stock_search(
    body: TrackStockSearchRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ghi log mỗi lần user tìm kiếm mã cổ phiếu."""
    background_tasks.add_task(
        logic.track_stock_search,
        db,
        keyword=body.keyword,
        session_id=body.session_id,
        ip_address=_client_ip(request),
    )
    return TrackResponse(success=True)


# ── 3. Click sidebar ──────────────────────────────────────────────

@router.post("/sidebar-click", response_model=TrackResponse)
async def track_sidebar_click(
    body: TrackSidebarClickRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ghi log mỗi lần user click vào mục sidebar."""
    background_tasks.add_task(
        logic.track_sidebar_click,
        db,
        menu_name=body.menu_name,
        menu_href=body.menu_href,
        session_id=body.session_id,
        user_id=body.user_id,
        ip_address=_client_ip(request),
    )
    return TrackResponse(success=True)


# ── 4. Session lifecycle ──────────────────────────────────────────

@router.post("/session/start", response_model=TrackResponse)
async def session_start(
    body: SessionStartRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Bắt đầu theo dõi phiên làm việc (gọi khi load app lần đầu)."""
    ok = await logic.session_start(
        db,
        session_id=body.session_id,
        user_id=body.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return TrackResponse(success=ok)


@router.post("/session/heartbeat", response_model=TrackResponse)
async def session_heartbeat(
    body: SessionHeartbeatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật thời gian phiên (gọi mỗi 30 giây)."""
    background_tasks.add_task(
        logic.session_heartbeat,
        db,
        session_id=body.session_id,
        duration_seconds=body.duration_seconds,
    )
    return TrackResponse(success=True)


@router.post("/session/end", response_model=TrackResponse)
async def session_end(
    body: SessionEndRequest,
    db: AsyncSession = Depends(get_db),
):
    """Kết thúc phiên làm việc (gọi khi đóng tab hoặc rời trang)."""
    ok = await logic.session_end(
        db,
        session_id=body.session_id,
        duration_seconds=body.duration_seconds,
    )
    return TrackResponse(success=ok)


# ── 5. Stats (admin) ──────────────────────────────────────────────

@router.get("/stats", response_model=TrackingStatsResponse)
async def get_stats(
    days: int = Query(7, ge=1, le=90, description="Số ngày thống kê"),
    top: int = Query(10, ge=1, le=50, description="Số kết quả top"),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê tổng quan hành vi người dùng (hot search, sidebar, login, session)."""
    data = await logic.get_tracking_stats(db, days=days, top=top)
    return data


# ── 6. Page View tracking ─────────────────────────────────────────

@router.post("/page-view", response_model=TrackResponse)
async def track_page_view(
    body: TrackPageViewRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ghi log mỗi lần user xem một trang."""
    background_tasks.add_task(
        logic.track_page_view,
        db,
        page_path=body.page_path,
        page_title=body.page_title,
        session_id=body.session_id,
        user_id=body.user_id,
        ip_address=_client_ip(request),
        referrer=body.referrer,
    )
    return TrackResponse(success=True)


# ── 7. Analysis View tracking ─────────────────────────────────────

@router.post("/analysis-view", response_model=TrackResponse)
async def track_analysis_view(
    body: TrackAnalysisViewRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ghi log mỗi lần user vào trang phân tích kỹ thuật CK."""
    background_tasks.add_task(
        logic.track_analysis_view,
        db,
        ticker=body.ticker,
        session_id=body.session_id,
        user_id=body.user_id,
        ip_address=_client_ip(request),
    )
    return TrackResponse(success=True)


# ── 8. Error logging ──────────────────────────────────────────────

@router.post("/error", response_model=TrackResponse)
async def track_error(
    body: TrackErrorRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ghi log lỗi frontend (JS errors)."""
    background_tasks.add_task(
        logic.track_error,
        db,
        error_type=body.error_type,
        error_message=body.error_message,
        stack_trace=body.stack_trace,
        page_url=body.page_url,
        session_id=body.session_id,
        user_id=body.user_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return TrackResponse(success=True)
