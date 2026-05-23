"""Pydantic schemas for the Stock List module."""

from typing import List, Optional

from pydantic import BaseModel, Field


# ── Request schemas ────────────────────────────────────────────────

class TrackStockClickRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, description="Mã cổ phiếu")
    session_id: str = Field(default="anonymous", max_length=64)


class TrackStockSearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255, description="Từ khóa tìm kiếm")
    session_id: str = Field(default="anonymous", max_length=64)


# ── Response schemas ───────────────────────────────────────────────

class StockOverviewItem(BaseModel):
    """Một dòng trong bảng tổng quan cổ phiếu."""
    ticker: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    exchange: Optional[str] = None
    current_price: Optional[float] = None
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    volume: Optional[int] = None
    avg_volume_10d: Optional[int] = None
    market_cap: Optional[float] = None       # VND
    pe: Optional[float] = None
    pb: Optional[float] = None
    eps: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    debt_to_equity: Optional[float] = None
    dividend_yield: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    week_change_52: Optional[float] = None
    sparkline: List[float] = Field(default_factory=list)


class StockOverviewPaginatedResponse(BaseModel):
    data: List[StockOverviewItem]
    total: int = Field(..., description="Tổng số mã cổ phiếu khớp điều kiện")
    page: int
    page_size: int
    total_pages: int
    summary: "MarketSummary"


class MarketSummary(BaseModel):
    total_stocks: int = 0
    total_up: int = 0
    total_down: int = 0
    total_unchanged: int = 0
    total_volume: int = 0
    avg_pe: Optional[float] = None


class SectorItem(BaseModel):
    name: str
    count: int


class MostViewedStock(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    click_count: int


class HotStockSearchItem(BaseModel):
    keyword: str
    search_count: int


class TrackResponse(BaseModel):
    success: bool = True
    message: str = "OK"


# ── Screener schemas ──────────────────────────────────────────────

class ScreenerItem(BaseModel):
    """Một dòng trong bộ lọc cổ phiếu — camelCase cho FE."""
    ticker: str
    companyName: Optional[str] = None
    sector: Optional[str] = None
    sector2: Optional[str] = None
    exchange: Optional[str] = None
    tradingDate: Optional[str] = None
    openPrice: Optional[float] = None
    highPrice: Optional[float] = None
    lowPrice: Optional[float] = None
    closePrice: Optional[float] = None
    currentPrice: Optional[float] = None
    priceChange: Optional[float] = None
    priceChangePercent: Optional[float] = None
    volume: Optional[int] = None
    avgVolume10d: Optional[int] = None
    marketCap: Optional[float] = None        # tỷ VND
    pe: Optional[float] = None
    pb: Optional[float] = None
    eps: Optional[float] = None              # VND
    roe: Optional[float] = None              # %
    roa: Optional[float] = None              # %
    debtToEquity: Optional[float] = None
    dividendYield: Optional[float] = None    # %
    revenueGrowth: Optional[float] = None    # %
    profitGrowth: Optional[float] = None     # %
    foreignOwnership: Optional[float] = None # %
    foreignNetBuy: Optional[float] = None    # tỷ VND
    weekChange52: Optional[float] = None     # %
    high52w: Optional[float] = None          # VND
    low52w: Optional[float] = None           # VND
    beta: Optional[float] = None
    rsi14: Optional[float] = None
    macdSignal: Optional[str] = None
    ma20Trend: Optional[str] = None
    signal: Optional[str] = None
    sparkline: List[float] = Field(default_factory=list)


class ScreenerResponse(BaseModel):
    data: List[ScreenerItem]
    total: int


# Update forward refs
StockOverviewPaginatedResponse.model_rebuild()
