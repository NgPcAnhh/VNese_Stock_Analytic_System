from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.database.database import get_db
from app.modules.bi.charts import schemas, service
from app.modules.bi.models.chart import Chart

router = APIRouter()

@router.post("/", response_model=schemas.ChartResponse)
async def create_chart(
    req: schemas.ChartCreate,
    db: AsyncSession = Depends(get_db)
):
    return await service.create_chart(db, req)

@router.get("/workspace/{workspace_id}", response_model=List[schemas.ChartResponse])
async def list_charts(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.get_charts(db, workspace_id)

@router.put("/{chart_id}", response_model=schemas.ChartResponse)
async def update_chart(
    chart_id: uuid.UUID,
    req: schemas.ChartCreate,
    db: AsyncSession = Depends(get_db)
):
    res = await service.update_chart(db, chart_id, req)
    if not res:
        raise HTTPException(status_code=404, detail="Chart not found")
    return res

@router.delete("/{chart_id}")
async def delete_chart(
    chart_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    db_obj = await db.get(Chart, chart_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Chart not found")
    await service.delete_chart(db, db_obj)
    return {"status": "success", "message": "Chart deleted"}
