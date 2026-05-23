import json
import re
import ast
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("YoY agent không trả JSON hợp lệ")
    json_str = match.group(0)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        s = json_str.replace("null", "None").replace("true", "True").replace("false", "False")
        try:
            return ast.literal_eval(s)
        except Exception:
            raise ValueError(f"Không thể parse JSON: {json_str}")


async def run_yoy_query_agent(
    message: str,
    entities: dict,
    rag_context: list[dict],
    ind_code_matches: list[dict],
    yoy_focus: str,
) -> dict:
    """
    Sub-agent 5.1: sinh SQL so sánh theo thời gian (YoY / chuỗi quý).
    Trả về: { "thought": str, "queries": [{ "name", "sql", "purpose" }] }
    """
    system_prompt = load_prompt("subagent_yoy_query.txt")

    prompt = f"""Câu hỏi user:
{message}

Yêu cầu tập trung YoY:
{yoy_focus}

Entities đã trích xuất:
{json.dumps(entities, ensure_ascii=False)}

BCTC ind_code candidates:
{json.dumps(ind_code_matches, ensure_ascii=False)}

Schema/RAG context:
{json.dumps(rag_context, ensure_ascii=False)}

Hãy sinh các SQL so sánh theo thời gian.
"""

    response = await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=2500,
    )
    result = _extract_json(response)
    # Đảm bảo luôn có trường citations (fallback nếu LLM không trả)
    if "citations" not in result:
        result["citations"] = []
    return result