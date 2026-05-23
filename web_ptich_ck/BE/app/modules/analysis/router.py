"""Analysis module API routes (endpoints 6–9)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.analysis import logic

router = APIRouter(prefix="/stock", tags=["Phân tích"])


# ── 6. Stock Comparison ──────────────────────────────────────────
@router.get("/{ticker}/comparison")
async def stock_comparison(
    ticker: str,
    peers: str = Query("", description="Comma-separated peer tickers"),
    db: AsyncSession = Depends(get_db),
):
    """So sánh cổ phiếu với các mã cùng ngành."""
    return await logic.get_stock_comparison(db, ticker=ticker, peers=peers)


# ── 7. Deep Analysis ─────────────────────────────────────────────
@router.get("/{ticker}/deep-analysis")
async def deep_analysis(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Phân tích sâu: CĐKT, KQKD, LCTT với chỉ số sức khỏe."""
    return await logic.get_deep_analysis(db, ticker=ticker)


# ── 8. Quant Analysis ────────────────────────────────────────────
@router.get("/{ticker}/quant-analysis")
async def quant_analysis(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Phân tích định lượng: Sharpe, VaR, Monte Carlo, …"""
    return await logic.get_quant_analysis(db, ticker=ticker)


# ── 9. Valuation ─────────────────────────────────────────────────
@router.get("/{ticker}/valuation")
async def valuation(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Định giá: DCF, DDM, PE/PB bands, Football Field."""
    return await logic.get_valuation(db, ticker=ticker)
