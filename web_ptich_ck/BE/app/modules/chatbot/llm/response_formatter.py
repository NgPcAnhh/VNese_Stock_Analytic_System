import re

def format_llm_response(text: str) -> str:
    """
    Chuẩn hóa và làm đẹp câu trả lời (Markdown) từ LLM để UI hiển thị tốt hơn,
    gọn gàng và chuyên nghiệp hơn.
    """
    if not text:
        return text

    # 1. Đảm bảo luôn có 1 dòng trống trước các heading (##, ###)
    text = re.sub(r'([^\n])\n(#{1,6}\s)', r'\1\n\n\2', text)

    # 2. Đảm bảo có khoảng trắng chuẩn sau các gạch đầu dòng (vd "-Text" -> "- Text")
    text = re.sub(r'^([ \t]*[-*])[ \t]*([^\s*-])', r'\1 \2', text, flags=re.MULTILINE)

    # 3. Đảm bảo list (gạch đầu dòng) tách biệt với dòng text liền trước nó
    # Chỉ thêm dòng trống nếu dòng trước không phải là list
    text = re.sub(r'([^\n])\n([ \t]*[-*]\s)', r'\1\n\n\2', text)

    # 4. In đậm các chỉ số tài chính hoặc các con số quan trọng nếu cần (Tùy chọn)
    # Ví dụ: biến số liệu phần trăm thành in đậm nếu chưa in đậm (giúp nổi bật)
    # text = re.sub(r'(?<!\*\*)(\b\d+(\.\d+)?\s*%)(?!\*\*)', r'**\1**', text)

    # 5. Xóa khoảng trắng thừa ở cuối mỗi dòng
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)

    # 6. Thay thế các bullet point lồng nhau bằng thụt lề chuẩn (2 spaces)
    text = re.sub(r'^\t+([-*]\s)', r'  \1', text, flags=re.MULTILINE)

    # 7. Dọn dẹp các dòng trống dư thừa (giới hạn tối đa 2 dòng \n liên tiếp)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()
