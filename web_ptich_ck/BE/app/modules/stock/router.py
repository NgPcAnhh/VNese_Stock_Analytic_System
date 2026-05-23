"""Stock module API routes (endpoints 1-9)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.stock import logic

router = APIRouter(prefix="/stock", tags=["Cổ phiếu"])


# ── 1. Mega Overview Endpoint ─────────────────────────────────────
@router.get("/{ticker}/overview")
async def stock_overview(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Tổng quan cổ phiếu — gộp tất cả dữ liệu overview tab."""
    return await logic.get_stock_overview(db, ticker=ticker)


# ── 1.1 Available Periods ─────────────────────────────────────────
@router.get("/{ticker}/available-periods")
async def available_periods(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách các năm có dữ liệu báo cáo tài chính."""
    return await logic.get_available_periods(db, ticker=ticker)


# ── 2. Price History ──────────────────────────────────────────────
@router.get("/{ticker}/price-history")
async def price_history(
    ticker: str,
    days: int = Query(365, ge=1, le=5000),
    period: str | None = Query(None, regex="^(1D|1W|1M|3M|6M|1Y|5Y|ALL)$"),
    db: AsyncSession = Depends(get_db),
):
    """Dữ liệu OHLCV cho biểu đồ kỹ thuật. Ưu tiên `period` nếu có."""
    return await logic.get_price_history(db, ticker=ticker, days=days, period=period)


# ── 3. Financial Ratios ──────────────────────────────────────────
@router.get("/{ticker}/financial-ratios")
async def financial_ratios(
    ticker: str,
    periods: int = Query(20, ge=4, le=40),
    year: int | None = Query(None, description="Lọc theo năm cụ thể (VD: 2024)"),
    db: AsyncSession = Depends(get_db),
):
    """Các chỉ số tài chính (PE, PB, ROE, ROA, …)."""
    return await logic.get_financial_ratios(db, ticker=ticker, periods=periods, year=year)


# ── 4. Financial Reports (IS, BS, CF) ────────────────────────────
@router.get("/{ticker}/financial-reports")
async def financial_reports(
    ticker: str,
    periods: int = Query(12, ge=4, le=20),
    year: int | None = Query(None, description="Lọc theo năm cụ thể (VD: 2024)"),
    db: AsyncSession = Depends(get_db),
):
    """Báo cáo tài chính (IS, BS, CF)."""
    return await logic.get_financial_reports(db, ticker=ticker, periods=periods, year=year)


# ── 4.1 Insurance TCDN Dashboard ─────────────────────────────
@router.get("/{ticker}/insurance-tcdn")
async def insurance_tcdn(
    ticker: str,
    period: str | None = Query(None, description="Kỳ dữ liệu (VD: Q4/2024)"),
    year: int | None = Query(None, description="Lọc theo năm cụ thể (VD: 2024)"),
    scenario: str = Query("adverse", pattern="^(baseline|adverse|severe)$"),
    db: AsyncSession = Depends(get_db),
):
    """Payload chuyên dụng cho Dashboard TCDN ngành bảo hiểm."""
    return await logic.get_insurance_tcdn_dashboard(
        db,
        ticker=ticker,
        period=period,
        year=year,
        scenario=scenario,
    )


# ── 5. Company Profile ───────────────────────────────────────────
@router.get("/{ticker}/profile")
async def company_profile(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Hồ sơ doanh nghiệp: tổng quan, cổ đông, sự kiện."""
    return await logic.get_company_profile(db, ticker=ticker)


# ── 6. Stock Comparison ──────────────────────────────────────────
@router.get("/{ticker}/comparison")
async def stock_comparison(
    ticker: str,
    peers: str = Query("", description="Comma-separated peer tickers (auto-detect if empty)"),
    db: AsyncSession = Depends(get_db),
):
    """So sánh cổ phiếu với các mã cùng ngành hoặc chỉ định."""
    return await logic.get_stock_comparison(db, ticker=ticker, peers=peers)


# ── 7. Deep Analysis (BS / IS / CF) ──────────────────────────────
@router.get("/{ticker}/deep-analysis")
async def deep_analysis(
    ticker: str,
    year: int | None = Query(None, description="Lọc theo năm cụ thể (VD: 2024)"),
    db: AsyncSession = Depends(get_db),
):
    """Phân tích chuyên sâu: Bảng cân đối, KQKD, dòng tiền."""
    return await logic.get_deep_analysis(db, ticker=ticker, year=year)


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
    """Định giá: DCF, DDM, PE/PB bands, peer valuation."""
    return await logic.get_valuation(db, ticker=ticker)
