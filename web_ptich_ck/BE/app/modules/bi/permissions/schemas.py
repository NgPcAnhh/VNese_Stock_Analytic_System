"""Schemas cho ChartPermission API."""
from typing import List, Optional
import uuid
from pydantic import BaseModel


class PermissionUserInfo(BaseModel):
    user_id: int
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ChartPermissionResponse(BaseModel):
    chart_id: uuid.UUID
    permitted_users: List[PermissionUserInfo]

    model_config = {"from_attributes": True}


class SetPermissionsRequest(BaseModel):
    user_ids: List[int]  # Danh sách user_ids được phép xem chart


class BatchSetPermissionsRequest(BaseModel):
    chart_ids: List[uuid.UUID]  # Nhiều chart cùng lúc
    user_ids: List[int]         # Gán cùng danh sách user cho tất cả chart trên


class DashboardPermissionsResponse(BaseModel):
    dashboard_id: uuid.UUID
    permissions: dict  # { chart_id (str): [user_id1, user_id2, ...] }
