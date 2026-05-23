"""API Router for the Indices module."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.indices import logic
from app.modules.indices.schemas import (
    MarketIndexItem,
    MarketIndicesResponse,
    MacroYearlyIndicatorItem,
    MacroYearlyTableResponse,
)

router = APIRouter(prefix="/indices", tags=["Chỉ số"])


@router.get(
    "/market",
    response_model=MarketIndicesResponse,
    summary="Chỉ số thị trường quốc tế (macro_economy)",
    description="Trả về tất cả asset_type từ bảng macro_economy với sparkline 30 ngày, "
    "biến động 7D / YTD / 1Y / 3Y.",
)
async def market_indices(db: AsyncSession = Depends(get_db)):
    data = await logic.get_market_indices(db)
    return {"data": data}


@router.get(
    "/macro-yearly",
    response_model=MacroYearlyTableResponse,
    summary="Chỉ số vĩ mô hàng năm (vn_macro_yearly)",
    description="Trả về 15 chỉ số vĩ mô Việt Nam, nhóm theo category, "
    "kèm thay đổi so với năm trước.",
)
async def macro_yearly(db: AsyncSession = Depends(get_db)):
    data = await logic.get_macro_yearly_indicators(db)
    return {"data": data}
