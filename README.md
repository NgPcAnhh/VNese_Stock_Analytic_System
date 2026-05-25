# 📈 HỆ THỐNG PHÂN TÍCH CHỨNG KHOÁN (STOCK ANALYSIS SYSTEM)

Dự án cung cấp một giải pháp toàn diện cho nhà đầu tư chứng khoán tại Việt Nam. Hệ thống bao gồm việc theo dõi diễn biến thị trường theo thời gian thực, phân tích chuyên sâu báo cáo tài chính doanh nghiệp, quản lý danh mục đầu tư, cùng với một trợ lý ảo AI (RAG Chatbot) thông minh hỗ trợ trả lời các câu hỏi về tài chính qua ngôn ngữ tự nhiên.

Dự án được chia làm 2 phân hệ (project con) chính: **Web Application (`web_ptich_ck`)** và **Data Pipeline (`data_pipeline`)**.

---

## 🏛️ 1. KIẾN TRÚC TỔNG QUAN

Hệ thống được thiết kế theo mô hình **Client-Server** kết hợp **Microservices-oriented** cho các dịch vụ AI và luồng xử lý dữ liệu lớn (Data Pipeline).

![Thiết kế hệ thống](data_pipeline/assets/system_design.png)

### 1.1. Phân hệ Nền tảng Web (`web_ptich_ck`)
Chịu trách nhiệm tương tác trực tiếp với người dùng cuối, hiển thị biểu đồ và cung cấp các công cụ phân tích, chat AI.

*   **Chức năng:** Cung cấp giao diện bảng điện, tìm kiếm thông tin, phân tích kỹ thuật, báo cáo tài chính, quản lý danh mục và RAG Chatbot.
*   **Công nghệ Frontend (FE):** Next.js (React), TypeScript, TailwindCSS, Chart libraries (Recharts).
*   **Công nghệ Backend (BE):** FastAPI (Python) phục vụ API tốc độ cao, xử lý bất đồng bộ lý tưởng cho AI stream và WebSockets (truyền dữ liệu real-time).
*   **Database:**
    *   **PostgreSQL (Data Warehouse - DWH):** Lưu trữ toàn bộ dữ liệu tài chính doanh nghiệp, biến động giá, thông tin người dùng.
    *   **Vector Database (FAISS/PGVector):** Lưu trữ metadata schema và vector tri thức ngành phục vụ AI Chatbot (RAG).
*   **Trí tuệ nhân tạo (AI):** OpenAI API (`text-embedding-3-small`, `gpt-4o-mini`), kiến trúc LlamaIndex / Langchain.

### 1.2. Phân hệ Xử lý Dữ liệu (`data_pipeline`)
Thu thập, làm sạch và chuẩn hóa dữ liệu tài chính khổng lồ từ các nguồn trước khi đẩy vào Data Warehouse. Sử dụng kiến trúc Medallion Lakehouse kết hợp Lambda Architecture.

*   **Chức năng:** Thu thập dữ liệu real-time và batch, xử lý làm sạch, chuẩn hóa dữ liệu báo cáo tài chính, đánh giá cảm xúc tin tức thị trường bằng AI.
*   **Công nghệ Orchestrator:** Apache Airflow (Celery Executor + Redis).
*   **Công nghệ Streaming:** Apache Kafka & Zookeeper xử lý hàng triệu message giao dịch/giây.
*   **Công nghệ Lưu trữ Hồ dữ liệu (Data Lake):** MinIO (tương thích AWS S3), định dạng file Parquet.
*   **AI/NLP Model:** `wonrax/phobert-base-vietnamese-sentiment` chạy nội bộ để chấm điểm cảm xúc (Sentiment Analysis) tin bài.

![Kiến trúc dữ liệu Medallion Lakehouse](data_pipeline/assets/system_architecture.png)

---

## 🎯 2. DANH SÁCH CHI TIẾT TẤT CẢ CHỨC NĂNG (USE CASE LIST)

Dự án được cấu trúc thành các module chức năng độc lập, hỗ trợ toàn diện vòng đời đầu tư và giám sát hệ thống.

### Phân hệ Web (`web_ptich_ck`)

#### 1. Module Xác thực & Quản lý Người dùng (Auth & Profile)
*   **Đăng ký tài khoản mới:** Người dùng đăng ký bằng Email và Mật khẩu. Hệ thống mã hóa mật khẩu trước khi lưu trữ.
*   **Đăng nhập cục bộ:** Xác thực bằng tài khoản đã đăng ký, hỗ trợ tạo session và cấp mã JWT (Access & Refresh Token).
*   **Xác thực 2 yếu tố (2FA / TOTP):** Hỗ trợ liên kết tài khoản với Google Authenticator thông qua mã QR, nâng cao tính bảo mật khi đăng nhập.
*   **Quản lý mật khẩu:** Bao gồm chức năng đổi mật khẩu (khi đã đăng nhập) và khôi phục mật khẩu qua email khi bị quên (Forgot/Reset Password).
*   **Hồ sơ Cá nhân:** Cho phép người dùng thay đổi họ tên, cập nhật ảnh đại diện (avatar) và quản lý lịch sử đăng nhập cá nhân.

#### 2. Module Tìm kiếm Thông tin (Live Search)
*   **Tìm kiếm mã cổ phiếu và tin tức:** Hỗ trợ ô tìm kiếm nhanh tại Header. Nhập chữ cái bất kỳ sẽ kích hoạt gợi ý thông minh, tự động hiển thị song song các mã cổ phiếu và tin bài liên quan.
*   **Debounced API Queries:** Sử dụng bộ đệm 400ms ở Client để giảm tải lượng request spam API lên Backend.
*   **Xu hướng Hot Search:** Tổng hợp các mã được quan tâm tìm kiếm nhiều nhất thị trường (ví dụ: `VHM`, `DIG`, `SSI`...) để gợi ý nhanh cho người dùng.
*   **Ghi log tìm kiếm:** Lưu trữ từ khóa tìm kiếm gắn với ID người dùng hoặc Session ID để hỗ trợ cá nhân hóa trải nghiệm.

#### 3. Module Theo dõi Thị trường & Nhóm ngành (Market & Indices)
*   **Bảng điện tổng hợp (Price Board):** Cập nhật biến động giá từng giây qua WebSockets, hiển thị giá khớp lệnh, khối lượng, dư mua/dư bán.
*   **Chỉ số thị trường (Indices):** Hiển thị chi tiết điểm số, thanh khoản và biến động phần trăm của các sàn giao dịch (VNINDEX, HNX, UPCOM, VN30).
*   **Bản đồ dòng tiền & Heatmap:** Biểu diễn trực quan dòng tiền đổ vào thị trường dưới dạng Treemap. Ô lớn tương ứng với thanh khoản lớn, màu xanh đại diện cho tăng giá, màu đỏ đại diện giảm giá.
*   **Hiệu suất Nhóm ngành (Sector Performance):** Xếp hạng tăng giảm của các nhóm ngành trong phiên (Tài chính, Bất động sản, Công nghệ, Bán lẻ...).
*   **Dòng tiền khối ngoại (Foreign Flow):** Thống kê giá trị mua ròng / bán ròng lũy kế của khối ngoại theo thời gian.
*   **Kinh tế Vĩ mô:** Trực quan hóa các dữ liệu vĩ mô của Việt Nam (CPI, GDP, FDI, Lãi suất ngân hàng...) dạng đồ thị qua các năm/quý.
*   **Tin tức thị trường chung:** Hiển thị luồng tin tức sự kiện kinh tế vĩ mô, chính sách và tin tức tổng hợp toàn thị trường.
*   **Chỉ số cảm xúc thị trường:** Trực quan hóa mức độ lạc quan/bi quan của thị trường thông qua tổng hợp điểm số cảm xúc (Sentiment Score) từ các bài báo trong ngày được AI phân tích.

#### 4. Module Tra cứu & Phân tích Chi tiết Cổ phiếu (Stock Analysis)
*   **Hồ sơ doanh nghiệp:** Xem thông tin khái quát công ty, danh sách hội đồng quản trị, cơ cấu cổ đông lớn, công ty con và lịch sử chia cổ tức.
*   **Báo cáo tài chính doanh nghiệp:** Truy xuất các báo cáo tài chính thô (Bảng Cân đối kế toán, Kết quả kinh doanh, Lưu chuyển tiền tệ) theo Quý/Năm. Hệ thống tự động thay đổi cấu trúc hiển thị tùy thuộc vào ngành đặc trưng (Doanh nghiệp thông thường, Ngân hàng, Bảo hiểm, Công ty Chứng khoán).
*   **Phân tích sâu tài chính (Deep Analysis):** Đồ thị hóa cơ cấu tài sản, cơ cấu nguồn vốn, tỷ suất lợi nhuận (ROE, ROA, GPM), chu kỳ tiền mặt và chấm điểm sức khỏe tài chính.
*   **Biểu đồ Phân tích Kỹ thuật (Technical Chart):** Tích hợp biểu đồ hình nến (OHLCV) và các chỉ báo kỹ thuật phổ biến (RSI, MACD, Bollinger Bands, đường SMA/EMA).
*   **Đồng hồ đo tín hiệu Kỹ thuật:** Tổng hợp tín hiệu mua/bán từ hàng loạt chỉ báo và đưa ra khuyến nghị tổng quát (Mua mạnh, Bán mạnh, Trung lập).
*   **So sánh đối thủ:** Lập bảng so sánh trực diện các chỉ số định giá và hiệu quả hoạt động với các doanh nghiệp cùng ngành.
*   **Phân tích Định lượng (Quant Analysis):** Tính toán rủi ro biến động giá cổ phiếu (Độ lệch chuẩn, Hệ số Beta, Giá trị chịu rủi ro VaR) và chạy mô phỏng Monte Carlo để dự báo biến động giá.
*   **Định giá doanh nghiệp (Valuation):** Áp dụng các công thức học thuật để ước lượng giá trị hợp lý của cổ phiếu (DCF, DDM, P/E dải lịch sử, Peer Valuation).
*   **Tin tức chi tiết doanh nghiệp:** Lọc và hiển thị danh sách tin tức, bài viết liên quan trực tiếp đến mã cổ phiếu đang tra cứu (tin tức nội bộ, giao dịch cổ đông lớn, lịch chia cổ tức...).
*   **Đo lường tâm lý cổ phiếu (AI Sentiment):** Hiển thị xu hướng cảm xúc của dư luận đối với doanh nghiệp theo thời gian dựa trên kết quả phân tích cảm xúc tin bài bằng AI.

#### 5. Module Bộ lọc Cổ phiếu (Stock Screener)
*   **Sàng lọc cổ phiếu:** Cho phép lọc toàn bộ mã trên thị trường dựa trên tổ hợp nhiều điều kiện (Sàn giao dịch, Nhóm ngành, P/E, P/B, ROE, Vốn hóa, Tỷ suất cổ tức...).
*   **Xu hướng Hot Search:** Thống kê các mã cổ phiếu đang được người dùng tìm kiếm nhiều nhất trên nền tảng.
*   **Mã cổ phiếu xem nhiều:** Danh sách các mã được người dùng click vào xem chi tiết nhiều nhất trong ngày/tuần.

#### 6. Module Quản lý Danh mục & Cảnh báo (Portfolio & Alerts)
*   **Theo dõi danh mục đầu tư:** Cho phép người dùng nhập các giao dịch mua/bán cổ phiếu thực tế, tự động tính toán giá vốn trung bình và lãi/lỗ (P/L) tạm tính dựa trên giá thời gian thực.
*   **Phân tích rủi ro danh mục:** Báo cáo hệ số Beta và độ lệch chuẩn của toàn bộ danh mục, đo lường mức độ ảnh hưởng của thị trường chung tới tài sản người dùng.
*   **Thiết lập Cảnh báo giá:** Người dùng đặt ngưỡng giá mong muốn cho một mã cổ phiếu. Khi giá khớp lệnh trên bảng điện chạm ngưỡng này, hệ thống sẽ gửi thông báo Pop-up/Email tức thì.

#### 7. Module Trợ lý Ảo AI (RAG Chatbot - StockPilot)
*   **Hỏi đáp dữ liệu nhanh (Search Mode):** Cho phép người dùng nhập các câu hỏi ngắn về dữ liệu tài chính (ví dụ: "EPS của FPT năm 2025 là bao nhiêu?"). Hệ thống tự sinh SQL và trả về bảng số liệu tức thì.
*   **Lập luận & Viết báo cáo (Analysis Mode):** Người dùng yêu cầu so sánh hoặc phân tích (ví dụ: "So sánh triển vọng tài chính giữa HPG và HSG"). Hệ thống sử dụng Multi-Agent để truy vấn số liệu chéo, lập luận và viết bài phân tích hoàn chỉnh kèm trích dẫn nguồn.

#### 8. Module Quản trị Hệ thống (Admin Panel)
*   **KPIs & Thống kê nền tảng:** Giám sát số người dùng hoạt động, số lượt đăng nhập mới, số phiên hoạt động trực tuyến.
*   **Quản lý người dùng:** Cho phép khóa tài khoản, kích hoạt, thay đổi vai trò (User/Admin) hoặc xóa session cưỡng ép đăng xuất.
*   **Analytics hành vi:** Báo cáo chi tiết các từ khóa tìm kiếm hot, các bài viết tin tức được đọc nhiều, danh mục menu được click nhiều nhất.
*   **Giám sát sức khỏe dữ liệu (Data Health):** Thống kê số lượng dòng của các bảng DWH chính và thời gian cập nhật gần nhất để kiểm soát tính ổn định của Data Pipeline.

> [!NOTE]
> **Phân tích luồng và quy trình hoạt động hệ thống:**
> * Xem chi tiết phân tích luồng dữ liệu (Kafka + Airflow) tại: [docs/data_flow.md](docs/data_flow.md)

---

### Phân hệ Data Pipeline (`data_pipeline`)

#### 1. Luồng Thu thập Dữ liệu Real-time (Kafka Pipeline)
*   **Hút dữ liệu Websocket:** Kết nối và duy trì kết nối ổn định với WebSocket nguồn (`stream2.simplize.vn`) để thu nhận luồng dữ liệu khớp lệnh chứng khoán.
*   **Làm giàu metadata:** Gắn thêm thời gian nhận tin (`ingested_at`) vào các bản ghi giao dịch nhằm phục vụ đối soát độ trễ.
*   **Hệ thống Message Broker:** Đẩy dữ liệu vào Kafka topic `market.quotes.raw`, phân chia partition theo ticker để giữ đúng thứ tự thời gian của các giao dịch.
*   **Gom cụm micro-batching:** Consumer đọc dữ liệu từ Kafka và gom vào bộ nhớ đệm (in-memory buffer) theo số lượng hoặc thời gian cài đặt để tránh quá tải I/O.
*   **Định dạng Parquet & Đẩy lên Data Lake:** Chuyển đổi định dạng dữ liệu từ JSON sang file cột Parquet tối ưu nén, phân vùng theo đường dẫn ngày giờ (ví dụ: `realtime/YYYY/MM/DD/HH/...parquet`) và đẩy lên hồ chứa MinIO.

![Luồng xử lý Kafka Real-time](data_pipeline/assets/kafka_flow.png)

#### 2. Luồng Định kỳ Batch ETL (Airflow Pipeline)
*   **Extraction (Đồng bộ Bronze):** Lập lịch tự động cào dữ liệu BCTC, giá EOD cuối ngày từ các nguồn mở khác nhau lưu dưới dạng file CSV thô vào MinIO.
*   **Transformation (Silver):** Đọc file thô từ MinIO, làm sạch dữ liệu (loại bỏ dòng trùng lặp, chuẩn hóa kiểu dữ liệu số, xử lý giá trị rỗng).
*   **Smart Mapping (Gold BCTC):** Tự động đọc cấu hình ánh xạ chỉ tiêu tài chính từ file `bctc.md` để chuyển đổi các tên chỉ tiêu tiếng Việt thô thành mã chỉ tiêu thống nhất (`ind_code`), giúp hệ thống hiển thị chính xác bảng BCTC của mọi doanh nghiệp.
*   **AI Sentiment Analysis (Gold News):** Chạy mô hình ngôn ngữ **PhoBERT Sentiment Analysis** để phân tích tiêu đề tin tức, gán nhãn Tích cực/Tiêu cực/Trung lập và quy đổi thành điểm số thực `[-100, 100]`.
*   **ICB Industry Mapping (Gold News):** Sử dụng Regex Matching quét tiêu đề tin để phân loại bài viết thuộc về 1 trong 19 nhóm ngành cấp 2 theo chuẩn ICB.
*   **Database Loading:** Thực thi các truy vấn SQL nâng cao (`UPSERT`) để ghi dữ liệu sạch vào Data Warehouse PostgreSQL đảm bảo không bị trùng lặp dữ liệu và tốc độ ghi tối đa.

![Luồng xử lý Airflow Batch ETL](data_pipeline/assets/airflow_flow.png)

> [!NOTE]
> * Xem chi tiết tài liệu biểu đồ hoạt động (Activity Diagram) tại: [docs/activity_diagrams.md](docs/activity_diagrams.md)

---

## 📂 3. CẤU TRÚC THƯ MỤC CHI TIẾT

Dưới đây là sơ đồ thư mục hoàn chỉnh của dự án:

```text
project_vnstock/
├── data_pipeline/                      # Phân hệ data pipeline thu thập dữ liệu
│   ├── etl/                            # Thư mục chứa cấu hình chạy chính
│   │   ├── .env                        # File biến môi trường local
│   │   ├── docker-compose.yaml         # Thiết lập container Airflow, Kafka, MinIO, Redis
│   │   ├── HDSD_kafka.md               # Tài liệu vận hành Kafka
│   │   ├── HDSD_postgres_docker.md     # Tài liệu truy cập database Docker nhanh
│   │   ├── airflow/                    # Apache Airflow lập lịch
│   │   │   ├── Dockerfile              # Custom image cài đặt PyTorch CPU & PhoBERT
│   │   │   ├── requirements.txt        # Các dependency cài thêm cho Airflow Workers
│   │   │   ├── dags/                   # Nơi định nghĩa các DAG chạy định kỳ
│   │   │   │   ├── minio_to_db_sync.py # Đồng bộ chính từ MinIO sang PostgreSQL DWH
│   │   │   │   ├── dl_bctc_luong_2.py  # Tải BCTC luồng 2
│   │   │   │   └── dl_dailly_price.py  # Tải giá EOD cuối ngày
│   │   │   └── plugins/                # Các thư viện xử lý dữ liệu tự viết
│   │   │       └── lake_to_dwh/
│   │   │           ├── sync_generic.py # Xử lý đồng bộ hóa chung
│   │   │           ├── sync_bctc.py    # Đồng bộ và chuẩn hóa mã chỉ tiêu BCTC
│   │   │           ├── sentiment_processor.py # AI xử lý cảm xúc tin tức qua PhoBERT
│   │   │           └── utils.py        # Các hàm tiện ích MinIO/Database
│   │   ├── kafka/                      # Chạy luồng streaming giá realtime
│   │   │   ├── Dockerfile              
│   │   │   ├── requirements.txt        
│   │   │   └── src/
│   │   │       ├── producers/
│   │   │       │   └── kafka_producer.py # Hút WebSocket đẩy vào Kafka
│   │   │       └── consumers/
│   │   │           └── minio_sink_consumer.py # Nhận tin từ Kafka, gom batch parquet -> MinIO
│   │   └── minio/                      # Lưu trữ cục bộ gắn với volume MinIO
│   └── assets/                         # Thư mục lưu trữ hình ảnh sơ đồ
│
└── web_ptich_ck/                       # Phân hệ Web App
    ├── docker-compose.yml              # Khởi động nhanh Web FE & BE qua Docker
    ├── md/                             # Tài liệu cấu hình map chỉ tiêu BCTC
    │   └── bctc.md                     # File mapping cấu hình chỉ tiêu tài chính doanh nghiệp
    ├── BE/                             # Backend (FastAPI Python)
    │   ├── requirements.txt            
    │   ├── .env                        # File cấu hình kết nối DWH & OpenAI API
    │   └── app/
    │       ├── main.py                 # Điểm bắt đầu khởi chạy dự án Backend
    │       ├── api/                    # Quản lý định tuyến (Endpoints Router)
    │       ├── core/                   # Cấu hình bảo mật, mã hóa JWT, middlewares
    │       ├── database/               # Khởi tạo DB, các câu lệnh tạo bảng SQL
    │       │   ├── schema_v1.sql       # Schema DWH cốt lõi
    │       │   ├── auth_tables.sql     # Các bảng phục vụ xác thực người dùng
    │       │   ├── schema_system.sql   # Các bảng lưu vết log hệ thống
    │       │   └── indexes.sql         # Tối ưu hóa truy vấn PostgreSQL
    │       ├── websocket/              # Quản lý kết nối WebSocket bảng giá
    │       └── modules/                # Chi tiết business logic các phân hệ
    │           ├── auth/               
    │           ├── stock/              
    │           └── chatbot/            # Kiến trúc RAG Chatbot
    │               ├── agents/         # Analyst, Data Retriever, Insight Agents
    │               ├── retrieval/      # Tìm kiếm vector tri thức
    │               ├── sql/            # Sinh và kiểm tra an toàn câu lệnh SQL
    │               └── system_prompt/  # Chứa file prompt hệ thống cho AI
    │
    └── FE/                             # Frontend (Next.js - TypeScript)
        ├── package.json                
        ├── .env.local                  # Lưu link trỏ tới Backend API URL
        ├── components/                 # Các UI Components dùng chung (Bảng, nút)
        ├── hooks/                      # Custom hooks cho các API requests
        ├── lib/                        # Axios Client, technical analysis logic
        └── app/                        # Next.js App Router
            ├── (auth)/                 # Cụm trang Đăng nhập / Đăng ký
            ├── market/                 # Trang bảng điện & heatmap thị trường
            ├── stock/                  # Trang phân tích chi tiết mã cổ phiếu
            ├── portfolio/              # Trang theo dõi danh mục đầu tư
            └── stockpilot/             # Khung trò chuyện với Chatbot AI
```

---

## 🚀 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY HỆ THỐNG

### 4.1. Yêu cầu phần mềm và cấu hình khuyến nghị
*   **Hệ điều hành:** Khuyên dùng Windows (cài đặt WSL2) hoặc Linux.
*   **Docker & Docker Compose:** Cài đặt Docker Engine/Desktop phiên bản mới nhất hỗ trợ tính năng `include` (Compose v2.20.0+).
*   **Tài nguyên Docker Desktop:** Cấp tối thiểu **4GB RAM** và **2 Core CPU** cho Docker để tránh lỗi tràn bộ nhớ (OOM) do hệ sinh thái Airflow, Kafka, Next.js và FastAPI xử lý AI chạy cùng lúc.

---

### 4.2. Triển khai Nhanh Toàn Bộ Hệ Thống (Một Lệnh Duy Nhất)
Nhờ tính năng `include` của Docker Compose mới nhất, tệp [docker-compose.yml](file:///d:/project_vnstock/docker-compose.yml) ở thư mục gốc đã được thiết lập để liên kết tất cả các dịch vụ của cả `data_pipeline` và `web_ptich_ck`. Bạn không cần cài đặt môi trường ảo Python hay Node.js thủ công trên máy.

1.  **Chuẩn bị tệp môi trường:**
    *   Đảm bảo tệp `data_pipeline/etl/.env` đã có sẵn các cấu hình cơ sở.
    *   Đảm bảo tệp `web_ptich_ck/BE/.env` đã có cấu hình và mã `OPENAI_API_KEY` hợp lệ.
2.  **Khởi chạy toàn bộ services:**
    Mở Terminal tại thư mục gốc của dự án (`project_vnstock/`) và thực thi lệnh:
    ```bash
    docker compose up -d --build
    ```
    *Hệ thống sẽ tự động tải các base image, xây dựng custom Airflow Image (kèm PhoBERT), build Backend FastAPI, build Frontend Next.js và khởi động 12+ containers cùng chạy trên mạng ảo chung `vietnam_stock_network`.*

---

### 4.3. Kiểm Tra Kết Quả (Như thế nào là thành công?)
Hệ thống được khởi chạy thành công hoàn toàn khi bạn chạy lệnh `docker ps` và thấy tất cả các container có trạng thái `Up` (Running / Healthy). Bạn có thể truy cập các địa chỉ UI và kiểm tra kết quả như sau:

#### 1. Kiểm tra Giao diện Người dùng (Frontend Next.js)
*   **Địa chỉ:** [http://localhost:3000](http://localhost:3000)
*   **Dấu hiệu thành công:** Trang web load mượt mà, hiển thị bảng giá chứng khoán (các ô nhấp nháy cập nhật liên tục thông qua WebSocket kết nối với Backend). Người dùng có thể tìm kiếm mã, xem biểu đồ kỹ thuật và mở khung chat với StockPilot.

#### 2. Kiểm tra API Backend (FastAPI)
*   **Địa chỉ:** [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Dấu hiệu thành công:** Mở được giao diện Swagger UI chứa danh sách đầy đủ tất cả endpoints (`/api/v1/...`). Thử execute một API (ví dụ: `GET /api/v1/tong-quan/ticker-slide`) trả về mã `200 OK` kèm dữ liệu dạng JSON.

#### 3. Kiểm tra Hệ thống Lập lịch (Apache Airflow)
*   **Địa chỉ:** [http://localhost:8080](http://localhost:8080) (Tài khoản: `airflow` / `airflow`)
*   **Dấu hiệu thành công:** Giao diện Airflow mở ra, hiển thị danh sách các DAGs như `minio_to_db_sync`, `dl_daily_price` ở trạng thái sẵn sàng. Khi bấm trigger chạy, các task chuyển màu xanh lá cây (Success).

#### 4. Kiểm tra Kho lưu trữ dữ liệu (MinIO Console)
*   **Địa chỉ:** [http://localhost:9001](http://localhost:9001) (Tài khoản: `minioadmin` / `minioadmin`)
*   **Dấu hiệu thành công:** Truy cập vào menu **Buckets** -> Bucket `thongtin-congty-va-bctc` chứa các thư mục phân vùng dữ liệu thô (realtime dạng parquet hoặc batch dạng csv).

#### 5. Kiểm tra Luồng Streaming (Kafka UI)
*   **Địa chỉ:** [http://localhost:8081](http://localhost:8081)
*   **Dấu hiệu thành công:** Giao diện Kafka UI hiển thị broker hoạt động bình thường. Vào mục **Topics** -> `market.quotes.raw` -> **Messages** thấy liên tục có tin nhắn JSON chứa giá khớp lệnh real-time nhảy đều đặn.

#### 6. Giám sát Task ngầm (Flower Celery Monitor)
*   **Địa chỉ:** [http://localhost:5555](http://localhost:5555)
*   **Dấu hiệu thành công:** Hiển thị danh sách các Airflow Worker đang active, sẵn sàng nhận các task ETL nặng từ Celery Queue.

---

### 4.4. Triển Khai Riêng Biệt Từng Phân Hệ (Hạ tầng ETL, BE, FE)

Trong quá trình phát triển (development), bạn thường chỉ muốn chạy hạ tầng cơ sở dữ liệu và data pipeline, sau đó phát triển code Backend (FastAPI) hoặc Frontend (Next.js) cục bộ trên máy host để dễ dàng debug, tận dụng tính năng hot-reload. Dưới đây là hướng dẫn chi tiết:

#### 4.4.1. Khởi chạy Nền tảng Hạ tầng & ETL (`data_pipeline`)
Phân hệ này cung cấp toàn bộ cơ sở dữ liệu (PostgreSQL DWH, Airflow DB), Broker (Kafka, Zookeeper), Storage (MinIO) và Redis.

1. **Khởi chạy bằng Docker Compose:**
   Chạy lệnh sau từ thư mục gốc của dự án để khởi chạy toàn bộ phân hệ ETL và hạ tầng cơ sở:
   ```bash
   docker compose -f data_pipeline/etl/docker-compose.yaml up -d --build
   ```
   *(Nếu bạn đang ở trong thư mục `data_pipeline/etl/`, bạn chỉ cần chạy `docker compose up -d --build`)*

2. **Xác nhận hạ tầng hoạt động:**
   * **Database DWH PostgreSQL** sẽ mở cổng `5433` ra ngoài máy host (port mapping `5433:5432`).
   * **MinIO Console** hoạt động tại port `9001`.
   * **Kafka Broker** hoạt động tại port `9092` (bên ngoài host) và `9093` (mạng nội bộ docker).
   * **Airflow Webserver** hoạt động tại port `8080`.

---

#### 4.4.2. Khởi chạy Backend (FastAPI BE) riêng biệt

##### Cách 1: Khởi chạy Backend bằng Docker Compose riêng biệt
Từ thư mục gốc của dự án, khởi chạy service Backend:
```bash
docker compose -f web_ptich_ck/docker-compose.yml up backend -d --build
```
*Lưu ý: Cách này yêu cầu phân hệ hạ tầng ETL (`dwh-postgres`) đã được khởi động trước.*

##### Cách 2: Khởi chạy Backend cục bộ trên máy Host (Khuyên dùng khi Dev)
1. **Cấu hình môi trường (`.env`):**
   Mở tệp [web_ptich_ck/BE/.env](file:///d:/project_vnstock/web_ptich_ck/BE/.env) và cập nhật thông số kết nối Database sang cổng `5433` (cổng được map từ container `dwh-postgres` ra ngoài máy host):
   ```env
   DATABASE_URL=postgresql+psycopg2://admin:123456@localhost:5433/postgres
   DATABASE_URL_SYNC=postgresql://admin:123456@localhost:5433/postgres
   ```
2. **Khởi tạo Virtual Environment và cài đặt thư viện:**
   Di chuyển vào thư mục Backend và thực hiện:
   ```bash
   cd web_ptich_ck/BE
   python -m venv .venv
   
   # Kích hoạt môi trường ảo:
   # Trên Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # Trên Windows (CMD):
   .venv\Scripts\activate.bat
   # Trên Linux/macOS:
   source .venv/bin/activate

   # Cài đặt dependencies:
   pip install -r requirements.txt
   ```
3. **Khởi chạy Redis cục bộ (nếu cần):**
   Backend FastAPI sử dụng Redis để làm cache và quản lý socket. Bạn có thể cài đặt Redis cục bộ trên máy host và chạy, hoặc cấu hình container Redis trên Docker mở cổng `6379` ra ngoài host để kết nối.
4. **Chạy Backend:**
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *Tài liệu API Swagger sẽ hiển thị tại [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

---

#### 4.4.3. Khởi chạy Frontend (Next.js FE) riêng biệt

##### Cách 1: Khởi chạy Frontend bằng Docker Compose
Từ thư mục gốc của dự án, khởi chạy service Frontend:
```bash
docker compose -f web_ptich_ck/docker-compose.yml up frontend -d --build
```

##### Cách 2: Khởi chạy Frontend cục bộ trên máy Host (Khuyên dùng khi Dev)
1. **Cài đặt dependencies:**
   Di chuyển vào thư mục Frontend và cài đặt thư viện thông qua Node.js:
   ```bash
   cd web_ptich_ck/FE
   npm install
   ```
2. **Cấu hình môi trường:**
   Đảm bảo tệp `.env.local` đã định cấu hình URL chính xác trỏ đến API Backend:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. **Chạy Frontend ở chế độ Dev:**
   ```bash
   npm run dev
   ```
   *Giao diện người dùng sẽ chạy tại [http://localhost:3000](http://localhost:3000) với tính năng Hot Reload.*

---

## 🛠️ 5. CÁC LỆNH DOCKER VẬN HÀNH & KIỂM TRA DỊCH VỤ

Dưới đây là tổng hợp các câu lệnh Docker hữu ích để bạn giám sát, tương tác và gỡ lỗi (debug) nhanh các dịch vụ khi hệ thống đang chạy.

### 5.1. Lệnh Giám Sát và Quản Lý Chung

*   **Kiểm tra danh sách và trạng thái các container đang chạy:**
    ```bash
    docker ps
    # Kiểm tra toàn bộ container (kể cả đã dừng/lỗi)
    docker ps -a
    ```
*   **Kiểm tra tài nguyên (CPU, RAM, Network I/O) thực tế các container đang tiêu thụ:**
    ```bash
    docker stats
    ```
*   **Dừng toàn bộ hệ thống (dữ liệu trong volumes vẫn được giữ nguyên):**
    ```bash
    docker compose down
    ```
*   **Dừng và xóa toàn bộ hệ thống cùng với dữ liệu volumes (Dọn dẹp sạch sẽ):**
    ```bash
    docker compose down -v
    ```

---

### 5.2. Vận Hành & Kiểm Tra Cơ Sở Dữ Liệu (PostgreSQL)

Hệ thống sử dụng container `dwh-postgres` cho kho dữ liệu chính và container `postgres` (trong stack ETL) cho siêu dữ liệu Airflow.

*   **Truy cập trực tiếp vào Data Warehouse PostgreSQL (psql):**
    Sử dụng lệnh sau để truy vấn trực tiếp cơ sở dữ liệu chứng khoán sạch:
    ```bash
    docker exec -it dwh-postgres psql -U admin -d postgres
    ```
    *Một số lệnh psql cơ bản khi đã kết nối thành công:*
    *   `\dn` : Liệt kê các schema (public, gold, staging, ...).
    *   `\dt` : Liệt kê các bảng thuộc schema hiện tại.
    *   `\d <tên_bảng>` : Xem cấu trúc chi tiết của bảng đó.
    *   `\q` : Thoát khỏi psql console.
*   **Sao lưu dữ liệu (Dump Database DWH) từ container ra máy host:**
    ```bash
    docker exec -t dwh-postgres pg_dump -U admin -d postgres > backup_db.sql
    ```
*   **Khôi phục dữ liệu (Restore Database DWH) từ tệp sql trên máy host:**
    ```bash
    docker exec -i dwh-postgres psql -U admin -d postgres < backup_db.sql
    ```
*   **Xem logs thời gian thực của Postgres để check lỗi kết nối:**
    ```bash
    docker logs -f dwh-postgres
    ```

---

### 5.3. Vận Hành & Kiểm Tra Luồng Dữ Liệu Streaming (Kafka)

*   **Xem logs của Kafka Broker:**
    ```bash
    docker logs -f kafka
    ```
*   **Liệt kê tất cả các Topic hiện có trong Kafka:**
    ```bash
    docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list
    ```
*   **Xem các message đang truyền thời gian thực qua topic (Ví dụ: `market.quotes.raw`):**
    ```bash
    docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic market.quotes.raw --from-beginning
    ```
*   **Tạo topic thủ công bằng dòng lệnh:**
    ```bash
    docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic test.topic --partitions 1 --replication-factor 1
    ```
*   **Kiểm tra thông tin chi tiết (describe) của một topic:**
    ```bash
    docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic market.quotes.raw
    ```

---

### 5.4. Vận Hành & Kiểm Tra Bộ Lập Lịch (Apache Airflow)

Các lệnh dưới đây thực thi thông qua docker compose tại thư mục chứa file cấu hình ETL:

*   **Kiểm tra trạng thái các service Airflow:**
    ```bash
    docker compose -f data_pipeline/etl/docker-compose.yaml ps
    ```
*   **Xem logs của các thành phần chính:**
    ```bash
    # Xem logs của Scheduler (Bộ lập lịch)
    docker compose -f data_pipeline/etl/docker-compose.yaml logs -f airflow-scheduler
    # Xem logs của Webserver (Giao diện quản trị)
    docker compose -f data_pipeline/etl/docker-compose.yaml logs -f airflow-webserver
    # Xem logs của Celery Worker (Nơi thực thi tác vụ)
    docker compose -f data_pipeline/etl/docker-compose.yaml logs -f airflow-worker
    ```
*   **Liệt kê danh sách các DAGs hiện có:**
    ```bash
    docker compose -f data_pipeline/etl/docker-compose.yaml exec airflow-webserver airflow dags list
    ```
*   **Kích hoạt (Trigger) chạy thủ công một DAG:**
    ```bash
    docker compose -f data_pipeline/etl/docker-compose.yaml exec airflow-webserver airflow dags trigger minio_to_db_sync
    ```
*   **Kiểm tra danh sách các task trong một DAG cụ thể:**
    ```bash
    docker compose -f data_pipeline/etl/docker-compose.yaml exec airflow-webserver airflow tasks list minio_to_db_sync
    ```
*   **Truy cập vào shell của container Airflow Worker để debug môi trường:**
    ```bash
    docker exec -it etl-airflow-worker-1 bash  # Lưu ý thay đổi tên container cho khớp thực tế
    ```

---

### 5.5. Vận Hành & Kiểm Tra Phân Hệ Web (Backend FastAPI & Next.js FE)

*   **Xem logs thời gian thực của Backend:**
    ```bash
    docker logs -f fast_api_backend
    ```
*   **Truy cập shell bên trong container Backend để kiểm tra file/cài đặt:**
    ```bash
    docker exec -it fast_api_backend bash
    ```
*   **Xem logs thời gian thực của Frontend:**
    ```bash
    docker logs -f nextjs_frontend
    ```
*   **Khởi động lại (Restart) riêng container Backend hoặc Frontend:**
    ```bash
    docker restart fast_api_backend
    docker restart nextjs_frontend
    ```
