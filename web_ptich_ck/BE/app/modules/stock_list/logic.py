"""Business logic for the Stock List module."""

from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# Schema
SCHEMA = "hethong_phantich_chungkhoan"
SYSTEM_SCHEMA = "system"
SCREENER_MV = f"{SCHEMA}.mv_stock_screener_base"

# Allowed sort fields → actual SQL expression
SORT_MAP = {
    "ticker": "bs.ticker",
    "current_price": "hp.close",
    "price_change_percent": "price_change_percent",
    "volume": "hp.volume",
    "market_cap": "computed_market_cap",
    "pe": "computed_pe",
    "pb": "computed_pb",
    "eps": "computed_eps",
    "roe": "fr.roe",
    "roa": "fr.roa",
    "dividend_yield": "fr.dividend_yield",
    "debt_to_equity": "fr.debt_to_equity",
}

MV_SORT_MAP = {
    "ticker": "mv.ticker",
    "current_price": "mv.current_price",
    "price_change_percent": "mv.price_change_percent",
    "volume": "mv.volume",
    "market_cap": "mv.market_cap",
    "pe": "mv.pe",
    "pb": "mv.pb",
    "eps": "mv.eps",
    "roe": "mv.roe",
    "roa": "mv.roa",
    "dividend_yield": "mv.dividend_yield",
    "debt_to_equity": "mv.debt_to_equity",
}


# ────────────────────────────────────────────────────────────────────
# 1. Stock list overview — paginated
# ────────────────────────────────────────────────────────────────────
async def get_stock_overview(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 30,
    search: Optional[str] = None,
    sector: Optional[str] = None,
    exchange: Optional[str] = None,
    sort_by: str = "market_cap",
    sort_dir: str = "desc",
) -> Dict[str, Any]:
    """
    Return paginated stock list using history_price, company_overview, financial_ratio.
    """
    cache_key = f"stock_list:{page}:{page_size}:{search}:{sector}:{exchange}:{sort_by}:{sort_dir}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # Fast path: read precomputed metrics from materialized view.
    mv_result = await _get_stock_overview_from_mv(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        sector=sector,
        exchange=exchange,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    if mv_result is not None:
        await cache_set(cache_key, mv_result, ttl=180)
        return mv_result

    # Validate sort
    sort_col = SORT_MAP.get(sort_by, "computed_market_cap")
    sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    # ── Build WHERE conditions ──
    conditions: List[str] = []
    params: Dict[str, Any] = {}

    if search:
        conditions.append(
            "(bs.ticker ILIKE :search OR COALESCE(co.company_name, '') ILIKE :search)"
        )
        params["search"] = f"%{search}%"
    if sector:
        conditions.append("co.sector = :sector")
        params["sector"] = sector
    if exchange:
        conditions.append("co.exchange_norm = :exchange")
        params["exchange"] = exchange.upper().strip()

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # ── Latest trading date ──
    latest_date_sql = text(f"""
        SELECT MAX(trading_date) FROM {SCHEMA}.history_price
    """)
    res = await db.execute(latest_date_sql)
    latest_date = res.scalar()
    if not latest_date:
        return _empty_response(page, page_size)

    # ── Previous trading date ──
    prev_date_sql = text(f"""
        SELECT MAX(trading_date) FROM {SCHEMA}.history_price
        WHERE trading_date < :latest_date
    """)
    res = await db.execute(prev_date_sql, {"latest_date": latest_date})
    prev_date = res.scalar()

    # ── Count total ──
    count_sql = text(f"""
        WITH co_dedup AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                CASE
                    WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) NOT IN ('', 'NaN') THEN BTRIM(organ_short_name)
                    WHEN organ_name IS NOT NULL AND BTRIM(organ_name) NOT IN ('', 'NaN') THEN BTRIM(organ_name)
                    ELSE NULL
                END AS company_name,
                CASE
                    WHEN icb_name3 IS NOT NULL AND BTRIM(icb_name3) NOT IN ('', 'NaN') THEN BTRIM(icb_name3)
                    WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
                    ELSE 'Chưa phân loại'
                END AS sector,
                CASE
                    WHEN exchange = 'HSX' THEN 'HOSE'
                    WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
                    ELSE NULL
                END AS exchange_norm
            FROM {SCHEMA}.company_overview
            WHERE exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('NaN', 'DELISTED')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
            ORDER BY UPPER(BTRIM(ticker)),
                CASE WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) != 'NaN' THEN 0 ELSE 1 END,
                exchange
        )
        SELECT COUNT(DISTINCT bs.ticker)
        FROM co_dedup bs
        LEFT JOIN co_dedup co ON co.ticker = bs.ticker
        WHERE {where_clause}
    """)
    count_params = {"latest_date": latest_date, **params}
    count_res = await db.execute(count_sql, count_params)
    total = count_res.scalar() or 0

    # If legacy query finds no records, return empty response instead of crashing
    if total == 0:
        return _empty_response(page, page_size)

    total_pages = math.ceil(total / page_size)
    offset = (page - 1) * page_size

    # ── Main query ──
    # Join latest financial_ratio + BCTC to compute P/E, P/B, EPS
    main_sql = text(f"""
        WITH co_dedup AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                CASE
                    WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) NOT IN ('', 'NaN') THEN BTRIM(organ_short_name)
                    WHEN organ_name IS NOT NULL AND BTRIM(organ_name) NOT IN ('', 'NaN') THEN BTRIM(organ_name)
                    ELSE NULL
                END AS company_name,
                CASE
                    WHEN icb_name3 IS NOT NULL AND BTRIM(icb_name3) NOT IN ('', 'NaN') THEN BTRIM(icb_name3)
                    WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
                    ELSE 'Chưa phân loại'
                END AS sector,
                CASE
                    WHEN exchange = 'HSX' THEN 'HOSE'
                    WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
                    ELSE NULL
                END AS exchange_norm
            FROM {SCHEMA}.company_overview
            WHERE exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('NaN', 'DELISTED')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
            ORDER BY UPPER(BTRIM(ticker)),
                CASE WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) != 'NaN' THEN 0 ELSE 1 END,
                exchange
        ),
        latest_fr AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker, roe, roa, market_cap, pe, pb,
                dividend_yield, debt_to_equity, eps
            FROM {SCHEMA}.financial_ratio
            ORDER BY UPPER(BTRIM(ticker)), year DESC, quarter DESC
        ),
        hp_latest AS (
            SELECT UPPER(BTRIM(ticker)) AS ticker, close, volume
            FROM {SCHEMA}.history_price
            WHERE trading_date = :latest_date
        ),
        hp_prev AS (
            SELECT UPPER(BTRIM(ticker)) AS ticker, close
            FROM {SCHEMA}.history_price
            WHERE trading_date = :prev_date
        ),
        bctc_metrics AS (
            SELECT bs.ticker, s.shares, e.equity, n.ttm_ni
            FROM co_dedup bs
            LEFT JOIN LATERAL (
                SELECT value / 10000.0 AS shares FROM {SCHEMA}.bctc
                WHERE ticker = bs.ticker AND ind_code = 'cp_pho_thong' AND value > 0
                ORDER BY year DESC, quarter DESC LIMIT 1
            ) s ON true
            LEFT JOIN LATERAL (
                SELECT value AS equity FROM {SCHEMA}.bctc
                WHERE ticker = bs.ticker AND ind_code = 'vcsh' AND value > 0
                ORDER BY year DESC, quarter DESC LIMIT 1
            ) e ON true
            LEFT JOIN LATERAL (
                SELECT SUM(value) as ttm_ni 
                FROM (
                    SELECT value FROM {SCHEMA}.bctc
                    WHERE ticker = bs.ticker AND ind_code = 'lnst_cua_co_dong_cong_ty_me'
                    ORDER BY year DESC, quarter DESC LIMIT 4
                ) sub
            ) n ON true
        )
        SELECT
            bs.ticker,
            co.company_name,
            co.sector,
            co.exchange_norm AS exchange,
            hp.close AS current_price,
            CASE WHEN hp_prev.close > 0
                THEN hp.close - hp_prev.close
                ELSE 0
            END AS price_change,
            CASE WHEN hp_prev.close > 0
                THEN ROUND(((hp.close - hp_prev.close) / hp_prev.close * 100)::numeric, 2)
                ELSE 0
            END AS price_change_percent,
            hp.volume,
            -- Market cap from BCTC shares
            CASE
                WHEN fr.market_cap IS NOT NULL THEN fr.market_cap
                WHEN bm.shares > 0 AND hp.close > 0
                    THEN ROUND((hp.close * 1000 * bm.shares / 1e9)::numeric, 1)
                ELSE NULL
            END AS computed_market_cap,
            -- EPS from BCTC
            CASE
                WHEN fr.eps IS NOT NULL THEN fr.eps
                WHEN bm.shares > 0 AND bm.ttm_ni IS NOT NULL
                    THEN ROUND((bm.ttm_ni / bm.shares)::numeric, 0)
                ELSE NULL
            END AS computed_eps,
            -- P/E from price and computed EPS
            CASE
                WHEN fr.pe IS NOT NULL THEN fr.pe
                WHEN bm.shares > 0 AND bm.ttm_ni IS NOT NULL AND bm.ttm_ni > 0
                        AND hp.close * 1000 * bm.shares / bm.ttm_ni > 0
                        AND hp.close * 1000 * bm.shares / bm.ttm_ni < 500
                    THEN ROUND((hp.close * 1000 / (bm.ttm_ni / bm.shares))::numeric, 2)
                ELSE NULL
            END AS computed_pe,
            -- P/B from price, shares, equity
            CASE
                WHEN fr.pb IS NOT NULL THEN fr.pb
                WHEN bm.shares > 0 AND bm.equity > 0 AND hp.close > 0
                        AND hp.close * 1000 * bm.shares / bm.equity > 0
                        AND hp.close * 1000 * bm.shares / bm.equity < 100
                    THEN ROUND((hp.close * 1000 * bm.shares / bm.equity)::numeric, 2)
                ELSE NULL
            END AS computed_pb,
            fr.roe,
            fr.roa,
            fr.debt_to_equity,
            fr.dividend_yield
        FROM co_dedup bs
        LEFT JOIN co_dedup co ON co.ticker = bs.ticker
        LEFT JOIN hp_latest hp ON hp.ticker = bs.ticker
        LEFT JOIN hp_prev ON hp_prev.ticker = bs.ticker
        LEFT JOIN latest_fr fr ON fr.ticker = bs.ticker
        LEFT JOIN bctc_metrics bm ON bm.ticker = bs.ticker
        WHERE {where_clause}
        ORDER BY {sort_col} {sort_direction} NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    query_params = {
        "limit": page_size,
        "offset": offset,
        "latest_date": latest_date,
        "prev_date": prev_date,
        **params,
    }

    try:
        res = await db.execute(main_sql, query_params)
        rows = res.mappings().all()
    except Exception as exc:
        logger.exception("get_stock_overview query error")
        await db.rollback()
        return _empty_response(page, page_size)

    tickers = [r["ticker"] for r in rows]

    # ── Sparkline (last 20 days close prices) ──
    sparkline_map = await _get_sparklines(db, tickers, latest_date)

    # ── Avg volume 10d ──
    avg_vol_map = await _get_avg_volume(db, tickers, latest_date)

    # ── 52-week high/low ──
    week52_map = await _get_52w_range(db, tickers, latest_date)

    # ── Build response data ──
    data = []
    for r in rows:
        t = r["ticker"]
        w52 = week52_map.get(t, {})
        current = float(r["current_price"]) if r["current_price"] else None
        high52 = w52.get("high")
        low52 = w52.get("low")
        # 52w change = (current - low52) / low52 * 100
        week_change_52 = None
        if current and low52 and low52 > 0:
            week_change_52 = round((current - low52) / low52 * 100, 2)

        data.append({
            "ticker": t,
            "company_name": r["company_name"] if r["company_name"] and r["company_name"] != "NaN" else None,
            "sector": r["sector"] if r["sector"] and r["sector"] != "NaN" else None,
            "exchange": r["exchange"] if r["exchange"] and r["exchange"] != "NaN" else None,
            "current_price": float(r["current_price"]) if r["current_price"] else None,
            "price_change": float(r["price_change"]) if r["price_change"] else None,
            "price_change_percent": float(r["price_change_percent"]) if r["price_change_percent"] else None,
            "volume": int(r["volume"]) if r["volume"] else None,
            "avg_volume_10d": avg_vol_map.get(t),
            "market_cap": float(r["computed_market_cap"]) if r["computed_market_cap"] else None,
            "pe": float(r["computed_pe"]) if r["computed_pe"] else None,
            "pb": float(r["computed_pb"]) if r["computed_pb"] else None,
            "eps": float(r["computed_eps"]) if r["computed_eps"] else None,
            "roe": round(r["roe"] * 100, 2) if r["roe"] else None,      # Convert ratio → percent
            "roa": round(r["roa"] * 100, 2) if r["roa"] else None,
            "debt_to_equity": round(r["debt_to_equity"], 2) if r["debt_to_equity"] else None,
            "dividend_yield": round(r["dividend_yield"] * 100, 2) if r["dividend_yield"] else None,
            "high_52w": high52,
            "low_52w": low52,
            "week_change_52": week_change_52,
            "sparkline": sparkline_map.get(t, []),
        })

    # ── Summary stats ──
    summary = await _get_market_summary(db, latest_date, prev_date)

    result = {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "summary": summary,
    }
    await cache_set(cache_key, result, ttl=180)
    return result


# ────────────────────────────────────────────────────────────────────
# 2. Sectors list
# ────────────────────────────────────────────────────────────────────
async def get_sectors(db: AsyncSession) -> List[Dict[str, Any]]:
    cache_key = "stock_list:sectors"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    mv_data = await _get_sectors_from_mv(db)
    if mv_data is not None:
        await cache_set(cache_key, mv_data, ttl=3600)
        return mv_data

    sql = text(f"""
        WITH co_dedup AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                CASE
                    WHEN icb_name3 IS NOT NULL AND BTRIM(icb_name3) NOT IN ('', 'NaN') THEN BTRIM(icb_name3)
                    WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
                    ELSE 'Chưa phân loại'
                END AS sector
            FROM {SCHEMA}.company_overview
            WHERE ticker IS NOT NULL
              AND BTRIM(ticker) NOT IN ('', 'NaN')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
              AND (exchange IS NULL OR (BTRIM(exchange) != 'NaN' AND BTRIM(exchange) != 'DELISTED'))
            ORDER BY UPPER(BTRIM(ticker)),
                CASE
                    WHEN icb_name3 IS NOT NULL AND BTRIM(icb_name3) NOT IN ('', 'NaN') THEN 0
                    WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN 1
                    ELSE 2
                END
        )
        SELECT sector AS name, COUNT(*) AS count
        FROM co_dedup
        GROUP BY sector
        ORDER BY count DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()
    if not rows:
        return None
    data = [{"name": r["name"], "count": r["count"]} for r in rows]
    await cache_set(cache_key, data, ttl=3600)
    return data


# ────────────────────────────────────────────────────────────────────
# 3. Most viewed stocks (by click count)
# ────────────────────────────────────────────────────────────────────
async def get_most_viewed(
    db: AsyncSession, limit: int = 10, days: int = 30
) -> List[Dict[str, Any]]:
    cache_key = f"stock_list:most_viewed:{limit}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            sc.ticker,
            co.organ_short_name AS company_name,
            COUNT(sc.id) AS click_count
        FROM {SYSTEM_SCHEMA}.stock_clicks sc
        LEFT JOIN {SCHEMA}.company_overview co ON co.ticker = sc.ticker
            AND co.exchange != 'NaN' AND co.exchange IS NOT NULL
        WHERE sc.clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY sc.ticker, co.organ_short_name
        ORDER BY click_count DESC
        LIMIT :limit
    """)
    try:
        res = await db.execute(sql, {"limit": limit, "days": days})
        rows = res.mappings().all()
    except Exception as exc:
        logger.warning("most_viewed query error: %s", exc)
        return []

    data = [
        {
            "ticker": r["ticker"],
            "company_name": r["company_name"] if r["company_name"] and r["company_name"] != "NaN" else None,
            "click_count": r["click_count"],
        }
        for r in rows
    ]
    await cache_set(cache_key, data, ttl=300)
    return data


# ────────────────────────────────────────────────────────────────────
# 4. Hot stock search keywords
# ────────────────────────────────────────────────────────────────────
async def get_hot_stock_search(
    db: AsyncSession, limit: int = 12, days: int = 7
) -> List[Dict[str, Any]]:
    cache_key = f"stock_list:hot_search:{limit}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            keyword,
            COUNT(*) AS search_count
        FROM {SYSTEM_SCHEMA}.stock_search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword
        ORDER BY search_count DESC
        LIMIT :limit
    """)
    try:
        res = await db.execute(sql, {"limit": limit, "days": days})
        rows = res.mappings().all()
    except Exception as exc:
        logger.warning("hot_stock_search query error: %s", exc)
        return []

    data = [{"keyword": r["keyword"], "search_count": r["search_count"]} for r in rows]
    await cache_set(cache_key, data, ttl=300)
    return data


# ────────────────────────────────────────────────────────────────────
# 5. Track stock click
# ────────────────────────────────────────────────────────────────────
async def track_stock_click(
    db: AsyncSession,
    ticker: str,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.stock_clicks (ticker, session_id, ip_address)
        VALUES (:ticker, :session_id, :ip_address)
    """)
    try:
        await db.execute(sql, {
            "ticker": ticker.upper().strip(),
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_stock_click error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 6. Track stock search
# ────────────────────────────────────────────────────────────────────
async def track_stock_search(
    db: AsyncSession,
    keyword: str,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.stock_search_logs (keyword, session_id, ip_address)
        VALUES (:keyword, :session_id, :ip_address)
    """)
    try:
        await db.execute(sql, {
            "keyword": keyword.strip().lower(),
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_stock_search error: %s", exc)
        return False


# ════════════════════════════════════════════════════════════════════
# Private helpers
# ════════════════════════════════════════════════════════════════════

async def _get_stock_overview_from_mv(
    db: AsyncSession,
    page: int,
    page_size: int,
    search: Optional[str],
    sector: Optional[str],
    exchange: Optional[str],
    sort_by: str,
    sort_dir: str,
) -> Optional[Dict[str, Any]]:
    """Return stock overview from materialized view, or None if unavailable."""
    sort_col = MV_SORT_MAP.get(sort_by, "mv.market_cap")
    sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    conditions: List[str] = []
    params: Dict[str, Any] = {}

    if search:
        conditions.append(
            "(mv.ticker ILIKE :search OR COALESCE(mv.company_name, '') ILIKE :search)"
        )
        params["search"] = f"%{search}%"
    if sector:
        conditions.append("mv.sector = :sector")
        params["sector"] = sector
    if exchange:
        conditions.append("mv.exchange = :exchange")
        params["exchange"] = exchange.upper().strip()

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    count_sql = text(f"""
        SELECT COUNT(*)
        FROM {SCREENER_MV} mv
        WHERE {where_clause}
    """)

    try:
        count_res = await db.execute(count_sql, params)
        total = count_res.scalar() or 0
    except Exception as exc:
        logger.info("stock overview MV unavailable, fallback to legacy query: %s", exc)
        await db.rollback()
        return None

    if total == 0:
        return None

    total_pages = math.ceil(total / page_size)
    offset = (page - 1) * page_size

    data_sql = text(f"""
        SELECT
            mv.ticker,
            mv.company_name,
            mv.sector,
            mv.exchange,
            mv.current_price,
            mv.price_change,
            mv.price_change_percent,
            mv.volume,
            mv.avg_volume_10d,
            mv.market_cap,
            mv.pe,
            mv.pb,
            mv.eps,
            mv.roe,
            mv.roa,
            mv.debt_to_equity,
            mv.dividend_yield,
            mv.high_52w,
            mv.low_52w,
            mv.week_change_52,
            mv.sparkline
        FROM {SCREENER_MV} mv
        WHERE {where_clause}
        ORDER BY {sort_col} {sort_direction} NULLS LAST
        LIMIT :limit OFFSET :offset
    """)

    summary_sql = text(f"""
        SELECT
            COUNT(*) AS total_stocks,
            COUNT(*) FILTER (WHERE mv.price_change > 0) AS total_up,
            COUNT(*) FILTER (WHERE mv.price_change < 0) AS total_down,
            COUNT(*) FILTER (WHERE mv.price_change = 0) AS total_unchanged,
            COALESCE(SUM(mv.volume), 0) AS total_volume,
            AVG(mv.pe) FILTER (WHERE mv.pe > 0 AND mv.pe < 200) AS avg_pe
        FROM {SCREENER_MV} mv
    """)

    query_params = {"limit": page_size, "offset": offset, **params}
    try:
        res = await db.execute(data_sql, query_params)
        rows = res.mappings().all()
    except Exception as exc:
        logger.info("stock overview MV data query failed, fallback to legacy query: %s", exc)
        await db.rollback()
        return None

    if not rows:
        return None

    try:
        summary_res = await db.execute(summary_sql)
        summary_row = summary_res.mappings().first()
    except Exception as exc:
        logger.info("stock overview MV summary query failed, fallback to legacy query: %s", exc)
        await db.rollback()
        return None

    data = []
    for r in rows:
        sparkline_raw = r["sparkline"] or []
        sparkline = [float(x) for x in sparkline_raw if x is not None]
        data.append({
            "ticker": r["ticker"],
            "company_name": r["company_name"],
            "sector": r["sector"],
            "exchange": r["exchange"],
            "current_price": float(r["current_price"]) if r["current_price"] is not None else None,
            "price_change": float(r["price_change"]) if r["price_change"] is not None else None,
            "price_change_percent": float(r["price_change_percent"]) if r["price_change_percent"] is not None else None,
            "volume": int(r["volume"]) if r["volume"] is not None else None,
            "avg_volume_10d": int(r["avg_volume_10d"]) if r["avg_volume_10d"] is not None else None,
            "market_cap": float(r["market_cap"]) if r["market_cap"] is not None else None,
            "pe": float(r["pe"]) if r["pe"] is not None else None,
            "pb": float(r["pb"]) if r["pb"] is not None else None,
            "eps": float(r["eps"]) if r["eps"] is not None else None,
            "roe": float(r["roe"]) if r["roe"] is not None else None,
            "roa": float(r["roa"]) if r["roa"] is not None else None,
            "debt_to_equity": float(r["debt_to_equity"]) if r["debt_to_equity"] is not None else None,
            "dividend_yield": float(r["dividend_yield"]) if r["dividend_yield"] is not None else None,
            "high_52w": float(r["high_52w"]) if r["high_52w"] is not None else None,
            "low_52w": float(r["low_52w"]) if r["low_52w"] is not None else None,
            "week_change_52": float(r["week_change_52"]) if r["week_change_52"] is not None else None,
            "sparkline": sparkline,
        })

    return {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "summary": {
            "total_stocks": int(summary_row["total_stocks"] or 0) if summary_row else 0,
            "total_up": int(summary_row["total_up"] or 0) if summary_row else 0,
            "total_down": int(summary_row["total_down"] or 0) if summary_row else 0,
            "total_unchanged": int(summary_row["total_unchanged"] or 0) if summary_row else 0,
            "total_volume": int(summary_row["total_volume"] or 0) if summary_row else 0,
            "avg_pe": round(float(summary_row["avg_pe"]), 1) if summary_row and summary_row["avg_pe"] is not None else None,
        },
    }


async def _get_sectors_from_mv(db: AsyncSession) -> Optional[List[Dict[str, Any]]]:
    """Return sector list from materialized view, or None if unavailable."""
    sql = text(f"""
        SELECT mv.sector AS name, COUNT(*) AS count
        FROM {SCREENER_MV} mv
        GROUP BY mv.sector
        ORDER BY count DESC
    """)

    try:
        res = await db.execute(sql)
    except Exception as exc:
        logger.info("sector MV unavailable, fallback to legacy query: %s", exc)
        await db.rollback()
        return None

    rows = res.mappings().all()
    if not rows:
        return None
    return [{"name": r["name"], "count": r["count"]} for r in rows]


async def _get_screener_base_from_mv(db: AsyncSession) -> Optional[List[Dict[str, Any]]]:
    """Return screener base rows from materialized view with legacy-compatible keys."""
    sql = text(f"""
        SELECT
            mv.ticker,
            mv.company_name,
            mv.sector,
            mv.sector2,
            mv.exchange,
            (mv.current_price / 1000.0) AS close_raw,
            ((mv.current_price - mv.price_change) / 1000.0) AS prev_close_raw,
            mv.volume,
            mv.market_cap,
            mv.pe,
            mv.pb,
            mv.eps,
            mv.shares,
            mv.equity,
            mv.ttm_ni,
            mv.prev_ni,
            mv.ttm_rev,
            mv.prev_rev,
            (mv.roe / 100.0) AS roe,
            (mv.roa / 100.0) AS roa,
            mv.debt_to_equity,
            (mv.dividend_yield / 100.0) AS dividend_yield,
            mv.total_liabilities,
            mv.ttm_div,
            mv.foreign_buy,
            mv.foreign_sell,
            mv.eb_price,
            (mv.high_52w / 1000.0) AS high_52w,
            (mv.low_52w / 1000.0) AS low_52w,
            mv.sparkline
        FROM {SCREENER_MV} mv
        ORDER BY mv.market_cap DESC NULLS LAST
    """)

    try:
        res = await db.execute(sql)
    except Exception as exc:
        logger.info("screener MV unavailable, fallback to legacy query: %s", exc)
        await db.rollback()
        return None
    rows = res.mappings().all()
    if not rows:
        return None
    return rows

async def _get_sparklines(
    db: AsyncSession, tickers: List[str], latest_date: str
) -> Dict[str, List[float]]:
    """Get last 20 trading days close prices for sparkline charts."""
    if not tickers:
        return {}

    sql = text(f"""
        SELECT ticker, close
        FROM (
            SELECT
                ticker, close, trading_date,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trading_date DESC) AS rn
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers)
              AND trading_date <= :latest_date
        ) sub
        WHERE rn <= 20
        ORDER BY ticker, trading_date ASC
    """)
    try:
        res = await db.execute(sql, {"tickers": tickers, "latest_date": latest_date})
        rows = res.fetchall()
    except Exception as exc:
        logger.warning("sparkline query error: %s", exc)
        return {}

    result: Dict[str, List[float]] = {}
    for row in rows:
        t = row[0]
        c = float(row[1]) if row[1] else 0
        result.setdefault(t, []).append(c)
    return result


async def _get_avg_volume(
    db: AsyncSession, tickers: List[str], latest_date: str
) -> Dict[str, int]:
    """Get 10-day average volume."""
    if not tickers:
        return {}

    sql = text(f"""
        SELECT ticker, ROUND(AVG(volume)) AS avg_vol
        FROM (
            SELECT ticker, volume,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trading_date DESC) AS rn
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers)
              AND trading_date <= :latest_date
        ) sub
        WHERE rn <= 10
        GROUP BY ticker
    """)
    try:
        res = await db.execute(sql, {"tickers": tickers, "latest_date": latest_date})
        rows = res.fetchall()
    except Exception as exc:
        logger.warning("avg_volume query error: %s", exc)
        return {}

    return {row[0]: int(row[1]) if row[1] else 0 for row in rows}


async def _get_52w_range(
    db: AsyncSession, tickers: List[str], latest_date: str
) -> Dict[str, Dict[str, float]]:
    """Get 52-week high and low."""
    if not tickers:
        return {}

    sql = text(f"""
        SELECT ticker, MAX(high) AS high_52w, MIN(low) AS low_52w
        FROM {SCHEMA}.history_price
        WHERE ticker = ANY(:tickers)
          AND trading_date >= :date_52w_ago
        GROUP BY ticker
    """)
    # trading_date is stored as text (YYYY-MM-DD), so string comparison works
    from datetime import datetime, timedelta
    try:
        dt = datetime.strptime(latest_date, "%Y-%m-%d")
    except Exception:
        return {}
    date_52w_ago = (dt - timedelta(days=365)).strftime("%Y-%m-%d")
    try:
        res = await db.execute(sql, {"tickers": tickers, "date_52w_ago": date_52w_ago})
        rows = res.fetchall()
    except Exception as exc:
        logger.warning("52w_range query error: %s", exc)
        return {}

    return {
        row[0]: {
            "high": float(row[1]) if row[1] else None,
            "low": float(row[2]) if row[2] else None,
        }
        for row in rows
    }


async def _get_market_summary(
    db: AsyncSession, latest_date: str, prev_date: Optional[str]
) -> Dict[str, Any]:
    """Compute market summary stats."""
    cache_key = f"stock_list:summary:{latest_date}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    if not prev_date:
        return {
            "total_stocks": 0, "total_up": 0, "total_down": 0,
            "total_unchanged": 0, "total_volume": 0, "avg_pe": None,
        }

    sql = text(f"""
        SELECT
            COUNT(*) AS total_stocks,
            SUM(CASE WHEN hp.close > hp_prev.close THEN 1 ELSE 0 END) AS total_up,
            SUM(CASE WHEN hp.close < hp_prev.close THEN 1 ELSE 0 END) AS total_down,
            SUM(CASE WHEN hp.close = hp_prev.close THEN 1 ELSE 0 END) AS total_unchanged,
            SUM(hp.volume) AS total_volume
        FROM {SCHEMA}.history_price hp
        LEFT JOIN {SCHEMA}.history_price hp_prev
            ON hp_prev.ticker = hp.ticker AND hp_prev.trading_date = :prev_date
        WHERE hp.trading_date = :latest_date
    """)
    res = await db.execute(sql, {"latest_date": latest_date, "prev_date": prev_date})
    row = res.mappings().first()

    # Average PE
    pe_sql = text(f"""
        SELECT AVG(pe) AS avg_pe
        FROM (
            SELECT DISTINCT ON (ticker) pe
            FROM {SCHEMA}.financial_ratio
            WHERE pe IS NOT NULL AND pe > 0 AND pe < 200
            ORDER BY ticker, year DESC, quarter DESC
        ) sub
    """)
    pe_res = await db.execute(pe_sql)
    avg_pe = pe_res.scalar()

    summary = {
        "total_stocks": int(row["total_stocks"]) if row else 0,
        "total_up": int(row["total_up"] or 0) if row else 0,
        "total_down": int(row["total_down"] or 0) if row else 0,
        "total_unchanged": int(row["total_unchanged"] or 0) if row else 0,
        "total_volume": int(row["total_volume"] or 0) if row else 0,
        "avg_pe": round(float(avg_pe), 1) if avg_pe else None,
    }
    await cache_set(cache_key, summary, ttl=300)
    return summary


def _empty_response(page: int, page_size: int) -> Dict[str, Any]:
    return {
        "data": [],
        "total": 0,
        "page": page,
        "page_size": page_size,
        "total_pages": 0,
        "summary": {
            "total_stocks": 0, "total_up": 0, "total_down": 0,
            "total_unchanged": 0, "total_volume": 0, "avg_pe": None,
        },
    }


# ════════════════════════════════════════════════════════════════════
# 7. Stock Screener — full dataset with all metrics
# ════════════════════════════════════════════════════════════════════

def _compute_rsi(closes: List[float], period: int = 14) -> Optional[float]:
    """Compute RSI (Relative Strength Index) from a list of close prices."""
    if len(closes) < period + 1:
        return None
    changes = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(c, 0) for c in changes]
    losses = [max(-c, 0) for c in changes]

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(changes)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - 100 / (1 + rs)


def _compute_ema(data: List[float], period: int) -> List[float]:
    """Compute Exponential Moving Average."""
    if not data:
        return []
    k = 2 / (period + 1)
    result = [data[0]]
    for i in range(1, len(data)):
        result.append(data[i] * k + result[-1] * (1 - k))
    return result


def _compute_macd_signal(closes: List[float]) -> str:
    """Compute MACD signal: 'Mua', 'Bán', or 'Trung tính'."""
    if len(closes) < 35:
        return "Trung tính"

    ema12 = _compute_ema(closes, 12)
    ema26 = _compute_ema(closes, 26)
    macd_line = [ema12[i] - ema26[i] for i in range(len(closes))]
    signal_line = _compute_ema(macd_line, 9)

    if macd_line[-1] > signal_line[-1]:
        return "Mua"
    elif macd_line[-1] < signal_line[-1]:
        return "Bán"
    return "Trung tính"


def _determine_signal(
    rsi: Optional[float], macd: Optional[str], ma_trend: Optional[str]
) -> str:
    """Derive overall signal from RSI, MACD, and MA20 trend."""
    buy = 0
    sell = 0
    if macd == "Mua":
        buy += 1
    elif macd == "Bán":
        sell += 1
    if ma_trend == "Trên MA20":
        buy += 1
    elif ma_trend == "Dưới MA20":
        sell += 1
    if rsi is not None:
        if rsi > 70:
            sell += 1
        elif rsi < 30:
            buy += 1

    if buy >= 2 and sell == 0:
        return "Mua"
    elif sell >= 2 and buy == 0:
        return "Bán"
    elif buy > sell:
        return "Theo dõi"
    return "Nắm giữ"


async def get_screener_data(db: AsyncSession) -> Dict[str, Any]:
    """
    Return full stock screener dataset.
    Computes P/E, P/B, EPS from BCTC; growth from YoY BCTC;
    technical indicators (RSI14, MACD, MA20) from price history.
    """
    cache_key = "stock_list:screener"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    mv_base_rows = await _get_screener_base_from_mv(db)

    # ── Latest & previous trading dates ──
    latest_date_sql = text(f"""
        SELECT MAX(trading_date) FROM {SCHEMA}.history_price
    """)
    res = await db.execute(latest_date_sql)
    latest_date = res.scalar()
    if not latest_date:
        return {"data": [], "total": 0}

    prev_date_sql = text(f"""
        SELECT MAX(trading_date) FROM {SCHEMA}.history_price
        WHERE trading_date < :latest_date
    """)
    res = await db.execute(prev_date_sql, {"latest_date": latest_date})
    prev_date = res.scalar()

    # Compute date boundaries
    try:
        dt = datetime.strptime(str(latest_date), "%Y-%m-%d")
    except Exception:
        dt = datetime.now()
    date_1y_ago = (dt - timedelta(days=365)).strftime("%Y-%m-%d")
    date_90d_ago = (dt - timedelta(days=120)).strftime("%Y-%m-%d")  # ~60 trading days

    # ── Main query: price + company + BCTC valuations + financial ratios + foreign ──
    main_sql = text(f"""
        WITH ticker_universe AS (
            SELECT ticker FROM {SCHEMA}.company_overview
            UNION
            SELECT ticker FROM {SCHEMA}.history_price
            WHERE trading_date = :latest_date
            UNION
            SELECT ticker FROM {SCHEMA}.financial_ratio
            UNION
            SELECT ticker FROM {SCHEMA}.bctc
            UNION
            SELECT ticker FROM {SCHEMA}.electric_board
            WHERE trading_date = (SELECT MAX(trading_date) FROM {SCHEMA}.electric_board)
        ),
        base_stocks AS (
            SELECT DISTINCT UPPER(BTRIM(ticker)) AS ticker
            FROM ticker_universe
            WHERE ticker IS NOT NULL
              AND BTRIM(ticker) NOT IN ('', 'NaN')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
        ),
        bctc_data AS (
            SELECT UPPER(BTRIM(ticker)) AS ticker, year, quarter, ind_code, value
            FROM {SCHEMA}.bctc
            WHERE ind_code IN (
                'cp_pho_thong',
                'vcsh',
                'no_phai_tra',
                'lnst_cua_co_dong_cong_ty_me',
                'doanh_thu_thuan',
                'co_tuc_da_tra'
            ) AND value IS NOT NULL AND value != 0
        ),
        shares AS (
            SELECT DISTINCT ON (ticker)
                ticker, value / 10000.0 AS shares
            FROM bctc_data
            WHERE ind_code = 'cp_pho_thong' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        equity AS (
            SELECT DISTINCT ON (ticker)
                ticker, value AS equity
            FROM bctc_data
            WHERE ind_code = 'vcsh' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        total_liabilities AS (
            SELECT DISTINCT ON (ticker)
                ticker, value AS liabilities
            FROM bctc_data
            WHERE ind_code = 'no_phai_tra'
            ORDER BY ticker, year DESC, quarter DESC
        ),
        ranked_div AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'co_tuc_da_tra'
        ),
        ttm_div AS (
            SELECT ticker, SUM(ABS(value)) AS ttm_div
            FROM ranked_div WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        ranked_ni AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'lnst_cua_co_dong_cong_ty_me'
        ),
        ttm_ni AS (
            SELECT ticker, SUM(value) AS ttm_ni
            FROM ranked_ni WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        prev_ni AS (
            SELECT ticker, SUM(value) AS prev_ni
            FROM ranked_ni WHERE rn BETWEEN 5 AND 8
            GROUP BY ticker HAVING COUNT(*) = 4
        ),
        ranked_rev AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'doanh_thu_thuan'
        ),
        ttm_rev AS (
            SELECT ticker, SUM(value) AS ttm_rev
            FROM ranked_rev WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        prev_rev AS (
            SELECT ticker, SUM(value) AS prev_rev
            FROM ranked_rev WHERE rn BETWEEN 5 AND 8
            GROUP BY ticker HAVING COUNT(*) = 4
        ),
        latest_fr AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                roe,
                roa,
                debt_to_equity,
                dividend_yield,
                market_cap,
                pe,
                pb,
                eps
            FROM {SCHEMA}.financial_ratio
            ORDER BY UPPER(BTRIM(ticker)), year DESC, quarter DESC
        ),
        hp_latest AS (
            SELECT UPPER(BTRIM(ticker)) AS ticker, close, volume
            FROM {SCHEMA}.history_price
            WHERE trading_date = :latest_date
        ),
        hp_prev AS (
            SELECT UPPER(BTRIM(ticker)) AS ticker, close
            FROM {SCHEMA}.history_price
            WHERE trading_date = :prev_date
        ),
        co_dedup AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                CASE
                    WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) NOT IN ('', 'NaN')
                        THEN BTRIM(organ_short_name)
                    WHEN organ_name IS NOT NULL AND BTRIM(organ_name) NOT IN ('', 'NaN')
                        THEN BTRIM(organ_name)
                    ELSE NULL
                END AS company_name,
                CASE
                    WHEN icb_name3 IS NOT NULL AND BTRIM(icb_name3) NOT IN ('', 'NaN') THEN BTRIM(icb_name3)
                    WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
                    ELSE 'Chưa phân loại'
                END AS sector,
                CASE
                    WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
                    ELSE NULL
                END AS sector2,
                CASE
                    WHEN exchange = 'HSX' THEN 'HOSE'
                    WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
                    ELSE NULL
                END AS exchange
            FROM {SCHEMA}.company_overview
            WHERE exchange IS NULL OR (BTRIM(exchange) != 'NaN' AND BTRIM(exchange) != 'DELISTED')
            ORDER BY UPPER(BTRIM(ticker)),
                CASE WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN' THEN 0 ELSE 1 END,
                exchange
        ),
        latest_eb AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                COALESCE(foreign_buy_volume, 0) AS foreign_buy,
                COALESCE(foreign_sell_volume, 0) AS foreign_sell,
                CASE WHEN match_price > 0 THEN match_price ELSE ref_price END AS eb_price
            FROM {SCHEMA}.electric_board
            WHERE match_price > 0 OR ref_price > 0
            ORDER BY UPPER(BTRIM(ticker)), trading_date DESC
        ),
        week52 AS (
            SELECT UPPER(BTRIM(ticker)) AS ticker,
                MAX(high) AS high_52w,
                MIN(low) AS low_52w
            FROM {SCHEMA}.history_price
            WHERE trading_date >= :date_1y_ago
            GROUP BY UPPER(BTRIM(ticker))
        )
        SELECT
            bs.ticker,
            co.company_name,
            co.sector,
            co.sector2,
            co.exchange,
            hp.close AS close_raw,
            hp_prev.close AS prev_close_raw,
            hp.volume,
            sh.shares,
            eq.equity,
            ni.ttm_ni,
            pn.prev_ni,
            tr.ttm_rev,
            pr.prev_rev,
            fr.roe,
            fr.roa,
            fr.debt_to_equity,
            fr.dividend_yield,
            fr.market_cap,
            fr.pe,
            fr.pb,
            fr.eps,
            tl.liabilities AS total_liabilities,
            dv.ttm_div,
            eb.foreign_buy,
            eb.foreign_sell,
            eb.eb_price,
            w52.high_52w,
            w52.low_52w
        FROM base_stocks bs
        LEFT JOIN hp_latest hp ON hp.ticker = bs.ticker
        LEFT JOIN hp_prev ON hp_prev.ticker = bs.ticker
        LEFT JOIN co_dedup co ON co.ticker = bs.ticker
        LEFT JOIN shares sh ON sh.ticker = bs.ticker
        LEFT JOIN equity eq ON eq.ticker = bs.ticker
        LEFT JOIN ttm_ni ni ON ni.ticker = bs.ticker
        LEFT JOIN prev_ni pn ON pn.ticker = bs.ticker
        LEFT JOIN ttm_rev tr ON tr.ticker = bs.ticker
        LEFT JOIN prev_rev pr ON pr.ticker = bs.ticker
        LEFT JOIN latest_fr fr ON fr.ticker = bs.ticker
        LEFT JOIN total_liabilities tl ON tl.ticker = bs.ticker
        LEFT JOIN ttm_div dv ON dv.ticker = bs.ticker
        LEFT JOIN latest_eb eb ON eb.ticker = bs.ticker
        LEFT JOIN week52 w52 ON w52.ticker = bs.ticker
        ORDER BY
            CASE WHEN sh.shares > 0 AND hp.close IS NOT NULL THEN hp.close * sh.shares ELSE 0 END DESC NULLS LAST
    """)

    if mv_base_rows is not None:
        base_rows = mv_base_rows
    else:
        try:
            res = await db.execute(main_sql, {
                "latest_date": latest_date,
                "prev_date": prev_date,
                "date_1y_ago": date_1y_ago,
            })
            base_rows = res.mappings().all()
        except Exception as exc:
            logger.error("screener main query error: %s", exc)
            return {"data": [], "total": 0}

    if not base_rows:
        return {"data": [], "total": 0}

    # ── Price history for technical indicators ──
    price_series: Dict[str, List[float]] = defaultdict(list)
    vol_series: Dict[str, List[int]] = defaultdict(list)

    if mv_base_rows is not None:
        # MV already stores last 20 closes in thousand-VND units.
        for row in base_rows:
            ticker = row.get("ticker")
            if not ticker:
                continue
            sparkline = row.get("sparkline") or []
            price_series[ticker] = [float(x) / 1000.0 for x in sparkline if x is not None]
            if row.get("volume") is not None:
                vol_series[ticker] = [int(row["volume"])]
    else:
        ticker_list = [r["ticker"] for r in base_rows if r.get("ticker")]
        history_rows = []
        if ticker_list:
            history_sql = text(f"""
                SELECT UPPER(BTRIM(ticker)) AS ticker, trading_date, close, volume
                FROM {SCHEMA}.history_price
                WHERE trading_date >= :date_90d_ago AND trading_date <= :latest_date
                  AND UPPER(BTRIM(ticker)) = ANY(:tickers)
                ORDER BY UPPER(BTRIM(ticker)), trading_date ASC
            """)
            try:
                res = await db.execute(history_sql, {
                    "date_90d_ago": date_90d_ago,
                    "latest_date": latest_date,
                    "tickers": ticker_list,
                })
                history_rows = res.fetchall()
            except Exception as exc:
                logger.warning("screener history query error: %s", exc)

        for row in history_rows:
            ticker = row[0]
            close_val = float(row[2]) if row[2] else 0
            vol_val = int(row[3]) if row[3] else 0
            price_series[ticker].append(close_val)
            vol_series[ticker].append(vol_val)

    # ── Compute technical indicators per ticker ──
    tech_map: Dict[str, Dict[str, Any]] = {}
    for ticker, closes in price_series.items():
        # RSI14
        rsi14 = _compute_rsi(closes, 14)

        # MA20 trend
        ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
        ma20_trend = None
        if ma20 and closes:
            ma20_trend = "Trên MA20" if closes[-1] > ma20 else "Dưới MA20"

        # MACD signal
        macd_signal = _compute_macd_signal(closes)

        # Sparkline (last 20 closes × 1000 → VND)
        sparkline = [round(c * 1000, 0) for c in closes[-20:]]

        # Avg volume 10d
        vols = vol_series.get(ticker, [])
        avg_vol_10d = round(sum(vols[-10:]) / min(len(vols[-10:]), 10)) if vols else None

        tech_map[ticker] = {
            "rsi14": round(rsi14, 1) if rsi14 is not None else None,
            "ma20_trend": ma20_trend,
            "macd_signal": macd_signal,
            "sparkline": sparkline,
            "avg_vol_10d": avg_vol_10d,
        }

    # ── Build final response items ──
    data: List[Dict[str, Any]] = []
    for r in base_rows:
        t = r["ticker"]
        tech = tech_map.get(t, {})

        close_raw = float(r["close_raw"]) if r["close_raw"] else None
        prev_raw = float(r["prev_close_raw"]) if r["prev_close_raw"] else None
        shares = float(r["shares"]) if r["shares"] else None
        equity_val = float(r["equity"]) if r["equity"] else None
        ttm_ni_val = float(r["ttm_ni"]) if r["ttm_ni"] else None
        prev_ni_val = float(r["prev_ni"]) if r["prev_ni"] else None
        ttm_rev_val = float(r["ttm_rev"]) if r["ttm_rev"] else None
        prev_rev_val = float(r["prev_rev"]) if r["prev_rev"] else None

        # Current price (VND)
        current_price = round(close_raw * 1000, 0) if close_raw else None

        # Price change
        price_change = None
        price_change_pct = None
        if close_raw and prev_raw and prev_raw > 0:
            price_change = round((close_raw - prev_raw) * 1000, 0)
            price_change_pct = round((close_raw - prev_raw) / prev_raw * 100, 2)

        # Market cap (tỷ VND)
        market_cap = float(r["market_cap"]) if r["market_cap"] is not None else None
        if market_cap is None and close_raw and shares and shares > 0:
            market_cap = round(close_raw * 1000 * shares / 1e9, 1)

        # EPS (VND)
        eps = float(r["eps"]) if r["eps"] is not None else None
        if eps is None and ttm_ni_val is not None and shares and shares > 0:
            eps = round(ttm_ni_val / shares, 0)

        # P/E
        pe = float(r["pe"]) if r["pe"] is not None else None
        if pe is None and eps and eps > 0 and current_price:
            pe_val = current_price / eps
            if 0 < pe_val < 500:
                pe = round(pe_val, 2)

        # P/B
        pb = float(r["pb"]) if r["pb"] is not None else None
        if pb is None and close_raw and shares and shares > 0 and equity_val and equity_val > 0:
            pb_val = close_raw * 1000 * shares / equity_val
            if 0 < pb_val < 100:
                pb = round(pb_val, 2)

        # ROE, ROA (stored as ratios → convert to %)
        roe = round(float(r["roe"]) * 100, 2) if r["roe"] else None
        roa = round(float(r["roa"]) * 100, 2) if r["roa"] else None

        # Debt to equity — prefer financial_ratio, fallback to BCTC (liabilities / equity)
        dte = round(float(r["debt_to_equity"]), 2) if r["debt_to_equity"] is not None else None
        total_liab = float(r["total_liabilities"]) if r["total_liabilities"] else None
        if dte is None and total_liab is not None and equity_val and equity_val > 0:
            dte = round(total_liab / equity_val, 2)

        # Dividend yield — prefer financial_ratio, fallback to BCTC TTM dividends / market_cap
        div_yield = round(float(r["dividend_yield"]) * 100, 2) if r["dividend_yield"] is not None else None
        ttm_div_val = float(r["ttm_div"]) if r["ttm_div"] else None
        if div_yield is None and ttm_div_val and ttm_div_val > 0 and close_raw and shares and shares > 0:
            mkt = close_raw * 1000 * shares
            if mkt > 0:
                div_yield = round(ttm_div_val / mkt * 100, 2)

        # Revenue growth (TTM vs prev TTM, %)
        revenue_growth = None
        if ttm_rev_val is not None and prev_rev_val and prev_rev_val != 0:
            revenue_growth = round(
                (ttm_rev_val - prev_rev_val) / abs(prev_rev_val) * 100, 1
            )

        # Profit growth (TTM vs prev TTM, %)
        profit_growth = None
        if ttm_ni_val is not None and prev_ni_val and prev_ni_val != 0:
            profit_growth = round(
                (ttm_ni_val - prev_ni_val) / abs(prev_ni_val) * 100, 1
            )

        # Foreign net buy (tỷ VND)
        foreign_net_buy = None
        if r["foreign_buy"] is not None and r["foreign_sell"] is not None and r["eb_price"]:
            eb_price = float(r["eb_price"])
            if eb_price > 0:
                net_vol = int(r["foreign_buy"]) - int(r["foreign_sell"])
                foreign_net_buy = round(net_vol * eb_price / 1e9, 2)

        # 52-week high/low (× 1000 → VND)
        high_52w = round(float(r["high_52w"]) * 1000, 0) if r["high_52w"] else None
        low_52w = round(float(r["low_52w"]) * 1000, 0) if r["low_52w"] else None

        # 52-week change
        week_change_52 = None
        if current_price and low_52w and low_52w > 0:
            week_change_52 = round((current_price - low_52w) / low_52w * 100, 2)

        # Signal
        rsi14 = tech.get("rsi14")
        macd_sig = tech.get("macd_signal", "Trung tính")
        ma20_tr = tech.get("ma20_trend", "Dưới MA20")
        signal = _determine_signal(rsi14, macd_sig, ma20_tr)

        # Normalize exchange: HSX → HOSE
        raw_exchange = r["exchange"]
        if raw_exchange == "HSX":
            raw_exchange = "HOSE"

        data.append({
            "ticker": t,
            "companyName": r["company_name"],
            "sector": r["sector"],
            "sector2": r["sector2"],
            "exchange": raw_exchange,
            "currentPrice": current_price,
            "priceChange": price_change,
            "priceChangePercent": price_change_pct,
            "volume": int(r["volume"]) if r["volume"] else None,
            "avgVolume10d": tech.get("avg_vol_10d"),
            "marketCap": market_cap,
            "pe": pe,
            "pb": pb,
            "eps": eps,
            "roe": roe,
            "roa": roa,
            "debtToEquity": dte,
            "dividendYield": div_yield,
            "revenueGrowth": revenue_growth,
            "profitGrowth": profit_growth,
            "foreignOwnership": None,   # Not available in current data
            "foreignNetBuy": foreign_net_buy,
            "weekChange52": week_change_52,
            "high52w": high_52w,
            "low52w": low_52w,
            "beta": None,               # Requires index correlation, not implemented
            "rsi14": rsi14,
            "macdSignal": macd_sig,
            "ma20Trend": ma20_tr,
            "signal": signal,
            "sparkline": tech.get("sparkline", []),
        })

    result = {"data": data, "total": len(data)}
    await cache_set(cache_key, result, ttl=300)
    return result
