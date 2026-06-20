SEARCH_KEYWORDS = [
    # Gốc của bạn
    "truy vấn", "tìm kiếm", "tra cứu", "bao nhiêu", "thông tin",
    
    # Động từ lệnh
    "xem", "hiển thị", "liệt kê", "cung cấp", "lọc", "trích xuất", "lấy", 
    "cập nhật", "tổng hợp", "điểm tin",
    
    # Cụm từ nghi vấn & Số lượng
    "khi nào", "ngày nào", "ai", "mức", "mức nào", "tỷ lệ", "top", "đứng thứ",
    
    # Định dạng dữ liệu/Tài liệu
    "dữ liệu", "chỉ số", "thống kê", "lịch sử", "báo cáo", "bctc", 
    "biểu đồ", "đồ thị", "chart", "tin tức", "sự kiện", "lịch", "danh sách",
    
    # Cụm từ ngữ cảnh
    "cho tôi biết", "cho xin", "chi tiết", "mới nhất", "hiện tại", "hôm nay"
]
ANALYSIS_KEYWORDS = [
    # Gốc của bạn
    "phân tích", "đánh giá", "nhận xét", "so sánh", "xu hướng", "triển vọng",
    "tại sao", "vì sao", "rủi ro", "cơ hội", "tăng trưởng", "định giá", "có nên",
    
    # Mở rộng chuyên sâu tài chính
    "bóc tách", "mổ xẻ", "lý giải", "giải thích", "dự báo", "dự đoán", "ước tính",
    "kỳ vọng", "biến động", "chu kỳ", "động lực", "tiềm năng", "dư địa", "áp lực",
    "thách thức", "nội tại", "sức khỏe tài chính", "lợi thế", "điểm rơi",
    
    # Mở rộng hành động & chiến lược
    "khuyến nghị", "chiến lược", "phù hợp", "an toàn", "bẫy", "bong bóng", 
    "tích sản", "đảo chiều", "bứt phá", "vượt trội", "tương quan", "tác động",
    
    # Cụm từ hỏi/nhìn nhận
    "góc nhìn", "quan điểm", "nhận định", "liệu có", "thế nào", "ra sao"
]


def detect_mode(message: str, mode: str = "auto") -> str:
    if mode in {"search", "analysis"}:
        return mode

    q = message.lower()

    search_score = sum(1 for kw in SEARCH_KEYWORDS if kw in q)
    analysis_score = sum(1 for kw in ANALYSIS_KEYWORDS if kw in q)

    return "analysis" if analysis_score > search_score else "search"