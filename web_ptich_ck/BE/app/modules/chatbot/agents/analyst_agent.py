from app.modules.chatbot.sql.generator_analysis import generate_analysis_sql
from app.modules.chatbot.sql.executor import execute_sql
from app.modules.chatbot.agents.subagents.insight_agent import run_insight_agent, run_insight_agent_stream
from app.modules.chatbot.sql.corrector import self_correct_sql
import asyncio
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

async def _execute_queries(
    queries: list[dict],
    message: str,
    schema_context: list[dict],
    ind_code_matches: list[dict],
) -> list[dict]:
    """Thực thi danh sách query song song, tự động sửa lỗi nếu gặp Exception."""
    async def _exec_one(q: dict) -> dict | None:
        if not q.get("sql", "").strip():
            return None
        sql = q["sql"]
        try:
            rows = await execute_sql(sql)
            return {
                "name": q["name"],
                "sql": sql,
                "purpose": q.get("purpose", ""),
                "rows": rows,
            }
        except Exception as e:
            logger.warning(f"Thực thi SQL phân tích '{q['name']}' thất bại: {e}. Tiến hành tự sửa...")
            try:
                corrected_sql = await self_correct_sql(
                    message=message,
                    original_sql=sql,
                    error_message=str(e),
                    rag_context=schema_context,
                    ind_code_matches=ind_code_matches,
                )
                rows = await execute_sql(corrected_sql)
                return {
                    "name": q["name"],
                    "sql": corrected_sql,
                    "purpose": q.get("purpose", ""),
                    "rows": rows,
                }
            except Exception as retry_err:
                logger.error(f"Sửa và chạy lại SQL '{q['name']}' vẫn thất bại: {retry_err}")
                return {
                    "name": q["name"],
                    "sql": sql,
                    "purpose": q.get("purpose", ""),
                    "rows": [],
                    "error": f"Lỗi gốc: {e}. Lỗi sau sửa: {retry_err}",
                }

    results = await asyncio.gather(
        *[_exec_one(q) for q in queries]
    )
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
    query_results = await _execute_queries(
        all_queries,
        message=message,
        schema_context=schema_context,
        ind_code_matches=ind_code_matches,
    )
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


async def run_analyst_agent_stream(
    message: str,
    entities: dict,
    schema_context: list[dict],
    ind_code_matches: list[dict],
) -> tuple[dict, AsyncGenerator[str, None]]:
    """
    Streaming variant of run_analyst_agent.
    Returns (metadata, text_stream):
    - metadata: dict with thought, citations, query_results, sql_used
    - text_stream: AsyncGenerator yielding answer tokens
    """
    
    # ── Bước 1: Data Retriever Agent ─────────────────────────────────
    payload = await generate_analysis_sql(
        message, entities, schema_context, ind_code_matches
    )
    
    all_queries = payload.get("queries", [])
    citations = payload.get("citations", [])
    thought = payload.get("thought", "Không có giải thích chiến lược.")

    # ── Bước 2: Thực thi SQL song song ───────────────────────────────
    query_results = await _execute_queries(
        all_queries,
        message=message,
        schema_context=schema_context,
        ind_code_matches=ind_code_matches,
    )
    sql_used = [r["sql"] for r in query_results]

    # ── Bước 3: Insight Agent — trả stream thay vì đợi kết quả ──────
    text_stream = run_insight_agent_stream(
        user_message=message,
        query_results=query_results,
        citations=citations,
    )

    metadata = {
        "query_results": query_results,
        "sql_used": sql_used,
        "citations": citations,
        "thought": f"**Chiến lược lấy dữ liệu:** {thought}",
    }

    return metadata, text_stream