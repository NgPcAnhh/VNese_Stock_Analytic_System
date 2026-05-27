from pydantic import BaseModel, ConfigDict
import uuid
from typing import List, Dict, Any
from datetime import datetime

class DashboardItemLayout(BaseModel):
    chart_id: uuid.UUID
    x: int
    y: int
    w: int
    h: int
    config: Dict[str, Any] = {}

class DashboardBase(BaseModel):
    name: str
    description: str | None = None
    status: str = 'draft'
    global_filters: List[Dict[str, Any]] | None = []
    theme_config: Dict[str, Any] | None = {}
    widgets: List[Dict[str, Any]] | None = []

class DashboardCreate(DashboardBase):
    workspace_id: uuid.UUID

class DashboardUpdateRequest(BaseModel):
    name: str
    description: str | None = None
    items: List[DashboardItemLayout]
    global_filters: List[Dict[str, Any]] | None = []
    theme_config: Dict[str, Any] | None = {}
    widgets: List[Dict[str, Any]] | None = []

class DashboardItemResponse(DashboardItemLayout):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class DashboardResponse(DashboardBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None
    items: List[DashboardItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
