from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

ALLOWED_ALERT_STATUSES = {"ACTIVE", "TRIGGERED", "DISMISSED"}


def _owner_clause(user_id: Optional[int]) -> str:
    return "user_id = :uid" if user_id else "session_id = :sid"


def _owner_params(user_id: Optional[int], session_id: str) -> dict:
    return {"uid": user_id} if user_id else {"sid": session_id}


async def get_alerts(db: AsyncSession, user_id: Optional[int], session_id: str) -> List[dict]:
    clause = _owner_clause(user_id)
    params = _owner_params(user_id, session_id)
    query = text(
        f"""
        SELECT id, ticker, target_price, condition_type, status, created_at, triggered_at
        FROM system.stock_price_alerts
        WHERE {clause}
        ORDER BY created_at DESC
        """
    )
    result = await db.execute(query, params)

    return [dict(r._mapping) for r in result]


async def create_alert(
    db: AsyncSession,
    ticker: str,
    condition_type: str,
    target_price: float,
    user_id: Optional[int],
    session_id: str,
) -> dict:
    query = text(
        """
        INSERT INTO system.stock_price_alerts (user_id, session_id, ticker, condition_type, target_price, status)
        VALUES (:uid, :sid, :ticker, :condition_type, :target_price, 'ACTIVE')
        RETURNING id, ticker, target_price, condition_type, status, created_at, triggered_at
        """
    )

    result = await db.execute(
        query,
        {
            "uid": user_id,
            "sid": session_id,
            "ticker": ticker,
            "condition_type": condition_type,
            "target_price": target_price,
        },
    )
    await db.commit()
    row = result.fetchone()
    return dict(row._mapping) if row else {}


async def update_alert(
    db: AsyncSession,
    alert_id: int,
    user_id: Optional[int],
    session_id: str,
    condition_type: Optional[str] = None,
    target_price: Optional[float] = None,
    status: Optional[str] = None,
) -> Optional[dict]:
    updates = []
    params = {
        "alert_id": alert_id,
        **_owner_params(user_id, session_id),
    }

    if condition_type is not None:
        updates.append("condition_type = :condition_type")
        params["condition_type"] = condition_type

    if target_price is not None:
        updates.append("target_price = :target_price")
        params["target_price"] = target_price

    if status is not None:
        normalized_status = status.upper()
        if normalized_status not in ALLOWED_ALERT_STATUSES:
            raise ValueError("Unsupported alert status")
        updates.append("status = :status")
        params["status"] = normalized_status

    if not updates:
        query = text(
            f"""
            SELECT id, ticker, target_price, condition_type, status, created_at, triggered_at
            FROM system.stock_price_alerts
            WHERE id = :alert_id AND {_owner_clause(user_id)}
            """
        )
        row = (await db.execute(query, params)).fetchone()
        return dict(row._mapping) if row else None

    query = text(
        f"""
        UPDATE system.stock_price_alerts
        SET {", ".join(updates)}
        WHERE id = :alert_id AND {_owner_clause(user_id)}
        RETURNING id, ticker, target_price, condition_type, status, created_at, triggered_at
        """
    )
    result = await db.execute(query, params)
    await db.commit()
    row = result.fetchone()
    return dict(row._mapping) if row else None


async def delete_alert(
    db: AsyncSession,
    alert_id: int,
    user_id: Optional[int],
    session_id: str,
) -> bool:
    params = {
        "alert_id": alert_id,
        **_owner_params(user_id, session_id),
    }
    query = text(
        f"""
        DELETE FROM system.stock_price_alerts
        WHERE id = :alert_id AND {_owner_clause(user_id)}
        RETURNING id
        """
    )
    result = await db.execute(query, params)
    await db.commit()
    return result.fetchone() is not None
