import asyncio
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("select * from hethong_phantich_chungkhoan.electric_board order by trading_date desc limit 5"))
        for row in res.mappings().all():
            print(dict(row))

asyncio.run(main())
