import json
import re
import ast
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


import logging
logger = logging.getLogger(__name__)

def extract_json(text: str) -> dict:
    if not text or not text.strip():
        logger.error("LLM returned empty response text")
        raise ValueError("LLM không trả JSON hợp lệ (chuỗi rỗng)")
        
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
        cleaned = cleaned.strip()

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        logger.error(f"Không tìm thấy khối JSON trong response. Raw response: {text}")
        raise ValueError("LLM không trả JSON hợp lệ")
        
    json_str = match.group(0)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as exc:
        logger.warning(f"json.loads thất bại ({exc}). Đang thử giải pháp dự phòng ast...")
        s = json_str.replace("null", "None").replace("true", "True").replace("false", "False")
        try:
            return ast.literal_eval(s)
        except Exception as ast_exc:
            logger.error(f"Tất cả giải pháp parse JSON thất bại. Raw response: {text}. Lỗi ast: {ast_exc}")
            raise ValueError(f"Không thể parse JSON: {json_str}")


async def generate_analysis_sql(
    message: str,
    entities: dict,
    rag_context: list[dict],
    ind_code_matches: list[dict],
) -> dict:
    """
    Sinh toàn bộ SQL (YoY, Peer, ...) cần thiết cho Analysis bằng 1 lượt gọi LLM duy nhất.
    """
    system_prompt = load_prompt("data_analyst_retriever.txt")

    prompt = f"""Câu hỏi user:
{message}

Entities:
{json.dumps(entities, ensure_ascii=False)}

BCTC ind_code candidates:
{json.dumps(ind_code_matches, ensure_ascii=False)}

Schema/RAG context:
{json.dumps(rag_context, ensure_ascii=False)}

Hãy sinh các câu lệnh SQL phục vụ phân tích.
"""
    response = await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=3000,
    )
    result = extract_json(response)
    if "citations" not in result:
        result["citations"] = []
    if "queries" not in result:
        result["queries"] = []
    return result