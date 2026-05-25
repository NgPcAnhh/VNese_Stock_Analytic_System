# 📐 TÀI LIỆU BIỂU ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAMS)

Tài liệu này mô tả chi tiết luồng nghiệp vụ (Business Logic) và các bước xử lý tương tác giữa **Người dùng (User)**, **Hệ thống (System)** và **Cơ sở dữ liệu (Database)** dưới góc nhìn của một Chuyên gia phân tích nghiệp vụ (Business Analyst).

Các biểu đồ hoạt động dưới đây được xây dựng dưới dạng **Activity Diagram có phân làn (Swimlanes)** bằng mã nguồn **Mermaid** tương ứng với 10 use case cốt lõi trong hệ thống phân tích chứng khoán Việt Nam.

---

## 1. Module Xác Thực Người Dùng & TOTP 2FA (Authentication & TOTP 2FA)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Nhập địa chỉ Email và Mật khẩu trên giao diện đăng nhập, sau đó bấm nút **Login**.
*   **System (Hệ thống BE):** Tiếp nhận thông tin đăng nhập, mã hóa mật khẩu đầu vào (hashing) và gửi yêu cầu xác thực sang Database.
*   **Database (Cơ sở dữ liệu):** Thực hiện tìm kiếm thông tin tài khoản người dùng theo email và so khớp mật khẩu đã mã hóa. Trả về trạng thái xác thực và trạng thái cấu hình 2FA (True/False, Has_2FA).
*   **System (Hệ thống BE):** Nhận kết quả từ Database:
    *   *Trường hợp 1 (Thông tin sai):* Trả về thông báo lỗi đăng nhập hiển thị trên màn hình User.
    *   *Trường hợp 2 (Đúng thông tin & Chưa bật 2FA):* Sinh mã JWT Access/Refresh Token, gửi phản hồi thành công và chuyển hướng người dùng về trang Dashboard.
    *   *Trường hợp 3 (Đúng thông tin & Đã bật 2FA):* Sinh mã token tạm thời (Temporary Token) và hiển thị form yêu cầu nhập mã OTP (2FA).
*   **User (Người dùng):** (Nếu thuộc trường hợp 3) Mở ứng dụng Google Authenticator, lấy mã OTP gồm 6 chữ số, điền vào form và bấm **Xác nhận**.
*   **System (Hệ thống BE):** Nhận mã OTP, kiểm tra tính hợp lệ sử dụng thuật toán TOTP. Gửi lệnh lưu log đăng nhập sang Database.
*   **Database (Cơ sở dữ liệu):** Lưu vết lịch sử đăng nhập thành công của người dùng.
*   **System (Hệ thống BE):** Trả về JWT Access/Refresh Token chính thức và điều hướng người dùng tới Dashboard.
*   **User (Người dùng):** Nhận phản hồi thành công trên màn hình, truy cập Dashboard. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    %% Định nghĩa luồng bơi (Swimlanes) thông qua Subgraphs
    subgraph User [Người dùng - User]
        Start1([Bắt đầu]) --> Input1[Nhập Email & Mật khẩu]
        Input1 --> Click1[Bấm nút Login]
        
        %% Nhánh nhập OTP
        ShowOTP[Hiển thị form yêu cầu nhập OTP 2FA] --> InputOTP[Lấy mã 6 số từ Authenticator & gửi]
        
        %% Nhận kết quả cuối cùng
        ReceiveSuccess1[Đăng nhập thành công & vào Dashboard] --> End1([Kết thúc])
        ReceiveError1[Hiển thị lỗi thông tin hoặc OTP sai] --> End1
    end

    subgraph System [Hệ thống - System]
        Click1 --> Encrypt1[Mã hóa mật khẩu đầu vào]
        Encrypt1 --> DBQuery1[Gửi yêu cầu xác thực tới Database]
        
        %% Nhận kết quả từ DB
        CheckAuth1{Thông tin đúng?}
        DBQuery1 -->|Xác thực| DBCheck1
        DBCheck1 -->|Trả kết quả| CheckAuth1
        
        CheckAuth1 -->|Sai| ReturnErr1[Tạo phản hồi lỗi đăng nhập]
        ReturnErr1 --> ReceiveError1
        
        CheckAuth1 -->|Đúng| Check2FA1{Tài khoản bật 2FA?}
        Check2FA1 -->|Chưa bật| GenJWT1[Tạo JWT Access & Refresh Token]
        GenJWT1 --> Redirect1[Chuyển hướng về Dashboard]
        Redirect1 --> ReceiveSuccess1
        
        Check2FA1 -->|Đã bật| GenTempToken1[Tạo Temporary Token]
        GenTempToken1 --> ShowOTP
        
        %% Xác thực OTP
        InputOTP --> VerifyOTP1[Xác thực OTP bằng thuật toán TOTP]
        VerifyOTP1 --> CheckOTPResult1{OTP chính xác?}
        
        CheckOTPResult1 -->|Sai| ReturnErr1
        CheckOTPResult1 -->|Đúng| SaveLog1[Gửi yêu cầu ghi nhận Login Log]
        
        SaveLog1 -->|Ghi nhận| DBSAveLog1
        DBSAveLog1 -->|Hoàn tất| GenJWTFinal1[Tạo JWT Access & Refresh Token]
        GenJWTFinal1 --> RedirectFinal1[Chuyển hướng về Dashboard]
        RedirectFinal1 --> ReceiveSuccess1
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBCheck1[Truy vấn bảng Users theo Email & lấy mật khẩu + cấu hình 2FA]
        DBSAveLog1[Ghi bản ghi mới vào bảng login_log]
    end
```

---

## 2. Module Bảng Điện Chứng Khoán Thời Gian Thực (Real-time Price Board)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập vào giao diện Bảng điện trực tuyến (Price Board).
*   **System (Hệ thống FE/BE):** 
    1. Gọi REST API gửi yêu cầu lấy dữ liệu tĩnh đóng phiên gần nhất (giá đóng cửa cũ, giá tham chiếu, giá trần, sàn) để render nhanh giao diện bảng điện ban đầu.
    2. Khởi tạo kết nối **WebSocket** (`ws://...`) đến Server BE để đăng ký nhận dòng thông tin nhảy giá thời gian thực (quotes).
*   **Database (Cơ sở dữ liệu):** Nhận yêu cầu REST API, truy xuất giá EOD và trả về kết quả cho Hệ thống.
*   **System (Hệ thống FE/BE):** Render kết cấu bảng điện ban đầu cho người dùng. Bắt đầu lắng nghe gói tin WebSocket chứa dữ liệu khớp lệnh nhảy giây từ Kafka Broker.
*   **Database (Cơ sở dữ liệu / Kafka Broker):** Kafka broker nhận message thô từ websocket producer, consumer đồng bộ chèn vào bảng `realtime_quotes` trong DWH, đồng thời đẩy sự kiện quote thời gian thực về phía Hệ thống.
*   **System (Hệ thống FE/BE):** Nhận gói tin quotes, tính toán mức chênh lệch giá, cập nhật tự động các số liệu trên màn hình bảng điện và đổi màu nhấp nháy (Xanh: tăng, Đỏ: giảm, Vàng: đứng giá).
*   **User (Người dùng):** Theo dõi diễn biến bảng điện nhảy tự động. Bấm tắt/rời bảng điện để hoàn thành.
*   **System (Hệ thống FE/BE):** Phát hiện sự kiện unmount giao diện, kích hoạt gửi tín hiệu đóng kết nối WebSocket để giải phóng tài nguyên. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start2([Bắt đầu]) --> OpenMarket2[Truy cập trang Bảng Điện]
        OpenMarket2 --> WatchMarket2[Theo dõi giá nhảy nhấp nháy thời gian thực]
        WatchMarket2 --> LeavePage2[Rời khỏi trang Bảng Điện]
    end

    subgraph System [Hệ thống - System]
        %% Tải tĩnh
        OpenMarket2 --> CallStatic2[Gọi REST API lấy dữ liệu EOD đóng phiên cũ]
        CallStatic2 --> DBQueryStatic2
        DBResultStatic2 --> RenderStatic2[Hiển thị bảng điện tĩnh ban đầu]
        
        %% Kết nối WebSocket
        RenderStatic2 --> ConnWS2[Khởi tạo kết nối WebSocket wss://...]
        ConnWS2 --> ListenWS2[Lắng nghe dòng sự kiện quotes nhảy giây]
        
        %% Quotes nhận từ Kafka
        DBSocket2 -->|Sự kiện quote mới| ListenWS2
        ListenWS2 --> ParseQuote2[Đọc dữ liệu giá khớp, khối lượng]
        ParseQuote2 --> CalcDelta2[Tính % tăng/giảm so với tham chiếu]
        CalcDelta2 --> FlashUI2[Cập nhật UI & Đổi màu nhấp nháy Xanh/Đỏ/Vàng]
        FlashUI2 --> WatchMarket2
        
        %% Đóng kết nối
        LeavePage2 --> TerminateWS2[Gửi tín hiệu đóng kết nối WebSocket]
        TerminateWS2 --> EndWS2([Đóng kết nối & Kết thúc])
    end

    subgraph Database [Cơ sở dữ liệu - Database & Kafka]
        DBQueryStatic2[Truy vấn bảng history_price lấy giá EOD hôm trước] --> DBResultStatic2
        DBSocket2[Kafka Consumer nhận quotes & chèn realtime_quotes DB DWH]
    end
```

---

## 3. Module Theo Dõi & Phân Tích Thị Trường (Market Dashboard & Cash Flow)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập vào trang Theo dõi/Phân tích thị trường (Market Dashboard) để phân tích dòng tiền.
*   **System (Hệ thống FE/BE):** Gửi các yêu cầu REST API song song để lấy thông số tổng quan thị trường: Bản đồ nhiệt (Heatmap), phân bổ dòng tiền (Cash Flow), tác động chỉ số (Index Impact), và dòng tiền khối ngoại (Foreign Flow).
*   **Database (Cơ sở dữ liệu):** Nhận yêu cầu, quét dữ liệu thống kê từ các bảng `electric_board`, `history_price` và `company_overview`. Thực hiện tính toán gộp (Aggregation) và trả về kết quả JSON.
*   **System (Hệ thống FE/BE):** Nhận kết quả và xử lý trực quan hóa:
    - *Heatmap:* Dựng bản đồ nhiệt Treemap trực quan, phân rã theo ngành cấp 1, cấp 2 và từng mã cổ phiếu (kích thước ô đại diện cho thanh khoản, màu sắc đại diện cho % biến động giá).
    - *Cash Flow:* Tính tỷ lệ phần trăm GTGD đổ vào các mã tăng, giảm, hoặc không đổi.
    - *Index Impact:* Xác định danh sách top cổ phiếu đóng góp số điểm nhiều nhất vào chỉ số VN-Index.
    - *Foreign Flow:* Lập chuỗi mua ròng/bán ròng của khối ngoại.
    Render toàn bộ các biểu đồ ECharts lên màn hình.
*   **User (Người dùng):** Xem các biểu đồ tương tác dòng tiền, click chọn một nhóm ngành trên bản đồ nhiệt để đi sâu phân tích hoặc rời trang. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start3([Bắt đầu]) --> OpenMarket3[Mở trang Theo Dõi Thị Trường]
        OpenMarket3 --> InteractCharts3[Tương tác biểu đồ: Heatmap, Cash Flow, Foreign Flow]
        InteractCharts3 --> End3([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        OpenMarket3 --> ParallelFetch3{Gọi các REST APIs song song}
        
        ParallelFetch3 --> GetHeatmap3[Tải dữ liệu Heatmap Treemap]
        ParallelFetch3 --> GetCashFlow3[Tải dữ liệu phân bổ dòng tiền]
        ParallelFetch3 --> GetForeignFlow3[Tải lịch sử giao dịch khối ngoại]
        
        GetHeatmap3 --> DBQueryHeatmap3
        GetCashFlow3 --> DBQueryCash3
        GetForeignFlow3 --> DBQueryForeign3
        
        %% Xử lý kết quả trả về
        DBResultHeatmap3 --> ParseHeatmap3[Dựng bản đồ nhiệt Treemap chuẩn ICB]
        DBResultCash3 --> ParseCash3[Tính toán tỷ lệ phần trăm phân bổ dòng tiền]
        DBResultForeign3 --> ParseForeign3[Tính toán chuỗi mua/bán ròng khối ngoại]
        
        ParseHeatmap3 --> RenderDashboard3
        ParseCash3 --> RenderDashboard3
        ParseForeign3 --> RenderDashboard3
        
        RenderDashboard3[Kết xuất Dashboard: Heatmap Treemap & Biểu đồ dòng tiền ECharts] --> InteractCharts3
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBQueryHeatmap3[Truy vấn electric_board gom theo ngành ICB] --> DBResultHeatmap3
        DBQueryCash3[Tính tổng giá trị giao dịch các mã tăng/giảm/đứng giá] --> DBResultCash3
        DBQueryForeign3[Truy vấn bảng electric_board trường foreign_buy/sell] --> DBResultForeign3
    end
```

---

## 4. Module Tra Cứu & Phân Tích Cổ Phiếu Chuyên Sâu (Stock Analysis)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Gõ mã cổ phiếu (Ví dụ: `FPT`) trên thanh tìm kiếm thông minh và chọn mã tương ứng từ danh sách gợi ý.
*   **System (Hệ thống FE/BE):** Nhận mã chứng khoán, thực hiện điều hướng URL sang trang chi tiết cổ phiếu `/stock/FPT`. Kích hoạt gửi 3 yêu cầu API song song:
    1. Tải hồ sơ doanh nghiệp & ban lãnh đạo (Profile).
    2. Tải chuỗi giá đóng cửa lịch sử phục vụ biểu đồ phân tích kỹ thuật (Price History).
    3. Tải báo cáo tài chính thô qua các quý/năm (Financial Reports).
*   **Database (Cơ sở dữ liệu):** Nhận các yêu cầu truy vấn song song, quét dữ liệu từ các bảng `company_overview`, `history_price`, `bctc` và `financial_ratio` dựa trên khóa `ticker = 'FPT'`. Trả về kết quả JSON cho Hệ thống.
*   **System (Hệ thống FE/BE):** Tiếp nhận dữ liệu phản hồi và tiến hành tính toán nghiệp vụ tại Client:
    - *Vẽ Chart:* Chuyển đổi dữ liệu chuỗi giá sang nến OHLCV và tính toán các chỉ báo kỹ thuật SMA, EMA, RSI, MACD.
    - *Khuyến nghị:* Chấm điểm tín hiệu mua/bán từ các chỉ báo kỹ thuật, render ECharts Technical Gauge.
    - *Phân tích sâu BCTC:* Tính toán breakdown cơ cấu tài sản, nguồn vốn và tỷ lệ tăng trưởng YoY/QoQ.
    - Giao diện được hiển thị đầy đủ cho người dùng.
*   **User (Người dùng):** Xem chi tiết thông số cổ phiếu, tương tác zoom/pan trên biểu đồ phân tích kỹ thuật hoặc xem báo cáo tài chính dọc của doanh nghiệp. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start4([Bắt đầu]) --> SearchTicker4[Nhập mã CK vào thanh tìm kiếm]
        SearchTicker4 --> SelectTicker4[Chọn mã FPT từ danh sách gợi ý]
        SelectTicker4 --> RenderWait4[Chờ tải trang]
        ViewDashboard4[Xem Hồ sơ, Chart kỹ thuật & Phân tích sâu BCTC] --> End4([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        SelectTicker4 --> Redirect4[Điều hướng sang trang /stock/FPT]
        Redirect4 --> ParallelFetch4{Gọi API song song}
        
        ParallelFetch4 --> GetProfile4[Tải Profile & Cổ đông]
        ParallelFetch4 --> GetPriceHist4[Tải Lịch sử giá]
        ParallelFetch4 --> GetReports4[Tải BCTC & Ratios]
        
        GetProfile4 --> DBQueryProfile4
        GetPriceHist4 --> DBQueryPrice4
        GetReports4 --> DBQueryReports4
        
        %% Xử lý dữ liệu trả về
        DBResultProfile4 --> ProcessProfile4[Chuẩn hóa ban lãnh đạo & sở hữu]
        DBResultPrice4 --> CalcIndicators4[Tính SMA, EMA, RSI, MACD & Trọng số tín hiệu]
        DBResultReports4 --> CalcDeepBCTC4[Tính cơ cấu tài sản, nguồn vốn & YoY/QoQ]
        
        ProcessProfile4 --> MergeLayout4
        CalcIndicators4 --> MergeLayout4
        CalcDeepBCTC4 --> MergeLayout4
        
        MergeLayout4[Tổng hợp dữ liệu] --> DrawGauge4[Vẽ đồng hồ khuyến nghị kỹ thuật ECharts]
        DrawGauge4 --> RenderUI4[Kết xuất giao diện chi tiết cổ phiếu]
        RenderUI4 --> ViewDashboard4
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBQueryProfile4[Truy vấn bảng company_overview & owner] --> DBResultProfile4
        DBQueryPrice4[Truy vấn bảng history_price lấy chuỗi giá đóng cửa] --> DBResultPrice4
        DBQueryReports4[Truy vấn bảng bctc & financial_ratio] --> DBResultReports4
    end
```

---

## 5. Module Quản Lý Danh Mục & Tính Toán Rủi Ro (Portfolio Transactions & Risk)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập trang quản lý danh mục cá nhân, bấm **Thêm giao dịch** (nhập Mã CK, Số lượng, Giá mua). Bấm nút **Lưu vị thế**.
*   **System (Hệ thống FE/BE):** Tiếp nhận thông số giao dịch, kiểm tra tính hợp lệ của dữ liệu đầu vào (khối lượng phải là số nguyên dương, giá trị số thực lớn hơn 0). Gửi yêu cầu lưu trữ thông tin giao dịch sang Database.
*   **Database (Cơ sở dữ liệu):** Ghi nhận thông tin giao dịch mới vào bảng vị thế giao dịch của người dùng trong DWH, trả về trạng thái lưu thành công.
*   **System (Hệ thống FE/BE):** 
    1. Gọi REST API cập nhật lấy toàn bộ vị thế hiện tại của danh mục, đồng thời lấy giá thị trường thời gian thực của các mã đang nắm giữ.
    2. Thực hiện tính toán lại Giá vốn trung bình, Tỷ trọng tài sản của từng mã trong danh mục và Lãi/Lỗ tạm tính (P/L).
    3. Gửi yêu cầu chạy module Phân tích định lượng để tính toán Beta danh mục, Độ lệch chuẩn tỷ suất sinh lời và giá trị chịu rủi ro (VaR - Value at Risk) thông qua mô phỏng Monte Carlo.
*   **Database (Cơ sở dữ liệu):** Lưu trữ kết quả báo cáo rủi ro danh mục mới được cập nhật vào PostgreSQL.
*   **System (Hệ thống FE/BE):** Trả về toàn bộ dữ liệu danh mục đầu tư đã tính toán và cập nhật giao diện Dashboard của người dùng.
*   **User (Người dùng):** Nhận báo cáo vị thế cập nhật mới kèm các chỉ số rủi ro trực quan trên biểu đồ tròn tỷ trọng. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start5([Bắt đầu]) --> AccessPort5[Vào trang Portfolio]
        AccessPort5 --> InputTx5[Nhập Mã CK, Số lượng, Giá mua]
        InputTx5 --> ClickSave5[Bấm nút Lưu vị thế]
        ViewDashboard5[Xem danh mục cập nhật, Lãi/Lỗ & Chỉ số rủi ro VaR] --> End5([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        ClickSave5 --> ValidateInput5{Dữ liệu hợp lệ?}
        ValidateInput5 -->|Không| Reject5[Thông báo nhập sai định dạng]
        Reject5 --> InputTx5
        
        ValidateInput5 -->|Có| DBInsert5[Gửi yêu cầu lưu giao dịch vào DB]
        DBInsertOk5 --> FetchAllPositions5[Truy vấn toàn bộ vị thế danh mục]
        FetchAllPositions5 --> DBGetPositions5
        
        DBPositionsResult5 --> CalcPositions5[Tính Giá vốn, Tỷ trọng, Lãi/Lỗ tạm tính]
        CalcPositions5 --> CalcRisk5[Chạy Monte Carlo tính Beta, Độ lệch chuẩn & VaR danh mục]
        CalcRisk5 --> DBSaveRisk5[Gửi yêu cầu lưu thông số rủi ro mới]
        
        DBSaveRiskOk5 --> RenderPortUI5[Cập nhật bảng danh mục & biểu đồ tỷ trọng UI]
        RenderPortUI5 --> ViewDashboard5
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBInsert5[Ghi bản ghi giao dịch mới vào DB] --> DBResultInsert5
        DBResultInsert5 -->|Hoàn tất| DBInsertOk5
        
        DBGetPositions5[Truy xuất các vị thế & Lịch sử giá của danh mục] --> DBPositionsResult5
        
        DBSaveRisk5[Cập nhật bảng báo cáo rủi ro portfolio_risk] --> DBSaveRiskResult5
        DBSaveRiskResult5 -->|Hoàn tất| DBSaveRiskOk5
    end
```

---

## 6. 🤖 Hệ Thống RAG Chatbot AI (Search & Analysis Agent Workflow)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Nhập câu hỏi truy vấn dữ liệu tài chính (Ví dụ: *"So sánh biên lợi nhuận gộp của FPT và MWG trong năm 2025"*) và bấm gửi.
*   **System (Hệ thống Chatbot BE):** 
    1. Tiền xử lý câu hỏi và chuyển qua **Router (Bộ định tuyến ý định)**.
    2. Router thực hiện phân loại ý định:
        - *Nhánh 1: Search Mode (Fast-path)*: Dùng để hỏi đáp số liệu nhanh. Sinh câu lệnh SQL tĩnh đơn giản.
        - *Nhánh 2: Analysis Mode (Agentic-path)*: Dùng để yêu cầu phân tích sâu, so sánh đối thủ hoặc vĩ mô. Kích hoạt Analyst Agent để lập kế hoạch lấy dữ liệu, sinh đồng thời nhiều câu lệnh SQL phức tạp (YoY, QoQ, Industry comparison).
    3. Gửi câu lệnh SQL sang Database để thực thi.
*   **Database (Cơ sở dữ liệu):** Nhận các câu lệnh SQL, thực thi truy vấn trên các bảng dữ liệu của schema `hethong_phantich_chungkhoan` (DWH) và trả về kết quả dưới dạng JSON cho Hệ thống.
*   **System (Hệ thống Chatbot BE):** 
    - Đối với *Search Mode*: Chuyển đổi dữ liệu JSON thô thành bảng số liệu trực quan và trả về trực tiếp cho giao diện người dùng.
    - Đối với *Analysis Mode*: Chuyển tiếp kết quả JSON kèm theo System Prompt chuyên sâu sang **Insight Agent / Financial Analyst LLM**. LLM đọc hiểu dữ liệu, lập luận, so sánh tương đối và sinh văn bản báo cáo phân tích có cấu trúc Markdown hoàn chỉnh.
*   **User (Người dùng):** Nhận được phản hồi hiển thị trên màn hình chat (bao gồm: bài phân tích lập luận sâu sắc từ AI, bảng dữ liệu đối chứng đi kèm và các nguồn trích dẫn dữ liệu đáng tin có đầy đủ). Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start6([Bắt đầu]) --> InputQuery6[Nhập câu hỏi so sánh hoặc tra cứu số liệu tài chính]
        InputQuery6 --> SendQuery6[Bấm nút Gửi]
        ViewResponse6[Nhận bài viết phân tích AI + Bảng số liệu minh họa + Nguồn trích dẫn] --> End6([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        SendQuery6 --> Router6[Intent Detector: Phân loại ý định của câu hỏi]
        Router6 --> DecisionMode6{Chế độ xử lý?}
        
        %% Nhánh Search Mode
        DecisionMode6 -->|Search Mode| SQLGen6[SQL Generator: Sinh 1 SQL đơn giản]
        SQLGen6 --> DBSearch6
        DBSearchResult6 --> FormatTable6[Chuyển đổi JSON thành Bảng số liệu UI]
        FormatTable6 --> ViewResponse6
        
        %% Nhánh Analysis Mode
        DecisionMode6 -->|Analysis Mode| MultiAgent6[Analyst Agent: Lập kế hoạch sinh chùm 3-5 SQL phức tạp]
        MultiAgent6 --> DBAnalysis6
        DBAnalysisResult6 --> InsightAgent6[Insight Agent LLM: Nhận dữ liệu JSON & lập luận phân tích]
        InsightAgent6 --> LLMGen6[Sinh văn bản báo cáo phân tích theo chuẩn tài chính]
        LLMGen6 --> ViewResponse6
    end

    subgraph Database [Cơ sở dữ liệu - Database DWH]
        DBSearch6[Thực thi SQL đơn truy vấn history_price hoặc bctc] --> DBSearchResult6
        DBAnalysis6[Thực thi song song nhiều SQLs lấy chuỗi dữ liệu, YoY, Peer] --> DBAnalysisResult6
    end
```

---

## 7. Module Bộ Lọc Cổ Phiếu (Stock Screener)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập trang Bộ lọc cổ phiếu (Stock Screener), chọn các tiêu chí lọc (Ví dụ: P/E < 15, ROE > 15%, Vốn hóa > 1,000 tỷ). Bấm nút **Lọc cổ phiếu**.
*   **System (Hệ thống FE/BE):** Tiếp nhận các điều kiện lọc từ giao diện, đóng gói tham số lọc gửi REST API request lên Backend Server.
*   **Database (Cơ sở dữ liệu):** Nhận truy vấn, thực hiện tìm kiếm trên các bảng `financial_ratio` và `company_overview` để lọc ra danh sách các mã cổ phiếu thỏa mãn đầy đủ các tiêu chí thiết lập. Trả về kết quả JSON.
*   **System (Hệ thống FE/BE):** Nhận kết quả từ Database, phân loại và sắp xếp dữ liệu, render bảng kết quả phân trang lên giao diện người dùng.
*   **User (Người dùng):** Xem danh sách cổ phiếu kết quả, sắp xếp theo chỉ số quan tâm hoặc click chọn một cổ phiếu bất kỳ để đi tới trang Phân tích chi tiết. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start7([Bắt đầu]) --> AccessScreener7[Vào trang Bộ Lọc Cổ Phiếu]
        AccessScreener7 --> SetFilters7[Chọn các tiêu chí lọc tài chính & định giá]
        SetFilters7 --> ClickFilter7[Bấm nút Lọc cổ phiếu]
        ViewResults7[Xem danh sách kết quả phân trang & click chọn mã cổ phiếu] --> End7([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        ClickFilter7 --> BuildParams7[Đóng gói bộ tham số lọc thành API request]
        BuildParams7 --> DBSearchScreener7[Gửi yêu cầu truy vấn lọc sang BE]
        DBSearchScreenerResult7 --> ProcessResults7[Sắp xếp & Định dạng dữ liệu kết quả]
        ProcessResults7 --> RenderScreenerUI7[Hiển thị danh sách cổ phiếu lọc được trên bảng UI]
        RenderScreenerUI7 --> ViewResults7
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBSearchScreener7[Truy vấn bảng financial_ratio & overview kết hợp lọc điều kiện] --> DBSearchScreenerResult7
    end
```

---

## 8. Module Phân Tích Kỹ Thuật (Technical Analysis & Gauge)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập vào mục Phân tích kỹ thuật của một cổ phiếu đang xem.
*   **System (Hệ thống FE/BE):** Gửi yêu cầu REST API lấy chuỗi lịch sử giá đóng cửa OHLCV dài hạn của cổ phiếu đó, truy xuất từ hệ thống và trả về dữ liệu.
*   **System (Hệ thống Client-side Engine):** Nhận chuỗi dữ liệu lịch sử:
    1. Tính toán động các đường trung bình SMA/EMA trên nhiều mốc chu kỳ (10, 20, 50, 100, 200).
    2. Tính toán động các chỉ báo dao động kỹ thuật RSI, MACD, ADX, Stochastic, Williams %R.
    3. Thực hiện tính toán điểm trọng số cho từng chỉ báo (Tín hiệu Mua: +1 đến +3 điểm, Bán: -1 đến -3 điểm, Trung lập: 0 điểm).
    4. Tổng hợp điểm số để đưa ra kết luận xu hướng chung (Mua mạnh, Mua, Trung lập, Bán, Bán mạnh) và render đồng hồ kỹ thuật (Technical Gauge Card).
*   **User (Người dùng):** Xem biểu đồ kỹ thuật cùng đồng hồ khuyến nghị kỹ thuật trực quan để hỗ trợ ra quyết định mua/bán cổ phiếu. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start8([Bắt đầu]) --> AccessTechnical8[Truy cập tab Phân tích kỹ thuật của cổ phiếu]
        AccessTechnical8 --> ViewTechnicalUI8[Xem biểu đồ chỉ báo & đồng hồ đo khuyến nghị mua/bán] --> End8([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        AccessTechnical8 --> CallHistory8[Gửi REST API yêu cầu lịch sử giá OHLCV]
        CallHistory8 --> RunTechnicalEngine8[Khởi chạy động cơ tính toán kỹ thuật Client-side]
        
        subgraph TechEngine [Động cơ Tính Toán Chỉ Báo Kỹ Thuật]
            RunTechnicalEngine8 --> CalcMovingAverages8[Tính các đường trung bình SMA / EMA]
            CalcMovingAverages8 --> CalcOscillators8[Tính chỉ báo dao động RSI, MACD, Stochastic]
            CalcOscillators8 --> WeightSignals8[Tính điểm trọng số tín hiệu mua/bán]
            WeightSignals8 --> AggregateConclusion8[Tổng hợp điểm kết luận xu hướng chung]
        end
        
        AggregateConclusion8 --> DrawGaugeUI8[Vẽ đồng hồ đo tín hiệu Technical Gauge ECharts]
        DrawGaugeUI8 --> RenderTechnicalUI8[Render giao diện phân tích kỹ thuật]
        RenderTechnicalUI8 --> ViewTechnicalUI8
    end
```

---

## 9. Module Xem Tin Tức Tài Chính & Tâm Lý (Financial News & Sentiment)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập vào trang Tin tức tài chính chung hoặc click đọc một tin cụ thể trên hệ thống.
*   **System (Hệ thống FE/BE):** Gửi yêu cầu REST API lấy danh sách bài báo mới nhất, tin tức đọc nhiều hoặc chỉ số tâm lý thị trường tổng hợp (News Sentiment Summary).
*   **Database (Cơ sở dữ liệu):** Truy vấn bảng `news` lấy danh sách bài viết kèm theo điểm tâm lý `sentiment_score`/`sentiment_label` và nhóm ngành `icb_name` do PhoBERT AI phân tích sẵn. Trả về kết quả JSON cho Hệ thống.
*   **System (Hệ thống FE/BE):** Nhận dữ liệu, kết xuất danh sách bài viết dưới dạng lưới và vẽ biểu đồ Gauge hiển thị tỉ lệ phần trăm sắc thái thị trường (Tích cực/Tiêu cực). Nếu người dùng click đọc chi tiết một tin, hệ thống gửi yêu cầu ghi nhận lượt xem.
*   **Database (Cơ sở dữ liệu):** (Khi click đọc tin) Ghi bản ghi click log vào bảng `article_clicks` trong schema system.
*   **User (Người dùng):** Đọc các nội dung bài viết, theo dõi xu hướng tâm lý thị trường để hỗ trợ định hướng đầu tư. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start9([Bắt đầu]) --> AccessNews9[Truy cập trang Tin Tức Tài Chính]
        AccessNews9 --> ClickArticle9[Click vào đọc một bài viết cụ thể]
        ClickArticle9 --> ReadArticle9[Đọc nội dung chi tiết bài báo] --> End9([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        AccessNews9 --> GetNewsList9[Gửi REST API yêu cầu danh sách tin & tâm lý]
        GetNewsList9 --> DBQueryNews9
        DBResultNews9 --> RenderNewsUI9[Vẽ biểu đồ tâm lý thị trường & hiển thị danh sách tin tức]
        RenderNewsUI9 --> ClickArticle9
        
        ClickArticle9 --> TrackNewsClick9[Gửi log tương tác click bài báo lên BE]
        TrackNewsClick9 --> DBSaveClick9
        DBSaveClickOk9 --> ReadArticle9
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBQueryNews9[Truy vấn bảng news lấy tin tức kèm điểm số sentiment & ngành ICB] --> DBResultNews9
        DBSaveClick9[Ghi nhận log vào bảng system.article_clicks] --> DBSaveClickOk9
    end
```

---

## 10. Module Xem Chỉ Số Thị Trường & Vĩ Mô (Market Indices & Macro)

### Luồng Nghiệp Vụ Chi Tiết (Document)
*   **User (Người dùng):** Bắt đầu. Truy cập vào mục Chỉ số thị trường hoặc chỉ số Kinh tế vĩ mô trên hệ thống.
*   **System (Hệ thống FE/BE):** Gửi các yêu cầu REST API song song để lấy điểm số chỉ số trong nước (VN-Index, HNX, UPCoM, VN30), tỷ giá/hàng hóa thế giới (Vàng thế giới, Dầu thô Brent, Dow Jones) và chỉ số vĩ mô năm của Việt Nam.
*   **Database (Cơ sở dữ liệu):** Thực hiện quét dữ liệu các bảng tương ứng `market_index`, `macro_economy`, `global_index`, và `vn_macro_yearly`. Trả về kết quả JSON cho Hệ thống.
*   **System (Hệ thống FE/BE):** Định dạng dữ liệu số liệu vĩ mô, vẽ các biểu đồ xu hướng biến động chỉ số (Line charts) và kết xuất bảng dữ liệu so sánh chu kỳ năm lên màn hình.
*   **User (Người dùng):** Xem biểu đồ, phân tích tương quan giữa các mốc thời gian vĩ mô và chỉ số kinh tế Việt Nam để nhận định xu hướng thị trường. Kết thúc luồng.

### Mã Nguồn Biểu Đồ (Mermaid Code)
```mermaid
flowchart TD
    subgraph User [Người dùng - User]
        Start10([Bắt đầu]) --> AccessIndices10[Mở mục Chỉ số thị trường & Vĩ mô]
        AccessIndices10 --> ViewMacroUI10[Xem biểu đồ chỉ số vĩ mô & bảng so sánh chu kỳ] --> End10([Kết thúc])
    end

    subgraph System [Hệ thống - System]
        AccessIndices10 --> ParallelFetchIndices10{Gọi các REST APIs song song}
        
        ParallelFetchIndices10 --> GetIndexData10[Tải điểm số Index trong nước]
        ParallelFetchIndices10 --> GetGlobalMacro10[Tải tỷ giá & hàng hóa thế giới]
        ParallelFetchIndices10 --> GetVNMacro10[Tải vĩ mô năm Việt Nam]
        
        GetIndexData10 --> DBQueryIndexData10
        GetGlobalMacro10 --> DBQueryGlobalMacro10
        GetVNMacro10 --> DBQueryVNMacro10
        
        %% Nhận kết quả
        DBResultIndexData10 --> ProcessIndices10[Chuẩn hóa chuỗi thời gian điểm số Index]
        DBResultGlobalMacro10 --> ProcessGlobalMacro10[Định dạng chuỗi giá hàng hóa thế giới]
        DBResultVNMacro10 --> ProcessVNMacro10[Pivot chuyển đổi dữ liệu vĩ mô theo năm]
        
        ProcessIndices10 --> MergeIndicesLayout10
        ProcessGlobalMacro10 --> MergeIndicesLayout10
        ProcessVNMacro10 --> MergeIndicesLayout10
        
        MergeIndicesLayout10[Tổng hợp dữ liệu] --> RenderIndicesUI10[Vẽ các biểu đồ đường xu hướng & bảng so sánh]
        RenderIndicesUI10 --> ViewMacroUI10
    end

    subgraph Database [Cơ sở dữ liệu - Database]
        DBQueryIndexData10[Truy vấn bảng market_index] --> DBResultIndexData10
        DBQueryGlobalMacro10[Truy vấn bảng macro_economy & global_index] --> DBResultGlobalMacro10
        DBQueryVNMacro10[Truy vấn bảng vn_macro_yearly] --> DBResultVNMacro10
    end
```
