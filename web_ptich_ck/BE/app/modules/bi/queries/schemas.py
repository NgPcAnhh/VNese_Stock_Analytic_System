from pydantic import BaseModel, ConfigDict
import uuid
from typing import List, Dict, Any
from datetime import datetime

class QueryBase(BaseModel):
    name: str
    description: str | None = None
    sql_text: str
    data_source_id: uuid.UUID
    database_name: str | None = None
    schema_name: str | None = None

class QueryCreate(QueryBase):
    workspace_id: uuid.UUID

class QueryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sql_text: str | None = None
    data_source_id: uuid.UUID | None = None
    database_name: str | None = None
    schema_name: str | None = None

class QueryResponse(QueryBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    parameters_schema: list | None = []
    version: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QueryPreviewRequest(BaseModel):
    data_source_id: uuid.UUID
    sql_text: str
    database: str | None = None
    schema_name: str | None = None
    limit: int | None = 100

class QueryPreviewResponse(BaseModel):
    columns: List[Dict[str, str]]
    rows: List[Dict[str, Any]]
    error: str | None = None
