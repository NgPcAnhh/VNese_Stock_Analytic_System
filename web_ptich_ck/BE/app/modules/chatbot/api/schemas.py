from typing import Literal, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    mode: Literal["auto", "search", "analysis"] = "auto"
    model_choice: str = "1"
    context: dict[str, Any] = Field(default_factory=dict)


class DataTable(BaseModel):
    title: str
    rows: list[dict]


class ChatResponse(BaseModel):
    mode_used: str
    action_required: str | None = None
    answer: str
    thought_process: str | None = None
    data_tables: list[DataTable] = Field(default_factory=list)
    citations: list[dict] = Field(default_factory=list)
    sql_used: list[str] = Field(default_factory=list)
    confidence: float | None = None
    data_freshness: str | None = None
    trace_id: str | None = None


class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    meta: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: int | None
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetailResponse(ChatSessionResponse):
    messages: list[ChatMessageResponse] = Field(default_factory=list)