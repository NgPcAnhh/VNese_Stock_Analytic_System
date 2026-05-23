"""Business logic for the Indices module.

Queries both `macro_economy` and `vn_macro_yearly` tables and returns
data formatted for the FE indices page components.
"""

import math
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set

# ────────────────────────────────────────────────────────────────────
# Asset type metadata
# ────────────────────────────────────────────────────────────────────
_ASSET_META: Dict[str, Dict[str, str]] = {
    "XAU": {"name": "Vàng (XAU)", "flag": "🥇"},
    "DXY": {"name": "US Dollar Index (DXY)", "flag": "💵"},
    "OIL": {"name": "Dầu thô WTI", "flag": "🛢️"},
    "USD_VND": {"name": "USD/VND", "flag": "🇻🇳"},
    "EUR_USD": {"name": "EUR/USD", "flag": "🇪🇺"},
    "USD_CNY": {"name": "USD/CNY", "flag": "🇨🇳"},
    "US_BOND_10Y": {"name": "US Bond 10Y", "flag": "🏦"},
    "DJI": {"name": "Dow Jones (DJI)", "flag": "🇺🇸"},
    "DOWJONES": {"name": "Dow Jones Industrial", "flag": "🇺🇸"},
}

# ────────────────────────────────────────────────────────────────────
# Macro yearly labels / categories / units
# ────────────────────────────────────────────────────────────────────
_MACRO_YEARLY_META: Dict[str, Dict[str, str]] = {
    "tang_truong_gdp": {
        "label": "Tăng trưởng GDP",
        "category": "Kinh tế vĩ mô",
        "unit": "%",
    },
    "lam_phat": {
        "label": "Lạm phát CPI",
        "category": "Kinh tế vĩ mô",
        "unit": "%",
    },
    "tang_truong_cong_nghiep_xay_dung": {
        "label": "Tăng trưởng CN & Xây dựng",
        "category": "Kinh tế vĩ mô",
        "unit": "%",
    },
    "tang_truong_nganh_che_bien_che_tao": {
        "label": "Tăng trưởng Chế biến chế tạo",
        "category": "Kinh tế vĩ mô",
        "unit": "%",
    },
    "tang_truong_tieu_dung_ho_gia_inh": {
        "label": "Tăng trưởng tiêu dùng hộ GĐ",
        "category": "Kinh tế vĩ mô",
        "unit": "%",
    },
    "ty_gia_usd_vnd": {
        "label": "Tỷ giá USD/VND",
        "category": "Lãi suất & Tiền tệ",
        "unit": "VND",
    },
    "lai_suat_tien_gui": {
        "label": "Lãi suất tiền gửi",
        "category": "Lãi suất & Tiền tệ",
        "unit": "%",
    },
    "lai_suat_cho_vay": {
        "label": "Lãi suất cho vay",
        "category": "Lãi suất & Tiền tệ",
        "unit": "%",
    },
    "tang_truong_xuat_khau": {
        "label": "Tăng trưởng xuất khẩu",
        "category": "Thương mại & Đầu tư",
        "unit": "%",
    },
    "tang_truong_nhap_khau": {
        "label": "Tăng trưởng nhập khẩu",
        "category": "Thương mại & Đầu tư",
        "unit": "%",
    },
    "can_can_thuong_mai": {
        "label": "Cán cân thương mại",
        "category": "Thương mại & Đầu tư",
        "unit": "Tỷ USD",
    },
    "fdi_thuc_hien": {
        "label": "FDI thực hiện",
        "category": "Thương mại & Đầu tư",
        "unit": "Tỷ USD",
    },
    "du_tru_ngoai_hoi": {
        "label": "Dự trữ ngoại hối",
        "category": "Thị trường tài chính",
        "unit": "Tỷ USD",
    },
    "tang_truong_cung_tien_m2": {
        "label": "Tăng trưởng cung tiền M2",
        "category": "Thị trường tài chính",
        "unit": "%",
    },
    "no_xau_ngan_hang": {
        "label": "Nợ xấu ngân hàng",
        "category": "Thị trường tài chính",
        "unit": "%",
    },
}

_MACRO_YEARLY_COLS = list(_MACRO_YEARLY_META.keys())


# ────────────────────────────────────────────────────────────────────
# 1. Market Indices from macro_economy
# ────────────────────────────────────────────────────────────────────

def _pct_change(cur: float, ref: float) -> float:
    """Compute percent change, safe against zero division."""
    if not ref:
        return 0.0
    return round((cur - ref) / ref * 100, 2)


async def get_market_indices(db: AsyncSession) -> List[Dict[str, Any]]:
    """Return all asset_types from macro_economy with sparklines + multi-period changes.

    For each asset_type computes:
      - sparkline: last 30 close values (ASC)
      - value: latest close
      - change / changePercent: vs previous trading day
      - week1: 7-day % change
      - ytd: year-to-date % change
      - year1: 1-year % change
      - year3: 3-year % change

    Cached 5 minutes.
    """
    cache_key = "indices:market_indices"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        SELECT asset_type, date, close
        FROM macro_economy
        WHERE close IS NOT NULL
        ORDER BY asset_type, date DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    # Group by asset_type — rows already sorted DESC within each group
    grouped: Dict[str, List[Dict]] = defaultdict(list)
    for r in rows:
        grouped[r["asset_type"]].append({
            "close": float(r["close"]),
            "date": r["date"].isoformat() if hasattr(r["date"], "isoformat") else str(r["date"]),
        })

    today = date.today()
    cutoffs = {
        "week1": (today - timedelta(days=7)).isoformat(),
        "ytd": f"{today.year}-01-01",
        "year1": (today - timedelta(days=365)).isoformat(),
        "year3": (today - timedelta(days=365 * 3)).isoformat(),
    }

    results: List[Dict[str, Any]] = []
    for asset, data_rows in grouped.items():
        if len(data_rows) < 2:
            continue

        meta = _ASSET_META.get(asset, {"name": asset, "flag": "📈"})
        cur_close = data_rows[0]["close"]
        prev_close = data_rows[1]["close"]
        change = round(cur_close - prev_close, 4)
        change_pct = _pct_change(cur_close, prev_close)

        # Sparkline — last 30 data points in ASC order
        sparkline_rows = data_rows[:30]
        sparkline = [r["close"] for r in reversed(sparkline_rows)]
        history = [
            {"date": r["date"], "close": r["close"]}
            for r in reversed(data_rows)
        ]

        # Multi-period changes — find the close value nearest to each cutoff
        period_changes: Dict[str, float] = {}
        for period_key, cutoff_date in cutoffs.items():
            # Find the first row with date <= cutoff (rows are DESC)
            ref_close = None
            for r in data_rows:
                if r["date"] <= cutoff_date:
                    ref_close = r["close"]
                    break
            period_changes[period_key] = _pct_change(cur_close, ref_close) if ref_close else 0.0

        results.append({
            "name": meta["name"],
            "asset_type": asset,
            "flag": meta["flag"],
            "sparkline": sparkline,
            "history": history,
            "value": cur_close,
            "change": change,
            "changePercent": change_pct,
            **period_changes,
        })

    # Sort by name for consistent order
    results.sort(key=lambda x: x["name"])

    await cache_set(cache_key, results, ttl=300)
    return results


# ────────────────────────────────────────────────────────────────────
# 2. Macro Yearly Indicators from vn_macro_yearly
# ────────────────────────────────────────────────────────────────────

def _format_value(v: float | None, unit: str) -> str:
    """Format a numeric value for display."""
    if v is None:
        return "N/A"
    if unit == "VND":
        return f"{v:,.0f}"
    if unit == "Tỷ USD":
        # DB stores raw USD → convert to Tỷ (billions)
        v_ty = v / 1_000_000_000
        return f"{v_ty:,.2f}"
    return f"{v:.2f}"


async def get_macro_yearly_indicators(db: AsyncSession) -> List[Dict[str, Any]]:
    """Return vn_macro_yearly data formatted as MacroIndicator[] for FE table.

    For each indicator column, uses the two most recent years to compute
    change, changePercent, trend, previousValue.

    Cached 1 hour.
    """
    cache_key = "indices:macro_yearly_indicators"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        SELECT *
        FROM hethong_phantich_chungkhoan.vn_macro_yearly
        ORDER BY year DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    if not rows:
        return []

    # rows[0] = latest year, rows[1] = previous year
    latest = rows[0]
    previous = rows[1] if len(rows) > 1 else None
    latest_year = int(latest["year"])
    prev_year = int(previous["year"]) if previous else None

    results: List[Dict[str, Any]] = []
    for col in _MACRO_YEARLY_COLS:
        meta = _MACRO_YEARLY_META[col]
        unit = meta["unit"]
        raw_val = latest.get(col)
        cur_val: float | None = None
        if raw_val is not None and not (isinstance(raw_val, float) and math.isnan(raw_val)):
            cur_val = float(raw_val)

        prev_val: float | None = None
        if previous:
            raw_prev = previous.get(col)
            if raw_prev is not None and not (isinstance(raw_prev, float) and math.isnan(raw_prev)):
                prev_val = float(raw_prev)

        # Compute change (use Tỷ USD scale for display if applicable)
        change = 0.0
        change_pct = 0.0
        trend = "stable"
        if cur_val is not None and prev_val is not None:
            if unit == "Tỷ USD":
                # Show change in Tỷ USD
                change = round((cur_val - prev_val) / 1_000_000_000, 2)
            else:
                change = round(cur_val - prev_val, 2)
            if prev_val != 0:
                change_pct = round(((cur_val - prev_val) / abs(prev_val)) * 100, 2)
            if cur_val > prev_val:
                trend = "up"
            elif cur_val < prev_val:
                trend = "down"

        results.append({
            "name": meta["label"],
            "category": meta["category"],
            "value": _format_value(cur_val, unit),
            "change": change,
            "changePercent": change_pct,
            "unit": unit,
            "period": str(latest_year),
            "previousValue": _format_value(prev_val, unit),
            "trend": trend,
        })

    await cache_set(cache_key, results, ttl=3600)
    return results
