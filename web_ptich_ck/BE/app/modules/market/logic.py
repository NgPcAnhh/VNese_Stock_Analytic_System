from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cached

logger = logging.getLogger(__name__)

# Statement timeout (ms) — cancel slow queries to protect pool
_STMT_TIMEOUT = text("SET LOCAL statement_timeout = '15000'")

SCHEMA = "hethong_phantich_chungkhoan"


# ────────────────────────────────────────────────────────────────────
# Helper: two most recent trading dates from history_price (text type)
# ────────────────────────────────────────────────────────────────────
_RANKED_DATES_CTE = f"""
    ranked_dates AS (
        SELECT trading_date,
               ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM {SCHEMA}.history_price
        WHERE close IS NOT NULL
        GROUP BY trading_date
        HAVING COUNT(*) >= 50
    ),
    latest_date AS (SELECT trading_date AS td FROM ranked_dates WHERE rn = 1),
    prev_date   AS (SELECT trading_date AS td FROM ranked_dates WHERE rn = 2)
"""

# Helper: two most recent trading dates from electric_board (date type)
_EB_RANKED_DATES_CTE = f"""
    eb_ranked AS (
        SELECT trading_date,
               ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM {SCHEMA}.electric_board
        WHERE match_price IS NOT NULL
        GROUP BY trading_date
    ),
    eb_latest AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 1),
    eb_prev   AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 2)
"""


def _slugify(name: str) -> str:
    """Convert Vietnamese sector name to a URL-safe slug."""
    s = name.lower().strip()
    s = re.sub(r"[àáạảãâầấậẩẫăằắặẳẵ]", "a", s)
    s = re.sub(r"[èéẹẻẽêềếệểễ]", "e", s)
    s = re.sub(r"[ìíịỉĩ]", "i", s)
    s = re.sub(r"[òóọỏõôồốộổỗơờớợởỡ]", "o", s)
    s = re.sub(r"[ùúụủũưừứựửữ]", "u", s)
    s = re.sub(r"[ỳýỵỷỹ]", "y", s)
    s = re.sub(r"đ", "d", s)
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def _fmt_market_cap(v: float) -> str:
    """Format market cap in tỷ VND."""
    if v >= 1_000_000:
        return f"{v / 1_000:,.0f}T"
    if v >= 1_000:
        return f"{v:,.0f}T"
    return f"{v:,.0f}T"


# ────────────────────────────────────────────────────────────────────
# 1. Market Heatmap
# ────────────────────────────────────────────────────────────────────
@cached("market:heatmap", ttl=120)
async def get_market_heatmap(
    db: AsyncSession, exchange: str = "all"
) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    exchange_filter = ""
    params: Dict[str, Any] = {}
    if exchange != "all":
        if exchange in ("HOSE", "HSX"):
            exchange_filter = "AND eb.exchange IN ('HOSE', 'HSX')"
        else:
            exchange_filter = "AND eb.exchange = :exchange"
            params["exchange"] = exchange

    sql = text(f"""
        SELECT sector, ticker, price, volume, p_change
        FROM (
            SELECT DISTINCT ON (eb.ticker)
                co.icb_name2                                      AS sector,
                eb.ticker,
                eb.match_price                                    AS price,
                COALESCE(eb.accumulated_volume, 0)                AS volume,
                CASE WHEN eb.ref_price > 0
                     THEN ROUND(((eb.match_price - eb.ref_price)
                                 / eb.ref_price * 100)::numeric, 2)
                     ELSE 0 END                                   AS p_change,
                eb.match_price * COALESCE(eb.accumulated_volume, 0) AS trade_val
            FROM {SCHEMA}.electric_board eb
            JOIN {SCHEMA}.company_overview co ON eb.ticker = co.ticker
            WHERE eb.trading_date = (
                    SELECT MAX(trading_date)
                    FROM {SCHEMA}.electric_board
                    WHERE match_price IS NOT NULL
                  )
              AND eb.match_price IS NOT NULL
              AND eb.match_price > 0
              AND co.icb_name2 IS NOT NULL
              {exchange_filter}
            ORDER BY eb.ticker, trade_val DESC
        ) sub
        ORDER BY sector, trade_val DESC
    """)
    res = await db.execute(sql, params)
    rows = res.mappings().all()

    sectors: Dict[str, List[Dict]] = {}
    for r in rows:
        sector = r["sector"]
        if sector not in sectors:
            sectors[sector] = []
        if len(sectors[sector]) < 20:
            sectors[sector].append({
                "name": r["ticker"],
                "value": float(r["price"] or 0) * int(r["volume"] or 0) / 1_000_000,
                "pChange": float(r["p_change"] or 0),
                "volume": int(r["volume"] or 0),
            })

    result = [
        {"name": sector, "children": stocks}
        for sector, stocks in sectors.items()
        if stocks
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 2. Cash Flow Distribution
# ────────────────────────────────────────────────────────────────────
@cached("market:cash_flow", ttl=120)
async def get_cash_flow(db: AsyncSession) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE}
        SELECT
            ROUND((SUM(CASE WHEN cur.close > prev.close
                        THEN cur.close * cur.volume ELSE 0 END) / 1e9)::numeric, 1) AS advancing_value,
            ROUND((SUM(CASE WHEN cur.close = prev.close
                        THEN cur.close * cur.volume ELSE 0 END) / 1e9)::numeric, 1) AS unchanged_value,
            ROUND((SUM(CASE WHEN cur.close < prev.close
                        THEN cur.close * cur.volume ELSE 0 END) / 1e9)::numeric, 1) AS declining_value,
            COUNT(*) FILTER (WHERE cur.close > prev.close) AS advancing_count,
            COUNT(*) FILTER (WHERE cur.close = prev.close) AS unchanged_count,
            COUNT(*) FILTER (WHERE cur.close < prev.close) AS declining_count
        FROM {SCHEMA}.history_price cur
        JOIN {SCHEMA}.history_price prev
            ON cur.ticker = prev.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        WHERE cur.trading_date = (SELECT td FROM latest_date)
          AND cur.close IS NOT NULL
          AND prev.close IS NOT NULL
          AND prev.close > 0
    """)
    res = await db.execute(sql)
    r = res.mappings().one()

    result = {
        "advancingValue": float(r["advancing_value"] or 0),
        "unchangedValue": float(r["unchanged_value"] or 0),
        "decliningValue": float(r["declining_value"] or 0),
        "advancingCount": int(r["advancing_count"] or 0),
        "unchangedCount": int(r["unchanged_count"] or 0),
        "decliningCount": int(r["declining_count"] or 0),
    }
    return result


# ────────────────────────────────────────────────────────────────────
# 3. Index Impact — Top stocks by estimated impact on VNINDEX
#    Uses trade-value weighting since financial_ratio may lack
#    outstanding_shares for some tickers.
# ────────────────────────────────────────────────────────────────────
@cached("market:index_impact", ttl=120)
async def get_index_impact(db: AsyncSession, limit: int = 10) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        market_total AS (
            SELECT SUM(cur.close * cur.volume) AS total_val
            FROM {SCHEMA}.history_price cur
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND cur.volume > 0
        )
        SELECT
            cur.ticker,
            ROUND(
                ((cur.close - prev.close) * cur.volume / mt.total_val * 1000)::numeric, 2
            ) AS impact
        FROM {SCHEMA}.history_price cur
        JOIN {SCHEMA}.history_price prev
            ON cur.ticker = prev.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        CROSS JOIN market_total mt
        WHERE cur.trading_date = (SELECT td FROM latest_date)
          AND cur.close IS NOT NULL
          AND prev.close IS NOT NULL
          AND prev.close > 0
          AND cur.volume > 0
          AND mt.total_val > 0
        ORDER BY ABS((cur.close - prev.close) * cur.volume) DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"limit": limit})
    rows = res.mappings().all()

    result = [
        {"ticker": r["ticker"], "impact": float(r["impact"] or 0)}
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 4. Foreign Flow — Net foreign by date (last N days)
#    electric_board.trading_date is DATE type — use INTERVAL for arithmetic.
# ────────────────────────────────────────────────────────────────────
@cached("market:foreign_flow", ttl=120)
async def get_foreign_flow(db: AsyncSession, days: int = 10) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH eb_max AS (
            SELECT MAX(trading_date) AS max_td
            FROM {SCHEMA}.electric_board
            WHERE match_price IS NOT NULL
        )
        SELECT
            eb.trading_date,
            ROUND((SUM(
                COALESCE(eb.foreign_buy_volume, 0) * eb.match_price
                - COALESCE(eb.foreign_sell_volume, 0) * eb.match_price
            ) / 1e9)::numeric, 1) AS net_val
        FROM {SCHEMA}.electric_board eb
        CROSS JOIN eb_max
        WHERE eb.match_price IS NOT NULL
          AND eb.match_price > 0
          AND eb.trading_date >= eb_max.max_td - make_interval(days => :days)
        GROUP BY eb.trading_date
        ORDER BY eb.trading_date ASC
    """)
    res = await db.execute(sql, {"days": days})
    rows = res.mappings().all()

    result = [
        {
            "date": r["trading_date"].strftime("%d/%m")
                if hasattr(r["trading_date"], "strftime")
                else str(r["trading_date"])[5:10].replace("-", "/"),
            "netVal": float(r["net_val"] or 0),
        }
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 5. Sector Overview — change + volume + value per sector
# ────────────────────────────────────────────────────────────────────
@cached("market:sector_overview", ttl=120)
async def get_sector_overview(db: AsyncSession) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE}
        SELECT
            co.icb_name2 AS name,
            ROUND(AVG(
                (cur.close - prev.close) / prev.close * 100
            )::numeric, 2) AS change,
            SUM(cur.volume)::bigint AS volume,
            ROUND((SUM(cur.close * cur.volume) / 1e9)::numeric, 0) AS value
        FROM {SCHEMA}.company_overview co
        JOIN {SCHEMA}.history_price cur
            ON cur.ticker = co.ticker
            AND cur.trading_date = (SELECT td FROM latest_date)
        JOIN {SCHEMA}.history_price prev
            ON prev.ticker = co.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        WHERE prev.close > 0
          AND cur.close IS NOT NULL
          AND co.icb_name2 IS NOT NULL
        GROUP BY co.icb_name2
        ORDER BY change DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    result = [
        {
            "name": r["name"],
            "change": float(r["change"] or 0),
            "volume": int(r["volume"] or 0),
            "value": float(r["value"] or 0),
            "cashFlow": float(r["value"] or 0),
        }
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 6. Sector Analysis Table — P/E, P/B, market cap, price changes
#    P/E & P/B computed from BCTC data (weighted: Σmarket_cap / Σearnings|equity).
# ────────────────────────────────────────────────────────────────────
@cached("market:sector_analysis", ttl=300)
async def get_sector_analysis(db: AsyncSession) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        date_7d AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 6
        ),
        mtd_date AS (
            SELECT MIN(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date >= date_trunc('month', (SELECT td FROM latest_date)::date)::text
        ),
        ytd_date AS (
            SELECT MIN(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date >= date_trunc('year', (SELECT td FROM latest_date)::date)::text
        ),
        date_1y AS (
            SELECT MAX(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date <= ((SELECT td FROM latest_date)::date - INTERVAL '1 year')::text
        ),
        date_3y AS (
            SELECT MAX(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date <= ((SELECT td FROM latest_date)::date - INTERVAL '3 years')::text
        ),
        -- BCTC data for computing P/E, P/B
        bctc_data AS (
            SELECT ticker, year, quarter, ind_code, value
            FROM {SCHEMA}.bctc
            WHERE ind_code IN (
                'BS_COMMON_STOCK',
                'BS_CHARTER_CAPITAL',
                'BS_EQUITY',
                'IS_NPAT_PARENT'
            ) AND value IS NOT NULL AND value != 0
        ),
        shares AS (
            SELECT DISTINCT ON (ticker)
                ticker, value / 10000.0 AS shares
            FROM bctc_data
            WHERE ind_code IN ('BS_COMMON_STOCK', 'BS_CHARTER_CAPITAL') AND value > 0
            ORDER BY ticker, year DESC, quarter DESC,
                     CASE WHEN ind_code = 'BS_COMMON_STOCK' THEN 1 ELSE 2 END
        ),
        equity AS (
            SELECT DISTINCT ON (ticker)
                ticker, value AS equity
            FROM bctc_data
            WHERE ind_code = 'BS_EQUITY' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        ranked_ni AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'IS_NPAT_PARENT'
        ),
        ttm_ni AS (
            SELECT ticker, SUM(value) AS ttm_ni
            FROM ranked_ni WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, market_cap
            FROM {SCHEMA}.financial_ratio
            ORDER BY ticker, year DESC, quarter DESC
        ),
        stock_data AS (
            SELECT
                co.icb_name2 AS sector,
                co.ticker,
                -- Raw market cap for P/E, P/B aggregation (VND-based)
                CASE WHEN sh.shares > 0 AND cur.close > 0
                    THEN cur.close * 1000 * sh.shares
                    ELSE NULL
                END AS mcap_raw,
                -- Market cap in tỷ for display / sorting
                CASE WHEN sh.shares > 0 AND cur.close > 0
                    THEN cur.close * 1000 * sh.shares / 1e9
                    ELSE COALESCE(fr.market_cap, cur.close * cur.volume)
                END AS market_cap,
                -- TTM net income (positive only, for sector P/E)
                CASE WHEN ni.ttm_ni > 0 THEN ni.ttm_ni ELSE NULL END AS ttm_ni_pos,
                -- Equity (positive only, for sector P/B)
                CASE WHEN eq.equity > 0 THEN eq.equity ELSE NULL END AS equity_pos,
                CASE WHEN prev.close > 0
                     THEN (cur.close - prev.close) / prev.close * 100
                     ELSE 0 END AS change_1d,
                CASE WHEN d7.close > 0
                     THEN (cur.close - d7.close) / d7.close * 100
                     ELSE NULL END AS change_7d,
                CASE WHEN ytd.close > 0
                     THEN (cur.close - ytd.close) / ytd.close * 100
                     ELSE NULL END AS change_ytd,
                CASE WHEN y1.close > 0
                     THEN (cur.close - y1.close) / y1.close * 100
                     ELSE NULL END AS change_1y,
                CASE WHEN y3.close > 0
                     THEN (cur.close - y3.close) / y3.close * 100
                     ELSE NULL END AS change_3y,
                CASE WHEN mtd.close > 0
                     THEN (cur.close - mtd.close) / mtd.close * 100
                     ELSE NULL END AS change_mtd
            FROM {SCHEMA}.company_overview co
            JOIN {SCHEMA}.history_price cur
                ON cur.ticker = co.ticker
                AND cur.trading_date = (SELECT td FROM latest_date)
            JOIN {SCHEMA}.history_price prev
                ON prev.ticker = co.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            LEFT JOIN {SCHEMA}.history_price d7
                ON d7.ticker = co.ticker
                AND d7.trading_date = (SELECT td FROM date_7d)
            LEFT JOIN {SCHEMA}.history_price mtd
                ON mtd.ticker = co.ticker
                AND mtd.trading_date = (SELECT td FROM mtd_date)
            LEFT JOIN {SCHEMA}.history_price ytd
                ON ytd.ticker = co.ticker
                AND ytd.trading_date = (SELECT td FROM ytd_date)
            LEFT JOIN {SCHEMA}.history_price y1
                ON y1.ticker = co.ticker
                AND y1.trading_date = (SELECT td FROM date_1y)
            LEFT JOIN {SCHEMA}.history_price y3
                ON y3.ticker = co.ticker
                AND y3.trading_date = (SELECT td FROM date_3y)
            LEFT JOIN shares sh ON sh.ticker = co.ticker
            LEFT JOIN equity eq ON eq.ticker = co.ticker
            LEFT JOIN ttm_ni ni ON ni.ticker = co.ticker
            LEFT JOIN latest_fr fr ON fr.ticker = co.ticker
            WHERE cur.close IS NOT NULL
              AND prev.close > 0
              AND co.icb_name2 IS NOT NULL
        )
        SELECT
            sector AS name,
            COUNT(*)::int AS stock_count,
            ROUND(COALESCE(SUM(market_cap), 0)::numeric, 0) AS market_cap,
            -- Sector P/E = Σ market_cap / Σ TTM_net_income (weighted)
            CASE WHEN SUM(CASE WHEN ttm_ni_pos IS NOT NULL AND mcap_raw IS NOT NULL
                             THEN ttm_ni_pos ELSE 0 END) > 0
                THEN ROUND(
                    (SUM(CASE WHEN ttm_ni_pos IS NOT NULL AND mcap_raw IS NOT NULL
                              THEN mcap_raw ELSE 0 END)::numeric
                     / SUM(CASE WHEN ttm_ni_pos IS NOT NULL AND mcap_raw IS NOT NULL
                               THEN ttm_ni_pos ELSE 0 END)::numeric
                    ), 2)
                ELSE NULL END AS pe,
            -- Sector P/B = Σ market_cap / Σ equity (weighted)
            CASE WHEN SUM(CASE WHEN equity_pos IS NOT NULL AND mcap_raw IS NOT NULL
                             THEN equity_pos ELSE 0 END) > 0
                THEN ROUND(
                    (SUM(CASE WHEN equity_pos IS NOT NULL AND mcap_raw IS NOT NULL
                              THEN mcap_raw ELSE 0 END)::numeric
                     / SUM(CASE WHEN equity_pos IS NOT NULL AND mcap_raw IS NOT NULL
                               THEN equity_pos ELSE 0 END)::numeric
                    ), 2)
                ELSE NULL END AS pb,
            ROUND(AVG(change_1d)::numeric, 2) AS change_1d,
            ROUND(AVG(change_7d)::numeric, 2) AS change_7d,
            ROUND(AVG(change_mtd)::numeric, 2) AS change_mtd,
            ROUND(AVG(change_ytd)::numeric, 2) AS change_ytd,
            ROUND(AVG(change_1y)::numeric, 2) AS change_1y,
            ROUND(AVG(change_3y)::numeric, 2) AS change_3y
        FROM stock_data
        GROUP BY sector
        ORDER BY market_cap DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    result = [
        {
            "name": r["name"],
            "stockCount": int(r["stock_count"]),
            "marketCap": _fmt_market_cap(float(r["market_cap"] or 0)),
            "pe": float(r["pe"]) if r["pe"] is not None else 0,
            "pb": float(r["pb"]) if r["pb"] is not None else 0,
            "priceChange1D": float(r["change_1d"]) if r["change_1d"] is not None else 0,
            "priceChange7D": float(r["change_7d"]) if r["change_7d"] is not None else 0,
            "priceChangeMTD": float(r["change_mtd"]) if r["change_mtd"] is not None else 0,
            "priceChangeYTD": float(r["change_ytd"]) if r["change_ytd"] is not None else 0,
            "priceChange1Y": float(r["change_1y"]) if r["change_1y"] is not None else 0,
            "priceChange3Y": float(r["change_3y"]) if r["change_3y"] is not None else 0,
        }
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 7. Sector Watchlist — Stocks grouped by sector
# ────────────────────────────────────────────────────────────────────
@cached("market:sector_watchlist", ttl=120)
async def get_sector_watchlist(db: AsyncSession) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    # Query 1: count distinct tickers per sector from canonical company_overview.
    counts_sql = text(f"""
        WITH unique_co AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                BTRIM(icb_name2) AS sector
            FROM {SCHEMA}.company_overview
            WHERE ticker IS NOT NULL
              AND BTRIM(ticker) NOT IN ('', 'NaN')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
              AND icb_name2 IS NOT NULL
              AND BTRIM(icb_name2) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker)),
                CASE
                    WHEN exchange IS NOT NULL
                        AND BTRIM(exchange) NOT IN ('', 'NaN', 'DELISTED') THEN 0
                    ELSE 1
                END,
                exchange
        )
        SELECT sector, COUNT(*)::int AS stock_count
        FROM unique_co
        GROUP BY sector
        ORDER BY sector
    """)
    counts_res = await db.execute(counts_sql)
    count_rows = counts_res.mappings().all()

    if not count_rows:
        return {"sectors": [], "stocks": {}}

    # Query 2: fetch stock details and price calculations.
    details_sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        unique_co AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                BTRIM(icb_name2) AS sector,
                organ_short_name,
                CASE
                    WHEN exchange = 'HSX' THEN 'HOSE'
                    WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
                    ELSE NULL
                END AS exchange
            FROM {SCHEMA}.company_overview
            WHERE ticker IS NOT NULL
              AND BTRIM(ticker) NOT IN ('', 'NaN')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
              AND icb_name2 IS NOT NULL
              AND BTRIM(icb_name2) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker)),
                CASE
                    WHEN exchange IS NOT NULL
                        AND BTRIM(exchange) NOT IN ('', 'NaN', 'DELISTED') THEN 0
                    ELSE 1
                END,
                exchange
        )
        SELECT
            co.sector,
            co.ticker,
            co.organ_short_name AS company_name,
            co.exchange,
            cur.close AS price,
            COALESCE(prev.close, 0) AS ref_price,
            CASE WHEN prev.close > 0
                 THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                 ELSE 0 END AS change,
            CASE WHEN prev.close > 0
                 THEN ROUND((cur.close - prev.close)::numeric, 2)
                 ELSE 0 END AS price_change,
            cur.volume,
            ROUND((cur.close * cur.volume)::numeric, 0) AS trade_value
        FROM unique_co co
        JOIN {SCHEMA}.history_price cur
            ON UPPER(BTRIM(cur.ticker)) = co.ticker
            AND cur.trading_date = (SELECT td FROM latest_date)
            AND cur.close IS NOT NULL
        LEFT JOIN {SCHEMA}.history_price prev
            ON UPPER(BTRIM(prev.ticker)) = co.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        ORDER BY co.sector, trade_value DESC
    """)
    details_res = await db.execute(details_sql)
    rows = details_res.mappings().all()

    def _clean(v: Any) -> str:
        """Return empty string for None, NaN, or 'NaN' values."""
        if v is None or str(v).strip().lower() == "nan":
            return ""
        return str(v).strip()

    # Group by sector
    sector_stocks: Dict[str, List[Dict]] = {}
    for r in rows:
        sector = r["sector"]
        if sector not in sector_stocks:
            sector_stocks[sector] = []
        sector_stocks[sector].append({
            "symbol": r["ticker"],
            "companyName": _clean(r["company_name"]),
            "exchange": _clean(r["exchange"]),
            "price": float(r["price"] or 0),
            "refPrice": float(r["ref_price"] or 0),
            "priceChange": float(r["price_change"] or 0),
            "change": float(r["change"] or 0),
            "volume": int(r["volume"] or 0),
            "tradeValue": float(r["trade_value"] or 0),
        })

    # Build sectors list from count query, then attach stocks from details query.
    sectors = []
    stocks_map: Dict[str, List[Dict]] = {}
    for r in count_rows:
        sector_name = r["sector"]
        slug = _slugify(sector_name)
        sectors.append({
            "id": slug,
            "name": sector_name,
            "count": int(r["stock_count"] or 0),
        })
        stocks_map[slug] = sector_stocks.get(sector_name, [])

    result = {"sectors": sectors, "stocks": stocks_map}
    return result


# ────────────────────────────────────────────────────────────────────
# 8. Sector Detail Dashboard
# ────────────────────────────────────────────────────────────────────

import math

def safe_float(v: Any, default: float = 0.0) -> float:
    """Convert value to float safely, returning default for None/NaN/Inf."""
    if v is None:
        return default
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def safe_str(v: Any, default: str = "") -> str:
    """Convert value to string safely, treating NaN/None as empty."""
    if v is None:
        return default
    s = str(v).strip()
    if s in ("NaN", "nan", "None", "null", ""):
        return default
    return s

@cached("market:sector_detail", ttl=180)
async def get_sector_detail(db: AsyncSession, sector_slug: str) -> Dict[str, Any]:

    """Full dashboard data for a single sector identified by slug."""
    await db.execute(_STMT_TIMEOUT)

    # ── Step 0: Resolve slug → sector name ───────────────────────
    all_sectors_sql = text(f"""
        SELECT DISTINCT icb_name2 AS sector
        FROM {SCHEMA}.company_overview
        WHERE icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN')
    """)
    sector_rows = (await db.execute(all_sectors_sql)).mappings().all()
    sector_name: str | None = None
    for r in sector_rows:
        if _slugify(r["sector"]) == sector_slug:
            sector_name = r["sector"]
            break
    if sector_name is None:
        return _empty_sector_detail(sector_slug)

    # ── Step 1: KPI + Breadth + Stock Table + Treemap ────────────

    main_sql = text(f"""
        WITH eb_ranked AS (
            SELECT trading_date,
                   ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
            FROM {SCHEMA}.electric_board
            WHERE match_price IS NOT NULL
            GROUP BY trading_date
        ),
        eb_latest_dt AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 1),
        eb_prev_dt   AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 2),
        sector_tickers AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                organ_short_name,
                CASE WHEN exchange = 'HSX' THEN 'HOSE'
                     WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
                     ELSE 'HOSE' END AS exchange
            FROM {SCHEMA}.company_overview
            WHERE BTRIM(icb_name2) = :sector_name
              AND ticker IS NOT NULL AND BTRIM(ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker)), exchange
        ),
        stock_data AS (
            SELECT eb.ticker,
                   eb.match_price AS price,
                   COALESCE(eb.ref_price, 0) AS ref_price,
                   COALESCE(eb.accumulated_volume, 0) AS volume,
                   COALESCE(eb.highest_price, eb.match_price) AS high_price,
                   COALESCE(eb.lowest_price, eb.match_price) AS low_price,
                   COALESCE(eb.foreign_buy_volume, 0) AS fb_vol,
                   COALESCE(eb.foreign_sell_volume, 0) AS fs_vol,
                   st.organ_short_name AS company_name,
                   st.exchange
            FROM {SCHEMA}.electric_board eb
            JOIN sector_tickers st ON UPPER(BTRIM(eb.ticker)) = st.ticker
            WHERE eb.trading_date = (SELECT td FROM eb_latest_dt)
              AND eb.match_price IS NOT NULL AND eb.match_price > 0
        )
        SELECT * FROM stock_data ORDER BY (price * volume) DESC
    """)
    res = await db.execute(main_sql, {"sector_name": sector_name})
    stock_rows = res.mappings().all()

    if not stock_rows:
        return _empty_sector_detail(sector_slug, sector_name)

    # ── Build stock table, treemap, breadth, KPI from stock_rows ─
    stocks_out = []
    treemap_out = []
    total_trading_value = 0.0
    total_market_cap_proxy = 0.0
    net_foreign = 0.0
    breadth = {"ceiling": 0, "up": 0, "ref": 0, "down": 0, "floor": 0}

    for r in stock_rows:
        price = safe_float(r["price"] or 0)
        ref = safe_float(r["ref_price"] or 0)
        vol = int(r["volume"] or 0)
        fb = int(r["fb_vol"] or 0)
        fs = int(r["fs_vol"] or 0)
        exchange = r["exchange"] or "HOSE"
        change_pct = round((price - ref) / ref * 100, 2) if ref > 0 else 0
        trade_val = round(price * vol / 1e9, 2)  # tỷ VND (price in 1000s VND × vol)
        # electric_board prices are already in 1000s VND unit? Check: match_price is raw.
        # Actually match_price is in raw VND (e.g. 25.50 for 25,500 VND)
        # trade_val in tỷ = price * 1000 * vol / 1e9 = price * vol / 1e6
        fb_val = round(fb * price / 1e9, 2)
        fs_val = round(fs * price / 1e9, 2)

        total_trading_value += trade_val
        total_market_cap_proxy += (price * vol)  # rough proxy
        net_foreign += (fb_val - fs_val)

        # Breadth
        limit = {"HOSE": 7, "HNX": 10, "UPCOM": 15}.get(exchange, 7)
        if change_pct >= limit:
            breadth["ceiling"] += 1
        elif change_pct <= -limit:
            breadth["floor"] += 1
        elif change_pct > 0:
            breadth["up"] += 1
        elif change_pct < 0:
            breadth["down"] += 1
        else:
            breadth["ref"] += 1

        stocks_out.append({
            "ticker": r["ticker"],
            "companyName": safe_str(r["company_name"]),
            "exchange": exchange,
            "price": price,
            "change1D": change_pct,
            "volume": vol,
            "tradingValue": trade_val,
            "foreignBuy": fb_val,
            "foreignSell": fs_val,
        })

        treemap_out.append({
            "ticker": r["ticker"],
            "marketCap": trade_val,  # use trade value as size proxy
            "changePercent": change_pct,
            "companyName": safe_str(r["company_name"]),
        })

    stock_count = len(stocks_out)

    # ── Step 2: Valuation P/B vs ROE from financial_ratio ────────
    val_sql = text(f"""
        SELECT DISTINCT ON (fr.ticker)
            fr.ticker,
            COALESCE(fr.pb, 0) AS pb,
            COALESCE(fr.roe, 0) AS roe,
            COALESCE(fr.market_cap, 0) AS market_cap
        FROM {SCHEMA}.financial_ratio fr
        JOIN (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker
            FROM {SCHEMA}.company_overview
            WHERE BTRIM(icb_name2) = :sector_name
              AND ticker IS NOT NULL AND BTRIM(ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker))
        ) st ON UPPER(BTRIM(fr.ticker)) = st.ticker
        WHERE fr.roe IS NOT NULL
        ORDER BY fr.ticker, fr.year DESC, fr.quarter DESC
    """)
    val_res = await db.execute(val_sql, {"sector_name": sector_name})
    val_rows = val_res.mappings().all()

    valuation_out = []
    total_equity_proxy = 0.0
    total_mcap_for_pb = 0.0
    for vr in val_rows:
        pb = safe_float(vr["pb"] or 0)
        roe = safe_float(vr["roe"] or 0) * 100  # convert to percentage
        mcap = safe_float(vr["market_cap"] or 0)
        zone = "balanced"
        if pb < 1.5 and roe > 15:
            zone = "attractive"
        elif pb > 2.0 and roe < 12:
            zone = "risk"
        valuation_out.append({
            "ticker": vr["ticker"],
            "pb": round(pb, 2),
            "roe": round(roe, 2),
            "marketCap": round(mcap, 2),
            "zone": zone,
        })
        if pb > 0 and mcap > 0:
            total_mcap_for_pb += mcap
            total_equity_proxy += mcap / pb

    sector_pb = round(total_mcap_for_pb / total_equity_proxy, 2) if total_equity_proxy > 0 else 0

    # ── Step 3: Liquidity by cap group ───────────────────────────
    cap_sql = text(f"""
        WITH sector_stocks AS (
            SELECT DISTINCT ON (UPPER(BTRIM(co.ticker)))
                UPPER(BTRIM(co.ticker)) AS ticker
            FROM {SCHEMA}.company_overview co
            WHERE BTRIM(co.icb_name2) = :sector_name
              AND co.ticker IS NOT NULL AND BTRIM(co.ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(co.ticker))
        ),
        latest_fr AS (
            SELECT DISTINCT ON (fr.ticker)
                fr.ticker, COALESCE(fr.market_cap, 0) AS market_cap
            FROM {SCHEMA}.financial_ratio fr
            JOIN sector_stocks ss ON UPPER(BTRIM(fr.ticker)) = ss.ticker
            ORDER BY fr.ticker, fr.year DESC, fr.quarter DESC
        ),
        eb_date AS (
            SELECT MAX(trading_date) AS td
            FROM {SCHEMA}.electric_board WHERE match_price IS NOT NULL
        )
        SELECT
            CASE
                WHEN COALESCE(lfr.market_cap, 0) >= 10000 THEN 'Large Cap'
                WHEN COALESCE(lfr.market_cap, 0) >= 1000 THEN 'Mid Cap'
                ELSE 'Small Cap'
            END AS cap_group,
            ROUND((SUM(eb.match_price * COALESCE(eb.accumulated_volume, 0)) / 1e9)::numeric, 1) AS trade_val
        FROM {SCHEMA}.electric_board eb
        JOIN sector_stocks ss ON UPPER(BTRIM(eb.ticker)) = ss.ticker
        LEFT JOIN latest_fr lfr ON UPPER(BTRIM(eb.ticker)) = UPPER(BTRIM(lfr.ticker))
        WHERE eb.trading_date = (SELECT td FROM eb_date)
          AND eb.match_price IS NOT NULL AND eb.match_price > 0
        GROUP BY cap_group
        ORDER BY trade_val DESC
    """)
    cap_res = await db.execute(cap_sql, {"sector_name": sector_name})
    cap_rows = cap_res.mappings().all()
    liq_by_cap = [{"group": r["cap_group"], "value": safe_float(r["trade_val"] or 0)} for r in cap_rows]

    # ── Step 4: Liquidity history (30 sessions) ──────────────────
    liq_history_sql = text(f"""
        WITH sector_stocks AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker
            FROM {SCHEMA}.company_overview
            WHERE BTRIM(icb_name2) = :sector_name
              AND ticker IS NOT NULL AND BTRIM(ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker))
        ),
        latest_date AS (
            SELECT MAX(trading_date::date) AS td
            FROM {SCHEMA}.history_price WHERE close IS NOT NULL
        ),
        daily_tv AS (
            SELECT
                hp.trading_date::date AS trading_date,
                ROUND((SUM(hp.close * COALESCE(hp.volume, 0)) / 1e6)::numeric, 1) AS trade_val
            FROM {SCHEMA}.history_price hp
            JOIN sector_stocks ss ON UPPER(BTRIM(hp.ticker)) = ss.ticker
            CROSS JOIN latest_date
            WHERE hp.close IS NOT NULL AND hp.close > 0
              AND hp.trading_date::date >= latest_date.td - INTERVAL '90 days'
            GROUP BY hp.trading_date::date
        ),
        daily_nf AS (
            SELECT
                eb.trading_date::date AS trading_date,
                ROUND((SUM(
                    COALESCE(eb.foreign_buy_volume, 0) * eb.match_price
                    - COALESCE(eb.foreign_sell_volume, 0) * eb.match_price
                ) / 1e9)::numeric, 1) AS net_foreign
            FROM {SCHEMA}.electric_board eb
            JOIN sector_stocks ss ON UPPER(BTRIM(eb.ticker)) = ss.ticker
            CROSS JOIN latest_date
            WHERE eb.match_price IS NOT NULL AND eb.match_price > 0
              AND eb.trading_date::date >= latest_date.td - INTERVAL '90 days'
            GROUP BY eb.trading_date::date
        ),
        daily_liq AS (
            SELECT
                COALESCE(tv.trading_date, nf.trading_date) AS trading_date,
                COALESCE(tv.trade_val, 0) AS trade_val,
                COALESCE(nf.net_foreign, 0) AS net_foreign
            FROM daily_tv tv
            FULL OUTER JOIN daily_nf nf ON tv.trading_date = nf.trading_date
        ),
        ranked_liq AS (
            SELECT
                trading_date,
                trade_val,
                net_foreign,
                LAG(trade_val) OVER (ORDER BY trading_date ASC) AS prev_trade_val
            FROM daily_liq
            ORDER BY trading_date DESC
            LIMIT 30
        )
        SELECT * FROM ranked_liq ORDER BY trading_date ASC
    """)
    liq_res = await db.execute(liq_history_sql, {"sector_name": sector_name})
    liq_rows = liq_res.mappings().all()
    liquidity_out = []
    sma20_vals = []
    
    for lr in liq_rows:
        tv = safe_float(lr["trade_val"] or 0)
        dt = lr["trading_date"]
        date_str = dt.strftime("%d/%m") if hasattr(dt, "strftime") else str(dt)[5:10].replace("-", "/")
        liquidity_out.append({
            "date": date_str,
            "tradingValue": tv,
            "netForeign": safe_float(lr["net_foreign"] or 0),
        })

    # SMA20: Take the last 20 points from the 30 fetched
    for lr in list(liq_rows)[-20:]:
        sma20_vals.append(safe_float(lr["trade_val"] or 0))

    sma20 = sum(sma20_vals) / len(sma20_vals) if sma20_vals else 0
    trading_vs_avg = round((total_trading_value - sma20) / sma20 * 100, 1) if sma20 > 0 else 0

    # ── Step 5: Performance vs VN-Index (6 months) ───────────────
    perf_sql = text(f"""
        WITH sector_stocks AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker
            FROM {SCHEMA}.company_overview
            WHERE BTRIM(icb_name2) = :sector_name
              AND ticker IS NOT NULL AND BTRIM(ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker))
        ),
        sector_daily AS (
            SELECT hp.trading_date,
                   SUM(hp.close * hp.volume) AS sector_value
            FROM {SCHEMA}.history_price hp
            JOIN sector_stocks ss ON UPPER(BTRIM(hp.ticker)) = ss.ticker
            WHERE hp.close IS NOT NULL AND hp.close > 0
              AND hp.trading_date >= (
                  (SELECT MAX(trading_date) FROM {SCHEMA}.history_price WHERE close IS NOT NULL)::date
                  - INTERVAL '6 months'
              )::text
            GROUP BY hp.trading_date
        ),
        vnindex AS (
            SELECT trading_date, close
            FROM {SCHEMA}.market_index
            WHERE UPPER(ticker) = 'VNINDEX'
              AND close IS NOT NULL
              AND trading_date::date >= (CURRENT_DATE - INTERVAL '6 months')
        )
        SELECT sd.trading_date,
               sd.sector_value,
               COALESCE(vi.close, 0) AS vnindex_close
        FROM sector_daily sd
        LEFT JOIN vnindex vi ON sd.trading_date = vi.trading_date::text
        ORDER BY sd.trading_date ASC
    """)
    perf_res = await db.execute(perf_sql, {"sector_name": sector_name})
    perf_rows = perf_res.mappings().all()

    performance_out = []
    if perf_rows:
        base_sector = safe_float(perf_rows[0]["sector_value"]) if perf_rows[0]["sector_value"] else 1
        base_vni = safe_float(perf_rows[0]["vnindex_close"]) if perf_rows[0]["vnindex_close"] else 1
        if base_sector == 0:
            base_sector = 1
        if base_vni == 0:
            base_vni = 1
        for pr in perf_rows:
            sv = safe_float(pr["sector_value"] or base_sector)
            vi = safe_float(pr["vnindex_close"] or base_vni)
            dt = pr["trading_date"]
            date_str = str(dt)[:10]
            performance_out.append({
                "date": date_str,
                "sectorReturn": round((sv / base_sector - 1) * 100, 2),
                "vnindexReturn": round((vi / base_vni - 1) * 100, 2),
            })
        # Downsample to ~60 points max for chart
        if len(performance_out) > 60:
            step = len(performance_out) // 60
            sampled = [performance_out[i] for i in range(0, len(performance_out), step)]
            if sampled[-1] != performance_out[-1]:
                sampled.append(performance_out[-1])
            performance_out = sampled

    # ── Step 6: RS Score (proxy — rank sector change vs all sectors)
    rs_sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        sector_changes AS (
            SELECT co.icb_name2 AS sector,
                   AVG((cur.close - prev.close) / NULLIF(prev.close, 0) * 100) AS avg_change
            FROM {SCHEMA}.company_overview co
            JOIN {SCHEMA}.history_price cur ON cur.ticker = co.ticker
                AND cur.trading_date = (SELECT td FROM latest_date)
            JOIN {SCHEMA}.history_price prev ON prev.ticker = co.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            WHERE prev.close > 0 AND cur.close IS NOT NULL
              AND co.icb_name2 IS NOT NULL
            GROUP BY co.icb_name2
        ),
        ranked AS (
            SELECT sector, avg_change,
                   PERCENT_RANK() OVER (ORDER BY avg_change ASC) * 99 + 1 AS rs_score
            FROM sector_changes
        )
        SELECT rs_score FROM ranked WHERE BTRIM(sector) = :sector_name
    """)
    rs_res = await db.execute(rs_sql, {"sector_name": sector_name})
    rs_row = rs_res.mappings().first()
    rs_score = round(safe_float(rs_row["rs_score"]), 1) if rs_row else 50

    # ── Step 7: MFI (proxy — simplified from TP × Volume) ────────
    mfi_sql = text(f"""
        WITH sector_stocks AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker
            FROM {SCHEMA}.company_overview
            WHERE BTRIM(icb_name2) = :sector_name
              AND ticker IS NOT NULL AND BTRIM(ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker))
        ),
        last_dates AS (
            SELECT DISTINCT trading_date
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
            ORDER BY trading_date DESC
            LIMIT 15
        ),
        daily_flow AS (
            SELECT hp.trading_date,
                   SUM((hp.high + hp.low + hp.close) / 3.0 * hp.volume) AS raw_mf,
                   LAG(SUM((hp.high + hp.low + hp.close) / 3.0)) OVER (ORDER BY hp.trading_date) AS prev_tp,
                   SUM((hp.high + hp.low + hp.close) / 3.0) AS curr_tp
            FROM {SCHEMA}.history_price hp
            JOIN sector_stocks ss ON UPPER(BTRIM(hp.ticker)) = ss.ticker
            WHERE hp.trading_date IN (SELECT trading_date FROM last_dates)
              AND hp.close IS NOT NULL AND hp.volume > 0
            GROUP BY hp.trading_date
        )
        SELECT
            COALESCE(SUM(CASE WHEN curr_tp > COALESCE(prev_tp, 0) THEN raw_mf ELSE 0 END), 0) AS pos_flow,
            COALESCE(SUM(CASE WHEN curr_tp <= COALESCE(prev_tp, 0) THEN raw_mf ELSE 0 END), 0) AS neg_flow
        FROM daily_flow
        WHERE prev_tp IS NOT NULL
    """)
    mfi_res = await db.execute(mfi_sql, {"sector_name": sector_name})
    mfi_row = mfi_res.mappings().first()
    pos = safe_float(mfi_row["pos_flow"]) if mfi_row and mfi_row["pos_flow"] else 0
    neg = safe_float(mfi_row["neg_flow"]) if mfi_row and mfi_row["neg_flow"] else 0
    mfi = round(100 - 100 / (1 + pos / neg), 1) if neg > 0 else (100 if pos > 0 else 50)
    mfi = max(0, min(100, mfi))

    # ── Assemble response ────────────────────────────────────────
    kpi = {
        "sectorName": sector_name,
        "rsScore": rs_score,
        "totalTradingValue": round(total_trading_value, 1),
        "tradingValueVsAvg": trading_vs_avg,
        "mfi": mfi,
        "marketCap": round(total_trading_value * 20, 0),  # rough proxy
        "netForeign": round(net_foreign, 1),
        "pb": sector_pb,
        "stockCount": stock_count,
    }

    # Try to get a better market cap from financial_ratio
    mcap_sql = text(f"""
        WITH sector_stocks AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker
            FROM {SCHEMA}.company_overview
            WHERE BTRIM(icb_name2) = :sector_name
              AND ticker IS NOT NULL AND BTRIM(ticker) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker))
        )
        SELECT COALESCE(SUM(sub.market_cap), 0) AS total_mcap
        FROM (
            SELECT DISTINCT ON (fr.ticker) fr.market_cap
            FROM {SCHEMA}.financial_ratio fr
            JOIN sector_stocks ss ON UPPER(BTRIM(fr.ticker)) = ss.ticker
            WHERE fr.market_cap IS NOT NULL AND fr.market_cap > 0
            ORDER BY fr.ticker, fr.year DESC, fr.quarter DESC
        ) sub
    """)
    mcap_res = await db.execute(mcap_sql, {"sector_name": sector_name})
    mcap_row = mcap_res.mappings().first()
    if mcap_row and safe_float(mcap_row["total_mcap"] or 0) > 0:
        kpi["marketCap"] = round(safe_float(mcap_row["total_mcap"]), 0)

    return {
        "kpi": kpi,
        "performance": performance_out,
        "breadth": breadth,
        "treemap": treemap_out,
        "liquidity": liquidity_out,
        "valuation": valuation_out,
        "liquidityByCap": liq_by_cap,
        "stocks": stocks_out,
    }


def _empty_sector_detail(slug: str, name: str | None = None) -> Dict[str, Any]:
    """Return an empty sector detail structure."""
    return {
        "kpi": {
            "sectorName": name or slug,
            "rsScore": 0, "totalTradingValue": 0, "tradingValueVsAvg": 0,
            "mfi": 50, "marketCap": 0, "netForeign": 0, "pb": 0, "stockCount": 0,
        },
        "performance": [],
        "breadth": {"ceiling": 0, "up": 0, "ref": 0, "down": 0, "floor": 0},
        "treemap": [],
        "liquidity": [],
        "valuation": [],
        "liquidityByCap": [],
        "stocks": [],
    }

