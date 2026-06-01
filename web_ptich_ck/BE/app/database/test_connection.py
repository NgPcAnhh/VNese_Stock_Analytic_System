import sys
import asyncio
from pathlib import Path

# Thêm đường dẫn BE vào sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.database.database import AsyncSessionLocal, engine
from app.core.config import get_settings

TARGET_SCHEMA = "hethong_phantich_chungkhoan"


async def test_database_connection():
    """Kiểm tra kết nối database có thành công không"""
    try:
        async with engine.connect() as connection:
            # Kiểm tra kết nối cơ bản
            result = await connection.execute(text("SELECT 1"))
            print("✓ Kết nối database thành công!")

            # Hiển thị thông tin kết nối
            db_info_res = await connection.execute(text(
                "SELECT current_database(), current_user, inet_server_addr(), inet_server_port(), version()"
            ))
            db_info = db_info_res.fetchone()
            print(f"  Database : {db_info[0]}")
            print(f"  User     : {db_info[1]}")
            print(f"  Host:Port: {db_info[2]}:{db_info[3]}")
            print(f"  Version  : {db_info[4][:60]}...")
            return True
    except Exception as e:
        print(f"✗ Lỗi kết nối database: {str(e)}")
        return False


async def test_session():
    """Kiểm tra có thể tạo session hay không"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT 1"))
            row = result.fetchone()
            print("✓ Session tạo thành công!")
            print(f"  Test query result: {row[0]}")
            return True
    except Exception as e:
        print(f"✗ Lỗi tạo session: {str(e)}")
        return False


async def test_schema_exists():
    """Kiểm tra schema hethong_phantich_chungkhoan có tồn tại không"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text(
                "SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema"
            ), {"schema": TARGET_SCHEMA})
            row = result.fetchone()

            if row:
                print(f"✓ Schema '{TARGET_SCHEMA}' tồn tại!")
            else:
                print(f"✗ Schema '{TARGET_SCHEMA}' KHÔNG tồn tại!")
                # Liệt kê tất cả schema hiện có
                all_schemas_res = await db.execute(text(
                    "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"
                ))
                all_schemas = all_schemas_res.fetchall()
                print("  Các schema hiện có:")
                for s in all_schemas:
                    print(f"    - {s[0]}")

            return row is not None
    except Exception as e:
        print(f"✗ Lỗi kiểm tra schema: {str(e)}")
        return False


async def test_tables_in_schema():
    """Kiểm tra các bảng trong schema hethong_phantich_chungkhoan"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = :schema
                ORDER BY table_name
            """), {"schema": TARGET_SCHEMA})
            tables = result.fetchall()

            if tables:
                print(f"✓ Tìm thấy {len(tables)} bảng trong schema '{TARGET_SCHEMA}':")
                for table in tables:
                    # Đếm số dòng trong mỗi bảng
                    try:
                        count_res = await db.execute(text(
                            f'SELECT COUNT(*) FROM "{TARGET_SCHEMA}"."{table[0]}"'
                        ))
                        count_row = count_res.fetchone()
                        count = count_row[0]
                        print(f"  - {table[0]}  ({count} rows)")
                    except Exception:
                        print(f"  - {table[0]}  (không đọc được)")
            else:
                print(f"⚠ Không tìm thấy bảng nào trong schema '{TARGET_SCHEMA}'")

            return True
    except Exception as e:
        print(f"✗ Lỗi kiểm tra bảng: {str(e)}")
        return False


async def test_search_path():
    """Kiểm tra search_path hiện tại"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SHOW search_path"))
            path_row = result.fetchone()
            path = path_row[0]
            print(f"  search_path hiện tại: {path}")
            return True
    except Exception as e:
        print(f"✗ Lỗi kiểm tra search_path: {str(e)}")
        return False


async def main():
    settings = get_settings()

    print("=" * 60)
    print("TEST KẾT NỐI DATABASE - POSTGRES / DOCKER")
    print("=" * 60)
    print(f"  DATABASE_URL: {settings.DATABASE_URL}")
    print(f"  Target schema: {TARGET_SCHEMA}")
    print("=" * 60)

    print("\n1. Kiểm tra kết nối engine...")
    await test_database_connection()

    print("\n2. Kiểm tra session...")
    await test_session()

    print("\n3. Kiểm tra search_path...")
    await test_search_path()

    print("\n4. Kiểm tra schema '{}'...".format(TARGET_SCHEMA))
    schema_ok = await test_schema_exists()

    if schema_ok:
        print("\n5. Kiểm tra các bảng trong schema...")
        await test_tables_in_schema()
    else:
        print("\n5. Bỏ qua kiểm tra bảng vì schema chưa tồn tại.")

    print("\n" + "=" * 60)
    print("HOÀN TẤT KIỂM TRA")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())