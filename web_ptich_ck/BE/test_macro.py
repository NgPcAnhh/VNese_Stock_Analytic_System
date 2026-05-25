import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

DATABASE_URL = "postgresql+asyncpg://postgres:123456@localhost:5433/vnstock_db"

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        sql = text("""
            SELECT
                a.asset_type AS name,
                p.prices[1] AS price,
                CASE
                    WHEN p.prices[2] > 0
                    THEN ROUND(((p.prices[1] - p.prices[2]) / p.prices[2] * 100)::numeric, 2)
                    ELSE 0
                END AS change
            FROM (
                SELECT DISTINCT asset_type FROM hethong_phantich_chungkhoan.macro_economy
            ) a
            CROSS JOIN LATERAL (
                SELECT ARRAY(
                    SELECT close
                    FROM hethong_phantich_chungkhoan.macro_economy me
                    WHERE me.asset_type = a.asset_type
                    ORDER BY date DESC
                    LIMIT 2
                ) AS prices
            ) p
            ORDER BY a.asset_type;
        """)
        try:
            r = await session.execute(sql)
            rows = r.mappings().all()
            for row in rows:
                print(dict(row))
        except Exception as e:
            print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
