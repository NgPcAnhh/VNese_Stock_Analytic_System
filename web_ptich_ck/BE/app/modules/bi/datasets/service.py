import uuid
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.bi.models.dataset import Dataset
from app.modules.bi.models.query import Query
from app.modules.bi.models.data_source import DataSource
from app.modules.bi.models.dataset_folder import DatasetFolder
from app.modules.bi.data_sources.service import decrypt_password
from app.modules.bi.datasets import schemas
from app.modules.bi.datasets.schemas import DatasetCreate, DatasetPreviewResponse
from app.modules.bi.queries.service import execute_preview
from app.modules.bi.queries.schemas import QueryPreviewRequest

async def resolve_folder_path(db: AsyncSession, workspace_id: uuid.UUID, folder_path: str) -> uuid.UUID:
    parts = [p.strip() for p in folder_path.split("/") if p.strip()]
    if not parts:
        raise ValueError("Đường dẫn thư mục không hợp lệ")

    current_parent_id = None
    for part in parts:
        query = select(DatasetFolder).where(
            DatasetFolder.workspace_id == workspace_id,
            DatasetFolder.name == part
        )
        if current_parent_id is None:
            query = query.where(DatasetFolder.parent_id.is_(None))
        else:
            query = query.where(DatasetFolder.parent_id == current_parent_id)
        
        result = await db.execute(query)
        folder = result.scalars().first()
        if not folder:
            raise ValueError(f"Thư mục '{part}' không tồn tại")
        
        current_parent_id = folder.id
        
    return current_parent_id

async def get_or_create_general_folder(db: AsyncSession, workspace_id: uuid.UUID) -> uuid.UUID:
    query = select(DatasetFolder).where(
        DatasetFolder.workspace_id == workspace_id,
        DatasetFolder.name == "general",
        DatasetFolder.parent_id.is_(None)
    )
    result = await db.execute(query)
    folder = result.scalars().first()
    if not folder:
        folder = DatasetFolder(
            workspace_id=workspace_id,
            name="general",
            parent_id=None
        )
        db.add(folder)
        await db.flush()
    return folder.id

async def create_dataset(db: AsyncSession, dataset_in: DatasetCreate):
    name = dataset_in.name.strip()
    folder_id = dataset_in.folder_id

    # Parse query dataset names with slashes
    if "/" in name:
        parts = name.split("/")
        dataset_name = parts[-1].strip()
        folder_path = "/".join(parts[:-1]).strip()

        if not dataset_name:
            raise ValueError("Tên dataset không hợp lệ")
        
        resolved_folder_id = await resolve_folder_path(db, dataset_in.workspace_id, folder_path)
        folder_id = resolved_folder_id
        name = dataset_name
    elif not folder_id:
        folder_id = await get_or_create_general_folder(db, dataset_in.workspace_id)

    db_obj = Dataset(
        workspace_id=dataset_in.workspace_id,
        query_id=dataset_in.query_id,
        data_source_id=dataset_in.data_source_id,
        name=name,
        description=dataset_in.description,
        columns_schema=dataset_in.columns_schema,
        refresh_mode=dataset_in.refresh_mode,
        cache_ttl_seconds=dataset_in.cache_ttl_seconds,
        folder_id=folder_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_dataset(db: AsyncSession, dataset_id: uuid.UUID, dataset_in: schemas.DatasetUpdate):
    db_obj = await db.get(Dataset, dataset_id)
    if not db_obj:
        return None
        
    update_data = dataset_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
        
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_datasets(db: AsyncSession, workspace_id: uuid.UUID):
    query = select(Dataset).where(Dataset.workspace_id == workspace_id)
    result = await db.execute(query)
    datasets = result.scalars().all()

    # Pre-fetch all workspace folders to avoid N+1 query problem when building paths
    folders_query = select(DatasetFolder).where(DatasetFolder.workspace_id == workspace_id)
    folders_result = await db.execute(folders_query)
    folders_map = {f.id: f for f in folders_result.scalars().all()}

    def get_path(fid):
        parts = []
        curr = fid
        visited = set()
        while curr and curr not in visited:
            visited.add(curr)
            f = folders_map.get(curr)
            if not f:
                break
            parts.insert(0, f.name)
            curr = f.parent_id
        return "/".join(parts)

    for ds in datasets:
        ds.folder_path = get_path(ds.folder_id) if ds.folder_id else "general"

    return datasets

async def create_folder(db: AsyncSession, folder_in: schemas.FolderCreate):
    db_obj = DatasetFolder(
        workspace_id=folder_in.workspace_id,
        name=folder_in.name,
        parent_id=folder_in.parent_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_folders(db: AsyncSession, workspace_id: uuid.UUID):
    query = select(DatasetFolder).where(DatasetFolder.workspace_id == workspace_id)
    result = await db.execute(query)
    return result.scalars().all()

async def delete_folder(db: AsyncSession, folder_id: uuid.UUID) -> bool:
    folder = await db.get(DatasetFolder, folder_id)
    if not folder:
        return False

    general_id = await get_or_create_general_folder(db, folder.workspace_id)

    async def get_all_subfolder_ids(fid: uuid.UUID) -> list[uuid.UUID]:
        ids = [fid]
        q = select(DatasetFolder.id).where(DatasetFolder.parent_id == fid)
        res = await db.execute(q)
        child_ids = res.scalars().all()
        for cid in child_ids:
            ids.extend(await get_all_subfolder_ids(cid))
        return ids

    all_folder_ids = await get_all_subfolder_ids(folder_id)

    from sqlalchemy import update
    upd_query = (
        update(Dataset)
        .where(Dataset.folder_id.in_(all_folder_ids))
        .values(folder_id=general_id)
    )
    await db.execute(upd_query)

    await db.delete(folder)
    await db.commit()
    return True


async def preview_dataset(db: AsyncSession, dataset_id: uuid.UUID) -> DatasetPreviewResponse:
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or not dataset.query_id:
        return DatasetPreviewResponse(columns=[], rows=[], error="Dataset or associated query not found")
        
    query_obj = await db.get(Query, dataset.query_id)
    if not query_obj:
        return DatasetPreviewResponse(columns=[], rows=[], error="Associated query not found")
        
    req = QueryPreviewRequest(
        data_source_id=query_obj.data_source_id, 
        sql_text=query_obj.sql_text,
        database=query_obj.database_name,
        schema_name=query_obj.schema_name
    )
    preview = await execute_preview(db, req)
    
    return DatasetPreviewResponse(columns=preview.columns, rows=preview.rows, error=preview.error)

async def delete_dataset(db: AsyncSession, dataset_obj: Dataset) -> None:
    await db.delete(dataset_obj)
    await db.commit()

async def import_excel(db: AsyncSession, req: schemas.ExcelImportRequest) -> Dataset:
    # 1. Fetch the data source
    ds = await db.get(DataSource, req.data_source_id)
    if not ds:
        raise ValueError("Data source not found")
        
    if ds.type != 'postgres':
        raise ValueError("Only PostgreSQL data sources are supported for importing Excel data.")
        
    password = decrypt_password(ds.encrypted_password) if ds.encrypted_password else None
    
    # 2. Connect to the target Postgres database
    conn = await asyncpg.connect(
        user=ds.username,
        password=password,
        database=req.database_name or ds.database_name,
        host=ds.host,
        port=ds.port or 5432,
        timeout=30
    )
    
    schema_name = req.schema_name or "public"
    safe_schema = schema_name.replace('"', '""')
    schema_prefix = f'"{safe_schema}".'
    
    try:
        # Create schema if not exists and set search path
        await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{safe_schema}"')
        await conn.execute(f'SET search_path TO "{safe_schema}"')
            
        # Create columns definitions
        col_defs = []
        col_names = []
        for col in req.columns:
            name = col["name"]
            safe_name = name.replace('"', '""')
            col_names.append(f'"{safe_name}"')
            
            t = col.get("type", "string").lower()
            if t == "number" or t == "numeric" or t == "float":
                col_defs.append(f'"{safe_name}" DOUBLE PRECISION')
            else:
                col_defs.append(f'"{safe_name}" TEXT')
                
        col_defs_str = ", ".join(col_defs)
        safe_table = req.table_name.replace('"', '""')
        
        # Drop table if exists, then create
        await conn.execute(f'DROP TABLE IF EXISTS {schema_prefix}"{safe_table}"')
        await conn.execute(f'CREATE TABLE {schema_prefix}"{safe_table}" ({col_defs_str})')
        
        # Prepare insert statement
        placeholders = [f"${i+1}" for i in range(len(req.columns))]
        insert_query = f'INSERT INTO {schema_prefix}"{safe_table}" ({", ".join(col_names)}) VALUES ({", ".join(placeholders)})'
        
        # Prepare rows data as a list of tuples corresponding to columns
        insert_data = []
        for row in req.rows:
            row_tuple = []
            for col in req.columns:
                val = row.get(col["name"])
                t = col.get("type", "string").lower()
                if val is not None:
                    if t == "number" or t == "numeric" or t == "float":
                        try:
                            val = float(val)
                        except (ValueError, TypeError):
                            val = None
                    else:
                        val = str(val)
                row_tuple.append(val)
            insert_data.append(tuple(row_tuple))
            
        # Insert rows
        if insert_data:
            await conn.executemany(insert_query, insert_data)
            
    finally:
        await conn.close()
        
    # 3. Create the Query model in metadata db
    sql_text = f'SELECT * FROM {schema_prefix}"{safe_table}"'
    query_obj = Query(
        workspace_id=req.workspace_id,
        data_source_id=req.data_source_id,
        name=f"Query for {req.dataset_name}",
        description=f"Generated query for Excel import of table {req.table_name}",
        sql_text=sql_text,
        database_name=req.database_name or ds.database_name,
        schema_name=schema_name
    )
    db.add(query_obj)
    await db.flush()
    
    # 4. Create the Dataset model
    dataset_obj = Dataset(
        workspace_id=req.workspace_id,
        query_id=query_obj.id,
        data_source_id=req.data_source_id,
        name=req.dataset_name,
        description=f"Imported Excel dataset: {req.table_name}",
        columns_schema=req.columns,
        refresh_mode='live'
    )
    db.add(dataset_obj)
    await db.commit()
    await db.refresh(dataset_obj)
    
    return dataset_obj
