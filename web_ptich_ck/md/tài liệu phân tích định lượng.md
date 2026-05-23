TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ: QUANT DASHBOARD
MỤC TIÊU CỦA DASHBOARD

Dashboard cung cấp một lăng kính định lượng, dịch chuyển từ việc chỉ quan sát biến động giá thuần túy sang phân tích sâu về xác suất, phân phối rủi ro và các yếu tố thống kê ngầm định. Cấu trúc gồm 5 phân hệ chính với 13 biểu đồ, được bố trí logic theo nguyên tắc "Top-Down" nhằm giải quyết các bài toán về: Hiệu suất, Rủi ro, Phân phối thống kê, Vi mô và Chu kỳ.

ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ VÀ BIỂU ĐỒ

I. TỔNG QUAN HIỆU SUẤT & KỸ THUẬT (OVERVIEW & TREND)

Cho cái nhìn ngay lập tức về hiệu quả đầu tư so với thị trường chung và các mốc kỹ thuật quan trọng.

1. Lợi nhuận Tích lũy (Normalized)

Loại biểu đồ: Line Chart (ECharts).

Ý nghĩa: Thể hiện sự tăng trưởng tài sản theo chuỗi thời gian, chuẩn hóa cùng mốc xuất phát (Base 100) để so sánh tài sản với Benchmark (ví dụ: VN-Index).

Tại sao dùng / Ứng dụng: Loại bỏ sự khác biệt về mệnh giá để làm nổi bật mức chênh lệch hiệu suất (Alpha). Giúp nhà quản lý trả lời nhanh: "Danh mục này có đang chiến thắng thị trường không?".

2. Hồ sơ Sụt giảm (Underwater/Drawdown)

Loại biểu đồ: Area Chart.

Ý nghĩa: Thể hiện tỷ lệ phần trăm sụt giảm tính từ các mức đỉnh cao nhất trước đó (Peak-to-Trough).

Tại sao dùng / Ứng dụng: Trực quan hóa rủi ro mất vốn. Xác định các "cú sốc" lớn nhất (Max Drawdown) và thời gian phục hồi (Recovery Time - thời gian để đường đỏ quay về mốc 0%), qua đó đánh giá sức chịu đựng của danh mục qua các cuộc khủng hoảng.

3. Phân tích Kỹ thuật Tổng hợp

Loại biểu đồ: Composed Chart (Kết hợp Trục Y kép).

Ý nghĩa: Tích hợp Giá, các đường Trung bình động (SMA 50, SMA 200) ở trục trái, và chỉ báo Động lượng (RSI 14) ở trục phải.

Tại sao dùng / Ứng dụng: Một công cụ "All-in-one" tiết kiệm không gian. Giúp xác định các điểm giao cắt xu hướng (Golden Cross/Death Cross) và trạng thái Quá mua (>70) hoặc Quá bán (<30) để căn chỉnh thời điểm ra/vào lệnh.

II. CẤU TRÚC RỦI RO & BIẾN ĐỘNG (RISK & VOLATILITY)

Đánh giá các chỉ số rủi ro dưới dạng động (chuỗi thời gian) thay vì các con số tĩnh.

4. Biến động trượt (Rolling Volatility)

Loại biểu đồ: Line Chart (So sánh 2 chu kỳ).

Ý nghĩa: Độ lệch chuẩn của tỷ suất lợi nhuận, được tính toán cuốn chiếu qua các khung 30 ngày (ngắn hạn) và 90 ngày (trung hạn) và thường niên hóa.

Tại sao dùng / Ứng dụng: Biến động giá không cố định. Việc đường Volatility ngắn hạn (30d) cắt mạnh lên trên đường trung hạn (90d) thường là chỉ báo sớm cho một đợt bán tháo diện rộng hoặc hoảng loạn trên thị trường.

5. Tỷ lệ Sharpe trượt

Loại biểu đồ: Line + Area Chart.

Ý nghĩa: Chỉ số đo lường lợi nhuận vượt trội trên mỗi đơn vị rủi ro, tính trượt trong chu kỳ 252 ngày (1 năm giao dịch).

Tại sao dùng / Ứng dụng: Sharpe > 1 cho thấy hiệu quả sinh lời tốt so với rủi ro đánh đổi. Việc theo dõi dạng trượt giúp xác minh xem năng lực quản trị rủi ro của danh mục có ổn định không, hay chỉ ăn may trong một chu kỳ uptrend ngắn ngủi.

6. Độ nhạy thị trường (Rolling Beta)

Loại biểu đồ: Line Chart.

Ý nghĩa: Thể hiện mức độ tương quan và khuếch đại biến động so với Benchmark (tính trượt 252 ngày).

Tại sao dùng / Ứng dụng: Giám sát sự "thay đổi tính cách" của tài sản. Một cổ phiếu phòng thủ (Beta < 1) bỗng nhiên biến động mạnh và có Beta vọt lên > 1 có nghĩa là cấu trúc cổ đông hoặc tính đầu cơ của dòng tiền đang thay đổi lớn.

III. PHÂN PHỐI THỐNG KÊ & RỦI RO ĐUÔI (STATS & TAIL RISK)

Áp dụng tư duy xác suất để kiểm định rủi ro.

7. Phân phối Lợi nhuận (Histogram)

Loại biểu đồ: Bar Chart chồng với Line Chart (Normal Curve).

Ý nghĩa: Đếm tần suất các phiên giao dịch có mức lợi nhuận tương đồng (vẽ thành Bar) và đối chiếu với đường phân phối chuẩn lý thuyết.

Tại sao dùng / Ứng dụng: Để kiểm tra độ nhọn (Kurtosis) và độ lệch (Skewness). Nếu các cột Bar thực tế cao hơn đường Normal Curve ở các cực trị, tài sản đó có rủi ro tiềm ẩn hoặc hay xảy ra những pha biến động phi mã bất thường.

8. Đuôi Rủi ro (Fat-tail VaR)

Loại biểu đồ: Bar Chart (Trích xuất từ đuôi trái).

Ý nghĩa: Phóng to vào phần đuôi sụt giảm của Histogram, đếm số phiên thị trường "rơi tự do" (ví dụ: <-2%, <-3%).

Tại sao dùng / Ứng dụng: Rủi ro đuôi béo (Fat-tail) là nguyên nhân chính khiến các quỹ đầu tư phá sản. Phân tích này hỗ trợ trực tiếp việc cấu hình các mô hình Value at Risk (VaR) và Stress-testing.

IV. CẤU TRÚC VI MÔ & QUÁN TÍNH (MICRO-STRUCTURE)

Phân tích hành vi dòng tiền và quán tính của chuỗi giá.

9. Hồ sơ Khối lượng (Volume Profile)

Loại biểu đồ: Horizontal Bar Chart.

Ý nghĩa: Cộng dồn tổng khối lượng giao dịch tại từng mức giá cố định thay vì theo thời gian.

Tại sao dùng / Ứng dụng: Tìm ra Point of Control (POC) - mức giá diễn ra sự giằng co lớn nhất. Đây chính là các vùng "Hỗ trợ" hoặc "Kháng cự" sinh ra bởi dòng tiền thực (đám đông bị kẹp hàng), có độ tin cậy cực cao.

10. Tự tương quan (Autocorrelation - ACF)

Loại biểu đồ: Bar Chart.

Ý nghĩa: Tính độ tương quan giữa lợi nhuận ngày hiện tại với $n$ ngày trước đó (Lag 1, Lag 2,...).

Tại sao dùng / Ứng dụng: Xác định tính "Quán tính" (Momentum) hay "Phục hồi trung bình" (Mean-reversion). Nếu Lag 1 dương đáng kể, cổ phiếu đang có xu hướng duy trì đà tăng/giảm. Nếu âm, giá thường đi ngang dích dắc.

V. TÍNH MÙA VỤ & CHU KỲ (SEASONALITY)

Phát hiện các lợi thế giao dịch dựa trên yếu tố thời gian.

11. Ma trận Hiệu suất (Heatmap)

Loại biểu đồ: Grid Heatmap.

Ý nghĩa: Trực quan hóa tỷ suất lợi nhuận của từng tháng dọc theo các năm bằng cường độ màu sắc (Xanh = Lãi, Đỏ = Lỗ).

Tại sao dùng / Ứng dụng: Cho phép nhà đầu tư nhìn lướt qua toàn bộ lịch sử giao dịch để nhận diện "mùa" nào thị trường dễ thở và "mùa" nào thường xảy ra sự cố.

12. Tính Mùa vụ theo Tháng

Loại biểu đồ: Bar Chart.

Ý nghĩa: Tính trung bình tỷ suất sinh lời của tất cả các Tháng 1, Tháng 2,... trong toàn bộ bộ dữ liệu lịch sử.

Tại sao dùng / Ứng dụng: Tìm kiếm các hiệu ứng chu kỳ lõi (như Hiệu ứng tháng Giêng, hay mùa báo cáo tài chính quý). Giúp xây dựng chiến lược "Market Timing" theo tháng.

13. Hiệu ứng Ngày trong tuần

Loại biểu đồ: Bar Chart.

Ý nghĩa: Tỷ suất sinh lời trung bình được chia theo thứ (Thứ 2 đến Thứ 6).

Tại sao dùng / Ứng dụng: Khám phá các rủi ro cục bộ theo hành vi đám đông (ví dụ: Thứ 6 thường xuyên bị bán mạnh do tâm lý né rủi ro ngày nghỉ cuối tuần).