from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database.database import get_db
from app.modules.portfolio.schemas import (
    CreatePortfolioRequest,
    PortfolioResponse,
    PortfolioPositionResponse,
    RiskSnapshotResponse,
    PortfolioListResponse
)
from app.modules.portfolio.logic import (
    create_portfolio,
    get_portfolio_positions,
    recalc_risk_snapshot,
    get_latest_risk_snapshot,
    get_all_portfolios,
    delete_portfolio
)

router = APIRouter(prefix="/portfolio", tags=["Quan tri danh muc"])

@router.get("", response_model=List[PortfolioListResponse])
async def api_get_all_portfolios(db: AsyncSession = Depends(get_db)):
    return await get_all_portfolios(db)

@router.post("", response_model=PortfolioResponse)
async def api_create_portfolio(payload: CreatePortfolioRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await create_portfolio(db, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{id}", status_code=204)
async def api_delete_portfolio(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await delete_portfolio(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Portfolio không tồn tại")
    return Response(status_code=204)

@router.get("/{id}/positions", response_model=List[PortfolioPositionResponse])
async def api_get_positions(id: int, db: AsyncSession = Depends(get_db)):
    return await get_portfolio_positions(db, id)

@router.get("/{id}/risk/snapshot", response_model=RiskSnapshotResponse)
async def api_get_risk_snapshot(id: int, db: AsyncSession = Depends(get_db)):
    snap = await get_latest_risk_snapshot(db, id)
    if not snap:
        raise HTTPException(status_code=404, detail="Risk snapshot not found")
    return dict(snap)

@router.post("/{id}/risk/recalc", response_model=RiskSnapshotResponse)
async def api_recalc_risk(id: int, db: AsyncSession = Depends(get_db)):
    snap = await recalc_risk_snapshot(db, id)
    if not snap:
        raise HTTPException(status_code=400, detail="Cannot calculate risk, check positions.")
    return dict(snap)
