import json
import re
import ast
import logging
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt

logger = logging.getLogger(__name__)


def extract_json(text: str) -> dict:
    if not text or not text.strip():
        logger.error("LLM returned empty response text during SQL correction")
        raise ValueError("LLM không trả JSON hợp lệ khi sửa SQL (chuỗi rỗng)")
        
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
        cleaned = cleaned.strip()

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        logger.error(f"Không tìm thấy khối JSON trong response sửa SQL. Raw response: {text}")
        raise ValueError("LLM không trả JSON hợp lệ khi sửa SQL")
        
    json_str = match.group(0)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as exc:
        logger.warning(f"json.loads sửa SQL thất bại ({exc}). Đang thử giải pháp dự phòng ast...")
        s = json_str.replace("null", "None").replace("true", "True").replace("false", "False")
        try:
            return ast.literal_eval(s)
        except Exception as ast_exc:
            logger.error(f"Tất cả giải pháp parse JSON sửa SQL thất bại. Raw response: {text}. Lỗi ast: {ast_exc}")
            raise ValueError(f"Không thể parse JSON: {json_str}")


async def self_correct_sql(
    message: str,
    original_sql: str,
    error_message: str,
    rag_context: list[dict] = None,
    ind_code_matches: list[dict] = None,
) -> str:
    """
    Gọi LLM sửa câu lệnh SQL bị lỗi dựa vào nguyên nhân lỗi (error_message) và ngữ cảnh.
    Trả về câu SQL mới đã được sửa đổi.
    """
    logger.info(f"Đang tiến hành tự động sửa lỗi SQL. SQL gốc: {original_sql}. Lỗi gặp phải: {error_message}")
    
    system_prompt = load_prompt("sql_corrector.txt")

    prompt = f"""Câu hỏi của người dùng:
{message}

Câu lệnh SQL bị lỗi:
{original_sql}

Thông báo lỗi từ PostgreSQL:
{error_message}

Schema/RAG context:
{json.dumps(rag_context or [], ensure_ascii=False)}

BCTC ind_code candidates:
{json.dumps(ind_code_matches or [], ensure_ascii=False)}

Hãy phân tích lỗi và sinh ra câu lệnh SQL chính xác.
"""
    try:
        response = await chat_completion(
            user_prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.0,
            max_tokens=2000,
        )
        payload = extract_json(response)
        corrected_sql = payload.get("sql", "").strip()
        
        logger.info(f"LLM đã sinh câu lệnh SQL mới sửa: {corrected_sql}. Giải thích: {payload.get('thought')}")
        
        if not corrected_sql:
            raise ValueError("Không tìm thấy trường 'sql' trong kết quả tự sửa lỗi")
            
        return corrected_sql
    except Exception as exc:
        logger.error(f"Lỗi khi thực hiện tự động sửa SQL: {exc}")
        # Trả lại SQL cũ nếu LLM sửa lỗi thất bại
        return original_sql
