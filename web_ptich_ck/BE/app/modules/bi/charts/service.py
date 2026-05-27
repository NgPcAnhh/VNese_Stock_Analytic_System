import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.bi.models.chart import Chart
from app.modules.bi.charts import schemas

async def create_chart(db: AsyncSession, chart_in: schemas.ChartCreate):
    db_obj = Chart(
        workspace_id=chart_in.workspace_id,
        dataset_id=chart_in.dataset_id,
        name=chart_in.name,
        description=chart_in.description,
        chart_type=chart_in.chart_type,
        encodings=chart_in.encodings,
        echarts_option=chart_in.echarts_option,
        transform_config=chart_in.transform_config
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_chart(db: AsyncSession, chart_id: uuid.UUID, chart_in: schemas.ChartCreate):
    db_obj = await db.get(Chart, chart_id)
    if not db_obj:
        return None
        
    update_data = chart_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_charts(db: AsyncSession, workspace_id: uuid.UUID):
    query = select(Chart).where(Chart.workspace_id == workspace_id)
    result = await db.execute(query)
    return result.scalars().all()

async def delete_chart(db: AsyncSession, chart_obj: Chart) -> None:
    await db.delete(chart_obj)
    await db.commit()
