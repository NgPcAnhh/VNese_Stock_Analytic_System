import uuid
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.bi.models.data_source import DataSource
from app.modules.bi.data_sources.schemas import DataSourceCreate, DataSourceUpdate, TestConnectionRequest
from app.core.config import get_settings
from cryptography.fernet import Fernet

settings = get_settings()
encryption_key = getattr(settings, "ENCRYPTION_KEY", "FW9yUp0yRl1lVuUv6ZuWbXX4SMWcheXrysMpQ_o8xxM=")
fernet = Fernet(encryption_key.encode('utf-8') if len(encryption_key) == 44 else Fernet.generate_key())

def encrypt_password(password: str) -> str:
    return fernet.encrypt(password.encode('utf-8')).decode('utf-8')

def decrypt_password(encrypted_password: str) -> str:
    try:
        return fernet.decrypt(encrypted_password.encode('utf-8')).decode('utf-8')
    except Exception as e:
        print(f"Failed to decrypt password: {e}")
        return ""

async def get_data_sources(db: AsyncSession, workspace_id: uuid.UUID):
    query = select(DataSource).where(DataSource.workspace_id == workspace_id)
    result = await db.execute(query)
    return result.scalars().all()

async def create_data_source(db: AsyncSession, data_source_in: DataSourceCreate):
    db_obj = DataSource(
        workspace_id=data_source_in.workspace_id,
        name=data_source_in.name,
        type=data_source_in.type,
        host=data_source_in.host,
        port=data_source_in.port,
        database_name=data_source_in.database_name,
        username=data_source_in.username,
        ssl_config=data_source_in.ssl_config,
        extra_config=data_source_in.extra_config
    )
    if data_source_in.password:
        db_obj.encrypted_password = encrypt_password(data_source_in.password)
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def test_connection(req: TestConnectionRequest) -> bool:
    if req.type == 'postgres':
        try:
            conn = await asyncpg.connect(
                user=req.username,
                password=req.password,
                database=req.database_name,
                host=req.host,
                port=req.port or 5432,
                timeout=5
            )
            await conn.close()
            return True
        except Exception as e:
            print(f"Connection failed: {e}")
            return False
    return False

async def update_data_source(db: AsyncSession, db_obj: DataSource, obj_in: DataSourceUpdate) -> DataSource:
    update_data = obj_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        if update_data["password"]:
            db_obj.encrypted_password = encrypt_password(update_data["password"])
        del update_data["password"]
    
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def delete_data_source(db: AsyncSession, db_obj: DataSource) -> None:
    await db.delete(db_obj)
    await db.commit()

async def get_databases(db: AsyncSession, db_obj: DataSource) -> list[str]:
    if db_obj.type != 'postgres':
        return [db_obj.database_name] if db_obj.database_name else []
        
    password = decrypt_password(db_obj.encrypted_password) if db_obj.encrypted_password else None
    
    try:
        conn = await asyncpg.connect(
            user=db_obj.username,
            password=password,
            database=db_obj.database_name or 'postgres',
            host=db_obj.host,
            port=db_obj.port or 5432,
            timeout=10
        )
    except Exception as e:
        raise ValueError(f"Failed to connect to database: {e}")
        
    try:
        rows = await conn.fetch("SELECT datname FROM pg_database WHERE datistemplate = false;")
        await conn.close()
        return [row['datname'] for row in rows]
    except Exception as e:
        print(f"Failed to query database list: {e}")
        await conn.close()
        return [db_obj.database_name] if db_obj.database_name else []

async def get_database_metadata(db: AsyncSession, db_obj: DataSource, target_db: str = None) -> dict:
    if db_obj.type != 'postgres':
        return {"database": db_obj.database_name, "schemas": []}
    
    password = decrypt_password(db_obj.encrypted_password) if db_obj.encrypted_password else None
    connect_db = target_db or db_obj.database_name or 'postgres'
    
    try:
        conn = await asyncpg.connect(
            user=db_obj.username,
            password=password,
            database=connect_db,
            host=db_obj.host,
            port=db_obj.port or 5432,
            timeout=10
        )
    except Exception as e:
        raise ValueError(f"Failed to connect to database '{connect_db}': {e}")
        
    try:
        query = """
            SELECT table_schema, table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'system') 
            ORDER BY table_schema, table_name, ordinal_position;
        """
        rows = await conn.fetch(query)
        await conn.close()
        
        schemas_dict = {}
        for row in rows:
            schema_name = row['table_schema']
            table_name = row['table_name']
            col_name = row['column_name']
            col_type = row['data_type']
            
            if schema_name not in schemas_dict:
                schemas_dict[schema_name] = {}
            if table_name not in schemas_dict[schema_name]:
                schemas_dict[schema_name][table_name] = []
                
            schemas_dict[schema_name][table_name].append({
                "name": col_name,
                "type": col_type
            })
            
        result_schemas = []
        for s_name, tables in schemas_dict.items():
            result_tables = []
            for t_name, cols in tables.items():
                result_tables.append({"name": t_name, "columns": cols})
            result_schemas.append({"name": s_name, "tables": result_tables})
            
        return {
            "database": connect_db,
            "schemas": result_schemas
        }
    except Exception as e:
        print(f"Failed to fetch metadata details: {e}")
        return {"database": connect_db, "schemas": []}
