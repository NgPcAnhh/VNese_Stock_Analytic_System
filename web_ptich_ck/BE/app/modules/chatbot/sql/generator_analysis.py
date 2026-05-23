import json
import re
import ast
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


def extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("LLM không trả JSON hợp lệ")
    json_str = match.group(0)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        s = json_str.replace("null", "None").replace("true", "True").replace("false", "False")
        try:
            return ast.literal_eval(s)
        except Exception:
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