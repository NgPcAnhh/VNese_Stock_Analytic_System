import json
import re
from pydantic import BaseModel, Field
from typing import Optional
from app.modules.chatbot.llm.client import chat_completion_structured


SYSTEM_PROMPT = """
Bạn là bộ trích xuất entity cho chatbot chứng khoán Việt Nam.
Chỉ trích xuất các thông tin được yêu cầu. Không giải thích.
"""

class PeriodInfo(BaseModel):
    type: Optional[str] = Field(None, description="quarter|year|range|recent|null")
    quarters: list[int] = Field(default_factory=list)
    years: list[int] = Field(default_factory=list)
    n_recent: Optional[int] = None

class EntityExtractionResult(BaseModel):
    tickers: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    period: PeriodInfo = Field(default_factory=PeriodInfo)
    sector: Optional[str] = None
    comparison_mode: Optional[str] = None



async def extract_entities(message: str) -> dict:
    try:
        response = await chat_completion_structured(
            user_prompt=f"Câu hỏi: {message}",
            system_prompt=SYSTEM_PROMPT,
            response_format=EntityExtractionResult,
            temperature=0.0,
            max_tokens=300,
        )
        return response.model_dump()
    except Exception as e:
        return {
            "tickers": [],
            "metrics": [],
            "period": {
                "type": None,
                "quarters": [],
                "years": [],
                "n_recent": None,
            },
            "sector": None,
            "comparison_mode": None,
        }