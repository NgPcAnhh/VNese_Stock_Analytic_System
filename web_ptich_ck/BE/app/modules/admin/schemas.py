"""Pydantic schemas for Admin module — full admin feature set."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── User Management ─────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    role_id: int
    auth_provider: str
    is_active: bool
    is_verified: bool
    is_totp_enabled: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedUsersResponse(BaseModel):
    items: List[UserAdminResponse]
    total: int
    page: int
    size: int
    pages: int


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    role_id: Optional[int] = None
    full_name: Optional[str] = None
    is_verified: Optional[bool] = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str


# ── Stats / Overview ─────────────────────────────────────────────

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    new_users_30d: int
    new_users_7d: int
    total_logins_30d: int
    logins_today: int
    sessions_today: int
    avg_session_duration_today: Optional[float] = None
    role_distribution: Dict[str, int]
    totp_enabled_count: int
    google_auth_count: int
    local_auth_count: int
    # Realtime KPIs from tracking tables
    active_sessions_count: int
    total_search_events_7d: int
    total_stock_clicks_7d: int
    total_article_clicks_7d: int


# ── Analytics (Tracking Tables) ──────────────────────────────────

class DailyCount(BaseModel):
    date: str
    count: int


class SearchTrend(BaseModel):
    keyword: str
    count: int
    dates: List[DailyCount] = []


class HotKeyword(BaseModel):
    keyword: str
    count: int


class HotTicker(BaseModel):
    ticker: str
    click_count: int
    unique_sessions: int


class SidebarUsage(BaseModel):
    menu_name: str
    menu_href: str
    click_count: int
    auth_clicks: int
    anon_clicks: int


class LoginMethodStat(BaseModel):
    method: str
    count: int


class DailyLoginStat(BaseModel):
    date: str
    total: int
    success: int
    fail: int
    local_count: int
    google_count: int


class DailySessionStat(BaseModel):
    date: str
    session_count: int
    avg_duration_seconds: Optional[float]
    total_duration_seconds: int


class AnalyticsSearchResponse(BaseModel):
    hot_keywords: List[HotKeyword]
    hot_stock_keywords: List[HotKeyword]
    search_by_day: List[DailyCount]
    stock_search_by_day: List[DailyCount]


class AnalyticsStockClicksResponse(BaseModel):
    top_tickers: List[HotTicker]
    clicks_by_day: List[DailyCount]


class AnalyticsLoginResponse(BaseModel):
    by_day: List[DailyLoginStat]
    by_method: List[LoginMethodStat]
    total_today: int
    success_rate_30d: Optional[float]


class AnalyticsSessionResponse(BaseModel):
    by_day: List[DailySessionStat]
    avg_duration_7d: Optional[float]
    total_sessions_7d: int
    anon_sessions_7d: int
    auth_sessions_7d: int


class AnalyticsSidebarResponse(BaseModel):
    by_menu: List[SidebarUsage]
    by_day: List[DailyCount]


# ── Session / Token Management ──────────────────────────────────

class ActiveSessionItem(BaseModel):
    session_id: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    started_at: datetime
    last_seen_at: datetime
    duration_seconds: int


class RefreshTokenItem(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    expires_at: datetime
    revoked: bool
    created_at: datetime


class PaginatedTokensResponse(BaseModel):
    items: List[RefreshTokenItem]
    total: int
    page: int
    size: int
    pages: int


# ── User Detail / History ──────────────────────────────────────

class UserLoginHistoryItem(BaseModel):
    id: int
    method: str
    success: bool
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    login_at: datetime


class UserSessionItem(BaseModel):
    session_id: str
    started_at: datetime
    last_seen_at: datetime
    duration_seconds: int
    ip_address: Optional[str] = None
    ended: bool


class UserDetailResponse(BaseModel):
    user: UserAdminResponse
    login_count: int
    last_10_logins: List[UserLoginHistoryItem]
    recent_sessions: List[UserSessionItem]
    total_search_count: int
    total_stock_click_count: int
    active_token_count: int


# ── Role Management ────────────────────────────────────────────

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    user_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateRoleRequest(BaseModel):
    description: Optional[str] = None
