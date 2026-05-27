import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.modules.bi.models.dashboard import Dashboard, DashboardItem
from app.modules.bi.dashboards.schemas import DashboardCreate, DashboardUpdateRequest

async def create_dashboard(db: AsyncSession, dash_in: DashboardCreate):
    db_obj = Dashboard(
        workspace_id=dash_in.workspace_id,
        name=dash_in.name,
        description=dash_in.description,
        status=dash_in.status,
        global_filters=dash_in.global_filters,
        theme_config=dash_in.theme_config,
        widgets=dash_in.widgets
    )
    db.add(db_obj)
    await db.commit()
    
    # Reload dashboard with items preloaded to prevent async lazy loading serialization errors
    query = select(Dashboard).where(Dashboard.id == db_obj.id).options(selectinload(Dashboard.items))
    result = await db.execute(query)
    return result.scalar_one()

async def get_dashboards(db: AsyncSession, workspace_id: uuid.UUID):
    query = select(Dashboard).where(Dashboard.workspace_id == workspace_id).options(selectinload(Dashboard.items))
    result = await db.execute(query)
    return result.scalars().all()

async def update_dashboard(db: AsyncSession, dashboard_id: uuid.UUID, update_in: DashboardUpdateRequest):
    dashboard = await db.get(Dashboard, dashboard_id, options=[selectinload(Dashboard.items)])
    if not dashboard:
        return None
        
    dashboard.name = update_in.name
    dashboard.description = update_in.description
    dashboard.global_filters = update_in.global_filters
    dashboard.theme_config = update_in.theme_config
    dashboard.widgets = update_in.widgets
    
    # Simple replace items for MVP
    for item in list(dashboard.items):
        await db.delete(item)
    dashboard.items.clear()
    
    for item_in in update_in.items:
        new_item = DashboardItem(
            dashboard_id=dashboard.id,
            chart_id=item_in.chart_id,
            x=item_in.x,
            y=item_in.y,
            w=item_in.w,
            h=item_in.h,
            config=item_in.config
        )
        dashboard.items.append(new_item)
        
    await db.commit()
    
    # Reload dashboard with items preloaded to prevent async lazy loading serialization errors
    query = select(Dashboard).where(Dashboard.id == dashboard_id).options(selectinload(Dashboard.items))
    result = await db.execute(query)
    return result.scalar_one()

async def delete_dashboard(db: AsyncSession, dashboard_id: uuid.UUID) -> bool:
    dashboard = await db.get(Dashboard, dashboard_id)
    if not dashboard:
        return False
    await db.delete(dashboard)
    await db.commit()
    return True
