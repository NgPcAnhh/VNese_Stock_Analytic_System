import asyncio
import re
import json as json_module
import logging
import uuid
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.chatbot.models import ChatSession, ChatMessage
from app.modules.chatbot.sql.corrector import self_correct_sql

logger = logging.getLogger(__name__)

from app.modules.chatbot.api.schemas import (
    ChatRequest,
    ChatResponse,
    DataTable,
    ChatSessionResponse,
    ChatSessionDetailResponse,
    ChatMessageResponse,
)
from app.modules.chatbot.router.intent_detector import detect_mode
from app.modules.chatbot.retrieval.vector_search import vector_search
from app.modules.chatbot.retrieval.ind_code_lookup import lookup_ind_code
from app.modules.chatbot.sql.generator_search import generate_search_sql
from app.modules.chatbot.sql.executor import execute_sql
from app.modules.chatbot.sql.formatter import rows_to_markdown_table
from app.modules.chatbot.agents.analyst_agent import run_analyst_agent, run_analyst_agent_stream
from app.modules.chatbot.llm.client import model_choice_ctx, chat_completion_stream
from app.modules.chatbot.router.prompt_refiner import refine_prompt

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])


# ------------------------------------------------------------------ #
#  Chat Sessions CRUD                                                #
# ------------------------------------------------------------------ #

@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_chat_sessions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Lấy danh sách các phiên chat của user hiện tại, sắp xếp theo updated_at giảm dần."""
    stmt = select(ChatSession).where(ChatSession.user_id == current_user.id).order_by(desc(ChatSession.updated_at))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def list_chat_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Lấy lịch sử tin nhắn của một phiên chat."""
    clean_session_id = session_id[5:] if session_id.startswith("chat-") else session_id
    try:
        session_uuid = uuid.UUID(clean_session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="session_id không đúng định dạng UUID")

    stmt = select(ChatSession).where(
        ChatSession.id == session_uuid, ChatSession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Phiên chat không tồn tại hoặc không thuộc quyền sở hữu của bạn")

    msg_stmt = select(ChatMessage).where(ChatMessage.session_id == session_uuid).order_by(ChatMessage.created_at.asc())
    msg_result = await db.execute(msg_stmt)
    return msg_result.scalars().all()


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Xóa một phiên chat."""
    clean_session_id = session_id[5:] if session_id.startswith("chat-") else session_id
    try:
        session_uuid = uuid.UUID(clean_session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="session_id không đúng định dạng UUID")

    stmt = select(ChatSession).where(
        ChatSession.id == session_uuid, ChatSession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Phiên chat không tồn tại hoặc không thuộc quyền sở hữu của bạn")

    await db.delete(session)
    await db.commit()
    return Response(status_code=204)


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
"""
 dùng để trích xuất nhanh các thực thể (mã cổ phiếu và chỉ số tài chính) từ câu hỏi của người dùng bằng biểu 
 thức chính quy (Regex) và đối khớp chuỗi, thay vì phải gọi mô hình ngôn ngữ lớn (LLM) 
 để tiết kiệm thời gian và chi phí token.
"""
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
#  SSE helper                                                          #
# ------------------------------------------------------------------ #

def _sse_event(event: str, data: dict | str) -> str:
    """Format a single SSE event string."""
    if isinstance(data, dict):
        from decimal import Decimal
        def make_serializable(obj):
            if isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(v) for v in obj]
            elif isinstance(obj, Decimal):
                return float(obj)
            return obj
        serializable_data = make_serializable(data)
        data_str = json_module.dumps(serializable_data, ensure_ascii=False)
    else:
        data_str = data
    return f"event: {event}\ndata: {data_str}\n\n"


# ------------------------------------------------------------------ #
#  Main endpoint (non-streaming)                                       #
# ------------------------------------------------------------------ #

@router.post("/ask", response_model=ChatResponse)
async def ask_chatbot(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Luồng theo kiến trúc:
    (1) User gửi prompt
    (2.1) LLM select role: search | analysis
    (2.2) Nếu auto detect = analysis → hỏi confirm user
          Nếu user đã confirm (mode='analysis') → tiếp tục
    (3) RAG retrieval → context + prompt + role
    (4) LLM xử lý
    (5) Nếu analysis → Agent Analyst (sub-agents YoY + peer + insight)
    (6) Trả answer
    """
    trace_id = str(uuid4())
    
    # Set model choice for this request lifecycle
    model_choice_ctx.set(req.model_choice)

    # ── Verify or create session ────────────────────────────────────
    session_uuid = None
    if req.session_id:
        if req.session_id.startswith("chat-"):
            uuid_str = req.session_id[5:]
        else:
            uuid_str = req.session_id
        try:
            session_uuid = uuid.UUID(uuid_str)
        except ValueError:
            session_uuid = None

    session = None
    if session_uuid:
        stmt = select(ChatSession).where(
            ChatSession.id == session_uuid, ChatSession.user_id == current_user.id
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

    if not session:
        new_uuid = session_uuid if session_uuid else uuid.uuid4()
        initial_title = req.message[:50] + ("..." if len(req.message) > 50 else "")
        session = ChatSession(
            id=new_uuid,
            user_id=current_user.id,
            title=initial_title
        )
        db.add(session)
        await db.commit()
        session_uuid = session.id
    else:
        session.updated_at = datetime.utcnow()
        db.add(session)
        await db.commit()

    # ── Fetch history for prompt_refiner ───────────────────────────
    history_stmt = select(ChatMessage).where(
        ChatMessage.session_id == session_uuid
    ).order_by(desc(ChatMessage.created_at)).limit(10)
    history_result = await db.execute(history_stmt)
    db_messages = list(history_result.scalars().all())
    db_messages.reverse()
    history_for_refiner = [{"role": msg.role, "content": msg.content} for msg in db_messages]

    # ── Save user message ──────────────────────────────────────────
    user_msg = ChatMessage(
        session_id=session_uuid,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    await db.commit()

    try:
        # ── Bước 2.0: Refine prompt đầu vào ─────────────────────────────
        refined_message = await _run("refine_prompt", refine_prompt(req.message, history=history_for_refiner), timeout=None)

        # ── Bước 2.1: Select role ─────────────────────────────────────
        detected_mode = detect_mode(refined_message, req.mode)

        # Helper to save assistant response and return it
        async def save_and_return(response_obj: ChatResponse):
            meta_dict = {
                "mode_used": response_obj.mode_used,
                "action_required": response_obj.action_required,
                "thought_process": response_obj.thought_process,
                "data_tables": [dt.model_dump() if hasattr(dt, 'model_dump') else dt for dt in response_obj.data_tables],
                "citations": response_obj.citations,
                "sql_used": response_obj.sql_used,
                "confidence": response_obj.confidence,
                "data_freshness": response_obj.data_freshness,
                "trace_id": response_obj.trace_id,
            }
            assistant_msg = ChatMessage(
                session_id=session_uuid,
                role="assistant",
                content=response_obj.answer,
                meta=meta_dict
            )
            db.add(assistant_msg)
            await db.commit()
            return response_obj

        # ── Bước 2.2: Confirm nếu auto detect ra analysis ─────────────
        if detected_mode == "analysis" and req.mode == "auto":
            confirm_resp = ChatResponse(
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
            return await save_and_return(confirm_resp)

        # ── Bước 3a: Fast Entity extraction ───────────────────────────
        entities = _quick_entities(refined_message)
        metric_text = " ".join(entities.get("metrics") or []) or refined_message

        # ── Bước 3b: Fast path (search, 1 chỉ tiêu, không cần RAG) ───
        if detected_mode == "search":
            fast = _build_fast_search_sql(refined_message, entities)
            if fast:
                rows = await _run("execute_fast_sql", execute_sql(fast["sql"]), timeout=12.0)
                fast_resp = ChatResponse(
                    mode_used="search",
                    answer=rows_to_markdown_table(rows),
                    data_tables=[DataTable(title="Kết quả truy vấn", rows=rows)],
                    citations=fast["citations"],
                    sql_used=[fast["sql"]],
                    trace_id=trace_id,
                )
                return await save_and_return(fast_resp)

        # ── Bước 3c: RAG retrieval (context + schema) ─────────────────
        schema_context, ind_code_matches = await asyncio.gather(
            _run("vector_search_metadata", vector_search(
                query=refined_message, doc_type="metadata", top_k=3,
            ), timeout=None),
            _run("lookup_ind_code", lookup_ind_code(metric_text, top_k=3), timeout=None),
        )

        if detected_mode == "search":
            # Bước 4: LLM sinh SQL search
            sql_payload = await _run(
                "generate_search_sql",
                generate_search_sql(
                    message=refined_message,
                    entities=entities,
                    rag_context=schema_context,
                    ind_code_matches=ind_code_matches,
                ),
                timeout=None,
            )
            
            sql_query = sql_payload.get("sql", "").strip()
            
            # Xử lý trường hợp câu hỏi giao tiếp thông thường không cần query
            if not sql_query:
                non_sql_resp = ChatResponse(
                    mode_used="search",
                    answer=sql_payload.get("thought", "Xin chào! Câu hỏi của bạn có vẻ không yêu cầu truy vấn dữ liệu tài chính. Bạn cần tôi giúp gì về phân tích cổ phiếu?"),
                    thought_process="Không phát hiện nhu cầu truy vấn SQL.",
                    data_tables=[],
                    citations=[],
                    sql_used=[],
                    trace_id=trace_id,
                )
                return await save_and_return(non_sql_resp)

            try:
                rows = await _run("execute_search_sql", execute_sql(sql_query), timeout=12.0)
            except Exception as e:
                logger.warning(f"Thực thi SQL tìm kiếm thất bại: {e}. Tiến hành tự động sửa lỗi SQL...")
                sql_query = await self_correct_sql(
                    message=refined_message,
                    original_sql=sql_query,
                    error_message=str(e),
                    rag_context=schema_context,
                    ind_code_matches=ind_code_matches,
                )
                rows = await _run("execute_search_sql_retry", execute_sql(sql_query), timeout=12.0)

            sql_resp = ChatResponse(
                mode_used="search",
                answer=rows_to_markdown_table(rows),
                thought_process=sql_payload.get("thought"),
                data_tables=[DataTable(title="Kết quả truy vấn", rows=rows)],
                citations=sql_payload.get("citations", []),
                sql_used=[sql_query],
                trace_id=trace_id,
            )
            return await save_and_return(sql_resp)

        else:
            result = await run_analyst_agent(
                message=refined_message,
                entities=entities,
                schema_context=schema_context,
                ind_code_matches=ind_code_matches,
            )

            analyst_resp = ChatResponse(
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
            return await save_and_return(analyst_resp)

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



# ------------------------------------------------------------------ #
#  Streaming endpoint (SSE)                                            #
# ------------------------------------------------------------------ #

@router.post("/ask/stream")
async def ask_chatbot_stream(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    SSE streaming endpoint — same pipeline as /ask but streams the final
    answer token-by-token via Server-Sent Events.
    
    Events:
      - event: metadata  → {mode_used, sql_used, data_tables, ...}
      - event: delta     → {text: "token"}
      - event: done      → {}
      - event: error     → {error: "message"}
    """
    trace_id = str(uuid4())
    model_choice_ctx.set(req.model_choice)

    async def _generate_sse():
        model_choice_ctx.set(req.model_choice)
        accumulated_text = ""
        metadata_saved = {}
        session_uuid = None
        try:
            # ── Verify or create session ────────────────────────────────────
            if req.session_id:
                if req.session_id.startswith("chat-"):
                    uuid_str = req.session_id[5:]
                else:
                    uuid_str = req.session_id
                try:
                    session_uuid = uuid.UUID(uuid_str)
                except ValueError:
                    session_uuid = None

            session = None
            if session_uuid:
                stmt = select(ChatSession).where(
                    ChatSession.id == session_uuid, ChatSession.user_id == current_user.id
                )
                result = await db.execute(stmt)
                session = result.scalar_one_or_none()

            if not session:
                new_uuid = session_uuid if session_uuid else uuid.uuid4()
                initial_title = req.message[:50] + ("..." if len(req.message) > 50 else "")
                session = ChatSession(
                    id=new_uuid,
                    user_id=current_user.id,
                    title=initial_title
                )
                db.add(session)
                await db.commit()
                session_uuid = session.id
            else:
                session.updated_at = datetime.utcnow()
                db.add(session)
                await db.commit()

            # ── Fetch history for prompt_refiner ───────────────────────────
            history_stmt = select(ChatMessage).where(
                ChatMessage.session_id == session_uuid
            ).order_by(desc(ChatMessage.created_at)).limit(10)
            history_result = await db.execute(history_stmt)
            db_messages = list(history_result.scalars().all())
            db_messages.reverse()
            history_for_refiner = [{"role": msg.role, "content": msg.content} for msg in db_messages]

            # ── Save user message ──────────────────────────────────────────
            user_msg = ChatMessage(
                session_id=session_uuid,
                role="user",
                content=req.message
            )
            db.add(user_msg)
            await db.commit()

            # ── Pipeline: same as /ask ────────────────────────────────
            refined_message = await _run(
                "refine_prompt", refine_prompt(req.message, history=history_for_refiner), timeout=None
            )
            detected_mode = detect_mode(refined_message, req.mode)

            # ── Confirm analysis (non-streaming response) ─────────────
            if detected_mode == "analysis" and req.mode == "auto":
                metadata = {
                    "mode_used": "auto",
                    "action_required": "confirm_analysis",
                    "sql_used": [],
                    "data_tables": [],
                    "citations": [],
                    "thought_process": "Phát hiện ý định phân tích phức tạp. Chờ xác nhận từ user.",
                    "confidence": None,
                    "data_freshness": None,
                    "trace_id": trace_id,
                }
                metadata_saved = metadata
                yield _sse_event("metadata", metadata)
                confirm_text = (
                    "Hệ thống nhận thấy câu hỏi của bạn cần **phân tích chuyên sâu đa chiều**.\n\n"
                    "Bạn có muốn chuyển sang chế độ **Chuyên viên Phân tích (Analyst)** "
                    "để tôi lập luận chi tiết hơn không?\n\n"
                    "_Gợi ý: Gửi lại câu hỏi với_ `mode: analysis` _để xác nhận._"
                )
                accumulated_text = confirm_text
                yield _sse_event("delta", {"text": confirm_text})
                yield _sse_event("done", {})
                
                # Save assistant response to DB
                if session_uuid:
                    assistant_msg = ChatMessage(
                        session_id=session_uuid,
                        role="assistant",
                        content=accumulated_text,
                        meta=metadata_saved
                    )
                    db.add(assistant_msg)
                    await db.commit()
                return

            entities = _quick_entities(refined_message)
            metric_text = " ".join(entities.get("metrics") or []) or refined_message

            # ── Search fast-path ──────────────────────────────────────
            if detected_mode == "search":
                fast = _build_fast_search_sql(refined_message, entities)
                if fast:
                    rows = await _run(
                        "execute_fast_sql", execute_sql(fast["sql"]), timeout=12.0
                    )
                    metadata = {
                        "mode_used": "search",
                        "action_required": None,
                        "sql_used": [fast["sql"]],
                        "data_tables": [{"title": "Kết quả truy vấn", "rows": rows}],
                        "citations": fast["citations"],
                        "thought_process": None,
                        "confidence": None,
                        "data_freshness": None,
                        "trace_id": trace_id,
                    }
                    metadata_saved = metadata
                    yield _sse_event("metadata", metadata)
                    accumulated_text = rows_to_markdown_table(rows)
                    yield _sse_event("delta", {"text": accumulated_text})
                    yield _sse_event("done", {})
                    
                    # Save assistant response to DB
                    if session_uuid:
                        assistant_msg = ChatMessage(
                            session_id=session_uuid,
                            role="assistant",
                            content=accumulated_text,
                            meta=metadata_saved
                        )
                        db.add(assistant_msg)
                        await db.commit()
                    return

            # ── RAG retrieval ─────────────────────────────────────────
            schema_context, ind_code_matches = await asyncio.gather(
                _run("vector_search_metadata", vector_search(
                    query=refined_message, doc_type="metadata", top_k=3,
                ), timeout=None),
                _run("lookup_ind_code", lookup_ind_code(metric_text, top_k=3), timeout=None),
            )

            if detected_mode == "search":
                sql_payload = await _run(
                    "generate_search_sql",
                    generate_search_sql(
                        message=refined_message,
                        entities=entities,
                        rag_context=schema_context,
                        ind_code_matches=ind_code_matches,
                    ),
                    timeout=None,
                )
                sql_query = sql_payload.get("sql", "").strip()

                if not sql_query:
                    metadata = {
                        "mode_used": "search",
                        "action_required": None,
                        "sql_used": [],
                        "data_tables": [],
                        "citations": [],
                        "thought_process": "Không phát hiện nhu cầu truy vấn SQL.",
                        "confidence": None,
                        "data_freshness": None,
                        "trace_id": trace_id,
                    }
                    metadata_saved = metadata
                    yield _sse_event("metadata", metadata)
                    answer = sql_payload.get(
                        "thought",
                        "Xin chào! Câu hỏi của bạn có vẻ không yêu cầu truy vấn dữ liệu tài chính."
                    )
                    accumulated_text = answer
                    yield _sse_event("delta", {"text": answer})
                    yield _sse_event("done", {})
                    
                    # Save assistant response to DB
                    if session_uuid:
                        assistant_msg = ChatMessage(
                            session_id=session_uuid,
                            role="assistant",
                            content=accumulated_text,
                            meta=metadata_saved
                        )
                        db.add(assistant_msg)
                        await db.commit()
                    return

                try:
                    rows = await _run(
                        "execute_search_sql", execute_sql(sql_query), timeout=12.0
                    )
                except Exception as e:
                    logger.warning(f"SQL thất bại: {e}. Tự sửa...")
                    sql_query = await self_correct_sql(
                        message=refined_message,
                        original_sql=sql_query,
                        error_message=str(e),
                        rag_context=schema_context,
                        ind_code_matches=ind_code_matches,
                    )
                    rows = await _run(
                        "execute_search_sql_retry", execute_sql(sql_query), timeout=12.0
                    )

                metadata = {
                    "mode_used": "search",
                    "action_required": None,
                    "sql_used": [sql_query],
                    "data_tables": [{"title": "Kết quả truy vấn", "rows": rows}],
                    "citations": sql_payload.get("citations", []),
                    "thought_process": sql_payload.get("thought"),
                    "confidence": None,
                    "data_freshness": None,
                    "trace_id": trace_id,
                }
                metadata_saved = metadata
                yield _sse_event("metadata", metadata)
                accumulated_text = rows_to_markdown_table(rows)
                yield _sse_event("delta", {"text": accumulated_text})
                yield _sse_event("done", {})
                
                # Save assistant response to DB
                if session_uuid:
                    assistant_msg = ChatMessage(
                        session_id=session_uuid,
                        role="assistant",
                        content=accumulated_text,
                        meta=metadata_saved
                    )
                    db.add(assistant_msg)
                    await db.commit()

            else:
                # ── Analysis mode — stream the insight answer ─────────
                analysis_metadata, text_stream = await run_analyst_agent_stream(
                    message=refined_message,
                    entities=entities,
                    schema_context=schema_context,
                    ind_code_matches=ind_code_matches,
                )

                metadata = {
                    "mode_used": "analysis",
                    "action_required": None,
                    "sql_used": analysis_metadata["sql_used"],
                    "data_tables": [
                        {"title": r["name"], "rows": r["rows"]}
                        for r in analysis_metadata["query_results"]
                    ],
                    "citations": analysis_metadata["citations"],
                    "thought_process": analysis_metadata["thought"],
                    "confidence": None,
                    "data_freshness": None,
                    "trace_id": trace_id,
                }
                metadata_saved = metadata
                yield _sse_event("metadata", metadata)

                async for token in text_stream:
                    yield _sse_event("delta", {"text": token})
                    accumulated_text += token

                yield _sse_event("done", {})
                
                # Save assistant response to DB
                if session_uuid:
                    assistant_msg = ChatMessage(
                        session_id=session_uuid,
                        role="assistant",
                        content=accumulated_text,
                        meta=metadata_saved
                    )
                    db.add(assistant_msg)
                    await db.commit()

        except StepTimeoutError as e:
            yield _sse_event("error", {
                "trace_id": trace_id,
                "error": f"Timeout tại bước: {e.step}",
            })
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield _sse_event("error", {
                "trace_id": trace_id,
                "error": str(e),
            })

    return StreamingResponse(
        _generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )