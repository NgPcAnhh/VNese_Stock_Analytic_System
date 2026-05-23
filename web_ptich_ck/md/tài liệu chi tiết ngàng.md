TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ VÀ CÔNG THỨC TÍNH TOÁN

Dự án: Dashboard Phân tích Chi tiết Ngành (Sector Dashboard)
Nền tảng: HTML/JS (ECharts, Tailwind CSS)

Tài liệu này mô tả chi tiết ý nghĩa và công thức/thuật toán để tính toán các số liệu được hiển thị trên từng vùng của Dashboard.

1. VÙNG ĐIỂM NHẤN NGÀNH (TOP KPIs)

Vùng này cung cấp bức tranh toàn cảnh về sức mạnh, dòng tiền và định giá của toàn bộ nhóm ngành tại thời điểm hiện tại.

1.1. Sức mạnh RS (Relative Strength)

Ý nghĩa: Đo lường sức mạnh giá của ngành so với thị trường chung (VN-Index). Điểm > 50 là mạnh hơn trung bình, > 80 là nhóm dẫn dắt.

Công thức (Tham khảo chuẩn O'Neil): Tính tỷ số $RS\_Ratio = \frac{\text{Chỉ số Ngành}}{\text{VN-Index}}$.
Sau đó, xếp hạng tỷ số này của ngành hiện tại so với tất cả các ngành khác trên thị trường trong $N$ phiên (thường là 6 tháng - 1 năm) và chuẩn hóa về thang điểm từ 1 đến 99.

1.2. Thanh khoản 24H (Total Trading Value)

Ý nghĩa: Tổng giá trị giao dịch của toàn bộ các cổ phiếu trong ngành trong ngày hiện tại. Đo lường mức độ sôi động.

Công thức: $Thanh\_Khoản = \sum (\text{Giá khớp lệnh}_i \times \text{Khối lượng khớp lệnh}_i)$ với $i$ là từng cổ phiếu trong ngành.

So sánh trung bình 20 phiên: $\frac{\text{Thanh khoản hôm nay} - \text{SMA20(Thanh khoản)}}{\text{SMA20(Thanh khoản)}} \times 100\%$

1.3. Dòng tiền MFI (Money Flow Index)

Ý nghĩa: Chỉ báo động lượng kết hợp cả Giá và Khối lượng để đo lường áp lực mua/bán. Thang đo từ 0 - 100.

Công thức (chu kỳ 14 phiên):

Typical Price (TP) = $\frac{\text{High} + \text{Low} + \text{Close}}{3}$

Raw Money Flow (RMF) = $TP \times \text{Volume}$

Money Ratio (MR) = $\frac{\text{Tổng RMF dương (những ngày TP tăng)}}{\text{Tổng RMF âm (những ngày TP giảm)}}$

MFI = $100 - \frac{100}{1 + MR}$

1.4. Vốn hóa Ngành (Market Capitalization)

Ý nghĩa: Tổng quy mô của ngành.

Công thức: $Vốn\_Hóa\_Ngành = \sum (\text{Giá hiện tại}_i \times \text{Số lượng cổ phiếu lưu hành}_i)$

1.5. Khối ngoại Net (Net Foreign Flow)

Ý nghĩa: Chênh lệch giữa giá trị mua và giá trị bán của nhà đầu tư nước ngoài đối với toàn ngành.

Công thức: $Net\_Foreign = \sum \text{Giá trị NĐTNN Mua}_i - \sum \text{Giá trị NĐTNN Bán}_i$

1.6. Định giá P/B (Price-to-Book Ratio)

Ý nghĩa: Mức định giá của ngành dựa trên giá trị sổ sách.

Công thức (P/B Tổng hợp ngành): $P/B\_Ngành = \frac{\text{Tổng Vốn hóa của toàn ngành}}{\text{Tổng Vốn chủ sở hữu của toàn ngành}}$

2. VÙNG BIỂU ĐỒ DIỄN BIẾN & ĐỘ RỘNG

2.1. Hiệu suất Ngành vs VN-Index (Line Chart)

Ý nghĩa: So sánh trực quan tốc độ tăng trưởng của Chỉ số Ngành và VN-Index quy về cùng một mốc xuất phát.

Công thức vẽ biểu đồ: Lấy ngày đầu tiên của chu kỳ (VD: 6 tháng trước) làm mốc Base = 100 (hoặc 0%).
$Giá\_trị\_hiển\_thị\_ngày\_T = \frac{\text{Chỉ số ngày T} - \text{Chỉ số ngày 0}}{\text{Chỉ số ngày 0}} \times 100\%$

2.2. Độ rộng Ngành - Market Breadth (Pie Chart)

Ý nghĩa: Cho biết mức độ lan tỏa của dòng tiền. Một ngành tăng điểm bền vững khi số mã Tăng áp đảo số mã Giảm.

Công thức phân loại (Dựa trên % thay đổi giá so với Giá tham chiếu):

Trần: $\text{Giá hiện tại} = \text{Giá Trần}$ (Ceiling)

Tăng: $0 < \% \text{Thay đổi} < \text{Biên độ Trần}$

Tham chiếu: $\% \text{Thay đổi} = 0$

Giảm: $\text{Biên độ Sàn} < \% \text{Thay đổi} < 0$

Sàn: $\text{Giá hiện tại} = \text{Giá Sàn}$ (Floor)

Logic vẽ: Đếm tổng số lượng cổ phiếu rơi vào từng nhóm và chuyển thành tỷ trọng % trên hình tròn.

3. VÙNG BẢN ĐỒ VỐN HÓA & DIỄN BIẾN DÒNG TIỀN

3.1. Bản đồ Vốn hóa Ngành (Treemap)

Ý nghĩa: Cung cấp góc nhìn "Chim bay" xem mã nào đang chi phối ngành (trọng số lớn) và trạng thái hiện tại của nó.

Công thức cấu hình:

Kích thước (Diện tích ô): Trực tiếp sử dụng giá trị $Vốn\_Hóa\_Thị\_Trường$ của từng mã.

Màu sắc: Phụ thuộc vào biến số $\% \text{Thay đổi giá 1D}$ (Tím = Trần, Xanh lá = Tăng, Vàng = Tham chiếu, Đỏ = Giảm, Xanh lơ = Sàn).

3.2. Diễn biến Thanh khoản & Khối ngoại (Bar + Line Chart)

Ý nghĩa: Quan sát thanh khoản chung kết hợp với động thái của dòng tiền thông minh (Ngoại).

Công thức vẽ:

Trục Y1 (Bar): Tổng giá trị giao dịch của ngành theo từng ngày (Tỷ VNĐ).

Trục Y2 (Line): Tổng Giá trị NĐTNN Mua ròng - Bán ròng theo từng ngày (Tỷ VNĐ). Nếu < 0 là Bán ròng (điểm màu đỏ), > 0 là Mua ròng (điểm màu xanh).

4. VÙNG PHÂN TÍCH ĐỊNH GIÁ & HIỆU QUẢ

4.1. Ma trận Định giá & Hiệu quả - P/B vs ROE (Scatter Plot)

Ý nghĩa: Tìm kiếm các cổ phiếu bị định giá thấp nhưng có khả năng sinh lời tốt.

Công thức thiết lập tọa độ:

Trục X (Hoành): Chỉ số $P/B$ (Định giá).

Trục Y (Tung): Chỉ số $ROE$ (Tỷ suất lợi nhuận trên vốn chủ sở hữu, tính bằng $\% = \frac{\text{LNST 4 quý gần nhất}}{\text{Vốn chủ sở hữu BQ}} \times 100$).

Kích thước bóng (Bubble Size): Tỷ lệ thuận với $\sqrt{\text{Vốn hóa}}$, giúp các mã lớn nổi bật hơn mà không che lấp các mã nhỏ.

Logic Phân loại (Tô màu tự động):

Vùng Hấp dẫn (Xanh lá): $P/B < 1.5$ VÀ $ROE > 15\%$ (Định giá rẻ, sinh lời cao).

Vùng Rủi ro (Đỏ): $P/B > 2.0$ VÀ $ROE < 12\%$ (Định giá đắt, sinh lời thấp).

Vùng Cân bằng (Xanh dương): Các trường hợp còn lại.

4.2. Phân bổ Thanh khoản (Donut Chart)

Ý nghĩa: Xác định dòng tiền trong phiên đang chảy vào rổ cổ phiếu nào (đầu cơ hay cơ bản).

Công thức phân nhóm (Tham khảo chuẩn HOSE/HNX):

Large Cap (Vốn hóa lớn): Thường lấy Top 30 mã vốn hóa lớn nhất thị trường, hoặc các mã có vốn hóa > 10,000 tỷ VNĐ.

Mid Cap (Vốn hóa vừa): Vốn hóa từ 1,000 tỷ đến 10,000 tỷ VNĐ.

Small Cap (Vốn hóa nhỏ/Penny): Vốn hóa < 1,000 tỷ VNĐ.

Tính toán: Tổng hợp (Sum) Giá trị giao dịch trong ngày của tất cả cổ phiếu thuộc từng nhóm trên và vẽ tỷ trọng (%).

5. BẢNG THỐNG KÊ CỔ PHIẾU TRONG NGÀNH (STOCK TABLE)

Mục đích: Bảng điện chi tiết sắp xếp từ trên xuống dưới dựa trên mức độ quan tâm của dòng tiền (Tổng GTGD).

Các trường dữ liệu & Cách tính:

Thị giá: Giá khớp lệnh gần nhất.

% 1D: $\frac{\text{Thị giá} - \text{Giá Tham chiếu}}{\text{Giá Tham chiếu}} \times 100\%$

KL Khớp: Tổng số lượng cổ phiếu đã được khớp lệnh thành công trong phiên.

Tổng GTGD: Bằng tích phân của Từng lô khối lượng khớp $\times$ Giá khớp tương ứng (Hoặc tính tương đối $\approx \text{Tổng KL} \times \text{Giá trung bình}$).

NN Mua/NN Bán: Giá trị NĐTNN mua/bán tính theo Tỷ VNĐ.