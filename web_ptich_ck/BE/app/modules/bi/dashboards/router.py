from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.database.database import get_db
from app.modules.bi.dashboards import schemas, service

router = APIRouter()

@router.post("/", response_model=schemas.DashboardResponse)
async def create_dashboard(
    req: schemas.DashboardCreate,
    db: AsyncSession = Depends(get_db)
):
    return await service.create_dashboard(db, req)

@router.get("/workspace/{workspace_id}", response_model=List[schemas.DashboardResponse])
async def list_dashboards(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.get_dashboards(db, workspace_id)

@router.put("/{dashboard_id}", response_model=schemas.DashboardResponse)
async def update_dashboard(
    dashboard_id: uuid.UUID,
    req: schemas.DashboardUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    dashboard = await service.update_dashboard(db, dashboard_id, req)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return dashboard

@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    success = await service.delete_dashboard(db, dashboard_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {"status": "success", "message": "Dashboard deleted"}
