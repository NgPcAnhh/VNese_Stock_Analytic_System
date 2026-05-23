import re
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


from app.modules.chatbot.llm.response_formatter import format_llm_response


async def generate_financial_analysis(
    user_message: str,
    data_context: str,
    citations: list[dict],
) -> str:
    system_prompt = load_prompt("financial_analyst.txt")

    prompt = f"""Câu hỏi user:
{user_message}

Số liệu truy vấn được:
{data_context}

Hãy phân tích cho user.
"""
    raw_response = await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=2000,
    )
    
    return format_llm_response(raw_response)