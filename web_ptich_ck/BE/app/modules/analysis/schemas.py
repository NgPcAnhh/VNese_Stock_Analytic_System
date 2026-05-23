"""Pydantic response schemas for the Analysis module (endpoints 6–9)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# Import PriceHistoryItem from stock schemas (used by ComparisonStock)
from app.modules.stock.schemas import PriceHistoryItem


# ── 6. Stock Comparison ──────────────────────────────────────────

class ComparisonStock(BaseModel):
    ticker: str
    companyName: str = ""
    exchange: str = ""
    price: float = 0
    priceChange: float = 0
    priceChangePercent: float = 0
    pe: Optional[float] = None
    pb: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    grossMargin: Optional[float] = None
    netMargin: Optional[float] = None
    debtToEquity: Optional[float] = None
    marketCap: Optional[float] = None
    eps: Optional[float] = None
    dividendYield: Optional[float] = None
    priceHistory: List[PriceHistoryItem] = Field(default_factory=list)


class ComparisonResponse(BaseModel):
    main: ComparisonStock
    peers: List[ComparisonStock]


# ── 7. Deep Analysis ─────────────────────────────────────────────

class OverviewStat(BaseModel):
    label: str
    value: str
    subLabel: str = ""
    trend: str = ""  # "up" | "down" | "neutral"


class HealthIndicator(BaseModel):
    name: str
    value: float
    status: str  # "good" | "warning" | "danger"
    description: str = ""
    threshold: str = ""


class TrendYear(BaseModel):
    year: int
    totalAssets: Optional[float] = None
    currentAssets: Optional[float] = None
    nonCurrentAssets: Optional[float] = None
    totalLiabilities: Optional[float] = None
    currentLiabilities: Optional[float] = None
    longTermLiabilities: Optional[float] = None
    equity: Optional[float] = None
    revenue: Optional[float] = None
    grossProfit: Optional[float] = None
    netProfit: Optional[float] = None
    operatingCashFlow: Optional[float] = None
    investingCashFlow: Optional[float] = None
    financingCashFlow: Optional[float] = None


class DuPontFactor(BaseModel):
    name: str
    value: float
    prior: Optional[float] = None


class BalanceSheetAnalysis(BaseModel):
    overviewStats: List[OverviewStat]
    healthIndicators: List[HealthIndicator]
    trends: List[TrendYear]
    leverageData: List[Dict[str, Any]] = Field(default_factory=list)
    liquidityData: List[Dict[str, Any]] = Field(default_factory=list)


class IncomeAnalysis(BaseModel):
    overviewStats: List[OverviewStat]
    dupont: List[DuPontFactor]
    marginTrends: List[Dict[str, Any]]
    costStructure: List[Dict[str, Any]]
    growthData: List[Dict[str, Any]]
    revenueBreakdown: List[Dict[str, Any]] = Field(default_factory=list)


class CashFlowAnalysis(BaseModel):
    overviewStats: List[OverviewStat]
    efficiencyMetrics: List[Dict[str, Any]]
    selfFundingData: List[Dict[str, Any]]
    earningsQuality: List[Dict[str, Any]]
    trends: List[TrendYear]
    waterfall: List[Dict[str, Any]] = Field(default_factory=list)


class DeepAnalysisResponse(BaseModel):
    balanceSheet: BalanceSheetAnalysis
    incomeStatement: IncomeAnalysis
    cashFlow: CashFlowAnalysis


# ── 8. Quant Analysis ────────────────────────────────────────────

class QuantKPI(BaseModel):
    label: str
    value: float
    suffix: str = ""


class QuantAnalysisResponse(BaseModel):
    kpis: List[QuantKPI]
    wealthIndex: List[Dict[str, Any]]
    monthlyReturns: List[Dict[str, Any]]
    drawdownData: List[Dict[str, Any]]
    rollingVolatility: List[Dict[str, Any]]
    histogram: List[Dict[str, Any]]
    rollingSharpe: List[Dict[str, Any]]
    varData: Dict[str, Any]
    radarMetrics: List[Dict[str, Any]]
    monteCarlo: Dict[str, Any]


# ── 9. Valuation ─────────────────────────────────────────────────

class ValuationSummary(BaseModel):
    intrinsicValue: float = 0
    currentPrice: float = 0
    upside: float = 0
    methods: List[Dict[str, Any]] = Field(default_factory=list)


class DCFModel(BaseModel):
    wacc: float = 0
    terminalGrowth: float = 0
    projections: List[Dict[str, Any]] = Field(default_factory=list)
    sensitivityMatrix: List[List[float]] = Field(default_factory=list)
    intrinsicValue: float = 0


class PEPBBand(BaseModel):
    dates: List[str]
    prices: List[float]
    highBand: List[float]
    midBand: List[float]
    lowBand: List[float]
    avgBand: List[float]


class PeerValuationItem(BaseModel):
    ticker: str
    companyName: str = ""
    pe: Optional[float] = None
    pb: Optional[float] = None
    evEbitda: Optional[float] = None
    roe: Optional[float] = None
    marketCap: Optional[float] = None


class ValuationResponse(BaseModel):
    summary: ValuationSummary
    dcf: DCFModel
    ddm: Dict[str, Any] = Field(default_factory=dict)
    peBand: PEPBBand = Field(default_factory=lambda: PEPBBand(dates=[], prices=[], highBand=[], midBand=[], lowBand=[], avgBand=[]))
    pbBand: PEPBBand = Field(default_factory=lambda: PEPBBand(dates=[], prices=[], highBand=[], midBand=[], lowBand=[], avgBand=[]))
    peerValuation: List[PeerValuationItem] = Field(default_factory=list)
    footballField: List[Dict[str, Any]] = Field(default_factory=list)
