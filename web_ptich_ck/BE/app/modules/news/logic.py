"""Business logic for the News module."""

from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# Schema names
NEWS_SCHEMA = "hethong_phantich_chungkhoan"
SYSTEM_SCHEMA = "system"


# ────────────────────────────────────────────────────────────────────
# 1. Latest news (nhỏ gọn, dùng cho hero section)
# ────────────────────────────────────────────────────────────────────
async def get_latest_news(
    db: AsyncSession, limit: int = 8
) -> List[Dict[str, Any]]:
    """Return the most recent articles for the hero slider."""
    cache_key = f"news:latest:{limit}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT id, source, title, link, published, summary
        FROM {NEWS_SCHEMA}.news
        ORDER BY published DESC NULLS LAST
        LIMIT :limit
    """)
    res = await db.execute(sql, {"limit": limit})
    rows = res.mappings().all()
    data = [
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
    await cache_set(cache_key, data, ttl=120)   # cache 2 phút
    return data


# ────────────────────────────────────────────────────────────────────
# 2. Paginated list with search & date filter
# ────────────────────────────────────────────────────────────────────
async def get_news_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    source: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Return a paginated list of news articles with optional filters.
    search   : partial match on title (ILIKE)
    source   : exact match on source
    date_from: published >= date_from (YYYY-MM-DD)
    date_to  : published <= date_to   (YYYY-MM-DD 23:59:59)
    """
    conditions = []
    params: Dict[str, Any] = {}

    if search:
        conditions.append("n.title ILIKE :search")
        params["search"] = f"%{search}%"
    if source:
        conditions.append("n.source = :source")
        params["source"] = source
    if date_from:
        conditions.append("n.published >= :date_from::timestamp")
        params["date_from"] = date_from
    if date_to:
        conditions.append("n.published <= (:date_to::date + INTERVAL '1 day')")
        params["date_to"] = date_to

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Count total
    count_sql = text(f"""
        SELECT COUNT(*) AS cnt
        FROM {NEWS_SCHEMA}.news n
        WHERE {where_clause}
    """)
    count_res = await db.execute(count_sql, params)
    total = count_res.scalar() or 0
    total_pages = max(1, math.ceil(total / page_size))

    # Fetch page
    offset = (page - 1) * page_size
    data_sql = text(f"""
        SELECT n.id, n.source, n.title, n.link, n.published, n.summary
        FROM {NEWS_SCHEMA}.news n
        WHERE {where_clause}
        ORDER BY n.published DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    params["limit"] = page_size
    params["offset"] = offset

    res = await db.execute(data_sql, params)
    rows = res.mappings().all()
    articles = [
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

    return {
        "data": articles,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ────────────────────────────────────────────────────────────────────
# 3. Most clicked articles
# ────────────────────────────────────────────────────────────────────
async def get_most_clicked(
    db: AsyncSession, limit: int = 10, days: int = 30
) -> List[Dict[str, Any]]:
    """
    Return articles with the most clicks in the last N days.
    Join system.article_clicks → hethong_phantich_chungkhoan.news
    """
    cache_key = f"news:most_clicked:{limit}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            n.id,
            n.title,
            n.source,
            n.published,
            n.link,
            COUNT(c.id) AS click_count
        FROM {SYSTEM_SCHEMA}.article_clicks c
        JOIN {NEWS_SCHEMA}.news n ON n.id = c.article_id
        WHERE c.clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY n.id, n.title, n.source, n.published, n.link
        ORDER BY click_count DESC
        LIMIT :limit
    """)
    try:
        res = await db.execute(sql, {"limit": limit, "days": days})
        rows = res.mappings().all()
    except Exception as exc:
        # Table might not exist yet — return empty
        logger.warning("most_clicked query error (schema may not exist): %s", exc)
        return []

    data = [
        {
            "id": r["id"],
            "title": r["title"],
            "source": r["source"],
            "published": r["published"].isoformat() if r["published"] else None,
            "link": r["link"],
            "click_count": r["click_count"],
        }
        for r in rows
    ]
    await cache_set(cache_key, data, ttl=300)  # cache 5 phút
    return data


# ────────────────────────────────────────────────────────────────────
# 4. Hot search keywords
# ────────────────────────────────────────────────────────────────────
async def get_hot_search(
    db: AsyncSession, limit: int = 12, days: int = 7
) -> List[Dict[str, Any]]:
    """Top searched keywords in the last N days."""
    cache_key = f"news:hot_search:{limit}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            keyword,
            COUNT(*) AS search_count
        FROM {SYSTEM_SCHEMA}.search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword
        ORDER BY search_count DESC
        LIMIT :limit
    """)
    try:
        res = await db.execute(sql, {"limit": limit, "days": days})
        rows = res.mappings().all()
    except Exception as exc:
        logger.warning("hot_search query error (schema may not exist): %s", exc)
        return []

    data = [
        {"keyword": r["keyword"], "search_count": r["search_count"]}
        for r in rows
    ]
    await cache_set(cache_key, data, ttl=300)
    return data


# ────────────────────────────────────────────────────────────────────
# 5. Track click
# ────────────────────────────────────────────────────────────────────
async def track_click(
    db: AsyncSession,
    article_id: int,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    """Insert a click event into system.article_clicks."""
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.article_clicks (article_id, session_id, ip_address)
        VALUES (:article_id, :session_id, :ip_address)
    """)
    try:
        await db.execute(sql, {
            "article_id": article_id,
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_click error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 6. Track search
# ────────────────────────────────────────────────────────────────────
async def track_search(
    db: AsyncSession,
    keyword: str,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    """Insert a search event into system.search_logs."""
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.search_logs (keyword, session_id, ip_address)
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
        logger.error("track_search error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 7. Get all distinct sources (for filter dropdown)
# ────────────────────────────────────────────────────────────────────
async def get_sources(db: AsyncSession) -> List[str]:
    """Return distinct news sources."""
    cache_key = "news:sources"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT DISTINCT source
        FROM {NEWS_SCHEMA}.news
        WHERE source IS NOT NULL
        ORDER BY source
    """)
    res = await db.execute(sql)
    sources = [row[0] for row in res.fetchall()]
    await cache_set(cache_key, sources, ttl=600)
    return sources


# ────────────────────────────────────────────────────────────────────
# 8. Sentiment Summary (Daily & Monthly)
# ────────────────────────────────────────────────────────────────────
async def get_sentiment_summary(db: AsyncSession) -> Dict[str, Any]:
    """
    Calculate average sentiment score from the `published` timestamp for:
    1. Current Day (Daily)
    2. Current Month (Monthly)
    Sentiment values are stored directly in the DB (range -100..100).
    """
    cache_key = "news:sentiment_summary"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            AVG(CASE WHEN published >= CURRENT_DATE THEN sentiment END) AS daily_avg,
            AVG(CASE WHEN published >= date_trunc('month', CURRENT_DATE) THEN sentiment END) AS monthly_avg
        FROM {NEWS_SCHEMA}.news
        WHERE sentiment IS NOT NULL
    """)
    res = await db.execute(sql)
    row = res.mappings().first()

    data = {
        "daily": float(row["daily_avg"]) if row and row["daily_avg"] is not None else 0.0,
        "monthly": float(row["monthly_avg"]) if row and row["monthly_avg"] is not None else 0.0,
    }

    await cache_set(cache_key, data, ttl=300)  # Cache 5 mins
    return data


# ────────────────────────────────────────────────────────────────────
# 9. Sector Sentiment (Day / Week / Month)
# ────────────────────────────────────────────────────────────────────
async def get_sector_sentiment(
    db: AsyncSession,
    time_range: str = "month",
) -> List[Dict[str, Any]]:
    """
    Calculate average sentiment per sector from the `published` timestamp within a time window.
    time_range: day | week | month
    """
    normalized = (time_range or "month").strip().lower()
    if normalized not in {"day", "week", "month"}:
        normalized = "month"

    range_sql = {
        "day": "CURRENT_DATE",
        "week": "date_trunc('week', CURRENT_DATE)",
        "month": "date_trunc('month', CURRENT_DATE)",
    }[normalized]

    cache_key = f"news:sector_sentiment:{normalized}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            COALESCE(icb_name, 'Khác') AS sector,
            AVG(sentiment) AS sentiment,
            COUNT(*) AS article_count
        FROM {NEWS_SCHEMA}.news
        WHERE sentiment IS NOT NULL
          AND published >= {range_sql}
        GROUP BY COALESCE(icb_name, 'Khác')
        ORDER BY sentiment DESC NULLS LAST, article_count DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    data = [
        {
            "sector": r["sector"],
            "sentiment": float(r["sentiment"]) if r["sentiment"] is not None else 0.0,
            "article_count": int(r["article_count"] or 0),
        }
        for r in rows
    ]

    await cache_set(cache_key, data, ttl=300)
    return data
