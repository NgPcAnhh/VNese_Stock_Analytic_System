from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.database.database import get_db
from app.modules.bi.data_sources import schemas, service
from app.modules.bi.models.data_source import DataSource

router = APIRouter()

@router.post("/", response_model=schemas.DataSourceResponse)
async def create_data_source(
    req: schemas.DataSourceCreate,
    db: AsyncSession = Depends(get_db)
):
    return await service.create_data_source(db, req)

@router.get("/workspace/{workspace_id}", response_model=List[schemas.DataSourceResponse])
async def list_data_sources(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.get_data_sources(db, workspace_id)

@router.post("/test-connection", response_model=schemas.TestConnectionResponse)
async def test_data_source_connection(
    req: schemas.TestConnectionRequest
):
    success = await service.test_connection(req)
    if success:
        return {"success": True, "message": "Connection successful"}
    return {"success": False, "message": "Connection failed"}

@router.put("/{data_source_id}", response_model=schemas.DataSourceResponse)
async def update_data_source(
    data_source_id: uuid.UUID,
    req: schemas.DataSourceUpdate,
    db: AsyncSession = Depends(get_db)
):
    db_obj = await db.get(DataSource, data_source_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Data Source not found")
    return await service.update_data_source(db, db_obj, req)

@router.delete("/{data_source_id}")
async def delete_data_source(
    data_source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    db_obj = await db.get(DataSource, data_source_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Data Source not found")
    await service.delete_data_source(db, db_obj)
    return {"status": "success", "message": "Data Source deleted"}

@router.get("/{data_source_id}/databases", response_model=schemas.DatabasesResponse)
async def get_data_source_databases(
    data_source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    db_obj = await db.get(DataSource, data_source_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Data Source not found")
    try:
        databases = await service.get_databases(db, db_obj)
        return {"databases": databases}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{data_source_id}/metadata", response_model=schemas.DatabaseMetadataResponse)
async def get_data_source_metadata(
    data_source_id: uuid.UUID,
    database: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    db_obj = await db.get(DataSource, data_source_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Data Source not found")
    try:
        return await service.get_database_metadata(db, db_obj, target_db=database)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
