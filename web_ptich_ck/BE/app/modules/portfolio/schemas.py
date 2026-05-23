from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

class PositionInput(BaseModel):
    ticker: str
    qty: int
    avg_cost: float
    buy_date: Optional[date] = None

class CreatePortfolioRequest(BaseModel):
    name: str
    risk_profile: str = Field(..., description="conservative/balanced/growth/aggressive")
    benchmark: str = "VNINDEX"
    positions: List[PositionInput] = []

class PortfolioPositionResponse(BaseModel):
    id: int
    portfolio_id: int
    ticker: str
    qty: int
    avg_cost: float
    buy_date: Optional[date]
    sector: Optional[str]
    exchange: Optional[str]

class PortfolioListResponse(BaseModel):
    id: int
    name: str
    risk_profile: str
    benchmark: str
    created_at: datetime

class PortfolioResponse(BaseModel):
    id: int
    name: str
    risk_profile: str
    benchmark: str
    created_at: datetime
    positions: List[PortfolioPositionResponse] = []

class RiskSnapshotResponse(BaseModel):
    portfolio_id: int
    date: date
    nav: float
    daily_return: float
    var_95_1d: float
    cvar_95: float
    beta: float
    sharpe: float
    sortino: float
    max_drawdown: float
    current_drawdown: float
    hhi: float
    liquidity_days: float
