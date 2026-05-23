SEARCH_KEYWORDS = [
    "bao nhiêu", "giá", "khối lượng", "eps", "roe", "roa", "p/e", "p/b",
    "doanh thu", "lợi nhuận", "bảng", "số liệu", "thống kê",
    "hiện tại", "gần nhất", "quý", "năm",
]

ANALYSIS_KEYWORDS = [
    "phân tích", "đánh giá", "nhận xét", "so sánh", "xu hướng", "triển vọng",
    "tại sao", "vì sao", "rủi ro", "cơ hội", "tăng trưởng", "định giá",
    "bền vững", "có nên",
]


def detect_mode(message: str, mode: str = "auto") -> str:
    if mode in {"search", "analysis"}:
        return mode

    q = message.lower()

    search_score = sum(1 for kw in SEARCH_KEYWORDS if kw in q)
    analysis_score = sum(1 for kw in ANALYSIS_KEYWORDS if kw in q)

    return "analysis" if analysis_score > search_score else "search"