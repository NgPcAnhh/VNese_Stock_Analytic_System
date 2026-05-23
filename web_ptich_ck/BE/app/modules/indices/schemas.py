"""Pydantic schemas for the Indices module."""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ── 1. Macro Economy (Market Indices) ──────────────────────────────
class MarketIndexHistoryPoint(BaseModel):
    date: str = Field(..., description="Trading date in YYYY-MM-DD")
    close: float = Field(..., description="Close price on date")


class MarketIndexItem(BaseModel):
    """One row in the market-indices table (macro_economy)."""

    name: str = Field(..., description="Human-readable name, e.g. 'Vàng (XAU)'")
    asset_type: str = Field(..., description="Raw asset_type key from DB")
    flag: str = Field(..., description="Emoji flag / icon")
    sparkline: List[float] = Field(
        default_factory=list,
        description="Last 30 close prices (ASC) for mini chart",
    )
    history: List[MarketIndexHistoryPoint] = Field(
        default_factory=list,
        description="Full close-price history (ASC) for expanded chart",
    )
    value: float = Field(..., description="Latest close price")
    change: float = Field(..., description="Absolute change vs previous day")
    changePercent: float = Field(..., description="Percent change vs previous day")
    week1: float = Field(0, description="7-day percent change")
    ytd: float = Field(0, description="Year-to-date percent change")
    year1: float = Field(0, description="1-year percent change")
    year3: float = Field(0, description="3-year percent change")


class MarketIndicesResponse(BaseModel):
    data: List[MarketIndexItem]


# ── 2. Macro Yearly (vn_macro_yearly) ─────────────────────────────
class MacroYearlyIndicatorItem(BaseModel):
    """One row in the macro-yearly indicators table."""

    name: str = Field(..., description="Human-readable indicator name")
    category: str = Field(..., description="Category grouping")
    value: str = Field(..., description="Latest year value, formatted")
    change: float = Field(0, description="Absolute change vs previous year")
    changePercent: float = Field(0, description="Percent change vs previous year")
    unit: str = Field("", description="Unit label, e.g. '%', 'Tỷ USD'")
    period: str = Field("", description="Period label, e.g. '2024'")
    previousValue: str = Field("", description="Previous year value, formatted")
    trend: str = Field("stable", description="'up' | 'down' | 'stable'")


class MacroYearlyTableResponse(BaseModel):
    data: List[MacroYearlyIndicatorItem]
