"""
AI Chart Code Generation Service.
Receives a user prompt + dataset schema → calls LLM → returns clean ECharts JS code.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional

from app.modules.chatbot.llm.client import chat_completion

logger = logging.getLogger(__name__)

# ── System prompt ────────────────────────────────────────────────────

SYSTEM_PROMPT = """Bạn là một AI chuyên gia về Apache ECharts và JavaScript.
Nhiệm vụ của bạn là viết code JavaScript để cấu hình ECharts chart theo yêu cầu của người dùng.

QUY TẮC BẮT BUỘC:
1. Chỉ trả về đoạn code JavaScript thuần túy — KHÔNG có giải thích, KHÔNG có markdown, KHÔNG có ```javascript fence.
2. Biến cục bộ `data` là một Array of Objects chứa dữ liệu từ dataset. Sử dụng data.map() để trích xuất.
3. KHÔNG sử dụng fetch(), axios hay gọi API bên ngoài — dữ liệu đã có sẵn trong `data`.
4. Đoạn code PHẢI kết thúc bằng lệnh `return option;` hoặc `return { ... };`.
5. Hỗ trợ dark theme mặc định (background transparent, text màu sáng).
6. Tooltip phải có trigger: 'axis' hoặc 'item'.
7. Code phải hoàn chỉnh và chạy được ngay — không placeholder, không TODO.

QUY TẮC VỀ RESPONSIVE VÀ LAYOUT (BẮT BUỘC — trừ khi user yêu cầu khác):
8. Chart phải RESPONSIVE cho mọi kích thước màn hình: KHÔNG dùng width/height cố định bằng pixel trong option. Để ECharts tự scale theo container.
9. Căn chart ở chính giữa container theo cả chiều ngang và dọc nếu không có yêu cầu khác.
10. Legend mặc định đặt ở DƯỚI CÙNG, căn GIỮA:
    legend: { orient: 'horizontal', bottom: 0, left: 'center' }
11. Grid (vùng vẽ) phải có padding hợp lý để tránh bị cắt:
    grid: { top: '10%', bottom: '15%', left: '5%', right: '5%', containLabel: true }
12. Với pie/donut chart: center: ['50%', '50%'], radius hợp lý (ví dụ: ['40%', '70%'] cho donut).
13. Màu chữ mặc định là MÀU ĐEN (#000000 hoặc '#333') cho tất cả text: nhãn trục (axisLabel), tên trục (nameTextStyle), legend, label trên điểm dữ liệu, title. Chỉ đổi màu chữ nếu user yêu cầu dark theme hoặc background tối.
"""


def _build_first_gen_prompt(
    prompt: str,
    columns: List[Dict[str, str]],
    sample_rows: List[Dict[str, Any]],
) -> str:
    """Build full prompt for first-time code generation."""
    cols_str = ", ".join(f"{c['name']} ({c.get('type', 'unknown')})" for c in columns)
    sample_str = json.dumps(sample_rows[:3], ensure_ascii=False, indent=2) if sample_rows else "[]"

    return f"""Hãy viết ECharts JavaScript code theo yêu cầu sau:

YÊU CẦU: {prompt}

THÔNG TIN DATASET:
- Các cột có sẵn: {cols_str}
- Ví dụ 3 rows dữ liệu (biến `data` sẽ có cấu trúc tương tự):
{sample_str}

Nhớ: trả về ĐÚNG code JavaScript, kết thúc bằng return option; hoặc return {{ ... }};"""


def _build_incremental_prompt(
    prompt: str,
    current_code: str,
    columns: List[Dict[str, str]],
    sample_rows: List[Dict[str, Any]],
) -> str:
    """Build prompt for incremental code update (2nd gen+)."""
    cols_str = ", ".join(f"{c['name']} ({c.get('type', 'unknown')})" for c in columns)
    sample_str = json.dumps(sample_rows[:3], ensure_ascii=False, indent=2) if sample_rows else "[]"

    return f"""Đây là code ECharts JavaScript hiện tại:

```javascript
{current_code}
```

DATASET columns: {cols_str}
Sample data: {sample_str}

YÊU CẦU THAY ĐỔI: {prompt}

Hãy viết lại code hoàn chỉnh với các thay đổi trên. Trả về ĐÚNG code JavaScript, kết thúc bằng return option; hoặc return {{ ... }};"""


def _extract_code(raw: str) -> str:
    """Strip markdown code fences and clean up LLM output."""
    # Remove ```javascript ... ``` or ``` ... ```
    raw = raw.strip()
    fence_pattern = re.compile(
        r"^```(?:javascript|js|typescript|ts)?\s*\n?(.*?)\n?```\s*$",
        re.DOTALL | re.IGNORECASE,
    )
    m = fence_pattern.match(raw)
    if m:
        return m.group(1).strip()

    # Remove inline single backtick wrapping (rare edge case)
    if raw.startswith("`") and raw.endswith("`"):
        raw = raw[1:-1].strip()

    return raw


async def generate_chart_code(
    prompt: str,
    columns: List[Dict[str, str]],
    sample_rows: List[Dict[str, Any]],
    current_code: Optional[str] = None,
) -> str:
    """
    Call LLM to generate / update ECharts JS code.
    
    Args:
        prompt: User's natural language request.
        columns: List of {name, type} dicts from dataset schema.
        sample_rows: Up to 3 sample data rows for context.
        current_code: Existing code string for incremental updates; None for first gen.
    
    Returns:
        Clean JavaScript code string ready to be put into Monaco Editor.
    """
    is_first_gen = current_code is None or current_code.strip() == ""

    if is_first_gen:
        user_prompt = _build_first_gen_prompt(prompt, columns, sample_rows)
    else:
        user_prompt = _build_incremental_prompt(prompt, current_code, columns, sample_rows)

    logger.info(
        "AI chart code gen | first=%s | prompt_len=%d",
        is_first_gen,
        len(user_prompt),
    )

    raw_response = await chat_completion(
        user_prompt=user_prompt,
        system_prompt=SYSTEM_PROMPT,
        temperature=0.2,
        max_tokens=4096,
        retries=2,
    )

    code = _extract_code(raw_response)

    if not code:
        raise ValueError("LLM returned empty code response")

    logger.info("AI chart code gen | code_len=%d chars", len(code))
    return code
