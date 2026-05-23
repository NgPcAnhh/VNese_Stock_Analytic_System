from app.modules.chatbot.sql.generator_analysis import generate_analysis_sql
from app.modules.chatbot.sql.executor import execute_sql
from app.modules.chatbot.agents.subagents.insight_agent import run_insight_agent
import asyncio

async def _execute_queries(queries: list[dict]) -> list[dict]:
    """Thực thi danh sách query song song, bỏ qua lỗi."""
    async def _exec_one(q: dict) -> dict | None:
        if not q.get("sql", "").strip():
            return None
        try:
            rows = await execute_sql(q["sql"])
            return {
                "name": q["name"],
                "sql": q["sql"],
                "purpose": q.get("purpose", ""),
                "rows": rows,
            }
        except Exception as e:
            return {
                "name": q["name"],
                "sql": q["sql"],
                "purpose": q.get("purpose", ""),
                "rows": [],
                "error": str(e),
            }

    results = await asyncio.gather(*[_exec_one(q) for q in queries])
    return [r for r in results if r is not None]


async def run_analyst_agent(
    message: str,
    entities: dict,
    schema_context: list[dict],
    ind_code_matches: list[dict],
) -> dict:
    """
    Agent Analyst điều phối pipeline phân tích (Tối ưu hóa: 2 LLM calls):
    
    Bước 1: Data Retriever Agent (LLM Call 1) -> Sinh toàn bộ SQL (YoY, Peer, ...)
    Bước 2: Thực thi SQL
    Bước 3: Insight Agent (LLM Call 2) -> Phân tích kết quả
    """
    
    # ── Bước 1: Data Retriever Agent ─────────────────────────────────
    payload = await generate_analysis_sql(
        message, entities, schema_context, ind_code_matches
    )
    
    all_queries = payload.get("queries", [])
    citations = payload.get("citations", [])
    thought = payload.get("thought", "Không có giải thích chiến lược.")

    # ── Bước 2: Thực thi SQL song song ───────────────────────────────
    query_results = await _execute_queries(all_queries)
    sql_used = [r["sql"] for r in query_results]

    # ── Bước 3: Insight Agent phân tích kết quả ──────────────────────
    answer = await run_insight_agent(
        user_message=message,
        query_results=query_results,
        citations=citations,
    )

    return {
        "answer": answer,
        "query_results": query_results,
        "sql_used": sql_used,
        "citations": citations,
        "thought": f"**Chiến lược lấy dữ liệu:** {thought}",
    }