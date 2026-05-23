from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AlertCreateRequest(BaseModel):
    ticker: str = Field(..., max_length=20)
    condition_type: str = Field(..., max_length=20) # GREATER_THAN or LESS_THAN
    target_price: float
    session_id: str = Field(default="anonymous", max_length=64)

class AlertResponse(BaseModel):
    id: int
    ticker: str
    condition_type: str
    target_price: float
    status: str
    created_at: datetime
    triggered_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AlertUpdateRequest(BaseModel):
    condition_type: Optional[str] = Field(default=None, max_length=20)
    target_price: Optional[float] = None
    status: Optional[str] = Field(default=None, max_length=20)


class AlertActionResponse(BaseModel):
    success: bool
    message: str
