import asyncio
import re
from uuid import uuid4
from fastapi import APIRouter, HTTPException

from app.modules.chatbot.api.schemas import ChatRequest, ChatResponse, DataTable
from app.modules.chatbot.router.intent_detector import detect_mode
from app.modules.chatbot.retrieval.vector_search import vector_search
from app.modules.chatbot.retrieval.ind_code_lookup import lookup_ind_code
from app.modules.chatbot.sql.generator_search import generate_search_sql
from app.modules.chatbot.sql.executor import execute_sql
from app.modules.chatbot.sql.formatter import rows_to_markdown_table
from app.modules.chatbot.agents.analyst_agent import run_analyst_agent
from app.modules.chatbot.llm.client import model_choice_ctx

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])

# ------------------------------------------------------------------ #
#  Timeout helper                                                      #
# ------------------------------------------------------------------ #

class StepTimeoutError(Exception):
    def __init__(self, step: str):
        super().__init__(step)
        self.step = step


async def _run(step: str, coro, timeout: float | None = None):
    """Chạy coroutine, raise StepTimeoutError nếu quá timeout."""
    if timeout is None:
        return await coro
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise StepTimeoutError(step) from exc


# ------------------------------------------------------------------ #
#  Quick entity / SQL (fast path cho search mode)                     #
# ------------------------------------------------------------------ #

def _quick_entities(message: str) -> dict:
    excluded = {
        # Vietnamese common words (3-4 chars uppercase)
        "CUA", "VA", "CHO", "VOI", "THEO", "GAN", "NHAT", "NAM", "QUY",
        "TOP", "MUA", "BAN", "CAO", "THAP", "TANG", "GIAM", "TIM", "MOI",
        "DAY", "LAM", "HAY", "LOI", "BIEN", "DOANH", "NGANH", "NHUNG",
        "DUOC", "TREN", "DUOI", "SANG", "CUNG", "NHAU", "THEM", "GIUA",
        "VIEC", "TRONG", "NGOAI", "HIEN", "DANG", "NGAY", "THANG",
        "TONG", "QUAN", "HANG", "NGAN", "NGHE", "CONG", "XUAT", "NHAP",
        "CHOT", "DONG", "KHOP", "CHIA", "TINH", "TRAI", "PHIEU",
        "BANG", "LIEU", "THAM", "KHAO", "DANH", "SACH", "DIEM",
        # Financial metric keywords
        "ROE", "ROA", "EPS", "YOY", "TTM", "EBIT", "BVPS",
        # Common short words
        "THE", "AND", "FOR", "NOT", "ARE", "BUT", "ALL", "CAN",
    }
    raw_tokens = re.findall(r"\b[A-Z]{3,4}\b", message.upper())
    tickers: list[str] = []
    for t in raw_tokens:
        if t not in excluded and t not in tickers:
            tickers.append(t)

    metrics = [
        kw for kw in ["roe", "roa", "eps", "pe", "pb", "doanh thu", "loi nhuan"]
        if kw in message.lower()
    ]
    return {
        "tickers": tickers,
        "metrics": metrics,
        "period": {"type": None, "quarters": [], "years": [], "n_recent": None},
        "sector": None,
        "comparison_mode": None,
    }


def _build_fast_search_sql(message: str, entities: dict) -> dict | None:
    """Fast-path: sinh SQL đơn giản không cần LLM cho các query 1 chỉ tiêu."""
    msg = message.lower()
    tickers = entities.get("tickers") or []
    ticker = tickers[0] if tickers else None
    if not ticker:
        return None

    metric_map = {
        "roe": "roe", "roa": "roa", "eps": "eps",
        "pe": "pe", "p/e": "pe", "pb": "pb", "p/b": "pb",
    }
    metric_col = next((col for key, col in metric_map.items() if key in msg), None)
    if not metric_col:
        return None

    limit = 4 if any(x in msg for x in ["4 quy", "4 quý"]) else 8
    sql = f"""
        SELECT ticker, year, quarter, {metric_col}
        FROM hethong_phantich_chungkhoan.financial_ratio
        WHERE ticker = '{ticker}'
          AND {metric_col} IS NOT NULL
        ORDER BY year DESC, quarter DESC
        LIMIT {limit}
    """.strip()

    return {
        "sql": sql,
        "citations": [{"source_type": "financial_ratio", "ticker": ticker,
                        "metric": metric_col, "period": f"recent_{limit}_quarters"}],
    }


# ------------------------------------------------------------------ #
#  Main endpoint                                                       #
# ------------------------------------------------------------------ #

@router.post("/ask", response_model=ChatResponse)
async def ask_chatbot(req: ChatRequest):
    """
    Luồng theo kiến trúc:
    (1) User gửi prompt
    (2.1) LLM select role: search | analysis
    (2.2) Nếu auto detect = analysis → hỏi confirm user
          Nếu user đã confirm (mode='analysis') → tiếp tục
    (3) RAG retrieval → context + prompt + role
    (4) LLM xử lý
    (5) Nếu analysis → Agent Analyst (sub-agents YoY + peer + tester + insight)
    (6) Trả answer
    """
    trace_id = str(uuid4())
    
    # Set model choice for this request lifecycle
    model_choice_ctx.set(req.model_choice)

    try:
        # ── Bước 2.1: Select role ─────────────────────────────────────
        detected_mode = detect_mode(req.message, req.mode)

        # ── Bước 2.2: Confirm nếu auto detect ra analysis ─────────────
        if detected_mode == "analysis" and req.mode == "auto":
            return ChatResponse(
                mode_used="auto",
                action_required="confirm_analysis",
                answer=(
                    "Hệ thống nhận thấy câu hỏi của bạn cần **phân tích chuyên sâu đa chiều**.\n\n"
                    "Bạn có muốn chuyển sang chế độ **Chuyên viên Phân tích (Analyst)** "
                    "để tôi lập luận chi tiết hơn không?\n\n"
                    "_Gợi ý: Gửi lại câu hỏi với_ `mode: analysis` _để xác nhận._"
                ),
                thought_process="Phát hiện ý định phân tích phức tạp. Chờ xác nhận từ user.",
                data_tables=[],
                trace_id=trace_id,
            )

        # ── Bước 3a: Fast Entity extraction ───────────────────────────
        entities = _quick_entities(req.message)
        metric_text = " ".join(entities.get("metrics") or []) or req.message

        # ── Bước 3b: Fast path (search, 1 chỉ tiêu, không cần RAG) ───
        if detected_mode == "search":
            fast = _build_fast_search_sql(req.message, entities)
            if fast:
                rows = await _run("execute_fast_sql", execute_sql(fast["sql"]), timeout=12.0)
                return ChatResponse(
                    mode_used="search",
                    answer=rows_to_markdown_table(rows),
                    data_tables=[DataTable(title="Kết quả truy vấn", rows=rows)],
                    citations=fast["citations"],
                    sql_used=[fast["sql"]],
                    trace_id=trace_id,
                )

        # ── Bước 3c: RAG retrieval (context + schema) ─────────────────
        schema_context, ind_code_matches = await asyncio.gather(
            _run("vector_search_metadata", vector_search(
                query=req.message, doc_type="metadata", top_k=3,
            ), timeout=None),
            _run("lookup_ind_code", lookup_ind_code(metric_text, top_k=3), timeout=None),
        )

        if detected_mode == "search":
            # Bước 4: LLM sinh SQL search
            sql_payload = await _run(
                "generate_search_sql",
                generate_search_sql(
                    message=req.message,
                    entities=entities,
                    rag_context=schema_context,
                    ind_code_matches=ind_code_matches,
                ),
                timeout=None,
            )
            
            sql_query = sql_payload.get("sql", "").strip()
            
            # Xử lý trường hợp câu hỏi giao tiếp thông thường không cần query
            if not sql_query:
                return ChatResponse(
                    mode_used="search",
                    answer=sql_payload.get("thought", "Xin chào! Câu hỏi của bạn có vẻ không yêu cầu truy vấn dữ liệu tài chính. Bạn cần tôi giúp gì về phân tích cổ phiếu?"),
                    thought_process="Không phát hiện nhu cầu truy vấn SQL.",
                    data_tables=[],
                    citations=[],
                    sql_used=[],
                    trace_id=trace_id,
                )

            rows = await _run("execute_search_sql", execute_sql(sql_query), timeout=12.0)

            return ChatResponse(
                mode_used="search",
                answer=rows_to_markdown_table(rows),
                thought_process=sql_payload.get("thought"),
                data_tables=[DataTable(title="Kết quả truy vấn", rows=rows)],
                citations=sql_payload.get("citations", []),
                sql_used=[sql_query],
                trace_id=trace_id,
            )

        else:
            result = await run_analyst_agent(
                message=req.message,
                entities=entities,
                schema_context=schema_context,
                ind_code_matches=ind_code_matches,
            )

            return ChatResponse(
                mode_used="analysis",
                answer=result["answer"],
                thought_process=result["thought"],
                data_tables=[
                    DataTable(title=r["name"], rows=r["rows"])
                    for r in result["query_results"]
                ],
                citations=result["citations"],
                sql_used=result["sql_used"],
                trace_id=trace_id,
            )

    except StepTimeoutError as e:
        raise HTTPException(status_code=504, detail={
            "trace_id": trace_id,
            "error": f"Timeout tại bước: {e.step}",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "trace_id": trace_id,
            "error": str(e),
        })