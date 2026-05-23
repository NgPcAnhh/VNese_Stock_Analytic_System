"""Pydantic response schemas for the Market module."""
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ── 1. Market Heatmap ─────────────────────────────────────────────
class HeatmapStock(BaseModel):
    name: str = Field(..., description="Ticker")
    value: float = Field(..., description="Trade value proxy (price * vol / 1e6)")
    pChange: float = Field(..., description="Percent price change")
    volume: int


class HeatmapSector(BaseModel):
    name: str = Field(..., description="Sector name (icb_name2)")
    children: List[HeatmapStock]


# ── 2. Cash Flow Distribution ─────────────────────────────────────
class CashFlowData(BaseModel):
    advancingValue: float = Field(..., description="Total value of advancing stocks (tỷ VND)")
    unchangedValue: float = Field(..., description="Total value of unchanged stocks (tỷ VND)")
    decliningValue: float = Field(..., description="Total value of declining stocks (tỷ VND)")
    advancingCount: int = Field(..., description="Number of advancing stocks")
    unchangedCount: int = Field(..., description="Number of unchanged stocks")
    decliningCount: int = Field(..., description="Number of declining stocks")


# ── 3. Index Impact ───────────────────────────────────────────────
class IndexImpactItem(BaseModel):
    ticker: str
    impact: float = Field(..., description="Contribution to index change (points)")


# ── 4. Foreign Flow ───────────────────────────────────────────────
class ForeignFlowItem(BaseModel):
    date: str = Field(..., description="Trading date dd/MM")
    netVal: float = Field(..., description="Net foreign value in tỷ VND")


# ── 5. Sector Overview ────────────────────────────────────────────
class SectorOverviewItem(BaseModel):
    name: str = Field(..., description="Sector name (icb_name2)")
    change: float = Field(..., description="Average % change")
    volume: int = Field(..., description="Total volume")
    value: float = Field(..., description="Total trade value in tỷ VND")
    cashFlow: float = Field(..., description="Net cash flow proxy in tỷ VND")


# ── 6. Sector Analysis Table ──────────────────────────────────────
class SectorAnalysisItem(BaseModel):
    name: str
    stockCount: int
    marketCap: str = Field(..., description="Formatted market cap, e.g. '3,550,712T'")
    pe: float
    pb: float
    priceChange1D: float
    priceChange7D: float
    priceChangeMTD: float = Field(0.0, description="Month-to-date price change")
    priceChangeYTD: float
    priceChange1Y: float
    priceChange3Y: float


# ── 7. Sector Watchlist ───────────────────────────────────────────
class WatchlistStock(BaseModel):
    symbol: str
    companyName: str = ""
    exchange: str = ""
    price: float
    refPrice: float = 0.0
    priceChange: float = 0.0
    change: float = Field(..., description="Percent change")
    volume: int = 0
    tradeValue: float = 0.0


class WatchlistSector(BaseModel):
    id: str = Field(..., description="Sector slug/id")
    name: str = Field(..., description="Sector display name")
    count: int = Field(..., description="Number of stocks in sector")


class SectorWatchlistData(BaseModel):
    sectors: List[WatchlistSector]
    stocks: Dict[str, List[WatchlistStock]] = Field(
        ..., description="Map: sector_id -> list of stocks"
    )


# ── 8. Sector Detail Dashboard ───────────────────────────────────
class SectorKPI(BaseModel):
    sectorName: str = Field(..., description="Tên ngành gốc")
    rsScore: float = Field(0, description="Relative Strength score 1-99")
    totalTradingValue: float = Field(0, description="Thanh khoản 24H tỷ VND")
    tradingValueVsAvg: float = Field(0, description="So sánh vs SMA20 %")
    mfi: float = Field(0, description="Money Flow Index 0-100")
    marketCap: float = Field(0, description="Vốn hóa ngành tỷ VND")
    netForeign: float = Field(0, description="Khối ngoại net tỷ VND")
    pb: float = Field(0, description="P/B ngành")
    stockCount: int = Field(0, description="Số cổ phiếu")


class SectorPerformancePoint(BaseModel):
    date: str
    sectorReturn: float
    vnindexReturn: float


class BreadthData(BaseModel):
    ceiling: int = 0
    up: int = 0
    ref: int = 0
    down: int = 0
    floor: int = 0


class TreemapStock(BaseModel):
    ticker: str
    marketCap: float
    changePercent: float
    companyName: str = ""


class LiquidityPoint(BaseModel):
    date: str
    tradingValue: float = 0
    netForeign: float = 0


class ValuationStock(BaseModel):
    ticker: str
    pb: float
    roe: float
    marketCap: float
    zone: str = "balanced"


class LiquidityByCapGroup(BaseModel):
    group: str
    value: float


class SectorStockRow(BaseModel):
    ticker: str
    companyName: str = ""
    exchange: str = ""
    price: float = 0
    change1D: float = 0
    volume: int = 0
    tradingValue: float = 0
    foreignBuy: float = 0
    foreignSell: float = 0


class SectorDetailData(BaseModel):
    kpi: SectorKPI
    performance: List[SectorPerformancePoint]
    breadth: BreadthData
    treemap: List[TreemapStock]
    liquidity: List[LiquidityPoint]
    valuation: List[ValuationStock]
    liquidityByCap: List[LiquidityByCapGroup]
    stocks: List[SectorStockRow]
