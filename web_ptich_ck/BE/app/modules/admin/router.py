"""API Router for Admin module — toàn bộ chức năng quản trị hệ thống."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.database import get_db
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.auth.models import RefreshToken, Role, User
from app.modules.auth.security import hash_password
from app.modules.admin.schemas import (
    AdminResetPasswordRequest,
    AdminStatsResponse,
    AnalyticsLoginResponse,
    AnalyticsSearchResponse,
    AnalyticsSessionResponse,
    AnalyticsSidebarResponse,
    AnalyticsStockClicksResponse,
    PaginatedTokensResponse,
    PaginatedUsersResponse,
    RefreshTokenItem,
    RoleResponse,
    UpdateRoleRequest,
    UpdateUserRequest,
    UserAdminResponse,
    UserDetailResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role("admin"))],
)

S = "system"  # schema shorthand


# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "avatar_url": u.avatar_url,
        "role": u.role.name if u.role else "user",
        "role_id": u.role_id,
        "auth_provider": u.auth_provider,
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "is_totp_enabled": u.is_totp_enabled,
        "last_login_at": u.last_login_at,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
    }


# ═══════════════════════════════════════════════════════════════════
# 1. DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=AdminStatsResponse, summary="Tổng quan KPI hệ thống")
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    """Trả về tất cả các KPI chính cho màn hình tổng quan admin."""

    sql = text(f"""
        WITH user_stats AS (
            SELECT
                COUNT(*)                                                   AS total_users,
                COUNT(*) FILTER (WHERE is_active)                          AS active_users,
                COUNT(*) FILTER (WHERE NOT is_active)                      AS inactive_users,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_30d,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')  AS new_7d,
                COUNT(*) FILTER (WHERE is_totp_enabled)                    AS totp_enabled,
                COUNT(*) FILTER (WHERE auth_provider = 'google')           AS google_count,
                COUNT(*) FILTER (WHERE auth_provider = 'local')            AS local_count
            FROM {S}.users
        ),
        login_stats AS (
            SELECT
                COUNT(*) FILTER (WHERE login_at >= NOW() - INTERVAL '30 days' AND success) AS logins_30d,
                COUNT(*) FILTER (WHERE login_at >= CURRENT_DATE)          AS logins_today
            FROM {S}.login_logs
        ),
        session_stats AS (
            SELECT
                COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE) AS sessions_today,
                AVG(duration_seconds) FILTER (WHERE started_at >= CURRENT_DATE AND ended) AS avg_dur_today,
                COUNT(*) FILTER (WHERE ended = FALSE) AS active_sessions
            FROM {S}.session_logs
        ),
        tracking_7d AS (
            SELECT
                (SELECT COUNT(*) FROM {S}.search_logs      WHERE searched_at >= NOW() - INTERVAL '7 days')  AS searches_7d,
                (SELECT COUNT(*) FROM {S}.stock_clicks     WHERE clicked_at  >= NOW() - INTERVAL '7 days')  AS stock_clicks_7d,
                (SELECT COUNT(*) FROM {S}.article_clicks   WHERE clicked_at  >= NOW() - INTERVAL '7 days')  AS article_clicks_7d
        )
        SELECT u.*, l.*, se.*, t.* FROM user_stats u, login_stats l, session_stats se, tracking_7d t
    """)

    row = (await db.execute(sql)).mappings().first()

    # Role distribution
    role_sql = text(f"""
        SELECT r.name, COUNT(u.id) AS cnt
        FROM {S}.users u JOIN {S}.roles r ON u.role_id = r.id
        GROUP BY r.name
    """)
    role_rows = (await db.execute(role_sql)).all()
    role_dist = {r[0]: r[1] for r in role_rows}

    return AdminStatsResponse(
        total_users=int(row["total_users"] or 0),
        active_users=int(row["active_users"] or 0),
        inactive_users=int(row["inactive_users"] or 0),
        new_users_30d=int(row["new_30d"] or 0),
        new_users_7d=int(row["new_7d"] or 0),
        total_logins_30d=int(row["logins_30d"] or 0),
        logins_today=int(row["logins_today"] or 0),
        sessions_today=int(row["sessions_today"] or 0),
        avg_session_duration_today=float(row["avg_dur_today"]) if row["avg_dur_today"] else None,
        role_distribution=role_dist,
        totp_enabled_count=int(row["totp_enabled"] or 0),
        google_auth_count=int(row["google_count"] or 0),
        local_auth_count=int(row["local_count"] or 0),
        active_sessions_count=int(row["active_sessions"] or 0),
        total_search_events_7d=int(row["searches_7d"] or 0),
        total_stock_clicks_7d=int(row["stock_clicks_7d"] or 0),
        total_article_clicks_7d=int(row["article_clicks_7d"] or 0),
    )


# ═══════════════════════════════════════════════════════════════════
# 2. USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/users", response_model=PaginatedUsersResponse, summary="Danh sách người dùng")
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="Tìm theo email hoặc tên"),
    role: Optional[str] = Query(None, description="Lọc theo role: user/admin/moderator"),
    is_active: Optional[bool] = Query(None, description="Lọc theo trạng thái active"),
    auth_provider: Optional[str] = Query(None, description="Lọc theo provider: local/google"),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách người dùng với phân trang và bộ lọc đa chiều."""
    query = select(User).options(selectinload(User.role))

    if q:
        term = f"%{q.lower()}%"
        query = query.where(
            func.lower(User.email).like(term) | func.lower(User.full_name).like(term)
        )
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if auth_provider:
        query = query.where(User.auth_provider == auth_provider)
    if role:
        role_sub = select(Role.id).where(func.lower(Role.name) == role.lower()).scalar_subquery()
        query = query.where(User.role_id == role_sub)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.order_by(User.id.desc()).offset((page - 1) * size).limit(size)
    users = (await db.execute(query)).scalars().all()

    return PaginatedUsersResponse(
        items=[_user_dict(u) for u in users],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse, summary="Chi tiết người dùng")
async def get_user_detail(user_id: int, db: AsyncSession = Depends(get_db)):
    """Lấy thông tin chi tiết 1 user, bao gồm lịch sử đăng nhập và phiên làm việc."""
    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Login history
    login_sql = text(f"""
        SELECT id, method, success, ip_address, device_info, login_at
        FROM {S}.login_logs
        WHERE user_id = :uid
        ORDER BY login_at DESC
        LIMIT 10
    """)
    login_rows = (await db.execute(login_sql, {"uid": user_id})).mappings().all()

    # Login count
    count_sql = text(f"SELECT COUNT(*) FROM {S}.login_logs WHERE user_id = :uid AND success = TRUE")
    login_count = (await db.execute(count_sql, {"uid": user_id})).scalar_one()

    # Recent sessions
    sess_sql = text(f"""
        SELECT session_id, started_at, last_seen_at, duration_seconds, ip_address, ended
        FROM {S}.session_logs
        WHERE user_id = :uid
        ORDER BY started_at DESC
        LIMIT 10
    """)
    sess_rows = (await db.execute(sess_sql, {"uid": user_id})).mappings().all()

    # Search counts
    sc_sql = text(f"SELECT COUNT(*) FROM {S}.search_logs WHERE session_id IN (SELECT session_id FROM {S}.session_logs WHERE user_id = :uid)")
    search_count = (await db.execute(sc_sql, {"uid": user_id})).scalar_one()
    
    stk_sql = text(f"SELECT COUNT(*) FROM {S}.stock_clicks WHERE session_id IN (SELECT session_id FROM {S}.session_logs WHERE user_id = :uid)")
    stock_click_count = (await db.execute(stk_sql, {"uid": user_id})).scalar_one()

    # Active token count
    tok_sql = text(f"SELECT COUNT(*) FROM {S}.refresh_tokens WHERE user_id = :uid AND NOT revoked AND expires_at > NOW()")
    active_tokens = (await db.execute(tok_sql, {"uid": user_id})).scalar_one()

    return UserDetailResponse(
        user=_user_dict(user),
        login_count=int(login_count),
        last_10_logins=[dict(r) for r in login_rows],
        recent_sessions=[dict(r) for r in sess_rows],
        total_search_count=int(search_count),
        total_stock_click_count=int(stock_click_count),
        active_token_count=int(active_tokens),
    )


@router.patch("/users/{user_id}", response_model=UserAdminResponse, summary="Cập nhật thông tin user")
async def update_user(
    user_id: int,
    body: UpdateUserRequest,
    current_admin: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật role, trạng thái active, is_verified hoặc tên của user."""
    if user_id == current_admin.id and body.is_active is False:
        raise HTTPException(status_code=400, detail="Không thể vô hiệu hoá chính mình.")

    result = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.role_id is not None:
        if user_id == current_admin.id and body.role_id != user.role_id:
            raise HTTPException(status_code=400, detail="Không thể tự thay đổi role của mình.")
        role = (await db.execute(select(Role).where(Role.id == body.role_id))).scalars().first()
        if not role:
            raise HTTPException(status_code=400, detail="Role không tồn tại.")
        user.role_id = body.role_id
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.is_verified is not None:
        user.is_verified = body.is_verified

    await db.flush()
    await db.refresh(user, attribute_names=["role"])
    return _user_dict(user)


@router.post("/users/{user_id}/reset-password", summary="Đặt lại mật khẩu của user")
async def admin_reset_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Admin đặt mật khẩu mới cho user (không yêu cầu mật khẩu cũ)."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(body.new_password)
    await db.flush()
    return {"success": True, "message": f"Đã đặt lại mật khẩu cho {user.email}"}


@router.delete("/users/{user_id}/sessions", summary="Thu hồi tất cả tokens của user")
async def revoke_user_sessions(user_id: int, db: AsyncSession = Depends(get_db)):
    """Thu hồi toàn bộ refresh_tokens còn hiệu lực của user."""
    sql = text(f"""
        UPDATE {S}.refresh_tokens
        SET revoked = TRUE
        WHERE user_id = :uid AND NOT revoked
    """)
    result = await db.execute(sql, {"uid": user_id})
    await db.flush()
    return {"success": True, "revoked_count": result.rowcount}


@router.delete("/users/{user_id}", summary="Xóa vĩnh viễn user")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa vĩnh viễn user khỏi hệ thống (kèm cascade refresh_tokens, password_reset_tokens)."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của mình.")

    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.flush()
    return {"success": True, "message": f"Đã xóa user {user.email}"}


@router.get("/users/{user_id}/login-history", summary="Lịch sử đăng nhập của user")
async def get_user_login_history(
    user_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Lấy toàn bộ lịch sử đăng nhập của 1 user, có phân trang."""
    count_sql = text(f"SELECT COUNT(*) FROM {S}.login_logs WHERE user_id = :uid")
    total = (await db.execute(count_sql, {"uid": user_id})).scalar_one()

    sql = text(f"""
        SELECT id, method, success, ip_address, device_info, login_at
        FROM {S}.login_logs
        WHERE user_id = :uid
        ORDER BY login_at DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(sql, {"uid": user_id, "limit": size, "offset": (page - 1) * size})).mappings().all()

    return {
        "items": [dict(r) for r in rows],
        "total": int(total),
        "page": page,
        "size": size,
        "pages": (int(total) + size - 1) // size,
    }


# ═══════════════════════════════════════════════════════════════════
# 3. SESSION / TOKEN MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/sessions", summary="Danh sách active sessions gần đây")
async def list_active_sessions(
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    only_active: bool = Query(True, description="Chỉ lấy sessions chưa kết thúc"),
    db: AsyncSession = Depends(get_db),
):
    """Xem tất cả phiên làm việc (gần nhất) trong hệ thống."""
    where = "WHERE ended = FALSE" if only_active else "WHERE started_at >= NOW() - INTERVAL '7 days'"
    count_sql = text(f"SELECT COUNT(*) FROM {S}.session_logs {where}")
    total = (await db.execute(count_sql)).scalar_one()

    sql = text(f"""
        SELECT sl.session_id, sl.user_id, u.email AS user_email,
               sl.ip_address, sl.user_agent,
               sl.started_at, sl.last_seen_at, sl.duration_seconds
        FROM {S}.session_logs sl
        LEFT JOIN {S}.users u ON sl.user_id = u.id
        {where}
        ORDER BY sl.last_seen_at DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(sql, {"limit": size, "offset": (page - 1) * size})).mappings().all()

    return {
        "items": [dict(r) for r in rows],
        "total": int(total),
        "page": page,
        "pages": (int(total) + size - 1) // size,
    }


@router.get("/tokens", response_model=PaginatedTokensResponse, summary="Danh sách refresh tokens")
async def list_refresh_tokens(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    only_active: bool = Query(True, description="Chỉ hiện tokens chưa bị thu hồi"),
    db: AsyncSession = Depends(get_db),
):
    """Xem danh sách refresh tokens của toàn hệ thống."""
    query = select(RefreshToken).options(selectinload(RefreshToken.user))
    if only_active:
        query = query.where(RefreshToken.revoked == False).where(
            RefreshToken.expires_at > func.now()
        )

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    query = query.order_by(RefreshToken.created_at.desc()).offset((page - 1) * size).limit(size)
    tokens = (await db.execute(query)).scalars().all()

    items = [
        RefreshTokenItem(
            id=t.id,
            user_id=t.user_id,
            user_email=t.user.email if t.user else None,
            device_info=t.device_info,
            ip_address=t.ip_address,
            expires_at=t.expires_at,
            revoked=t.revoked,
            created_at=t.created_at,
        )
        for t in tokens
    ]

    return PaginatedTokensResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


@router.delete("/tokens/{token_id}", summary="Thu hồi một refresh token")
async def revoke_token(token_id: int, db: AsyncSession = Depends(get_db)):
    """Thu hồi 1 refresh token cụ thể theo ID."""
    token = (await db.execute(select(RefreshToken).where(RefreshToken.id == token_id))).scalars().first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    token.revoked = True
    await db.flush()
    return {"success": True, "message": "Token đã bị thu hồi."}


# ═══════════════════════════════════════════════════════════════════
# 4. ANALYTICS — Tracking Tables
# ═══════════════════════════════════════════════════════════════════

@router.get("/analytics/searches", response_model=AnalyticsSearchResponse, summary="Phân tích tìm kiếm")
async def analytics_searches(
    days: int = Query(30, ge=1, le=90),
    top: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê xu hướng tìm kiếm từ search_logs và stock_search_logs."""
    params = {"days": days, "top": top}

    hot_sql = text(f"""
        SELECT keyword, COUNT(*) AS count
        FROM {S}.search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword ORDER BY count DESC LIMIT :top
    """)
    hot_stock_sql = text(f"""
        SELECT keyword, COUNT(*) AS count
        FROM {S}.stock_search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword ORDER BY count DESC LIMIT :top
    """)
    by_day_sql = text(f"""
        SELECT DATE(searched_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)
    stk_by_day_sql = text(f"""
        SELECT DATE(searched_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.stock_search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)

    r_hot     = (await db.execute(hot_sql, params)).mappings().all()
    r_hstock  = (await db.execute(hot_stock_sql, params)).mappings().all()
    r_day     = (await db.execute(by_day_sql, params)).mappings().all()
    r_sday    = (await db.execute(stk_by_day_sql, params)).mappings().all()

    return AnalyticsSearchResponse(
        hot_keywords=[{"keyword": r["keyword"], "count": r["count"]} for r in r_hot],
        hot_stock_keywords=[{"keyword": r["keyword"], "count": r["count"]} for r in r_hstock],
        search_by_day=[{"date": str(r["date"]), "count": r["count"]} for r in r_day],
        stock_search_by_day=[{"date": str(r["date"]), "count": r["count"]} for r in r_sday],
    )


@router.get("/analytics/stock-clicks", response_model=AnalyticsStockClicksResponse, summary="Phân tích click mã CK")
async def analytics_stock_clicks(
    days: int = Query(30, ge=1, le=90),
    top: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê top mã cổ phiếu được click nhiều nhất và xu hướng theo ngày."""
    params = {"days": days, "top": top}

    top_sql = text(f"""
        SELECT ticker, COUNT(*) AS click_count, COUNT(DISTINCT session_id) AS unique_sessions
        FROM {S}.stock_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY ticker ORDER BY click_count DESC LIMIT :top
    """)
    by_day_sql = text(f"""
        SELECT DATE(clicked_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.stock_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)

    r_top = (await db.execute(top_sql, params)).mappings().all()
    r_day = (await db.execute(by_day_sql, params)).mappings().all()

    return AnalyticsStockClicksResponse(
        top_tickers=[{"ticker": r["ticker"], "click_count": r["click_count"], "unique_sessions": r["unique_sessions"]} for r in r_top],
        clicks_by_day=[{"date": str(r["date"]), "count": r["count"]} for r in r_day],
    )


@router.get("/analytics/logins", response_model=AnalyticsLoginResponse, summary="Phân tích đăng nhập")
async def analytics_logins(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê chi tiết đăng nhập: theo ngày, phương thức, tỷ lệ thành công."""
    params = {"days": days}

    by_day_sql = text(f"""
        SELECT
            DATE(login_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE success) AS success,
            COUNT(*) FILTER (WHERE NOT success) AS fail,
            COUNT(*) FILTER (WHERE method = 'local') AS local_count,
            COUNT(*) FILTER (WHERE method = 'google') AS google_count
        FROM {S}.login_logs
        WHERE login_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)
    by_method_sql = text(f"""
        SELECT method, COUNT(*) AS count
        FROM {S}.login_logs
        WHERE login_at >= NOW() - make_interval(days => :days) AND success
        GROUP BY method ORDER BY count DESC
    """)
    today_sql = text(f"SELECT COUNT(*) FROM {S}.login_logs WHERE login_at >= CURRENT_DATE")
    rate_sql = text(f"""
        SELECT
            CASE WHEN COUNT(*) = 0 THEN NULL
            ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 2) END AS rate
        FROM {S}.login_logs
        WHERE login_at >= NOW() - make_interval(days => :days)
    """)

    r_day    = (await db.execute(by_day_sql, params)).mappings().all()
    r_method = (await db.execute(by_method_sql, params)).mappings().all()
    r_today  = (await db.execute(today_sql)).scalar_one()
    r_rate   = (await db.execute(rate_sql, params)).mappings().first()

    return AnalyticsLoginResponse(
        by_day=[{
            "date": str(r["date"]),
            "total": r["total"],
            "success": r["success"],
            "fail": r["fail"],
            "local_count": r["local_count"],
            "google_count": r["google_count"],
        } for r in r_day],
        by_method=[{"method": r["method"], "count": r["count"]} for r in r_method],
        total_today=int(r_today or 0),
        success_rate_30d=float(r_rate["rate"]) if r_rate and r_rate["rate"] else None,
    )


@router.get("/analytics/sessions", response_model=AnalyticsSessionResponse, summary="Phân tích phiên làm việc")
async def analytics_sessions(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê phiên làm việc: thời gian TB, tỷ lệ anonymous vs authenticated."""
    params = {"days": days}

    by_day_sql = text(f"""
        SELECT
            DATE(started_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
            COUNT(*) AS session_count,
            AVG(duration_seconds) FILTER (WHERE ended) AS avg_duration_seconds,
            COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds
        FROM {S}.session_logs
        WHERE started_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)
    summary_sql = text(f"""
        SELECT
            AVG(duration_seconds) FILTER (WHERE ended AND started_at >= NOW() - INTERVAL '7 days') AS avg_7d,
            COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '7 days') AS total_7d,
            COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '7 days' AND user_id IS NULL) AS anon_7d,
            COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '7 days' AND user_id IS NOT NULL) AS auth_7d
        FROM {S}.session_logs
    """)

    r_day = (await db.execute(by_day_sql, params)).mappings().all()
    r_sum = (await db.execute(summary_sql)).mappings().first()

    return AnalyticsSessionResponse(
        by_day=[{
            "date": str(r["date"]),
            "session_count": r["session_count"],
            "avg_duration_seconds": float(r["avg_duration_seconds"]) if r["avg_duration_seconds"] else None,
            "total_duration_seconds": int(r["total_duration_seconds"]),
        } for r in r_day],
        avg_duration_7d=float(r_sum["avg_7d"]) if r_sum and r_sum["avg_7d"] else None,
        total_sessions_7d=int(r_sum["total_7d"] or 0),
        anon_sessions_7d=int(r_sum["anon_7d"] or 0),
        auth_sessions_7d=int(r_sum["auth_7d"] or 0),
    )


@router.get("/analytics/sidebar", response_model=AnalyticsSidebarResponse, summary="Phân tích sử dụng sidebar")
async def analytics_sidebar(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê tần suất click từng mục sidebar, phân biệt user đăng nhập/ẩn danh."""
    params = {"days": days}

    by_menu_sql = text(f"""
        SELECT
            menu_name, menu_href,
            COUNT(*) AS click_count,
            COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS auth_clicks,
            COUNT(*) FILTER (WHERE user_id IS NULL) AS anon_clicks
        FROM {S}.sidebar_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY menu_name, menu_href
        ORDER BY click_count DESC
    """)
    by_day_sql = text(f"""
        SELECT DATE(clicked_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.sidebar_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)

    r_menu = (await db.execute(by_menu_sql, params)).mappings().all()
    r_day  = (await db.execute(by_day_sql, params)).mappings().all()

    return AnalyticsSidebarResponse(
        by_menu=[{
            "menu_name": r["menu_name"],
            "menu_href": r["menu_href"],
            "click_count": r["click_count"],
            "auth_clicks": r["auth_clicks"],
            "anon_clicks": r["anon_clicks"],
        } for r in r_menu],
        by_day=[{"date": str(r["date"]), "count": r["count"]} for r in r_day],
    )


@router.get("/analytics/articles", summary="Phân tích click bài báo")
async def analytics_articles(
    days: int = Query(30, ge=1, le=90),
    top: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê bài báo được click nhiều nhất và xu hướng tổng theo ngày."""
    params = {"days": days, "top": top}

    top_sql = text(f"""
        SELECT article_id, COUNT(*) AS click_count, COUNT(DISTINCT session_id) AS unique_sessions
        FROM {S}.article_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY article_id ORDER BY click_count DESC LIMIT :top
    """)
    by_day_sql = text(f"""
        SELECT DATE(clicked_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.article_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)

    r_top = (await db.execute(top_sql, params)).mappings().all()
    r_day = (await db.execute(by_day_sql, params)).mappings().all()

    return {
        "top_articles": [{"article_id": r["article_id"], "click_count": r["click_count"], "unique_sessions": r["unique_sessions"]} for r in r_top],
        "clicks_by_day": [{"date": str(r["date"]), "count": r["count"]} for r in r_day],
    }


# ═══════════════════════════════════════════════════════════════════
# 5. ROLE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/roles", response_model=list[RoleResponse], summary="Danh sách vai trò")
async def list_roles(db: AsyncSession = Depends(get_db)):
    """Lấy tất cả roles cùng số lượng user của mỗi role."""
    roles = (await db.execute(select(Role))).scalars().all()

    result = []
    for r in roles:
        count = (await db.execute(select(func.count(User.id)).where(User.role_id == r.id))).scalar_one()
        result.append({
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "user_count": int(count),
            "created_at": r.created_at,
        })
    return result


@router.patch("/roles/{role_id}", response_model=RoleResponse, summary="Cập nhật mô tả role")
async def update_role(
    role_id: int,
    body: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật mô tả của một role."""
    role = (await db.execute(select(Role).where(Role.id == role_id))).scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if body.description is not None:
        role.description = body.description
    await db.flush()

    count = (await db.execute(select(func.count(User.id)).where(User.role_id == role.id))).scalar_one()
    return {"id": role.id, "name": role.name, "description": role.description, "user_count": int(count), "created_at": role.created_at}


# ═══════════════════════════════════════════════════════════════════
# 6. DATA HEALTH — Stock data monitoring
# ═══════════════════════════════════════════════════════════════════

@router.get("/data-health", summary="Sức khỏe dữ liệu stock")
async def data_health(db: AsyncSession = Depends(get_db)):
    """Kiểm tra tình trạng dữ liệu trong các bảng stock chính."""
    tables_sql = text("""
        SELECT
            'history_price' AS table_name,
            COUNT(*) AS row_count,
            COUNT(DISTINCT ticker) AS unique_tickers,
            MAX(trading_date) AS latest_date
        FROM hethong_phantich_chungkhoan.history_price
        UNION ALL
        SELECT
            'realtime_quotes',
            COUNT(*),
            COUNT(DISTINCT symbol),
            MAX(ts::text)
        FROM hethong_phantich_chungkhoan.realtime_quotes
        UNION ALL
        SELECT
            'financial_ratio',
            COUNT(*),
            COUNT(DISTINCT ticker),
            MAX(year::text || '-Q' || quarter::text)
        FROM hethong_phantich_chungkhoan.financial_ratio
        UNION ALL
        SELECT
            'bctc',
            COUNT(*),
            COUNT(DISTINCT ticker),
            MAX(year::text || '-Q' || quarter)
        FROM hethong_phantich_chungkhoan.bctc
        UNION ALL
        SELECT
            'news',
            COUNT(*),
            0,
            MAX(inserted_at::text)
        FROM hethong_phantich_chungkhoan.news
        UNION ALL
        SELECT
            'company_overview',
            COUNT(*),
            COUNT(DISTINCT ticker),
            NULL
        FROM hethong_phantich_chungkhoan.company_overview
        UNION ALL
        SELECT
            'market_index',
            COUNT(*),
            COUNT(DISTINCT ticker),
            MAX(trading_date)
        FROM hethong_phantich_chungkhoan.market_index
    """)

    try:
        rows = (await db.execute(tables_sql)).mappings().all()
    except Exception as exc:
        logger.error("data_health error: %s", exc)
        rows = []

    # Tracking tables health
    tracking_sql = text(f"""
        SELECT
            'page_views' AS table_name, COUNT(*) AS row_count,
            MAX(viewed_at::text) AS latest
        FROM {S}.page_views
        UNION ALL
        SELECT 'analysis_views', COUNT(*), MAX(viewed_at::text)
        FROM {S}.analysis_views
        UNION ALL
        SELECT 'error_logs', COUNT(*), MAX(created_at::text)
        FROM {S}.error_logs
        UNION ALL
        SELECT 'article_clicks', COUNT(*), MAX(clicked_at::text)
        FROM {S}.article_clicks
        UNION ALL
        SELECT 'search_logs', COUNT(*), MAX(searched_at::text)
        FROM {S}.search_logs
        UNION ALL
        SELECT 'stock_clicks', COUNT(*), MAX(clicked_at::text)
        FROM {S}.stock_clicks
        UNION ALL
        SELECT 'session_logs', COUNT(*), MAX(started_at::text)
        FROM {S}.session_logs
        UNION ALL
        SELECT 'login_logs', COUNT(*), MAX(login_at::text)
        FROM {S}.login_logs
    """)

    try:
        tracking_rows = (await db.execute(tracking_sql)).mappings().all()
    except Exception as exc:
        logger.error("data_health tracking error: %s", exc)
        tracking_rows = []

    return {
        "stock_tables": [dict(r) for r in rows],
        "tracking_tables": [dict(r) for r in tracking_rows],
    }


# ═══════════════════════════════════════════════════════════════════
# 7. PAGE VIEWS / ANALYSIS VIEWS ANALYTICS
# ═══════════════════════════════════════════════════════════════════

@router.get("/analytics/page-views", summary="Phân tích lượt xem trang")
async def analytics_page_views(
    days: int = Query(30, ge=1, le=90),
    top: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê top trang được xem nhiều nhất và xu hướng theo ngày."""
    params = {"days": days, "top": top}

    top_sql = text(f"""
        SELECT page_path, COUNT(*) AS view_count, COUNT(DISTINCT session_id) AS unique_sessions
        FROM {S}.page_views
        WHERE viewed_at >= NOW() - make_interval(days => :days)
        GROUP BY page_path ORDER BY view_count DESC LIMIT :top
    """)
    by_day_sql = text(f"""
        SELECT DATE(viewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.page_views
        WHERE viewed_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)

    r_top = (await db.execute(top_sql, params)).mappings().all()
    r_day = (await db.execute(by_day_sql, params)).mappings().all()

    return {
        "top_pages": [{"page_path": r["page_path"], "view_count": r["view_count"], "unique_sessions": r["unique_sessions"]} for r in r_top],
        "views_by_day": [{"date": str(r["date"]), "count": r["count"]} for r in r_day],
    }


@router.get("/analytics/analysis-views", summary="Phân tích lượt phân tích CK")
async def analytics_analysis_views(
    days: int = Query(30, ge=1, le=90),
    top: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê top mã CK được phân tích nhiều nhất và xu hướng theo ngày."""
    params = {"days": days, "top": top}

    top_sql = text(f"""
        SELECT ticker, COUNT(*) AS view_count, COUNT(DISTINCT session_id) AS unique_sessions
        FROM {S}.analysis_views
        WHERE viewed_at >= NOW() - make_interval(days => :days)
        GROUP BY ticker ORDER BY view_count DESC LIMIT :top
    """)
    by_day_sql = text(f"""
        SELECT DATE(viewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date, COUNT(*) AS count
        FROM {S}.analysis_views
        WHERE viewed_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)

    r_top = (await db.execute(top_sql, params)).mappings().all()
    r_day = (await db.execute(by_day_sql, params)).mappings().all()

    return {
        "top_tickers": [{"ticker": r["ticker"], "view_count": r["view_count"], "unique_sessions": r["unique_sessions"]} for r in r_top],
        "views_by_day": [{"date": str(r["date"]), "count": r["count"]} for r in r_day],
    }


@router.get("/analytics/errors", summary="Phân tích lỗi hệ thống")
async def analytics_errors(
    days: int = Query(30, ge=1, le=90),
    top: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê lỗi frontend/backend theo ngày."""
    params = {"days": days, "top": top}

    by_day_sql = text(f"""
        SELECT DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
               COUNT(*) AS count,
               COUNT(*) FILTER (WHERE error_type = 'frontend') AS frontend_count,
               COUNT(*) FILTER (WHERE error_type = 'backend') AS backend_count
        FROM {S}.error_logs
        WHERE created_at >= NOW() - make_interval(days => :days)
        GROUP BY 1 ORDER BY 1 DESC
    """)
    recent_sql = text(f"""
        SELECT id, error_type, error_message, page_url, created_at
        FROM {S}.error_logs
        ORDER BY created_at DESC
        LIMIT :top
    """)

    r_day = (await db.execute(by_day_sql, params)).mappings().all()
    r_recent = (await db.execute(recent_sql, {"top": top})).mappings().all()

    return {
        "by_day": [dict(r) for r in r_day],
        "recent_errors": [dict(r) for r in r_recent],
    }
