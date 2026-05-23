from pydantic import BaseModel, Field
from app.modules.chatbot.llm.client import chat_completion_structured

SYSTEM_PROMPT = """Bạn là Prompt Refiner cho chatbot chứng khoán.
Nhiệm vụ: Dịch lại câu hỏi của user thành "refined_message" chuẩn mực, sát nghĩa để truy vấn DB.
Loại bỏ nhầm lẫn mã chứng khoán (VD: "TOP", "MUA", "BAN", "CAO", "THAP" không phải mã cổ phiếu).
Trích xuất câu hỏi chuẩn hóa ngắn gọn nhất."""
class RefinedPrompt(BaseModel):
    refined_message: str = Field(..., description="Câu hỏi đã được chuẩn hóa")

async def refine_prompt(message: str) -> str:
    prompt = f"""
Câu hỏi user:
{message}

Hãy tối ưu câu hỏi.
"""
    try:
        response = await chat_completion_structured(
            user_prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            response_format=RefinedPrompt,
            temperature=0.0,
            max_tokens=256,
        )
        refined = response.refined_message
        return refined if refined else message
    except Exception as e:
        return message
