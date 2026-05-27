import uuid
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.bi.models.query import Query
from app.modules.bi.models.data_source import DataSource
from app.modules.bi.queries.schemas import QueryCreate, QueryUpdate, QueryPreviewRequest, QueryPreviewResponse
from app.modules.bi.data_sources.service import decrypt_password

async def validate_sql(sql_text: str):
    # Basic MVP validation
    forbidden_keywords = [
        'insert', 'update', 'delete', 'drop', 'alter', 'truncate', 
        'create', 'grant', 'revoke', 'call', 'exec', 'merge'
    ]
    sql_lower = sql_text.lower()
    for keyword in forbidden_keywords:
        if keyword in sql_lower:
            raise ValueError("SQL not allowed. Only SELECT is permitted.")
            
    # Block access to the "system" schema
    import re
    if re.search(r'\b(system|["\']system["\'])\s*\.', sql_lower):
        raise ValueError("Access to the 'system' schema is restricted.")

async def execute_preview(db: AsyncSession, req: QueryPreviewRequest) -> QueryPreviewResponse:
    try:
        await validate_sql(req.sql_text)
    except ValueError as e:
        return QueryPreviewResponse(columns=[], rows=[], error=str(e))
        
    ds = await db.get(DataSource, req.data_source_id)
    if not ds:
        return QueryPreviewResponse(columns=[], rows=[], error="Data source not found")
        
    if ds.type == 'postgres':
        try:
            password = decrypt_password(ds.encrypted_password) if ds.encrypted_password else None
            conn = await asyncpg.connect(
                user=ds.username,
                password=password,
                database=req.database or ds.database_name,
                host=ds.host,
                port=ds.port or 5432,
                timeout=15
            )
            
            # Restrict schema access
            if req.schema_name:
                if req.schema_name.lower().strip('"\' ') == 'system':
                    await conn.close()
                    return QueryPreviewResponse(columns=[], rows=[], error="Access to the 'system' schema is restricted.")
                safe_schema = req.schema_name.replace('"', '""')
                await conn.execute(f'SET search_path TO "{safe_schema}"')
            else:
                # Force public schema by default to prevent querying system tables implicitly
                await conn.execute("SET search_path TO public")
            
            limit = min(req.limit or 100, 100000)
            wrapped_sql = f"SELECT * FROM ({req.sql_text}) AS subquery LIMIT {limit}"
            stmt = await conn.prepare(wrapped_sql)
            records = await stmt.fetch()
            
            if not records:
                columns = []
                rows = []
            else:
                columns = [{"name": key, "type": "string"} for key in records[0].keys()]
                rows = [dict(record) for record in records]
                
            await conn.close()
            return QueryPreviewResponse(columns=columns, rows=rows)
        except Exception as e:
            return QueryPreviewResponse(columns=[], rows=[], error=str(e))
            
    return QueryPreviewResponse(columns=[], rows=[], error="Unsupported data source type")

async def create_query(db: AsyncSession, query_in: QueryCreate):
    await validate_sql(query_in.sql_text)
    if query_in.schema_name and query_in.schema_name.lower().strip('"\' ') == 'system':
        raise ValueError("Access to the 'system' schema is restricted.")
        
    db_obj = Query(
        workspace_id=query_in.workspace_id,
        data_source_id=query_in.data_source_id,
        name=query_in.name,
        description=query_in.description,
        sql_text=query_in.sql_text,
        database_name=query_in.database_name,
        schema_name=query_in.schema_name
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_query(db: AsyncSession, query_id: uuid.UUID, query_in: QueryUpdate):
    db_obj = await db.get(Query, query_id)
    if not db_obj:
        return None
        
    if query_in.sql_text:
        await validate_sql(query_in.sql_text)
    if query_in.schema_name and query_in.schema_name.lower().strip('"\' ') == 'system':
        raise ValueError("Access to the 'system' schema is restricted.")
        
    update_data = query_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_queries(db: AsyncSession, workspace_id: uuid.UUID):
    query = select(Query).where(Query.workspace_id == workspace_id)
    result = await db.execute(query)
    return result.scalars().all()
