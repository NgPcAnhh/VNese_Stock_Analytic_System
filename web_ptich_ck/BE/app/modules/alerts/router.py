from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from .schemas import (
    AlertActionResponse,
    AlertCreateRequest,
    AlertResponse,
    AlertUpdateRequest,
)
from . import logic
from typing import List

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.post("", response_model=AlertResponse)
async def create_alert(
    request: Request,
    payload: AlertCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = getattr(request.state, "user_id", None)
        alert = await logic.create_alert(
            db, 
            ticker=payload.ticker, 
            condition_type=payload.condition_type,
            target_price=payload.target_price, 
            user_id=user_id, 
            session_id=payload.session_id
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[AlertResponse])
async def get_alerts(
    request: Request,
    session_id: str = "anonymous",
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = getattr(request.state, "user_id", None)
        alerts = await logic.get_alerts(db, user_id=user_id, session_id=session_id)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    payload: AlertUpdateRequest,
    request: Request,
    session_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = getattr(request.state, "user_id", None)
        updated = await logic.update_alert(
            db=db,
            alert_id=alert_id,
            user_id=user_id,
            session_id=session_id,
            condition_type=payload.condition_type,
            target_price=payload.target_price,
            status=payload.status,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated


@router.delete("/{alert_id}", response_model=AlertActionResponse)
async def delete_alert(
    alert_id: int,
    request: Request,
    session_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    try:
        user_id = getattr(request.state, "user_id", None)
        deleted = await logic.delete_alert(
            db=db,
            alert_id=alert_id,
            user_id=user_id,
            session_id=session_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertActionResponse(success=True, message="Alert deleted")
