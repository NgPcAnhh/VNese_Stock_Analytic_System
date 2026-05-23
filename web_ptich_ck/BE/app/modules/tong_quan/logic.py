from __future__ import annotations

import logging
import math
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────

INDEX_NAME_MAP = {
    "VNINDEX": "VN-INDEX",
    "VN30": "VN30",
    "HNXINDEX": "HNX-INDEX",
    "UPCOMINDEX": "UPCOM-INDEX",
}

PERIOD_DAYS = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "ALL": 99999,
}


def _format_volume(v: float) -> str:
    """Format a numeric volume to a human-readable string."""
    if v >= 1_000_000_000:
        return f"{v / 1_000_000_000:.1f}B"
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v / 1_000:.0f}K"
    return str(int(v))


def _status(change: float) -> str:
    if change > 0:
        return "up"
    if change < 0:
        return "down"
    return "unchanged"

# ────────────────────────────────────────────────────────────────────
# 0. Ticker Slide — top 10 tăng, top 10 giảm + 4 chỉ số
# ────────────────────────────────────────────────────────────────────
async def get_ticker_slide(db: AsyncSession) -> List[Dict[str, Any]]:
    cache_key = "ticker_slide"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # ── 4 chỉ số thị trường ──
    idx_sql = text("""
        SELECT
            t.ticker,
            cur.close AS price,
            cur.close - prev.close AS change,
            CASE WHEN prev.close > 0
                THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                ELSE 0 END AS percent
        FROM (VALUES
            ('VNINDEX', 1),
            ('VN30', 2),
            ('HNXINDEX', 3),
            ('UPCOMINDEX', 4)
        ) AS t(ticker, sort_order)
        CROSS JOIN LATERAL (
            SELECT close
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            LIMIT 1
        ) cur
        CROSS JOIN LATERAL (
            SELECT close
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            OFFSET 1 LIMIT 1
        ) prev
        ORDER BY t.sort_order
    """)
    result = await db.execute(idx_sql)
    idx_rows = result.mappings().all()

    indices = []
    for r in idx_rows:
        change = float(r["change"] or 0)
        indices.append({
            "symbol": r["ticker"],
            "price": float(r["price"] or 0),
            "change": round(change, 2),
            "percent": float(r["percent"] or 0),
            "category": "index",
        })

    # ── Top 10 tăng + Top 10 giảm (cổ phiếu thường) ──
    stock_sql = text("""
        WITH ranked_dates AS (
            SELECT trading_date, ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
            FROM hethong_phantich_chungkhoan.history_price
            WHERE close IS NOT NULL
            GROUP BY trading_date
            HAVING COUNT(*) >= 50
        ),
        latest_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 1
        ),
        prev_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 2
        ),
        changes AS (
            SELECT
                cur.ticker,
                cur.close AS price,
                cur.close - prev.close AS change,
                CASE WHEN prev.close > 0
                    THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                    ELSE 0 END AS percent
            FROM hethong_phantich_chungkhoan.history_price cur
            JOIN hethong_phantich_chungkhoan.history_price prev
                ON cur.ticker = prev.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND prev.close IS NOT NULL
              AND prev.close > 0
        ),
        top_gainers AS (
            SELECT *, 'gainer' AS category
            FROM changes
            ORDER BY percent DESC
            LIMIT 10
        ),
        top_losers AS (
            SELECT *, 'loser' AS category
            FROM changes
            ORDER BY percent ASC
            LIMIT 10
        )
        SELECT * FROM top_gainers
        UNION ALL
        SELECT * FROM top_losers
    """)
    result = await db.execute(stock_sql)
    stock_rows = result.mappings().all()

    stocks = []
    for r in stock_rows:
        stocks.append({
            "symbol": r["ticker"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "percent": float(r["percent"] or 0),
            "category": r["category"],
        })

    data = indices + stocks
    await cache_set(cache_key, data, ttl=120)  # cache 2 phút
    return data


# ────────────────────────────────────────────────────────────────────
# 1. Market Index Cards
# ────────────────────────────────────────────────────────────────────
async def get_market_index_cards(db: AsyncSession) -> List[Dict[str, Any]]:
    """Return latest index values for VNINDEX, VN30, HNX, UPCOM."""
    sql = text("""
        SELECT
            cur.trading_date,
            t.ticker,
            cur.close AS value,
            cur.close - prev.close AS change,
            CASE WHEN prev.close > 0
                THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                ELSE 0 END AS percent
        FROM (VALUES
            ('VNINDEX', 1),
            ('VN30', 2),
            ('HNXINDEX', 3),
            ('UPCOMINDEX', 4)
        ) AS t(ticker, sort_order)
        CROSS JOIN LATERAL (
            SELECT close, trading_date
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            LIMIT 1
        ) cur
        CROSS JOIN LATERAL (
            SELECT close
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            OFFSET 1 LIMIT 1
        ) prev
        ORDER BY t.sort_order;
    """)
    
    # ── Redis cache ──
    cache_key = "market_index_cards"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    r = await db.execute(sql)
    rows = r.mappings().all()

    results = []
    for r in rows:
        change = float(r["change"] or 0)
        results.append({
            "id": r["ticker"],
            "tradingDate": str(r["trading_date"]) if r["trading_date"] else None,
            "name": INDEX_NAME_MAP.get(r["ticker"], r["ticker"]),
            "value": float(r["value"] or 0),
            "change": round(change, 2),
            "percent": float(r["percent"] or 0),
            "status": _status(change),
        })

    await cache_set(cache_key, results, ttl=60)  # cache 1 phút
    return results


# ────────────────────────────────────────────────────────────────────
# 2. Market Chart (OHLCV) — Optimised with Redis cache + downsampling
# ────────────────────────────────────────────────────────────────────

# Ánh xạ period → interval SQL để gom nến (downsampling)
# Với khoảng thời gian lớn, gom dữ liệu theo tuần/tháng để giảm số bản ghi
RESAMPLE_MAP: Dict[str, Optional[str]] = {
    "1W": None,       # daily — ít dữ liệu, giữ nguyên
    "1M": None,       # daily
    "3M": None,       # daily
    "6M": "1 week",   # gom tuần
    "1Y": "1 week",   # gom tuần
    "ALL": "1 month",  # gom tháng
}

# TTL (giây) cho cache theo period — dữ liệu cũ ít thay đổi → cache lâu hơn
CACHE_TTL_MAP: Dict[str, int] = {
    "1W": 60,       # 1 phút
    "1M": 120,      # 2 phút
    "3M": 300,      # 5 phút
    "6M": 600,      # 10 phút
    "1Y": 900,      # 15 phút
    "ALL": 1800,    # 30 phút
}


def _build_market_chart_sql(interval: Optional[str]) -> str:
    """Tạo câu SQL phù hợp: raw daily hoặc aggregated (tuần/tháng)."""
    if interval is None:
        # Trả về dữ liệu daily, không gom
        return """
            SELECT trading_date, open, high, low, close, volume
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = :ticker
              AND trading_date >= :cutoff
            ORDER BY trading_date ASC
        """
    # Gom nến theo interval (tuần / tháng) bằng date_trunc
    # trading_date là kiểu text → cast sang date trước khi dùng date_trunc
    unit = interval.split()[1] if ' ' in interval else interval
    return f"""
        SELECT
            date_trunc('{unit}', trading_date::date)::date AS trading_date,
            (ARRAY_AGG(open ORDER BY trading_date ASC))[1]   AS open,
            MAX(high)                                         AS high,
            MIN(low)                                          AS low,
            (ARRAY_AGG(close ORDER BY trading_date DESC))[1]  AS close,
            SUM(volume)                                       AS volume
        FROM hethong_phantich_chungkhoan.market_index
        WHERE ticker = :ticker
          AND trading_date >= :cutoff
        GROUP BY 1
        ORDER BY 1 ASC
    """


async def get_market_chart(
    db: AsyncSession,
    ticker: str = "VNINDEX",
    period: str = "1Y",
    page: int = 1,
    page_size: int = 0,
) -> Dict[str, Any]:
    """
    Trả dữ liệu OHLCV cho chart, đã tối ưu:
      - Redis cache tránh query DB lặp lại
      - Downsampling: 6M/1Y gom tuần, ALL gom tháng
      - Hỗ trợ phân trang (page_size > 0) để giảm tải FE

    Returns:
        {
            "data": [...],
            "meta": {"ticker", "period", "total", "page", "page_size", "total_pages"}
        }
    """
    cache_key = f"market_chart:{ticker}:{period}"
    cached = await cache_get(cache_key)

    if cached is None:
        # ── Query DB ──────────────────────────────────────────────
        days = PERIOD_DAYS.get(period, 365)
        cutoff = (date.today() - timedelta(days=days)).isoformat()

        interval = RESAMPLE_MAP.get(period)
        sql = text(_build_market_chart_sql(interval))

        r = await db.execute(sql, {"ticker": ticker, "cutoff": cutoff})
        rows = r.mappings().all()
        cached = [
            {
                "date": r["trading_date"].isoformat()
                    if hasattr(r["trading_date"], "isoformat")
                    else str(r["trading_date"]),
                "open": float(r["open"] or 0),
                "high": float(r["high"] or 0),
                "low": float(r["low"] or 0),
                "close": float(r["close"] or 0),
                "volume": int(r["volume"] or 0),
            }
            for r in rows
        ]
        # ── Lưu vào Redis ─────────────────────────────────────────
        ttl = CACHE_TTL_MAP.get(period, 300)
        await cache_set(cache_key, cached, ttl=ttl)
        logger.info(
            "market_chart DB query: ticker=%s period=%s rows=%d",
            ticker, period, len(cached),
        )

    # ── Phân trang (nếu FE yêu cầu) ──────────────────────────────
    total = len(cached)

    if page_size > 0:
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        page_data = cached[start:end]
    else:
        # Không phân trang — trả hết (dữ liệu đã downsampled nên OK)
        total_pages = 1
        page_data = cached

    return {
        "data": page_data,
        "meta": {
            "ticker": ticker,
            "period": period,
            "total": total,
            "page": page,
            "page_size": page_size if page_size > 0 else total,
            "total_pages": total_pages,
        },
    }


# ────────────────────────────────────────────────────────────────────
# 3. Biến động ngành
# ────────────────────────────────────────────────────────────────────

async def get_sector_performance(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Tối ưu:
      - CTE lấy 2 ngày giao dịch gần nhất rồi JOIN thay vì N sub-query tương quan
      - Redis cache 2 phút
    """
    cache_key = "sector_performance"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        WITH ranked_dates AS (
            SELECT trading_date, COUNT(*) AS cnt,
                   ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
            FROM hethong_phantich_chungkhoan.history_price
            WHERE close IS NOT NULL
            GROUP BY trading_date
            HAVING COUNT(*) >= 50
        ),
        latest_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 1
        ),
        prev_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 2
        )
        SELECT
            co.icb_name2 AS name,
            ROUND(AVG(
                (cur.close - prev.close) / prev.close * 100
            )::numeric, 2) AS value
        FROM hethong_phantich_chungkhoan.company_overview co
        JOIN hethong_phantich_chungkhoan.history_price cur
            ON cur.ticker = co.ticker
            AND cur.trading_date = (SELECT td FROM latest_date)
        JOIN hethong_phantich_chungkhoan.history_price prev
            ON prev.ticker = co.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        WHERE prev.close > 0
          AND cur.close IS NOT NULL
          AND co.icb_name2 IS NOT NULL
        GROUP BY co.icb_name2
        ORDER BY value DESC;
    """)
    r = await db.execute(sql)
    rows = r.mappings().all()
    result = [{"name": r["name"], "value": float(r["value"] or 0)} for r in rows]
    await cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 4. CHỉ số quốc tế (international & macro indices)
# ────────────────────────────────────────────────────────────────────

async def get_market_comparison(db: AsyncSession) -> List[Dict[str, Any]]:
    """Latest close + % change for macro_economy asset types (global indices etc.).

    Redis cache 5 phút — dữ liệu quốc tế cập nhật không quá thường xuyên.
    """
    cache_key = "market_comparison"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        SELECT
            a.asset_type AS name,
            p.prices[1] AS price,
            CASE
                WHEN p.prices[2] > 0
                THEN ROUND(((p.prices[1] - p.prices[2]) / p.prices[2] * 100)::numeric, 2)
                ELSE 0
            END AS change
        FROM (
            SELECT DISTINCT asset_type FROM macro_economy
        ) a
        CROSS JOIN LATERAL (
            SELECT ARRAY(
                SELECT close
                FROM macro_economy me
                WHERE me.asset_type = a.asset_type
                ORDER BY date DESC
                LIMIT 2
            ) AS prices
        ) p
        ORDER BY a.asset_type;
    """)
    r = await db.execute(sql)
    rows = r.mappings().all()
    result = [
        {
            "name": r["name"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "status": _status(float(r["change"] or 0)),
        }
        for r in rows
    ]
    await cache_set(cache_key, result, ttl=300)
    return result


# ────────────────────────────────────────────────────────────────────
# 5. Market Breadth
# ────────────────────────────────────────────────────────────────────

async def get_market_breadth(db: AsyncSession) -> Dict[str, int]:
    """Count advancing / declining / unchanged stocks for the latest trading day.

    Redis cache 2 phút.
    """
    cache_key = "market_breadth"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        WITH ranked_dates AS (
            SELECT trading_date,
                   ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
            FROM hethong_phantich_chungkhoan.history_price
            WHERE close IS NOT NULL
            GROUP BY trading_date
            HAVING COUNT(*) >= 50
        ),
        date_vars AS (
            SELECT
                (SELECT trading_date FROM ranked_dates WHERE rn = 1) AS t0_date,
                (SELECT trading_date FROM ranked_dates WHERE rn = 2) AS t1_date
        )
        SELECT
            COUNT(*) FILTER (WHERE cur.close > prev.close) AS advancing,
            COUNT(*) FILTER (WHERE cur.close < prev.close) AS declining,
            COUNT(*) FILTER (WHERE cur.close = prev.close) AS unchanged
        FROM date_vars v
        JOIN hethong_phantich_chungkhoan.history_price cur
        ON cur.trading_date = v.t0_date
        JOIN hethong_phantich_chungkhoan.history_price prev
        ON prev.trading_date = v.t1_date
        AND prev.ticker = cur.ticker
        WHERE v.t0_date > v.t1_date
        AND prev.close > 0;
    """)
    res = await db.execute(sql)
    r = res.mappings().one()
    result = {
        "advancing": int(r["advancing"] or 0),
        "declining": int(r["declining"] or 0),
        "unchanged": int(r["unchanged"] or 0),
    }
    await cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 6. Top Stocks Table (gainers / losers / foreign)
# ────────────────────────────────────────────────────────────────────

async def get_top_stocks(
    db: AsyncSession, category: str = "gainers", limit: int = 10
) -> List[Dict[str, Any]]:
    """Top cổ phiếu tăng / giảm / khối ngoại.

    - gainers: top 10 tăng giá mạnh nhất (% change cao nhất)
    - losers:  top 10 giảm giá mạnh nhất (% change thấp nhất)
    - foreign: top 10 net mua ròng cao nhất + top 10 net bán ròng lớn nhất = 20 mã
    """

    # ── Khối ngoại ──────────────────────────────────────────────────
    if category == "foreign":
        cache_key = f"top_stocks:foreign:{limit}"
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

        sql = text("""
            WITH latest_date AS (
                SELECT trading_date AS td
                FROM hethong_phantich_chungkhoan.electric_board
                WHERE foreign_buy_volume IS NOT NULL
                ORDER BY trading_date DESC
                LIMIT 1
            ),
            foreign_data AS (
                SELECT
                    eb.ticker                                     AS symbol,
                    eb.match_price                                AS price,
                    CASE WHEN eb.ref_price > 0
                        THEN ROUND(((eb.match_price - eb.ref_price)
                                    / eb.ref_price * 100)::numeric, 2)
                        ELSE 0 END                                AS change,
                    COALESCE(eb.foreign_buy_volume, 0)            AS foreign_buy,
                    COALESCE(eb.foreign_sell_volume, 0)           AS foreign_sell,
                    COALESCE(eb.foreign_buy_volume, 0)
                      - COALESCE(eb.foreign_sell_volume, 0)       AS net_volume
                FROM hethong_phantich_chungkhoan.electric_board eb
                WHERE eb.trading_date = (SELECT td FROM latest_date)
                  AND eb.match_price IS NOT NULL
                  AND eb.match_price > 0
            ),
            top_net_buy AS (
                SELECT *, 'net_buy' AS side
                FROM foreign_data
                WHERE net_volume > 0
                ORDER BY net_volume DESC
                LIMIT :limit
            ),
            top_net_sell AS (
                SELECT *, 'net_sell' AS side
                FROM foreign_data
                WHERE net_volume < 0
                ORDER BY net_volume ASC
                LIMIT :limit
            )
            SELECT * FROM top_net_buy
            UNION ALL
            SELECT * FROM top_net_sell
        """)
        res = await db.execute(sql, {"limit": limit})
        rows = res.mappings().all()
        result = [
            {
                "symbol": r["symbol"],
                "price": float(r["price"] or 0),
                "change": float(r["change"] or 0),
                "volume": _format_volume(abs(int(r["net_volume"] or 0))),
                "foreignBuy": int(r["foreign_buy"] or 0),
                "foreignSell": int(r["foreign_sell"] or 0),
                "netVolume": int(r["net_volume"] or 0),
                "side": r["side"],
            }
            for r in rows
        ]
        await cache_set(cache_key, result, ttl=120)
        return result

    # ── Tăng giá / Giảm giá — cùng pattern với stock_sql của Ticker Slide ──
    cache_key = f"top_stocks:{category}:{limit}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    order_clause = "percent DESC" if category == "gainers" else "percent ASC"
    sql = text(f"""
        WITH ranked_dates AS (
            SELECT trading_date, ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
            FROM hethong_phantich_chungkhoan.history_price
            WHERE close IS NOT NULL
            GROUP BY trading_date
            HAVING COUNT(*) >= 50
        ),
        latest_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 1
        ),
        prev_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 2
        ),
        changes AS (
            SELECT
                cur.ticker,
                cur.close AS price,
                cur.close - prev.close AS change,
                CASE WHEN prev.close > 0
                    THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                    ELSE 0 END AS percent,
                cur.volume
            FROM hethong_phantich_chungkhoan.history_price cur
            JOIN hethong_phantich_chungkhoan.history_price prev
                ON cur.ticker = prev.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND prev.close IS NOT NULL
              AND prev.close > 0
        )
        SELECT ticker AS symbol, price, change, percent, volume
        FROM changes
        ORDER BY {order_clause}
        LIMIT :limit
    """)
    res = await db.execute(sql, {"limit": limit})
    rows = res.mappings().all()
    result = [
        {
            "symbol": r["symbol"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "percent": float(r["percent"] or 0),
            "volume": _format_volume(int(r["volume"] or 0)),
        }
        for r in rows
    ]
    await cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 6b. Top Stocks — Unified (all 3 categories in 1 call, 1 Redis key)
# ────────────────────────────────────────────────────────────────────

async def get_top_stocks_all(
    db: AsyncSession, limit: int = 10
) -> Dict[str, List[Dict[str, Any]]]:
    """Trả về cả 3 danh mục top cổ phiếu trong 1 lần gọi.

    Redis key: ``top_stocks:all:{limit}`` — TTL 120 s.
    Nếu cache hit → trả ngay, không query DB.
    Nếu cache miss → chạy 2 SQL (1 cho gainers+losers, 1 cho foreign),
    gộp kết quả rồi lưu Redis.
    """
    cache_key = f"top_stocks:all:{limit}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # ── 1. Gainers + Losers (1 query, lấy cả 2 đầu) ───────────────
    gl_sql = text("""
        WITH ranked_dates AS (
            SELECT trading_date,
                   ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
            FROM hethong_phantich_chungkhoan.history_price
            WHERE close IS NOT NULL
            GROUP BY trading_date
            HAVING COUNT(*) >= 50
        ),
        latest_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 1
        ),
        prev_date AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 2
        ),
        changes AS (
            SELECT
                cur.ticker,
                cur.close                                         AS price,
                cur.close - prev.close                            AS change,
                CASE WHEN prev.close > 0
                    THEN ROUND(((cur.close - prev.close)
                                / prev.close * 100)::numeric, 2)
                    ELSE 0 END                                    AS percent,
                cur.volume
            FROM hethong_phantich_chungkhoan.history_price cur
            JOIN hethong_phantich_chungkhoan.history_price prev
                ON cur.ticker = prev.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND prev.close IS NOT NULL
              AND prev.close > 0
        ),
        top_gainers AS (
            SELECT *, 'gainer' AS cat
            FROM changes ORDER BY percent DESC LIMIT :limit
        ),
        top_losers AS (
            SELECT *, 'loser' AS cat
            FROM changes ORDER BY percent ASC LIMIT :limit
        )
        SELECT * FROM top_gainers
        UNION ALL
        SELECT * FROM top_losers
    """)
    res = await db.execute(gl_sql, {"limit": limit})
    gl_rows = res.mappings().all()

    gainers: List[Dict[str, Any]] = []
    losers: List[Dict[str, Any]] = []
    for r in gl_rows:
        item = {
            "symbol": r["ticker"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "percent": float(r["percent"] or 0),
            "volume": _format_volume(int(r["volume"] or 0)),
        }
        if r["cat"] == "gainer":
            gainers.append(item)
        else:
            losers.append(item)

    # ── 2. Foreign (1 query — net_buy + net_sell) ───────────────────
    foreign_sql = text("""
        WITH latest_date AS (
            SELECT trading_date AS td
            FROM hethong_phantich_chungkhoan.electric_board
            WHERE foreign_buy_volume IS NOT NULL
            ORDER BY trading_date DESC
            LIMIT 1
        ),
        foreign_data AS (
            SELECT
                eb.ticker                                     AS symbol,
                eb.match_price                                AS price,
                CASE WHEN eb.ref_price > 0
                    THEN ROUND(((eb.match_price - eb.ref_price)
                                / eb.ref_price * 100)::numeric, 2)
                    ELSE 0 END                                AS change,
                COALESCE(eb.foreign_buy_volume, 0)            AS foreign_buy,
                COALESCE(eb.foreign_sell_volume, 0)           AS foreign_sell,
                COALESCE(eb.foreign_buy_volume, 0)
                  - COALESCE(eb.foreign_sell_volume, 0)       AS net_volume
            FROM hethong_phantich_chungkhoan.electric_board eb
            WHERE eb.trading_date = (SELECT td FROM latest_date)
              AND eb.match_price IS NOT NULL
              AND eb.match_price > 0
        ),
        top_net_buy AS (
            SELECT *, 'net_buy' AS side
            FROM foreign_data WHERE net_volume > 0
            ORDER BY net_volume DESC LIMIT :limit
        ),
        top_net_sell AS (
            SELECT *, 'net_sell' AS side
            FROM foreign_data WHERE net_volume < 0
            ORDER BY net_volume ASC LIMIT :limit
        )
        SELECT * FROM top_net_buy
        UNION ALL
        SELECT * FROM top_net_sell
    """)
    res2 = await db.execute(foreign_sql, {"limit": limit})
    f_rows = res2.mappings().all()

    foreign: List[Dict[str, Any]] = [
        {
            "symbol": r["symbol"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "volume": _format_volume(abs(int(r["net_volume"] or 0))),
            "foreignBuy": int(r["foreign_buy"] or 0),
            "foreignSell": int(r["foreign_sell"] or 0),
            "netVolume": int(r["net_volume"] or 0),
            "side": r["side"],
        }
        for r in f_rows
    ]

    result = {"gainers": gainers, "losers": losers, "foreign": foreign}
    await cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 7. Market Heatmap
# ────────────────────────────────────────────────────────────────────

# Mapping electric_board exchange codes to user-friendly names
_EB_EXCHANGE_MAP = {"HSX": "HOSE", "HNX": "HNX", "UPCOM": "UPCOM"}
_EB_EXCHANGE_REVERSE = {"HOSE": "HSX", "HNX": "HNX", "UPCOM": "UPCOM"}


async def get_market_heatmap(
    db: AsyncSession, exchange: str = "all"
) -> List[Dict[str, Any]]:
    """Sector → stocks treemap data.

    Uses electric_board (24 ms) instead of history_price (13 s)
    because ref_price is already available — no need for window functions.
    Cached in Redis for 120 s.
    """
    cache_key = f"market_heatmap:{exchange}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    exchange_filter = ""
    params: Dict[str, Any] = {}
    if exchange != "all":
        eb_code = _EB_EXCHANGE_REVERSE.get(exchange, exchange)
        exchange_filter = "AND eb.exchange = :exchange"
        params["exchange"] = eb_code

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
            FROM hethong_phantich_chungkhoan.electric_board eb
            JOIN hethong_phantich_chungkhoan.company_overview co
                 ON eb.ticker = co.ticker
            WHERE eb.trading_date = (
                    SELECT MAX(trading_date)
                    FROM hethong_phantich_chungkhoan.electric_board
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

    # Group by sector, cap 15 stocks per sector
    sectors: Dict[str, List[Dict]] = {}
    for r in rows:
        sector = r["sector"]
        if sector not in sectors:
            sectors[sector] = []
        if len(sectors[sector]) < 15:
            sectors[sector].append({
                "name": r["ticker"],
                "value": float(r["price"] or 0) * int(r["volume"] or 0) / 1_000_000,
                "pChange": float(r["p_change"] or 0),
                "volume": int(r["volume"] or 0),
            })

    result = [
        {"name": sector, "children": stocks}
        for sector, stocks in sectors.items()
    ]
    await cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 8. Macro Data
# ────────────────────────────────────────────────────────────────────

SPARKLINE_PERIOD_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
}


async def get_macro_data(db: AsyncSession) -> List[Dict[str, Any]]:
    """Macro indicators with sparkline data — 1 query thay vì N+1.

    FIX: Trước đây chạy 5 queries/asset_type → 20 assets = 100+ queries.
    Giờ chỉ 1 query duy nhất lấy toàn bộ dữ liệu, xử lý Python-side.
    Redis cache 5 phút.
    """
    cache_key = "macro_data"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # 1 query lấy hết — tránh N+1 hoàn toàn
    sql = text("""
        SELECT asset_type, close, date
        FROM hethong_phantich_chungkhoan.macro_economy
        WHERE close IS NOT NULL
        ORDER BY asset_type, date DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    # Group by asset_type
    from collections import defaultdict
    grouped: Dict[str, List[Dict]] = defaultdict(list)
    for r in rows:
        grouped[r["asset_type"]].append({
            "close": float(r["close"]),
            "date": r["date"].isoformat() if hasattr(r["date"], "isoformat") else str(r["date"]),
        })

    cutoffs = {
        k: (date.today() - timedelta(days=d)).isoformat()
        for k, d in SPARKLINE_PERIOD_DAYS.items()
    }

    results = []
    for asset, data_rows in grouped.items():
        if len(data_rows) < 2:
            continue

        # data_rows đã sort DESC → [0] = newest, [1] = prev
        cur_close = data_rows[0]["close"]
        prev_close = data_rows[1]["close"]
        change = round(cur_close - prev_close, 4)
        change_pct = round((change / prev_close * 100), 2) if prev_close else 0

        # Sparklines — filter Python-side thay vì query lại DB
        sparklines: Dict[str, List[float]] = {}
        for period_key, cutoff_date in cutoffs.items():
            sparklines[period_key] = [
                r["close"]
                for r in reversed(data_rows)  # reverse → ASC order
                if r["date"] >= cutoff_date
            ]

        results.append({
            "name": asset,
            "price": cur_close,
            "change": change,
            "changePct": change_pct,
            "sparklines": sparklines,
        })

    await cache_set(cache_key, results, ttl=300)
    return results


# ────────────────────────────────────────────────────────────────────
# 9. News
# ────────────────────────────────────────────────────────────────────

async def get_news(
    db: AsyncSession, limit: int = 10, offset: int = 0
) -> List[Dict[str, Any]]:
    """Latest news from the news table."""
    sql = text("""
        SELECT id, source, title, link, published, summary
        FROM hethong_phantich_chungkhoan.news
        ORDER BY published DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    res = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = res.mappings().all()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "source": r["source"],
            "published": r["published"].isoformat() if r["published"] else None,
            "summary": r["summary"],
            "link": r["link"],
        }
        for r in rows
    ]


# ────────────────────────────────────────────────────────────────────
# 10. Valuation P/E
# ────────────────────────────────────────────────────────────────────

async def get_valuation_pe(db: AsyncSession) -> List[Dict[str, Any]]:
    """Average market P/E per quarter for the last 12 quarters. Cached 300 s."""
    cache_key = "valuation_pe"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        WITH quarterly_pe AS (
            -- For each ticker+quarter, use that quarter's pe;
            -- if null, fall back to the latest non-null pe from a prior quarter
            SELECT
                fr.ticker,
                fr.year,
                fr.quarter,
                COALESCE(
                    fr.pe,
                    (SELECT fr2.pe
                     FROM hethong_phantich_chungkhoan.financial_ratio fr2
                     WHERE fr2.ticker = fr.ticker
                       AND fr2.pe IS NOT NULL AND fr2.pe > 0 AND fr2.pe < 200
                       AND (fr2.year, fr2.quarter) < (fr.year, fr.quarter)
                     ORDER BY fr2.year DESC, fr2.quarter DESC
                     LIMIT 1)
                ) AS pe
            FROM hethong_phantich_chungkhoan.financial_ratio fr
        )
        SELECT
            year,
            quarter,
            ROUND(AVG(pe)::numeric, 2) AS avg_pe
        FROM quarterly_pe
        WHERE pe IS NOT NULL AND pe > 0 AND pe < 200
        GROUP BY year, quarter
        ORDER BY year DESC, quarter DESC
        LIMIT 12
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()
    rows = list(reversed(rows))
    result = [
        {
            "month": f"Q{r['quarter']}/{r['year']}",
            "value": float(r["avg_pe"] or 0),
        }
        for r in rows
    ]
    await cache_set(cache_key, result, ttl=300)
    return result


# ────────────────────────────────────────────────────────────────────
# 11. Liquidity
# ────────────────────────────────────────────────────────────────────

async def get_liquidity(db: AsyncSession, days: int = 20) -> List[Dict[str, Any]]:
    """Daily total trading value (close * volume) aggregated from history_price. Cached 300 s."""
    cache_key = f"liquidity:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        SELECT
            trading_date,
            ROUND((SUM(close * volume) / 1e9)::numeric, 0) AS total_value_bn
        FROM hethong_phantich_chungkhoan.history_price
        WHERE close IS NOT NULL AND volume IS NOT NULL
        GROUP BY trading_date
        ORDER BY trading_date DESC
        LIMIT :days
    """)
    res = await db.execute(sql, {"days": days})
    rows = res.mappings().all()
    rows = list(reversed(rows))
    result = [
        {
            "date": r["trading_date"].strftime("%d/%m") if hasattr(r["trading_date"], "strftime") else str(r["trading_date"])[5:10].replace("-", "/"),
            "value": float(r["total_value_bn"] or 0),
        }
        for r in rows
    ]
    await cache_set(cache_key, result, ttl=300)
    return result


# ────────────────────────────────────────────────────────────────────
# 12. Macro Yearly (vn_macro_yearly)
# ────────────────────────────────────────────────────────────────────

# Human‑readable labels for vn_macro_yearly columns
_MACRO_YEARLY_LABELS = {
    "tang_truong_gdp": "Tăng trưởng GDP (%)",
    "lam_phat": "Lạm phát CPI (%)",
    "tang_truong_cong_nghiep_xay_dung": "Tăng trưởng CN & XD (%)",
    "tang_truong_nganh_che_bien_che_tao": "Tăng trưởng Chế biến chế tạo (%)",
    "tang_truong_tieu_dung_ho_gia_inh": "Tăng trưởng tiêu dùng hộ GĐ (%)",
    "ty_gia_usd_vnd": "Tỷ giá USD/VND",
    "lai_suat_tien_gui": "Lãi suất tiền gửi (%)",
    "lai_suat_cho_vay": "Lãi suất cho vay (%)",
    "tang_truong_xuat_khau": "Tăng trưởng xuất khẩu (%)",
    "tang_truong_nhap_khau": "Tăng trưởng nhập khẩu (%)",
    "can_can_thuong_mai": "Cán cân thương mại (USD)",
    "fdi_thuc_hien": "FDI thực hiện (USD)",
    "du_tru_ngoai_hoi": "Dự trữ ngoại hối (USD)",
    "tang_truong_cung_tien_m2": "Tăng trưởng cung tiền M2 (%)",
    "no_xau_ngan_hang": "Nợ xấu ngân hàng (%)",
}

_MACRO_YEARLY_COLS = list(_MACRO_YEARLY_LABELS.keys())


async def get_macro_yearly(db: AsyncSession) -> Dict[str, Any]:
    """Return vn_macro_yearly data.

    Response format:
    {
      "years": [2015, 2016, ...],
      "indicators": [
        {"key": "tang_truong_gdp", "label": "Tăng trưởng GDP (%)", "values": [6.7, 6.2, ...]},
        ...
      ]
    }
    Cached 1 hour — yearly data rarely changes.
    """
    cache_key = "macro_yearly:v4"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        SELECT *
        FROM hethong_phantich_chungkhoan.vn_macro_yearly
        ORDER BY year ASC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    if not rows:
        return {"years": [], "indicators": []}

    years = [int(r["year"]) for r in rows]
    indicators = []
    for col in _MACRO_YEARLY_COLS:
        values = []
        for r in rows:
            v = r.get(col)
            if v is None or (isinstance(v, float) and math.isnan(v)):
                values.append(None)
            else:
                values.append(round(float(v), 2))

        indicators.append({
            "key": col,
            "label": _MACRO_YEARLY_LABELS[col],
            "values": values,
        })

    result = {"years": years, "indicators": indicators}
    await cache_set(cache_key, result, ttl=3600)
    return result
