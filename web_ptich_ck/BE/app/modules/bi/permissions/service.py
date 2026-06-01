"""Service layer for ChartPermission CRUD."""
import uuid
from typing import Dict, List

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.bi.models.permission import ChartPermission
from app.modules.bi.models.chart import Chart
from app.modules.auth.models import User


async def get_chart_permitted_user_ids(db: AsyncSession, chart_id: uuid.UUID) -> List[int]:
    """Lấy danh sách user_id được phép xem chart."""
    stmt = select(ChartPermission.user_id).where(ChartPermission.chart_id == chart_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_chart_permissions_with_users(db: AsyncSession, chart_id: uuid.UUID) -> dict:
    """Lấy danh sách user info đầy đủ cho chart."""
    stmt = (
        select(User)
        .join(ChartPermission, ChartPermission.user_id == User.id)
        .where(ChartPermission.chart_id == chart_id)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    return {
        "chart_id": chart_id,
        "permitted_users": [
            {
                "user_id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
            }
            for u in users
        ],
    }


async def set_chart_permissions(
    db: AsyncSession,
    chart_id: uuid.UUID,
    user_ids: List[int],
) -> None:
    """Ghi đè toàn bộ permissions cho 1 chart."""
    # Xóa toàn bộ permissions cũ
    await db.execute(delete(ChartPermission).where(ChartPermission.chart_id == chart_id))
    # Thêm permissions mới
    for uid in user_ids:
        db.add(ChartPermission(chart_id=chart_id, user_id=uid))
    await db.commit()


async def batch_set_chart_permissions(
    db: AsyncSession,
    chart_ids: List[uuid.UUID],
    user_ids: List[int],
) -> None:
    """Ghi đè permissions cho nhiều charts cùng lúc (cùng 1 danh sách user)."""
    if not chart_ids:
        return
    # Xóa permissions cũ của các charts đó
    await db.execute(
        delete(ChartPermission).where(ChartPermission.chart_id.in_(chart_ids))
    )
    # Thêm mới
    for chart_id in chart_ids:
        for uid in user_ids:
            db.add(ChartPermission(chart_id=chart_id, user_id=uid))
    await db.commit()


async def get_dashboard_chart_permissions(
    db: AsyncSession,
    chart_ids: List[uuid.UUID],
) -> Dict[str, List[int]]:
    """Lấy toàn bộ permissions cho danh sách chart_ids (dùng cho dashboard).
    
    Returns: { chart_id_str: [user_id1, user_id2, ...] }
    """
    if not chart_ids:
        return {}
    stmt = select(ChartPermission).where(ChartPermission.chart_id.in_(chart_ids))
    result = await db.execute(stmt)
    perms = result.scalars().all()

    output: Dict[str, List[int]] = {str(cid): [] for cid in chart_ids}
    for p in perms:
        output[str(p.chart_id)].append(p.user_id)
    return output


async def get_all_users(db: AsyncSession) -> List[dict]:
    """Lấy danh sách tất cả users (để hiển thị trong permission modal)."""
    stmt = select(User).where(User.is_active == True).order_by(User.full_name)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
            "role": u.role.name if u.role else "user",
        }
        for u in users
    ]
