import asyncio
import sys
import os

# Ensure the app module is in the python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

async def run_migration():
    async with engine.begin() as conn:
        print("Running migration to add 'permissions' column...")
        try:
            await conn.execute(text("ALTER TABLE system.roles ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;"))
            print("Migration successful.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column 'permissions' already exists.")
            else:
                print(f"Error: {e}")
        
        # also update admin role to have all permissions by default?
        # Not necessary since admin bypasses permissions, but maybe good to set.

if __name__ == "__main__":
    asyncio.run(run_migration())
