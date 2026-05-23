"""
SQL queries and business logic for the Analysis module.

Endpoints:
  6. get_stock_comparison — compare ticker vs peers
  7. get_deep_analysis    — BS/IS/CF deep analysis with indicators
  8. get_quant_analysis   — quantitative metrics (Sharpe, VaR, Monte Carlo…)
  9. get_valuation        — DCF, DDM, PE/PB bands, peer valuation
"""
from __future__ import annotations

import asyncio
import logging
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cached

# Import shared constants and helpers from the stock module
from app.modules.stock.logic import (
    SCHEMA,
    _STMT_TIMEOUT,
    IS_CODES,
    BS_CODES,
    CF_CODES,
    _fmt_market_cap,
    _safe_float,
    _safe_int,
    _safe_round,
    _query_price_history,
)

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# 6. Stock Comparison
# ────────────────────────────────────────────────────────────────────
@cached("stock:compare", ttl=300)
async def get_stock_comparison(
    db: AsyncSession, ticker: str = "VIC", peers: str = ""
) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Resolve peer list — if not provided, use same sector
    if peers:
        peer_list = [p.strip().upper() for p in peers.split(",") if p.strip()]
    else:
        # Auto-detect peers from same sector
        sql = text(f"""
            WITH sector AS (
                SELECT icb_name2 FROM {SCHEMA}.company_overview
                WHERE ticker = :ticker LIMIT 1
            )
            SELECT ticker FROM {SCHEMA}.company_overview
            WHERE icb_name2 = (SELECT icb_name2 FROM sector)
              AND ticker != :ticker
            LIMIT 5
        """)
        res = await db.execute(sql, {"ticker": ticker})
        peer_list = [r["ticker"] for r in res.mappings().all()]

    all_tickers = [ticker] + peer_list

    # Fetch latest ratio + price for all tickers at once
    sql = text(f"""
        WITH latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, pe, pb, roe, roa, gross_margin, net_margin,
                debt_to_equity, market_cap, eps, dividend_yield
            FROM {SCHEMA}.financial_ratio
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker, year DESC, quarter DESC
        ),
        latest_hp AS (
            SELECT DISTINCT ON (ticker)
                ticker, close, trading_date
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers) AND close IS NOT NULL
            ORDER BY ticker, trading_date DESC
        ),
        latest_eb AS (
            SELECT DISTINCT ON (ticker)
                ticker, ref_price, match_price
            FROM {SCHEMA}.electric_board
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker, trading_date DESC
        )
        SELECT
            hp.ticker,
            co.organ_short_name AS company_name,
            co.exchange,
            COALESCE(eb.match_price, hp.close) AS price,
            COALESCE(eb.ref_price, hp.close) AS ref_price,
            fr.pe, fr.pb, fr.roe, fr.roa,
            fr.gross_margin, fr.net_margin,
            fr.debt_to_equity, fr.market_cap,
            fr.eps, fr.dividend_yield
        FROM latest_hp hp
        JOIN {SCHEMA}.company_overview co ON co.ticker = hp.ticker
        LEFT JOIN latest_fr fr ON fr.ticker = hp.ticker
        LEFT JOIN latest_eb eb ON eb.ticker = hp.ticker
    """)
    res = await db.execute(sql, {"tickers": all_tickers})
    rows = {r["ticker"]: dict(r) for r in res.mappings().all()}

    def _build_comparison(t: str) -> Dict:
        r = rows.get(t, {})
        price = _safe_float(r.get("price"))
        ref = _safe_float(r.get("ref_price"))
        change = price - ref if ref > 0 else 0
        change_pct = (change / ref * 100) if ref > 0 else 0
        return {
            "ticker": t,
            "companyName": r.get("company_name", ""),
            "exchange": r.get("exchange", ""),
            "price": price,
            "priceChange": round(change, 2),
            "priceChangePercent": round(change_pct, 2),
            "pe": _safe_round(r.get("pe")),
            "pb": _safe_round(r.get("pb")),
            "roe": _safe_round(r.get("roe")),
            "roa": _safe_round(r.get("roa")),
            "grossMargin": _safe_round(r.get("gross_margin")),
            "netMargin": _safe_round(r.get("net_margin")),
            "debtToEquity": _safe_round(r.get("debt_to_equity")),
            "marketCap": _safe_round(r.get("market_cap")),
            "eps": _safe_round(r.get("eps")),
            "dividendYield": _safe_round(r.get("dividend_yield")),
            "priceHistory": [],
        }

    main_data = _build_comparison(ticker)
    peers_data = [_build_comparison(t) for t in peer_list if t in rows]

    return {"main": main_data, "peers": peers_data}


# ────────────────────────────────────────────────────────────────────
# 7. Deep Analysis (Balance Sheet, Income Statement, Cash Flow)
# ────────────────────────────────────────────────────────────────────
@cached("stock:deep", ttl=300)
async def get_deep_analysis(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Fetch financial data for deep analysis (last 5 years annual)
    reports_res, ratios_res = await asyncio.gather(
        _query_annual_bctc(db, ticker, years=5),
        _query_annual_ratios(db, ticker, years=5),
    )

    reports = reports_res  # {(year, quarter): {ind_code: value}}
    ratios = ratios_res    # [{year, quarter, ...cols}]

    # ── Balance Sheet Analysis ──
    bs_analysis = _build_bs_analysis(reports, ratios)

    # ── Income Statement Analysis ──
    is_analysis = _build_is_analysis(reports, ratios)

    # ── Cash Flow Analysis ──
    cf_analysis = _build_cf_analysis(reports, ratios)

    return {
        "balanceSheet": bs_analysis,
        "incomeStatement": is_analysis,
        "cashFlow": cf_analysis,
    }


async def _query_annual_bctc(db: AsyncSession, ticker: str, years: int = 5) -> Dict:
    """Get annual (Q5=full year or Q4) BCTC data for multiple years."""
    all_codes = set()
    for mapping in (IS_CODES, BS_CODES, CF_CODES):
        all_codes.update(mapping.values())

    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker
          AND ind_code = ANY(:codes)
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, {"ticker": ticker, "codes": list(all_codes)})
    rows = res.mappings().all()

    # Pivot: {(year, quarter)} -> {ind_code: value}
    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])

    return pivot


async def _query_annual_ratios(db: AsyncSession, ticker: str, years: int = 5) -> List[Dict]:
    """Get annual financial ratios."""
    sql = text(f"""
        SELECT year, quarter,
               pe, pb, roe, roa, roic,
               gross_margin, net_margin, ebit_margin,
               debt_to_equity, current_ratio, quick_ratio, cash_ratio,
               interest_coverage_ratio, asset_turnover,
               financial_leverage, market_cap, eps
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC, quarter DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"ticker": ticker, "limit": years * 4 + 4})
    return [dict(r) for r in res.mappings().all()]


def _build_bs_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build balance sheet analysis data."""
    # Get unique years, sorted ascending
    years_set = set()
    for (y, q) in reports.keys():
        years_set.add(y)
    years = sorted(years_set)[-5:]  # last 5 years

    # Trends
    trends = []
    for year in years:
        # Find Q4 or largest quarter for each year
        year_data = {}
        for q in ["5", "4", "3", "2", "1"]:  # Q5=annual preferred
            if (year, q) in reports:
                year_data = reports[(year, q)]
                break
        if not year_data:
            continue

        trends.append({
            "year": year,
            "totalAssets": year_data.get(BS_CODES["totalAssets"]),
            "currentAssets": year_data.get(BS_CODES["currentAssets"]),
            "nonCurrentAssets": year_data.get(BS_CODES["nonCurrentAssets"]),
            "totalLiabilities": year_data.get(BS_CODES["totalLiabilities"]),
            "currentLiabilities": year_data.get(BS_CODES["currentLiabilities"]),
            "longTermLiabilities": year_data.get(BS_CODES["longTermLiabilities"]),
            "equity": year_data.get(BS_CODES["totalEquity"]),
        })

    # Health indicators from latest ratio
    latest_r = ratios[0] if ratios else {}
    current_ratio_val = _safe_float(latest_r.get("current_ratio"))
    de_val = _safe_float(latest_r.get("debt_to_equity"))
    quick_ratio_val = _safe_float(latest_r.get("quick_ratio"))

    health_indicators = [
        {
            "name": "Hệ số thanh toán hiện hành",
            "value": current_ratio_val,
            "status": "good" if current_ratio_val >= 1.5 else ("warning" if current_ratio_val >= 1 else "danger"),
            "description": f"Khả năng thanh toán nợ ngắn hạn: {current_ratio_val:.2f}x",
            "threshold": ">= 1.5",
        },
        {
            "name": "Hệ số nợ/vốn chủ sở hữu",
            "value": de_val,
            "status": "good" if de_val <= 1 else ("warning" if de_val <= 2 else "danger"),
            "description": f"Đòn bẩy tài chính: {de_val:.2f}x",
            "threshold": "<= 1.0",
        },
        {
            "name": "Hệ số thanh toán nhanh",
            "value": quick_ratio_val,
            "status": "good" if quick_ratio_val >= 1 else ("warning" if quick_ratio_val >= 0.5 else "danger"),
            "description": f"Thanh khoản nhanh: {quick_ratio_val:.2f}x",
            "threshold": ">= 1.0",
        },
    ]

    # Overview stats
    latest_bs = {}
    for q in ["5", "4", "3", "2", "1"]:
        if years and (years[-1], q) in reports:
            latest_bs = reports[(years[-1], q)]
            break

    total_assets = latest_bs.get(BS_CODES["totalAssets"], 0)
    total_equity = latest_bs.get(BS_CODES["totalEquity"], 0)
    total_liab = latest_bs.get(BS_CODES["totalLiabilities"], 0)

    overview_stats = [
        {"label": "Tổng tài sản", "value": _fmt_market_cap(total_assets), "subLabel": "", "trend": ""},
        {"label": "Vốn chủ sở hữu", "value": _fmt_market_cap(total_equity), "subLabel": "", "trend": ""},
        {"label": "Tổng nợ", "value": _fmt_market_cap(total_liab), "subLabel": "", "trend": ""},
        {"label": "D/E", "value": f"{de_val:.2f}x", "subLabel": "", "trend": ""},
    ]

    # Leverage data
    leverage_data = []
    for t in trends:
        equity = t.get("equity") or 0
        liab = (t.get("totalLiabilities") or 0)
        leverage_data.append({
            "year": t["year"],
            "equity": equity,
            "liabilities": liab,
            "deRatio": round(liab / equity, 2) if equity > 0 else 0,
        })

    # Liquidity data
    liquidity_data = []
    for r in ratios:
        if r.get("current_ratio") is not None:
            liquidity_data.append({
                "year": r.get("year"),
                "quarter": r.get("quarter"),
                "currentRatio": _safe_round(r.get("current_ratio")),
                "quickRatio": _safe_round(r.get("quick_ratio")),
                "cashRatio": _safe_round(r.get("cash_ratio")),
            })

    return {
        "overviewStats": overview_stats,
        "healthIndicators": health_indicators,
        "trends": trends,
        "leverageData": leverage_data[:5],
        "liquidityData": liquidity_data[:8],
    }


def _build_is_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build income statement analysis data."""
    years_set = set()
    for (y, q) in reports.keys():
        years_set.add(y)
    years = sorted(years_set)[-5:]

    # DuPont analysis from latest ratio
    latest_r = ratios[0] if ratios else {}
    prior_r = ratios[4] if len(ratios) > 4 else {}

    dupont = [
        {"name": "ROE", "value": _safe_float(latest_r.get("roe")), "prior": _safe_float(prior_r.get("roe"))},
        {"name": "Biên lợi nhuận ròng", "value": _safe_float(latest_r.get("net_margin")), "prior": _safe_float(prior_r.get("net_margin"))},
        {"name": "Vòng quay tổng tài sản", "value": _safe_float(latest_r.get("asset_turnover")), "prior": _safe_float(prior_r.get("asset_turnover"))},
        {"name": "Đòn bẩy tài chính", "value": _safe_float(latest_r.get("financial_leverage")), "prior": _safe_float(prior_r.get("financial_leverage"))},
    ]

    # Margin trends
    margin_trends = []
    for r in ratios:
        if r.get("gross_margin") is not None:
            margin_trends.append({
                "year": r.get("year"),
                "quarter": r.get("quarter"),
                "grossMargin": _safe_round(r.get("gross_margin")),
                "netMargin": _safe_round(r.get("net_margin")),
                "ebitMargin": _safe_round(r.get("ebit_margin")),
            })

    # Cost structure from BCTC
    cost_structure = []
    for year in years:
        year_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                year_data = reports[(year, q)]
                break
        if not year_data:
            continue
        revenue = year_data.get(IS_CODES["revenue"], 0)
        cogs = year_data.get(IS_CODES["costOfGoodsSold"], 0)
        selling = year_data.get(IS_CODES["sellingExpenses"], 0)
        admin = year_data.get(IS_CODES["adminExpenses"], 0)
        fin_exp = year_data.get(IS_CODES["financialExpenses"], 0)
        cost_structure.append({
            "year": year,
            "revenue": revenue,
            "cogs": abs(cogs),
            "selling": abs(selling),
            "admin": abs(admin),
            "financial": abs(fin_exp),
        })

    # Growth data
    growth_data = []
    for i, year in enumerate(years):
        if i == 0:
            continue
        cur_data = {}
        prev_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                cur_data = reports[(year, q)]
                break
        for q in ["5", "4", "3", "2", "1"]:
            if (years[i - 1], q) in reports:
                prev_data = reports[(years[i - 1], q)]
                break

        cur_rev = cur_data.get(IS_CODES["revenue"], 0)
        prev_rev = prev_data.get(IS_CODES["revenue"], 0)
        cur_ni = cur_data.get(IS_CODES["netProfit"], 0)
        prev_ni = prev_data.get(IS_CODES["netProfit"], 0)

        rev_growth = ((cur_rev - prev_rev) / abs(prev_rev) * 100) if prev_rev else 0
        ni_growth = ((cur_ni - prev_ni) / abs(prev_ni) * 100) if prev_ni else 0

        growth_data.append({
            "year": year,
            "revenueGrowth": round(rev_growth, 2),
            "netProfitGrowth": round(ni_growth, 2),
        })

    # Overview stats
    overview_stats = [
        {"label": "ROE", "value": f"{_safe_float(latest_r.get('roe')):.1f}%", "subLabel": "", "trend": ""},
        {"label": "Biên LN ròng", "value": f"{_safe_float(latest_r.get('net_margin')):.1f}%", "subLabel": "", "trend": ""},
        {"label": "EPS", "value": f"{_safe_float(latest_r.get('eps')):,.0f}", "subLabel": "", "trend": ""},
        {"label": "P/E", "value": f"{_safe_float(latest_r.get('pe')):.1f}", "subLabel": "", "trend": ""},
    ]

    return {
        "overviewStats": overview_stats,
        "dupont": dupont,
        "marginTrends": margin_trends[:8],
        "costStructure": cost_structure,
        "growthData": growth_data,
        "revenueBreakdown": [],
    }


def _build_cf_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build cash flow analysis data."""
    years_set = set()
    for (y, q) in reports.keys():
        years_set.add(y)
    years = sorted(years_set)[-5:]

    # Trends
    trends = []
    for year in years:
        year_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                year_data = reports[(year, q)]
                break
        if not year_data:
            continue
        trends.append({
            "year": year,
            "operatingCashFlow": year_data.get(CF_CODES["operatingCashFlow"]),
            "investingCashFlow": year_data.get(CF_CODES["investingCashFlow"]),
            "financingCashFlow": year_data.get(CF_CODES["financingCashFlow"]),
            "revenue": year_data.get(IS_CODES["revenue"]),
            "netProfit": year_data.get(IS_CODES["netProfit"]),
        })

    # Overview stats
    latest_cf = {}
    for q in ["5", "4", "3", "2", "1"]:
        if years and (years[-1], q) in reports:
            latest_cf = reports[(years[-1], q)]
            break

    ocf = latest_cf.get(CF_CODES["operatingCashFlow"], 0)
    icf = latest_cf.get(CF_CODES["investingCashFlow"], 0)
    fcf = latest_cf.get(CF_CODES["financingCashFlow"], 0)
    net_profit = latest_cf.get(IS_CODES["netProfit"], 0)

    overview_stats = [
        {"label": "CF HĐKD", "value": _fmt_market_cap(ocf), "subLabel": "", "trend": "up" if ocf > 0 else "down"},
        {"label": "CF HĐĐT", "value": _fmt_market_cap(icf), "subLabel": "", "trend": "down" if icf < 0 else "up"},
        {"label": "CF HĐTC", "value": _fmt_market_cap(fcf), "subLabel": "", "trend": ""},
        {"label": "FCF", "value": _fmt_market_cap(ocf + icf), "subLabel": "", "trend": "up" if (ocf + icf) > 0 else "down"},
    ]

    # Efficiency metrics
    efficiency_metrics = []
    for t in trends:
        rev = t.get("revenue") or 0
        ocf_val = t.get("operatingCashFlow") or 0
        ni = t.get("netProfit") or 0
        efficiency_metrics.append({
            "year": t["year"],
            "cfToRevenue": round(ocf_val / rev * 100, 2) if rev else 0,
            "cfToNetProfit": round(ocf_val / ni * 100, 2) if ni else 0,
        })

    # Self-funding data
    self_funding = []
    for t in trends:
        ocf_val = t.get("operatingCashFlow") or 0
        icf_val = t.get("investingCashFlow") or 0
        self_funding.append({
            "year": t["year"],
            "operatingCF": ocf_val,
            "investingCF": icf_val,
            "selfFundingRatio": round(ocf_val / abs(icf_val) * 100, 2) if icf_val else 0,
        })

    # Earnings quality (CF vs profit)
    earnings_quality = []
    for t in trends:
        ocf_val = t.get("operatingCashFlow") or 0
        ni = t.get("netProfit") or 0
        earnings_quality.append({
            "year": t["year"],
            "netProfit": ni,
            "operatingCF": ocf_val,
            "ratio": round(ocf_val / ni * 100, 2) if ni else 0,
        })

    # Waterfall for latest year
    waterfall = []
    if latest_cf:
        waterfall = [
            {"name": "CF HĐKD", "value": ocf},
            {"name": "CF HĐĐT", "value": icf},
            {"name": "CF HĐTC", "value": fcf},
            {"name": "Thay đổi ròng", "value": ocf + icf + fcf},
        ]

    return {
        "overviewStats": overview_stats,
        "efficiencyMetrics": efficiency_metrics,
        "selfFundingData": self_funding,
        "earningsQuality": earnings_quality,
        "trends": trends,
        "waterfall": waterfall,
    }


# ────────────────────────────────────────────────────────────────────
# 8. Quant Analysis
# ────────────────────────────────────────────────────────────────────
@cached("stock:quant", ttl=600)
async def get_quant_analysis(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Quantitative analysis using numpy on price history."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Get 3 years of price data
    sql = text(f"""
        SELECT trading_date, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date ASC
    """)
    res = await db.execute(sql, {"ticker": ticker})
    rows = res.mappings().all()

    if len(rows) < 30:
        return _empty_quant()

    dates = [r["trading_date"] for r in rows]
    closes = np.array([float(r["close"]) for r in rows])
    volumes = np.array([float(r["volume"] or 0) for r in rows])

    # Daily returns
    returns = np.diff(closes) / closes[:-1]
    returns = returns[np.isfinite(returns)]

    if len(returns) < 20:
        return _empty_quant()

    # ── KPIs ──
    total_return = (closes[-1] / closes[0] - 1) * 100
    ann_return = ((closes[-1] / closes[0]) ** (252 / len(closes)) - 1) * 100
    ann_vol = float(np.std(returns) * np.sqrt(252) * 100)
    rf = 0.045  # risk-free rate ~4.5%
    sharpe = (ann_return / 100 - rf) / (ann_vol / 100) if ann_vol > 0 else 0

    # Max drawdown
    cummax = np.maximum.accumulate(closes)
    drawdowns = (closes - cummax) / cummax
    max_dd = float(np.min(drawdowns) * 100)

    # Sortino ratio (correct: sqrt of mean of squared negative deviations)
    daily_rf = rf / 252
    downside_diff = np.minimum(returns - daily_rf, 0)
    downside_vol = float(np.sqrt(np.mean(downside_diff ** 2)) * np.sqrt(252))
    sortino = (ann_return / 100 - rf) / downside_vol if downside_vol > 0 else 0

    kpis = [
        {"label": "Tổng lợi nhuận", "value": round(total_return, 2), "suffix": "%"},
        {"label": "LN hàng năm", "value": round(ann_return, 2), "suffix": "%"},
        {"label": "Biến động (σ)", "value": round(ann_vol, 2), "suffix": "%"},
        {"label": "Sharpe Ratio", "value": round(sharpe, 2), "suffix": ""},
        {"label": "Sortino Ratio", "value": round(sortino, 2), "suffix": ""},
        {"label": "Max Drawdown", "value": round(max_dd, 2), "suffix": "%"},
    ]

    # ── Wealth Index ──
    wealth = np.cumprod(1 + returns)
    wealth_index = [
        {"date": dates[i + 1], "value": round(float(wealth[i]), 4)}
        for i in range(0, len(wealth), max(1, len(wealth) // 200))
    ]

    # ── Monthly Returns heatmap ──
    monthly_returns = _compute_monthly_returns(dates[1:], returns)

    # ── Drawdown chart ──
    dd_sample = max(1, len(drawdowns) // 200)
    drawdown_data = [
        {"date": dates[i], "value": round(float(drawdowns[i]) * 100, 2)}
        for i in range(0, len(drawdowns), dd_sample)
    ]

    # ── Rolling Volatility (60-day window) ──
    window = 60
    rolling_vol_data = []
    if len(returns) > window:
        for i in range(window, len(returns), max(1, (len(returns) - window) // 150)):
            vol = float(np.std(returns[i - window:i]) * np.sqrt(252) * 100)
            rolling_vol_data.append({"date": dates[i + 1], "value": round(vol, 2)})

    # ── Histogram ──
    hist_counts, bin_edges = np.histogram(returns * 100, bins=50)
    histogram = [
        {"bin": round(float((bin_edges[i] + bin_edges[i + 1]) / 2), 2), "count": int(hist_counts[i])}
        for i in range(len(hist_counts))
    ]

    # ── Rolling Sharpe (120-day) ──
    sharpe_window = 120
    rolling_sharpe_data = []
    if len(returns) > sharpe_window:
        daily_rf = rf / 252
        for i in range(sharpe_window, len(returns), max(1, (len(returns) - sharpe_window) // 100)):
            window_ret = returns[i - sharpe_window:i]
            w_mean = float(np.mean(window_ret))
            w_std = float(np.std(window_ret))
            s = ((w_mean - daily_rf) / w_std * np.sqrt(252)) if w_std > 0 else 0
            rolling_sharpe_data.append({"date": dates[i + 1], "value": round(s, 2)})

    # ── VaR (Value at Risk) ──
    var_95 = float(np.percentile(returns, 5) * 100)
    var_99 = float(np.percentile(returns, 1) * 100)
    cvar_95 = float(np.mean(returns[returns <= np.percentile(returns, 5)]) * 100)
    var_data = {
        "var95": round(var_95, 2),
        "var99": round(var_99, 2),
        "cvar95": round(cvar_95, 2),
        "distribution": histogram[:20],
    }

    # ── Radar metrics ──
    # Normalize to 0-100 using financially meaningful thresholds
    # Return score: 0%→0, 15%→50, 30%→100
    ret_score = max(0, min(100, ann_return / 0.30 * 100))
    # Volatility score: 0%→100, 25%→50, 50%→0  (lower vol = better)
    vol_score = max(0, min(100, (1 - ann_vol / 50) * 100))
    # Sharpe score: 0→25, 1→50, 2→75, 3→100
    sharpe_score = max(0, min(100, sharpe / 3 * 100))
    # Drawdown score: 0%→100, -25%→50, -50%→0  (less drawdown = better)
    dd_score = max(0, min(100, (1 + max_dd / 50) * 100))
    # Sortino score: 0→25, 1→50, 2→75, 3→100
    sortino_score = max(0, min(100, sortino / 3 * 100))
    # Consistency: coefficient of variation of monthly returns
    if len(returns) > 20:
        monthly_means = []
        chunk = max(1, len(returns) // 12)
        for ci in range(0, len(returns), chunk):
            monthly_means.append(float(np.mean(returns[ci:ci + chunk])))
        cv = float(np.std(monthly_means) / (abs(np.mean(monthly_means)) + 1e-10))
        consistency = max(0, min(100, (1 - min(cv, 5) / 5) * 100))
    else:
        consistency = 50

    radar_metrics = [
        {"axis": "Lợi nhuận", "value": round(ret_score, 1)},
        {"axis": "Rủi ro thấp", "value": round(vol_score, 1)},
        {"axis": "Sharpe", "value": round(sharpe_score, 1)},
        {"axis": "Drawdown thấp", "value": round(dd_score, 1)},
        {"axis": "Sortino", "value": round(sortino_score, 1)},
        {"axis": "Tính nhất quán", "value": round(consistency, 1)},
    ]

    # ── Monte Carlo Simulation ──
    monte_carlo = _run_monte_carlo(closes[-1], returns, days=252, simulations=500)

    return {
        "kpis": kpis,
        "wealthIndex": wealth_index,
        "monthlyReturns": monthly_returns,
        "drawdownData": drawdown_data,
        "rollingVolatility": rolling_vol_data,
        "histogram": histogram,
        "rollingSharpe": rolling_sharpe_data,
        "varData": var_data,
        "radarMetrics": radar_metrics,
        "monteCarlo": monte_carlo,
    }


def _empty_quant() -> Dict:
    return {
        "kpis": [], "wealthIndex": [], "monthlyReturns": [],
        "drawdownData": [], "rollingVolatility": [], "histogram": [],
        "rollingSharpe": [], "varData": {}, "radarMetrics": [],
        "monteCarlo": {},
    }


def _compute_monthly_returns(dates: List[str], returns: np.ndarray) -> List[Dict]:
    """Aggregate daily returns into monthly returns for heatmap."""
    monthly: Dict[str, float] = {}
    for i, d in enumerate(dates):
        if i >= len(returns):
            break
        # Extract year-month from trading_date (could be 'YYYY-MM-DD' or 'DD/MM/YYYY')
        try:
            if "-" in d:
                ym = d[:7]  # 'YYYY-MM'
            else:
                parts = d.split("/")
                ym = f"{parts[2]}-{parts[1]}"
        except (IndexError, AttributeError):
            continue
        if ym not in monthly:
            monthly[ym] = 1.0  # geometric accumulator
        monthly[ym] *= (1 + float(returns[i]))

    result = []
    for ym, cum in sorted(monthly.items()):
        parts = ym.split("-")
        if len(parts) == 2:
            result.append({
                "year": int(parts[0]),
                "month": int(parts[1]),
                "return": round((cum - 1) * 100, 2),  # geometric return
            })
    return result


def _run_monte_carlo(
    last_price: float,
    returns: np.ndarray,
    days: int = 252,
    simulations: int = 500,
) -> Dict[str, Any]:
    """Run Monte Carlo simulation on stock returns."""
    if len(returns) < 20:
        return {}

    mu = float(np.mean(returns))
    sigma = float(np.std(returns))

    # Generate simulated paths
    rng = np.random.default_rng(abs(hash(str(last_price))) % (2**31))
    random_returns = rng.normal(mu, sigma, (simulations, days))
    price_paths = last_price * np.cumprod(1 + random_returns, axis=1)

    # Percentiles for fan chart
    percentiles = {}
    for p in [5, 25, 50, 75, 95]:
        pct_values = np.percentile(price_paths, p, axis=0)
        # Sample every ~5 days
        sample = max(1, days // 50)
        percentiles[f"p{p}"] = [
            round(float(pct_values[i]), 2)
            for i in range(0, days, sample)
        ]

    # Final price distribution
    final_prices = price_paths[:, -1]
    expected = round(float(np.mean(final_prices)), 2)
    p5 = round(float(np.percentile(final_prices, 5)), 2)
    p95 = round(float(np.percentile(final_prices, 95)), 2)

    return {
        "simulations": simulations,
        "days": days,
        "expectedPrice": expected,
        "p5": p5,
        "p95": p95,
        "percentiles": percentiles,
        "probUp": round(float(np.mean(final_prices > last_price) * 100), 1),
    }


# ────────────────────────────────────────────────────────────────────
# 9. Valuation
# ────────────────────────────────────────────────────────────────────
@cached("stock:valuation", ttl=600)
async def get_valuation(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Valuation models: DCF, DDM, PE/PB bands, peer valuation."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Fetch data in parallel
    ratio_res, bctc_res, price_res, peers_res = await asyncio.gather(
        _query_valuation_ratios(db, ticker),
        _query_valuation_bctc(db, ticker),
        _query_price_history(db, ticker, days=1000),
        _query_valuation_peers(db, ticker),
    )

    ratios = ratio_res or []
    bctc = bctc_res
    prices = price_res or []
    peers = peers_res or []

    current_price = float(prices[-1]["close"]) if prices else 0

    # ── DCF Model ──
    dcf = _compute_dcf(bctc, ratios, current_price)

    # ── DDM Model ──
    ddm = _compute_ddm(ratios, current_price)

    # ── PE/PB Bands ──
    pe_band = _compute_pe_pb_band(prices, ratios, "pe")
    pb_band = _compute_pe_pb_band(prices, ratios, "pb")

    # ── Peer Valuation ──
    peer_valuation = [
        {
            "ticker": r["ticker"],
            "companyName": r.get("company_name", ""),
            "pe": _safe_round(r.get("pe")),
            "pb": _safe_round(r.get("pb")),
            "evEbitda": _safe_round(r.get("ev_ebitda")),
            "roe": _safe_round(r.get("roe")),
            "marketCap": _safe_round(r.get("market_cap")),
        }
        for r in peers
    ]

    # ── Summary ──
    intrinsic = dcf.get("intrinsicValue", 0)
    upside = ((intrinsic - current_price) / current_price * 100) if current_price > 0 else 0
    methods = [
        {"method": "DCF", "value": dcf.get("intrinsicValue", 0)},
        {"method": "DDM", "value": ddm.get("intrinsicValue", 0)},
    ]

    summary = {
        "intrinsicValue": intrinsic,
        "currentPrice": current_price,
        "upside": round(upside, 2),
        "methods": methods,
    }

    # ── Football Field ──
    target_eps = _safe_float(ratios[0].get("eps")) if ratios else 0
    football_field = _compute_football_field(dcf, ddm, pe_band, pb_band, peer_valuation, current_price, target_eps)

    return {
        "summary": summary,
        "dcf": dcf,
        "ddm": ddm,
        "peBand": pe_band,
        "pbBand": pb_band,
        "peerValuation": peer_valuation,
        "footballField": football_field,
    }


async def _query_valuation_ratios(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        SELECT year, quarter, pe, pb, eps, roe, roa,
               market_cap, outstanding_shares, ev_ebitda,
               dividend_yield, net_margin
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC, quarter DESC
        LIMIT 20
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_valuation_bctc(db: AsyncSession, ticker: str) -> Dict:
    codes = list(set(IS_CODES.values()) | set(CF_CODES.values()) | {BS_CODES["totalEquity"], BS_CODES["totalLiabilities"]})
    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker AND ind_code = ANY(:codes)
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, {"ticker": ticker, "codes": codes})
    rows = res.mappings().all()

    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])
    return pivot


async def _query_valuation_peers(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        ),
        peer_ratios AS (
            SELECT DISTINCT ON (fr.ticker)
                fr.ticker, co.organ_short_name AS company_name,
                fr.pe, fr.pb, fr.ev_ebitda, fr.roe, fr.market_cap
            FROM {SCHEMA}.financial_ratio fr
            JOIN {SCHEMA}.company_overview co ON co.ticker = fr.ticker
            WHERE co.icb_name2 = (SELECT icb_name2 FROM sector)
              AND fr.ticker != :ticker
            ORDER BY fr.ticker, fr.year DESC, fr.quarter DESC
        )
        SELECT * FROM peer_ratios LIMIT 10
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


def _compute_dcf(bctc: Dict, ratios: List[Dict], current_price: float) -> Dict:
    """DCF model: use annual FCF, derive WACC from data where possible."""
    # ── 1. Get annual FCF (prefer Q5=full-year, else sum Q1-Q4) ──
    yearly_fcf: Dict[int, float] = {}
    for (yr, q), data in bctc.items():
        ocf = data.get(CF_CODES.get("operatingCashFlow", ""), 0)
        capex = abs(data.get(CF_CODES.get("purchaseOfFixedAssets", ""), 0))
        if ocf == 0:
            continue
        fcf = ocf - capex
        if str(q) == "5":
            yearly_fcf[yr] = fcf  # annual record, overrides
        elif yr not in yearly_fcf:
            yearly_fcf.setdefault(yr, 0)
            yearly_fcf[yr] += fcf  # sum quarters as fallback

    if not yearly_fcf:
        return {"wacc": 0, "terminalGrowth": 0, "projections": [], "sensitivityMatrix": [], "intrinsicValue": 0}

    # Use the most recent annual FCF
    sorted_years = sorted(yearly_fcf.keys(), reverse=True)
    base_fcf = yearly_fcf[sorted_years[0]]

    # ── 2. Estimate growth rate from historical FCF CAGR ──
    growth_rate = 0.08  # default
    if len(sorted_years) >= 3:
        oldest_yr = sorted_years[min(4, len(sorted_years) - 1)]
        old_fcf = yearly_fcf[oldest_yr]
        if old_fcf > 0 and base_fcf > 0:
            n = sorted_years[0] - oldest_yr
            if n > 0:
                cagr = (base_fcf / old_fcf) ** (1 / n) - 1
                # Clamp between -5% and 30%
                growth_rate = max(-0.05, min(0.30, cagr))

    # ── 3. Estimate WACC from data ──
    wacc = 0.12  # default
    if ratios:
        roe = _safe_float(ratios[0].get("roe")) / 100 if ratios[0].get("roe") else 0
        de = _safe_float(ratios[0].get("debt_to_equity"))
        if roe > 0 and de >= 0:
            # Simplified: Ke from ROE, Kd ≈ 6%, tax ≈ 20%
            ke = max(0.08, min(0.25, roe))
            kd = 0.06
            tax_rate = 0.20
            e_weight = 1 / (1 + de)
            d_weight = de / (1 + de)
            wacc = ke * e_weight + kd * (1 - tax_rate) * d_weight
            wacc = max(0.08, min(0.20, wacc))

    terminal_growth = 0.03  # conservative, capped at GDP growth

    # ── 4. Projections (full precision for EV, rounded for display) ──
    shares = _safe_float(ratios[0].get("outstanding_shares")) if ratios else 0
    projections_display = []
    cum_pv_full = 0.0
    for i in range(1, 6):
        projected_fcf = base_fcf * (1 + growth_rate) ** i
        pv = projected_fcf / (1 + wacc) ** i
        cum_pv_full += pv
        projections_display.append({
            "year": i,
            "fcf": round(projected_fcf / 1e9, 2),
            "pv": round(pv / 1e9, 2),
        })

    # Terminal value (full precision)
    terminal_fcf = base_fcf * (1 + growth_rate) ** 5 * (1 + terminal_growth)
    terminal_value = terminal_fcf / (wacc - terminal_growth) if wacc > terminal_growth else 0
    pv_terminal = terminal_value / (1 + wacc) ** 5

    ev = cum_pv_full + pv_terminal
    intrinsic = (ev / shares) if shares > 0 else 0

    # ── 5. Sensitivity matrix ──
    waccs = [round(wacc - 0.02, 3), round(wacc - 0.01, 3), round(wacc, 3), round(wacc + 0.01, 3), round(wacc + 0.02, 3)]
    growths = [0.02, 0.025, 0.03, 0.035, 0.04]
    sensitivity = []
    for w in waccs:
        row = []
        for g in growths:
            if w <= g:
                row.append(0)
                continue
            tv = base_fcf * (1 + growth_rate) ** 5 * (1 + g) / (w - g)
            pv_tv = tv / (1 + w) ** 5
            cum_pv = sum(base_fcf * (1 + growth_rate) ** yr / (1 + w) ** yr for yr in range(1, 6))
            val = (cum_pv + pv_tv) / shares if shares > 0 else 0
            row.append(round(val, 0))
        sensitivity.append(row)

    return {
        "wacc": round(wacc, 4),
        "terminalGrowth": terminal_growth,
        "projections": projections_display,
        "sensitivityMatrix": sensitivity,
        "intrinsicValue": round(intrinsic, 0),
    }


def _compute_ddm(ratios: List[Dict], current_price: float) -> Dict:
    """Gordon Growth Model (DDM) — derive DPS from EPS * payout ratio, Ke from ROE-based proxy."""
    if not ratios:
        return {"intrinsicValue": 0}

    div_yield = _safe_float(ratios[0].get("dividend_yield"))
    eps = _safe_float(ratios[0].get("eps"))
    roe = _safe_float(ratios[0].get("roe")) / 100 if ratios[0].get("roe") else 0

    if eps <= 0:
        return {"intrinsicValue": 0, "dividendPerShare": 0, "costOfEquity": 0, "growthRate": 0}

    # Derive DPS: EPS × payout ratio.  payout = div_yield * price / eps
    if div_yield > 0 and current_price > 0:
        payout_ratio = min(1.0, (div_yield / 100) * current_price / eps)
    else:
        payout_ratio = 0.3  # default 30% if no dividend data
    dividend = eps * payout_ratio

    if dividend <= 0:
        return {"intrinsicValue": 0, "dividendPerShare": 0, "costOfEquity": 0, "growthRate": 0}

    # Cost of equity: proxy from ROE, clamped to 8-20%
    cost_of_equity = max(0.08, min(0.20, roe if roe > 0 else 0.12))

    # Growth: sustainable growth = ROE * retention ratio
    retention = 1 - payout_ratio
    growth = max(0.02, min(0.10, roe * retention)) if roe > 0 else 0.05

    if cost_of_equity <= growth:
        growth = cost_of_equity - 0.02  # ensure convergence

    intrinsic = dividend * (1 + growth) / (cost_of_equity - growth)

    return {
        "intrinsicValue": round(intrinsic, 0),
        "dividendPerShare": round(dividend, 0),
        "costOfEquity": round(cost_of_equity, 4),
        "growthRate": round(growth, 4),
    }


def _compute_pe_pb_band(prices: List[Dict], ratios: List[Dict], metric: str = "pe") -> Dict:
    """Compute PE or PB band chart data with time-varying base (EPS/BVPS per quarter)."""
    if not prices or not ratios:
        return {"dates": [], "prices": [], "highBand": [], "midBand": [], "lowBand": [], "avgBand": []}

    # Collect metric multiplier values across periods
    values = [_safe_float(r.get(metric)) for r in ratios if r.get(metric) and _safe_float(r.get(metric)) > 0]
    if not values:
        return {"dates": [], "prices": [], "highBand": [], "midBand": [], "lowBand": [], "avgBand": []}

    high_mult = max(values)
    low_mult = min(values)
    avg_mult = sum(values) / len(values)
    mid_mult = sorted(values)[len(values) // 2]

    # ── Build quarterly base_val (EPS or BVPS) lookup ──
    # key: (year, quarter) → base_val, sorted chronologically
    quarterly_base: List[Tuple[int, int, float]] = []
    for r in ratios:
        yr = int(r.get("year", 0))
        q = int(r.get("quarter", 0))
        if yr == 0:
            continue
        if metric == "pe":
            bv = _safe_float(r.get("eps"))
        else:
            pb_val = _safe_float(r.get("pb"))
            pe_val = _safe_float(r.get("pe"))
            eps_val = _safe_float(r.get("eps"))
            # BVPS ≈ EPS * PE / PB  →  price/PB  →  EPS*PE/PB
            if pb_val > 0 and pe_val > 0 and eps_val > 0:
                bv = eps_val * pe_val / pb_val
            else:
                bv = 0
        if bv > 0:
            quarterly_base.append((yr, q, bv))

    quarterly_base.sort(key=lambda x: (x[0], x[1]))

    if not quarterly_base:
        return {"dates": [], "prices": [], "highBand": [], "midBand": [], "lowBand": [], "avgBand": []}

    def _find_base_for_date(date_str: str) -> float:
        """Find the most recent quarterly base_val for a given date."""
        try:
            if "-" in date_str:
                yr = int(date_str[:4])
                mo = int(date_str[5:7])
            else:
                parts = date_str.split("/")
                yr, mo = int(parts[2]), int(parts[1])
        except (ValueError, IndexError):
            return quarterly_base[-1][2]
        # Map month to approximate end-of-quarter
        q = min(4, (mo - 1) // 3 + 1)
        best = quarterly_base[-1][2]  # fallback to latest
        for yy, qq, bv in quarterly_base:
            if (yy, qq) <= (yr, q):
                best = bv
        return best

    # Sample prices
    sample = max(1, len(prices) // 200)
    sampled = [prices[i] for i in range(0, len(prices), sample)]

    dates = [p["trading_date"] for p in sampled]
    price_vals = [_safe_float(p["close"]) for p in sampled]

    high_band = []
    mid_band = []
    low_band = []
    avg_band = []
    for d in dates:
        bv = _find_base_for_date(d)
        high_band.append(round(high_mult * bv, 2))
        mid_band.append(round(mid_mult * bv, 2))
        low_band.append(round(low_mult * bv, 2))
        avg_band.append(round(avg_mult * bv, 2))

    return {
        "dates": dates,
        "prices": price_vals,
        "highBand": high_band,
        "midBand": mid_band,
        "lowBand": low_band,
        "avgBand": avg_band,
    }


def _compute_football_field(dcf: Dict, ddm: Dict, pe_band: Dict, pb_band: Dict,
                             peer_valuation: List[Dict], current_price: float,
                             target_eps: float = 0) -> List[Dict]:
    """Compute football field chart data showing valuation ranges."""
    result = []

    # DCF
    if dcf.get("sensitivityMatrix"):
        flat = [v for row in dcf["sensitivityMatrix"] for v in row if v > 0]
        if flat:
            result.append({"method": "DCF", "low": min(flat), "mid": dcf.get("intrinsicValue", 0), "high": max(flat)})

    # DDM — use Ke/growth sensitivity instead of arbitrary ±20%
    ddm_val = ddm.get("intrinsicValue", 0)
    dps = ddm.get("dividendPerShare", 0)
    ke = ddm.get("costOfEquity", 0)
    g = ddm.get("growthRate", 0)
    if ddm_val > 0 and dps > 0 and ke > 0:
        # Sensitivity: vary Ke ±2% and g ±1%
        ddm_low = dps * (1 + max(0.01, g - 0.01)) / (min(0.25, ke + 0.02) - max(0.01, g - 0.01)) if (ke + 0.02) > (g - 0.01) else ddm_val * 0.7
        ddm_high = dps * (1 + min(0.15, g + 0.01)) / (max(0.06, ke - 0.02) - min(0.15, g + 0.01)) if (ke - 0.02) > (g + 0.01) else ddm_val * 1.3
        result.append({"method": "DDM", "low": round(min(ddm_low, ddm_val), 0), "mid": ddm_val, "high": round(max(ddm_high, ddm_val), 0)})

    # PE Band
    if pe_band.get("lowBand") and pe_band["lowBand"]:
        result.append({"method": "P/E Band", "low": pe_band["lowBand"][-1], "mid": pe_band["avgBand"][-1], "high": pe_band["highBand"][-1]})

    # PB Band
    if pb_band.get("lowBand") and pb_band["lowBand"]:
        result.append({"method": "P/B Band", "low": pb_band["lowBand"][-1], "mid": pb_band["avgBand"][-1], "high": pb_band["highBand"][-1]})

    # Peer comparison — use TARGET company's EPS (not derived from price/peer_PE)
    peer_pes = [p.get("pe") for p in peer_valuation if p.get("pe") and p["pe"] > 0]
    if peer_pes and target_eps > 0:
        result.append({
            "method": "Peer P/E",
            "low": round(min(peer_pes) * target_eps, 0),
            "mid": round(sum(peer_pes) / len(peer_pes) * target_eps, 0),
            "high": round(max(peer_pes) * target_eps, 0),
        })

    # Add current price marker
    if result:
        result.append({"method": "Giá hiện tại", "low": current_price, "mid": current_price, "high": current_price})

    return result
