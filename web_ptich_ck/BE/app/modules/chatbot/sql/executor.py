import re
from app.modules.chatbot.db.pool import get_pool

BLOCKED_SQL = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|copy)\b",
    re.IGNORECASE,
)


def validate_readonly_sql(sql: str) -> None:
    if BLOCKED_SQL.search(sql):
        raise ValueError("SQL không an toàn: chỉ cho phép SELECT/WITH.")

    first = sql.strip().lower()
    if not (first.startswith("select") or first.startswith("with")):
        raise ValueError("SQL không hợp lệ: chỉ cho phép SELECT hoặc WITH.")


async def execute_sql(sql: str, max_rows: int = 200) -> list[dict]:
    validate_readonly_sql(sql)

    pool = await get_pool()

    async with pool.acquire() as conn:
        async with conn.transaction(readonly=True):
            await conn.execute("SET LOCAL statement_timeout = '10s'")
            rows = await conn.fetch(sql)

        result = [dict(row) for row in rows]
        return result[:max_rows]