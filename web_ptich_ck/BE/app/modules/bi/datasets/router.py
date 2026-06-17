from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.database.database import get_db
from app.modules.bi.datasets import schemas, service
from app.modules.bi.models.dataset import Dataset

router = APIRouter()

@router.post("/", response_model=schemas.DatasetResponse)
async def create_dataset(
    req: schemas.DatasetCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        return await service.create_dataset(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/workspace/{workspace_id}", response_model=List[schemas.DatasetResponse])
async def list_datasets(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.get_datasets(db, workspace_id)

@router.post("/{dataset_id}/preview", response_model=schemas.DatasetPreviewResponse)
async def preview_dataset(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.preview_dataset(db, dataset_id)

@router.put("/{dataset_id}", response_model=schemas.DatasetResponse)
async def update_dataset(
    dataset_id: uuid.UUID,
    req: schemas.DatasetUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        res = await service.update_dataset(db, dataset_id, req)
        if not res:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    db_obj = await db.get(Dataset, dataset_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    await service.delete_dataset(db, db_obj)
    return {"status": "success", "message": "Dataset deleted"}

@router.post("/import-excel", response_model=schemas.DatasetResponse)
async def import_excel(
    req: schemas.ExcelImportRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        return await service.import_excel(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── Folders Routes ──

@router.post("/folders", response_model=schemas.FolderResponse)
async def create_folder(
    req: schemas.FolderCreate,
    db: AsyncSession = Depends(get_db)
):
    return await service.create_folder(db, req)

@router.get("/folders/workspace/{workspace_id}", response_model=List[schemas.FolderResponse])
async def list_folders(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.get_folders(db, workspace_id)

@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    success = await service.delete_folder(db, folder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"status": "success", "message": "Folder deleted"}

