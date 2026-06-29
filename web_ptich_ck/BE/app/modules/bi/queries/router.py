from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.database.database import get_db
from app.modules.bi.queries import schemas, service

router = APIRouter()

@router.post("/preview", response_model=schemas.QueryPreviewResponse)
async def preview_query(
    req: schemas.QueryPreviewRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return await service.execute_preview(db, req)

@router.post("/", response_model=schemas.QueryResponse)
async def create_query(
    req: schemas.QueryCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        return await service.create_query(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/workspace/{workspace_id}", response_model=List[schemas.QueryResponse])
async def list_queries(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await service.get_queries(db, workspace_id)

@router.put("/{query_id}", response_model=schemas.QueryResponse)
async def update_query(
    query_id: uuid.UUID,
    req: schemas.QueryUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        res = await service.update_query(db, query_id, req)
        if not res:
            raise HTTPException(status_code=404, detail="Query not found")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
