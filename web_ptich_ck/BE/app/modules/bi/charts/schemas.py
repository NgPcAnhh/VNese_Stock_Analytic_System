from pydantic import BaseModel, ConfigDict
import uuid
from typing import Dict, Any, List, Optional
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


# ── AI Chart Code Generation ────────────────────────────────────────

class ColumnSchema(BaseModel):
    name: str
    type: str = "unknown"


class AiCodeGenRequest(BaseModel):
    prompt: str
    columns: List[ColumnSchema] = []
    sample_rows: List[Dict[str, Any]] = []
    current_code: Optional[str] = None  # None = first gen, str = incremental


class AiCodeGenResponse(BaseModel):
    code: str
    is_first_gen: bool
