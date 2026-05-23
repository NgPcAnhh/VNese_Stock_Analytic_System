from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ── 0. Ticker Slide ────────────────────────────────────────────────
class TickerSlideItem(BaseModel):
    symbol: str = Field(..., description="Mã cổ phiếu hoặc chỉ số")
    price: float = Field(..., description="Giá hiện tại / giá trị chỉ số")
    change: float = Field(..., description="Thay đổi tuyệt đối so với phiên trước")
    percent: float = Field(..., description="Thay đổi phần trăm")
    category: Literal["index", "gainer", "loser"] = Field(
        ..., description="Phân loại: index / gainer / loser"
    )


# ── 1. Market Index Cards ──────────────────────────────────────────
class MarketIndexCard(BaseModel):
    id: str = Field(..., description="Ticker code, e.g. VNINDEX")
    tradingDate: Optional[str] = Field(None, description="Latest trading date YYYY-MM-DD")
    name: str = Field(..., description="Display name, e.g. VN-INDEX")
    value: float = Field(..., description="Latest close price / index value")
    change: float = Field(..., description="Absolute change vs previous session")
    percent: float = Field(..., description="Percent change vs previous session")
    status: Literal["up", "down", "unchanged"]


# ── 2. OHLCV Data (market chart) ──────────────────────────────────
class OHLCVData(BaseModel):
    date: str = Field(..., description="Trading date YYYY-MM-DD")
    open: float
    high: float
    low: float
    close: float
    volume: int


class PaginationMeta(BaseModel):
    ticker: str
    period: str
    total: int = Field(..., description="Tổng số bản ghi")
    page: int
    page_size: int
    total_pages: int


class OHLCVPaginatedResponse(BaseModel):
    data: List[OHLCVData]
    meta: PaginationMeta


# ── 3. Sector Performance ─────────────────────────────────────────
class SectorPerformanceItem(BaseModel):
    name: str = Field(..., description="Sector name (icb_name2)")
    value: float = Field(..., description="Average % change of stocks in sector")


# ── 4. Market Comparison (international indices) ───────────────────
class MarketComparisonItem(BaseModel):
    name: str = Field(..., description="Index name")
    price: float = Field(..., description="Latest close value")
    change: float = Field(..., description="Percent change")
    status: Literal["up", "down", "unchanged"]


# ── 5. Market Breadth ─────────────────────────────────────────────
class MarketBreadthData(BaseModel):
    advancing: int = Field(..., description="Number of stocks that went up")
    declining: int = Field(..., description="Number of stocks that went down")
    unchanged: int = Field(..., description="Number of stocks unchanged")


# ── 6. Top Stocks ─────────────────────────────────────────────────
class TopStockItem(BaseModel):
    symbol: str
    price: float
    change: float = Field(..., description="Percent change")
    volume: str = Field(..., description="Formatted volume, e.g. '2.5M'")
    percent: Optional[float] = Field(None, description="Percent change (alias)")
    foreignBuy: Optional[int] = Field(None, description="Foreign buy volume")
    foreignSell: Optional[int] = Field(None, description="Foreign sell volume")
    netVolume: Optional[int] = Field(None, description="Net foreign volume")
    side: Optional[Literal["net_buy", "net_sell"]] = Field(
        None, description="Side: net_buy or net_sell (foreign only)"
    )


class TopStocksAllResponse(BaseModel):
    """Unified response for all 3 categories — fetched in 1 API call."""
    gainers: List[TopStockItem]
    losers: List[TopStockItem]
    foreign: List[TopStockItem]


# ── 7. Market Heatmap ─────────────────────────────────────────────
class HeatmapStock(BaseModel):
    name: str = Field(..., description="Ticker")
    value: float = Field(..., description="Market-cap proxy or total_value")
    pChange: float = Field(..., description="Percent price change")
    volume: int


class HeatmapSector(BaseModel):
    name: str = Field(..., description="Sector name")
    children: List[HeatmapStock]


# ── 8. Macro Data ─────────────────────────────────────────────────
class MacroIndicatorItem(BaseModel):
    name: str
    price: float = Field(..., description="Latest value")
    change: float = Field(..., description="Absolute change")
    changePct: float = Field(..., description="Percent change")
    sparklines: Dict[str, List[float]] = Field(
        ..., description='Sparkline data keyed by "1m","3m","6m","1y"'
    )


# ── 9. News ───────────────────────────────────────────────────────
class NewsItem(BaseModel):
    id: int
    title: Optional[str] = None
    source: Optional[str] = None
    published: Optional[str] = None
    summary: Optional[str] = None
    link: Optional[str] = None


# ── 10. Valuation P/E ─────────────────────────────────────────────
class ValuationPoint(BaseModel):
    month: str = Field(..., description="Label, e.g. 'Q1/2025'")
    value: float = Field(..., description="Average P/E ratio")


# ── 11. Liquidity ─────────────────────────────────────────────────
class LiquidityPoint(BaseModel):
    date: str = Field(..., description="Trading date dd/mm")
    value: float = Field(..., description="Total trading value in billions VND")


# ── 12. Macro Yearly (vn_macro_yearly) ───────────────────────────
class MacroYearlyIndicator(BaseModel):
    key: str = Field(..., description="Column name in DB")
    label: str = Field(..., description="Human-readable label")
    values: List[Optional[float]] = Field(..., description="Values per year; None = N/A")


class MacroYearlyResponse(BaseModel):
    years: List[int]
    indicators: List[MacroYearlyIndicator]
