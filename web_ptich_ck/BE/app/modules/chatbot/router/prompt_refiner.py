from pydantic import BaseModel, Field
from app.modules.chatbot.llm.client import chat_completion_structured


SYSTEM_PROMPT = """Bạn là Prompt Refiner cho chatbot chứng khoán.
Nhiệm vụ: Dịch/tối ưu câu hỏi hiện tại của user thành "refined_message" chuẩn mực, rõ nghĩa, độc lập (standalone query) dựa trên lịch sử hội thoại (nếu có).
Đặc biệt lưu ý:
1. Nếu câu hỏi hiện tại phụ thuộc hoặc tham chiếu đến ngữ cảnh trước đó (Ví dụ: "Thế còn năm 2024?", "Biên lợi nhuận của doanh nghiệp đó thì sao?"), hãy dùng lịch sử hội thoại để viết lại thành một câu hỏi hoàn chỉnh độc lập (Ví dụ: "ROE của HPG năm 2024 là bao nhiêu?", "Biên lợi nhuận gộp của VNM là bao nhiêu?").
2. Nếu câu hỏi hiện tại đã rõ nghĩa và độc lập, hoặc không liên quan đến lịch sử hội thoại trước đó, hãy giữ nguyên ý nghĩa của nó hoặc sửa lại cho chuẩn hóa hơn.
3. Loại bỏ nhầm lẫn mã chứng khoán (VD: "TOP", "MUA", "BAN", "CAO", "THAP" không phải mã cổ phiếu).
4. Câu trả lời của bạn phải là câu hỏi đã được chuẩn hóa ngắn gọn và đầy đủ thông tin nhất để truy vấn cơ sở dữ liệu."""

class RefinedPrompt(BaseModel):
    refined_message: str = Field(..., description="Câu hỏi đã được chuẩn hóa độc lập")

async def refine_prompt(message: str, history: list[dict] | None = None) -> str:
    history_str = ""
    if history:
        history_str = "\n".join([f"{h.get('role', 'user').upper()}: {h.get('content', '')}" for h in history])
    
    prompt = f"""
Lịch sử cuộc hội thoại gần đây:
{history_str if history_str else "(Không có lịch sử)"}

Câu hỏi hiện tại của user:
{message}

Dựa trên lịch sử hội thoại và câu hỏi hiện tại, hãy viết lại câu hỏi hiện tại thành một câu hỏi chuẩn hóa, đầy đủ ngữ cảnh và độc lập (standalone query) để truy vấn hệ thống.
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

