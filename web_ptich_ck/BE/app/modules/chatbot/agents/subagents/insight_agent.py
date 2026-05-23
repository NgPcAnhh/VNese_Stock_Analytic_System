import json
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt
from app.modules.chatbot.sql.formatter import format_analysis_context
from app.modules.chatbot.llm.response_formatter import format_llm_response


async def run_insight_agent(
    user_message: str,
    query_results: list[dict],
    citations: list[dict],
) -> str:
    """
    Sub-agent: tổng hợp toàn bộ dữ liệu → bản phân tích hoàn thiện.
    """
    system_prompt = load_prompt("subagent_insight.txt")

    data_context = format_analysis_context(query_results)

    prompt = f"""Câu hỏi user:
{user_message}

Dữ liệu đã truy vấn:
{data_context}

Hãy viết bản phân tích hoàn thiện.
"""

    raw_response = await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.5,
        max_tokens=2000,
    )
    return format_llm_response(raw_response)