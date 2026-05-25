# Kiến trúc Hybrid Chatbot AI

Dưới đây là sơ đồ kiến trúc luồng xử lý của hệ thống Chatbot AI lai (Hybrid) được xây dựng cho dự án. Kiến trúc này kết hợp giữa:
1. **Rule-based (Heuristic)**: Xử lý siêu tốc các câu hỏi tra cứu chỉ số đơn giản (Fast Path).
2. **LLM Text-to-SQL + RAG**: Xử lý các câu hỏi tra cứu dữ liệu phức tạp cần truy xuất database.
3. **Multi-Agent (Analyst & Insight)**: Xử lý các câu hỏi phân tích đa chiều thông qua nhiều Agent phối hợp.

```mermaid
flowchart TD
    Start(["User Request: /chat/ask"]) --> ID["Intent Detector<br>detect_mode"]
    ID -->|"Xác định Intend"| Mode{"Mode: search or analysis?"}
    
    Mode --> QE["Fast Entity Extraction<br>Trích xuất Ticker, Metric"]
    
    QE --> CheckFast{"Mode == search<br>AND<br>Truy vấn 1 chỉ tiêu?"}
    
    %% Fast Path
    CheckFast -->|"Có"| FastPath["Fast Path:<br>Rule-based SQL Generator"]
    FastPath --> ExecFast["Execute SQL"]
    ExecFast --> ResultFast(["Trả về kết quả ngay lập tức"])
    
    %% RAG Path
    CheckFast -->|"Không"| RAG["RAG Retrieval<br>Vector Search & Ind Code Lookup"]
    RAG --> Context["Ngữ cảnh + Schema Database"]
    
    Context --> Branch{"Theo Mode đã xác định"}
    
    %% Search Mode (LLM)
    Branch -->|"Search Mode"| SearchLLM["Search SQL Generator<br>LLM Call"]
    SearchLLM --> |"Sinh câu lệnh SQL"| ExecSearch["Execute SQL"]
    ExecSearch --> ResultSearch(["Trả về Bảng Dữ Liệu"])
    
    %% Analysis Mode (Multi-Agent)
    Branch -->|"Analysis Mode"| AnalystAgent["Analyst Agent Orchestrator"]
    
    AnalystAgent --> DataRetriever["Data Retriever Agent<br>LLM Call 1"]
    DataRetriever --> |"Sinh nhiều câu SQL <br>(VD: So sánh YoY, Peer)"| ExecParallel["Thực thi SQL Song Song"]
    ExecParallel --> Insight["Insight Agent<br>LLM Call 2"]
    Insight --> |"Phân tích kết quả, lập luận"| ResultAnalysis(["Trả về Bài Phân Tích Chuyên Sâu"])

    %% Styling
    classDef heuristic fill:#f9f,stroke:#333,stroke-width:2px;
    classDef llm fill:#bbf,stroke:#333,stroke-width:2px;
    classDef agent fill:#bfb,stroke:#333,stroke-width:2px;
    
    FastPath:::heuristic
    SearchLLM:::llm
    DataRetriever:::agent
    Insight:::agent
    AnalystAgent:::agent
```

## Các thành phần chính

1. **Intent Detector**: Phân loại ý định của người dùng dựa trên từ khóa (ví dụ: "giá", "P/E" -> Search; "phân tích", "đánh giá" -> Analysis).
2. **Fast Entity Extraction**: Trích xuất nhanh các thực thể tài chính như mã cổ phiếu, chỉ số tài chính cơ bản để phục vụ Fast Path.
3. **Fast Path**: Nếu người dùng chỉ hỏi 1 chỉ số cơ bản của 1 mã cổ phiếu (VD: "P/E của FPT"), hệ thống sẽ tự động sinh SQL bằng quy tắc (Rule-based) và bỏ qua bước gọi LLM để tối ưu tốc độ.
4. **RAG Retrieval**: Dùng Vector Search để tìm kiếm các Schema / Metadata liên quan và tra cứu mã ngành (Industry Code) để cung cấp Context cho LLM.
5. **Analyst Agent**: Cấu trúc Multi-Agent gồm:
   - **Data Retriever Agent**: Chịu trách nhiệm viết nhiều truy vấn SQL để lấy dữ liệu đa chiều (VD: lịch sử quá khứ, dữ liệu ngành, đối thủ cạnh tranh).
   - **Insight Agent**: Nhận kết quả từ Data Retriever, đọc hiểu số liệu và viết ra lời nhận xét phân tích cuối cùng.
