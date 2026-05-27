from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class DataSourceBase(BaseModel):
    name: str
    type: str
    host: str | None = None
    port: int | None = None
    database_name: str | None = None
    username: str | None = None
    ssl_config: dict | None = None
    extra_config: dict | None = None

class DataSourceCreate(DataSourceBase):
    workspace_id: uuid.UUID
    password: str | None = None

class DataSourceUpdate(DataSourceBase):
    password: str | None = None

class DataSourceResponse(DataSourceBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TestConnectionRequest(BaseModel):
    type: str
    host: str
    port: int | None = None
    database_name: str | None = None
    username: str | None = None
    password: str | None = None
    
class TestConnectionResponse(BaseModel):
    success: bool
    message: str | None = None

class ColumnMetadata(BaseModel):
    name: str
    type: str

class TableMetadata(BaseModel):
    name: str
    columns: list[ColumnMetadata]

class SchemaMetadata(BaseModel):
    name: str
    tables: list[TableMetadata]

class DatabaseMetadataResponse(BaseModel):
    database: str
    schemas: list[SchemaMetadata]

class DatabasesResponse(BaseModel):
    databases: list[str]
