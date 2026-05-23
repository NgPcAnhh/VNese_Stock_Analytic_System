"""Pydantic response schemas for the Stock module."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── 1. Stock Overview (Mega endpoint) ─────────────────────────────

class StockMetrics(BaseModel):
    marketCap: str = ""
    marketCapRank: int = 0
    volume: str = ""
    pe: str = ""
    peRank: int = 0
    eps: str = ""
    pb: str = ""
    evEbitda: str = ""
    outstandingShares: str = ""
    roe: str = ""


class StockEvaluation(BaseModel):
    risk: str = "Trung bình"
    valuation: str = "Trung bình"
    fundamentalAnalysis: str = "Trung bình"
    technicalAnalysis: str = "Trung bình"


class StockInfo(BaseModel):
    ticker: str
    exchange: str = ""
    companyName: str = ""
    companyNameFull: str = ""
    logoUrl: str = ""
    tags: List[str] = Field(default_factory=list)
    website: str = ""
    currentPrice: float = 0
    priceChange: float = 0
    priceChangePercent: float = 0
    dayLow: float = 0
    dayHigh: float = 0
    referencePrice: float = 0
    ceilingPrice: float = 0
    floorPrice: float = 0
    metrics: StockMetrics = Field(default_factory=StockMetrics)
    evaluation: StockEvaluation = Field(default_factory=StockEvaluation)


class PriceHistoryItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class OrderBookItem(BaseModel):
    time: str
    volume: int
    price: float
    side: str
    change: float


class HistoricalDataItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    change: float
    changePercent: float
    volume: int


class Shareholder(BaseModel):
    name: str
    role: str = ""
    shares: str = "0"
    percentage: float = 0


class PeerStock(BaseModel):
    ticker: str
    price: float = 0
    priceChange: float = 0
    priceChangePercent: float = 0
    volume: int = 0
    sparklineData: List[float] = Field(default_factory=list)


class NewsArticle(BaseModel):
    id: str
    title: str
    time: str = ""
    ticker: str = ""


class RecommendedStock(BaseModel):
    ticker: str
    exchange: str = ""
    companyName: str = ""
    logoUrl: str = ""
    price: float = 0
    priceChange: float = 0
    priceChangePercent: float = 0
    marketCap: str = ""
    volume: str = ""
    pe: str = ""
    chartData: List[float] = Field(default_factory=list)


class StockOverviewResponse(BaseModel):
    stockInfo: StockInfo
    priceHistory: List[PriceHistoryItem]
    orderBook: List[OrderBookItem]
    historicalData: List[HistoricalDataItem]
    shareholders: List[Shareholder]
    shareholderStructure: Dict[str, float]
    peerStocks: List[PeerStock]
    corporateNews: List[NewsArticle]
    recommendations: List[RecommendedStock]


# ── 2. Financial Ratios ──────────────────────────────────────────

class FinancialRatioItem(BaseModel):
    year: int
    quarter: int
    pe: Optional[float] = None
    pb: Optional[float] = None
    ps: Optional[float] = None
    eps: Optional[float] = None
    bvps: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    roic: Optional[float] = None
    grossMargin: Optional[float] = None
    netMargin: Optional[float] = None
    ebitMargin: Optional[float] = None
    debtToEquity: Optional[float] = None
    currentRatio: Optional[float] = None
    quickRatio: Optional[float] = None
    cashRatio: Optional[float] = None
    interestCoverageRatio: Optional[float] = None
    assetTurnover: Optional[float] = None
    inventoryTurnover: Optional[float] = None
    receivableDays: Optional[float] = None
    inventoryDays: Optional[float] = None
    payableDays: Optional[float] = None
    cashConversionCycle: Optional[float] = None
    evEbitda: Optional[float] = None
    dividendYield: Optional[float] = None
    marketCap: Optional[float] = None
    outstandingShares: Optional[float] = None
    pCashflow: Optional[float] = None


# ── 3. Financial Reports (IS, BS, CF) ────────────────────────────

class FinancialPeriod(BaseModel):
    period: str       # "Q4/2025"
    year: int
    quarter: int


class IncomeStatementItem(BaseModel):
    period: FinancialPeriod
    revenue: Optional[float] = 0
    costOfGoodsSold: Optional[float] = 0
    grossProfit: Optional[float] = 0
    sellingExpenses: Optional[float] = 0
    adminExpenses: Optional[float] = 0
    operatingProfit: Optional[float] = 0
    financialIncome: Optional[float] = 0
    financialExpenses: Optional[float] = 0
    interestExpenses: Optional[float] = 0
    profitBeforeTax: Optional[float] = 0
    incomeTax: Optional[float] = 0
    netProfit: Optional[float] = 0
    netProfitParent: Optional[float] = 0
    eps: Optional[float] = 0


class BalanceSheetItem(BaseModel):
    period: FinancialPeriod
    totalAssets: Optional[float] = 0
    currentAssets: Optional[float] = 0
    cash: Optional[float] = 0
    shortTermInvestments: Optional[float] = 0
    shortTermReceivables: Optional[float] = 0
    inventory: Optional[float] = 0
    nonCurrentAssets: Optional[float] = 0
    fixedAssets: Optional[float] = 0
    longTermInvestments: Optional[float] = 0
    totalLiabilities: Optional[float] = 0
    currentLiabilities: Optional[float] = 0
    longTermLiabilities: Optional[float] = 0
    totalEquity: Optional[float] = 0
    charterCapital: Optional[float] = 0
    retainedEarnings: Optional[float] = 0
    totalLiabilitiesAndEquity: Optional[float] = 0


class CashFlowItem(BaseModel):
    period: FinancialPeriod
    operatingCashFlow: Optional[float] = 0
    profitBeforeTax: Optional[float] = 0
    depreciationAmortization: Optional[float] = 0
    provisionsAndReserves: Optional[float] = 0
    workingCapitalChanges: Optional[float] = 0
    interestPaid: Optional[float] = 0
    incomeTaxPaid: Optional[float] = 0
    investingCashFlow: Optional[float] = 0
    purchaseOfFixedAssets: Optional[float] = 0
    proceedsFromDisposal: Optional[float] = 0
    investmentInSubsidiaries: Optional[float] = 0
    financingCashFlow: Optional[float] = 0
    proceedsFromBorrowing: Optional[float] = 0
    repaymentOfBorrowing: Optional[float] = 0
    dividendsPaid: Optional[float] = 0
    proceedsFromEquity: Optional[float] = 0
    netCashChange: Optional[float] = 0
    beginningCash: Optional[float] = 0
    endingCash: Optional[float] = 0


class FinancialReportsResponse(BaseModel):
    incomeStatement: List[IncomeStatementItem]
    balanceSheet: List[BalanceSheetItem]
    cashFlow: List[CashFlowItem]


# ── 4. Company Profile ───────────────────────────────────────────

class CompanyOverview(BaseModel):
    ticker: str
    companyName: str = ""
    companyNameFull: str = ""
    exchange: str = ""
    industry: str = ""
    subIndustry: str = ""
    sector: str = ""
    description: str = ""
    taxCode: str = ""
    charterCapital: Optional[float] = None
    outstandingShares: Optional[float] = None
    website: str = ""


class EventItem(BaseModel):
    title: str
    date: str = ""
    source: str = ""
    category: str = ""


class CompanyProfileResponse(BaseModel):
    overview: CompanyOverview
    shareholders: List[Shareholder]
    events: List[EventItem]
    dividendHistory: List[Dict[str, Any]] = Field(default_factory=list)


# ── 5. Stock Comparison ──────────────────────────────────────────

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


# ── 6. Deep Analysis ─────────────────────────────────────────────

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


# ── 7. Quant Analysis ────────────────────────────────────────────

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


# ── 8. Valuation ─────────────────────────────────────────────────

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
