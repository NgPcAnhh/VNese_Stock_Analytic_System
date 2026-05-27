from pydantic import BaseModel, ConfigDict
import uuid
from typing import Dict, Any
from datetime import datetime

class ChartBase(BaseModel):
    name: str
    description: str | None = None
    dataset_id: uuid.UUID
    chart_type: str
    encodings: Dict[str, Any] | None = {}
    echarts_option: Dict[str, Any] | None = {}
    transform_config: Dict[str, Any] | None = {}

class ChartCreate(ChartBase):
    workspace_id: uuid.UUID

class ChartResponse(ChartBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
