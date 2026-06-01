"""Router cho Chart Permission API."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.bi.permissions import service, schemas

router = APIRouter()


# ── Lấy danh sách tất cả users (để hiển thị trong permission modal) ─────────
@router.get("/users", summary="List all system users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả users trong hệ thống (dùng cho dropdown phân quyền)."""
    return await service.get_all_users(db)


# ── Lấy permissions của 1 chart ─────────────────────────────────────────────
@router.get("/charts/{chart_id}", response_model=schemas.ChartPermissionResponse)
async def get_chart_permissions(
    chart_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách users có quyền xem chart."""
    result = await service.get_chart_permissions_with_users(db, chart_id)
    return result


# ── Ghi đè permissions của 1 chart ──────────────────────────────────────────
@router.post("/charts/{chart_id}", summary="Set permissions for a chart")
async def set_chart_permissions(
    chart_id: uuid.UUID,
    body: schemas.SetPermissionsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Ghi đè toàn bộ permission list cho 1 chart. Truyền [] để xóa hết (chỉ admin/creator xem được)."""
    await service.set_chart_permissions(db, chart_id, body.user_ids)
    return {"status": "success", "chart_id": str(chart_id), "user_ids": body.user_ids}


# ── Batch set permissions cho nhiều charts ───────────────────────────────────
@router.post("/charts/batch", summary="Batch set permissions for multiple charts")
async def batch_set_permissions(
    body: schemas.BatchSetPermissionsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Ghi đè permissions cho nhiều charts cùng lúc với cùng 1 danh sách users."""
    await service.batch_set_chart_permissions(db, body.chart_ids, body.user_ids)
    return {
        "status": "success",
        "chart_ids": [str(cid) for cid in body.chart_ids],
        "user_ids": body.user_ids,
    }


# ── Lấy toàn bộ permissions của 1 dashboard (theo chart_ids) ────────────────
@router.post("/dashboard-charts", summary="Get permissions for a list of chart IDs")
async def get_dashboard_permissions(
    chart_ids: List[uuid.UUID],
    db: AsyncSession = Depends(get_db),
):
    """Lấy permissions map cho danh sách chart_ids. Response: { chart_id: [user_ids] }"""
    result = await service.get_dashboard_chart_permissions(db, chart_ids)
    return result
