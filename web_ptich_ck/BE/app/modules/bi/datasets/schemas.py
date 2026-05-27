from pydantic import BaseModel, ConfigDict
import uuid
from typing import List, Dict, Any
from datetime import datetime

class DatasetBase(BaseModel):
    name: str
    description: str | None = None
    query_id: uuid.UUID | None = None
    data_source_id: uuid.UUID | None = None
    refresh_mode: str = 'live'
    cache_ttl_seconds: int = 300

class DatasetCreate(DatasetBase):
    workspace_id: uuid.UUID
    columns_schema: List[Dict[str, Any]] = []

class DatasetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    query_id: uuid.UUID | None = None
    data_source_id: uuid.UUID | None = None
    refresh_mode: str | None = None
    cache_ttl_seconds: int | None = None
    columns_schema: List[Dict[str, Any]] | None = None

class DatasetResponse(DatasetBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    columns_schema: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DatasetPreviewResponse(BaseModel):
    columns: List[Dict[str, str]]
    rows: List[Dict[str, Any]]
    error: str | None = None

class ExcelImportRequest(BaseModel):
    workspace_id: uuid.UUID
    data_source_id: uuid.UUID
    dataset_name: str
    table_name: str
    database_name: str | None = None
    schema_name: str | None = None
    columns: List[Dict[str, Any]]
    rows: List[Dict[str, Any]]
