import re
import logging
import asyncpg
from app.modules.chatbot.db.pool import get_pool

logger = logging.getLogger(__name__)

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


def inject_limit_1000(sql: str) -> str:
    """Loại bỏ chấm phẩy cuối dòng và thay thế/thêm LIMIT 1000 vào câu truy vấn SQL."""
    sql_stripped = sql.strip().rstrip(';').strip()
    limit_pattern = re.compile(r"\blimit\s+\d+\s*$", re.IGNORECASE)
    if limit_pattern.search(sql_stripped):
        return limit_pattern.sub("LIMIT 1000", sql_stripped)
    else:
        return f"{sql_stripped} LIMIT 1000"


async def execute_sql(sql: str, max_rows: int = 200) -> list[dict]:
    validate_readonly_sql(sql)

    pool = await get_pool()

    async with pool.acquire() as conn:
        try:
            # Thử chạy với timeout 5 giây đầu tiên
            async with conn.transaction(readonly=True):
                await conn.execute("SET LOCAL statement_timeout = '5s'")
                rows = await conn.fetch(sql)
        except asyncpg.exceptions.QueryCanceledError:
            # Nếu truy vấn chạy trên 5 giây, thực hiện dừng truy vấn (đã bị cancel bởi statement_timeout)
            # và đặt limit 1000 vào truy vấn và thực hiện lại với timeout 10 giây.
            logger.warning(f"Truy vấn chạy quá 5 giây và bị dừng. Tiến hành đặt LIMIT 1000 và thử lại. SQL gốc: {sql}")
            new_sql = inject_limit_1000(sql)
            validate_readonly_sql(new_sql)
            
            async with conn.transaction(readonly=True):
                await conn.execute("SET LOCAL statement_timeout = '10s'")
                rows = await conn.fetch(new_sql)

        result = [dict(row) for row in rows]
        return result[:max_rows]