import uuid
import re
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.bi.models.query import Query
from app.modules.bi.models.data_source import DataSource
from app.modules.bi.queries.schemas import QueryCreate, QueryUpdate, QueryPreviewRequest, QueryPreviewResponse
from app.modules.bi.data_sources.service import decrypt_password

async def validate_sql(sql_text: str):
    # Expanded forbidden keywords to prevent DDL, DML, and various injection techniques
    forbidden_keywords = [
        'insert', 'update', 'delete', 'drop', 'alter', 'truncate', 
        'create', 'grant', 'revoke', 'call', 'exec', 'merge',
        'pg_sleep', 'pg_read_file', 'pg_ls_dir', 'copy'
    ]
    sql_lower = sql_text.lower().strip()
    
    # Remove trailing semicolon if it exists at the very end
    if sql_lower.endswith(';'):
        sql_lower = sql_lower[:-1].strip()
        
    # Check for internal semicolons which could indicate multiple statements
    if ';' in sql_lower:
        raise ValueError("Multiple SQL statements are not allowed. Semicolons are only permitted at the end of the query.")

    # 1. Check for forbidden keywords using word boundaries
    for keyword in forbidden_keywords:
        pattern = rf'\b{keyword}\b'
        if re.search(pattern, sql_lower):
            raise ValueError(f"SQL not allowed: Potential security risk or unauthorized command detected ('{keyword}'). Only SELECT is permitted.")
            
    # Check for forbidden symbols/patterns
    forbidden_patterns = ['--', '/\\*', '\\*/']
    for pattern in forbidden_patterns:
        if re.search(pattern, sql_lower):
            raise ValueError(f"SQL not allowed: Potential security risk or unauthorized comment detected ('{pattern}').")

    # 2. Block access to sensitive system schemas
    # Using more comprehensive regex to catch variations like "system"., information_schema. etc.
    restricted_schemas = ['system', 'information_schema', 'pg_catalog', 'bi_hub']
    for schema in restricted_schemas:
        # Match schema followed by a dot, handling possible quotes
        pattern = rf'\b(["\']?{schema}["\']?)\s*\.'
        if re.search(pattern, sql_lower):
            raise ValueError(f"Access to the '{schema}' schema is restricted.")

    # 3. Ensure it starts with SELECT (or a comment followed by SELECT)
    # Strip whitespace and common comment patterns for initial check
    stripped_sql = re.sub(r'/\*.*?\*/', '', sql_lower, flags=re.DOTALL).strip()
    if not (stripped_sql.startswith('select') or stripped_sql.startswith('with')):
         raise ValueError("SQL must be a SELECT or WITH statement.")

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
            
            db_name = req.database
            if db_name == "import excel":
                db_name = ds.database_name
                
            conn = await asyncpg.connect(
                user=ds.username,
                password=password,
                database=db_name or ds.database_name,
                host=ds.host,
                port=ds.port or 5432,
                timeout=15
            )
            
            # Restrict schema access
            if req.schema_name:
                schema_clean = req.schema_name.lower().strip('"\' ')
                if schema_clean in ('system', 'bi_hub'):
                    await conn.close()
                    return QueryPreviewResponse(columns=[], rows=[], error=f"Access to the '{schema_clean}' schema is restricted.")
                safe_schema = req.schema_name.replace('"', '""')
                await conn.execute(f'SET search_path TO "{safe_schema}"')
            else:
                # Force public schema by default to prevent querying system tables implicitly
                await conn.execute("SET search_path TO public")
            
            # Clean SQL for wrapping
            clean_sql = req.sql_text.strip()
            if clean_sql.endswith(';'):
                clean_sql = clean_sql[:-1].strip()

            limit = min(req.limit or 100, 100000)
            wrapped_sql = f"SELECT * FROM ({clean_sql}) AS subquery LIMIT {limit}"
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
    if query_in.schema_name and query_in.schema_name.lower().strip('"\' ') in ('system', 'bi_hub'):
        schema_clean = query_in.schema_name.lower().strip('"\' ')
        raise ValueError(f"Access to the '{schema_clean}' schema is restricted.")
        
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
    if query_in.schema_name and query_in.schema_name.lower().strip('"\' ') in ('system', 'bi_hub'):
        schema_clean = query_in.schema_name.lower().strip('"\' ')
        raise ValueError(f"Access to the '{schema_clean}' schema is restricted.")
        
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
