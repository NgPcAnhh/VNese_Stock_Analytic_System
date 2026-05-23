# Tài liệu prompt AI — Phân loại dashboard tài chính theo ngành từ bộ dashboard mẫu

## Mục tiêu tài liệu

Tài liệu này dùng để định hướng thiết kế dashboard tài chính theo ngành dựa trên bộ dashboard mẫu đã có. Bộ dashboard mẫu hiện tại có cấu trúc mạnh cho doanh nghiệp **phi tài chính**, gồm 3 tab lớn:

* **Bảng Cân Đối Kế Toán**
* **Kết Quả Kinh Doanh**
* **Lưu Chuyển Tiền Tệ**

Bộ mẫu đã thể hiện rõ các lớp phân tích như:

* KPI lớn ở đầu mỗi tab
* các biểu đồ cơ cấu tài sản, nguồn vốn, doanh thu, chi phí
* các chỉ số đòn bẩy, thanh khoản, khả năng sinh lời
* các chỉ số vận hành tài chính như CCC, FCF, earnings quality, DuPont

Tài liệu này sẽ trả lời 2 câu hỏi:

1. Những nhóm ngành nào trong dataset có thể **gộp dùng chung** bộ dashboard hiện tại hoặc biến thể rất gần của nó.
2. Những nhóm ngành nào cần **dashboard riêng**, vì logic tài chính, cấu trúc báo cáo và chỉ số phân tích khác biệt đáng kể.

---

# PHẦN 1 — NGUYÊN TẮC CHUNG KHI THIẾT KẾ DASHBOARD THEO BỘ MẪU

## 1. Triết lý thiết kế chung

Thiết kế dashboard phải bám theo tinh thần của bộ mẫu đã gửi:

* giao diện hiện đại, sáng, card-based, dễ đọc cho lãnh đạo
* mỗi dashboard có nhiều tab lớn theo logic tài chính
* KPI lớn luôn nằm ở đầu mỗi tab
* phía dưới là các chart giải thích nguyên nhân, chất lượng, xu hướng và rủi ro
* chart không chỉ để hiển thị số mà phải giúp trả lời các câu hỏi quản trị như:

  * doanh nghiệp đang tăng trưởng từ đâu
  * lợi nhuận đến từ hoạt động cốt lõi hay bất thường
  * bảng cân đối đang an toàn hay rủi ro
  * dòng tiền có hỗ trợ lợi nhuận hay không

## 2. Nguyên tắc phân loại ngành

Không cố dùng 1 dashboard cho mọi ngành. Phải chia theo logic tài chính vận hành:

* **Nhóm doanh nghiệp phi tài chính thông thường**: có thể dùng bộ mẫu hiện tại hoặc biến thể gần giống.
* **Nhóm tài chính đặc thù**: cần dashboard riêng, vì báo cáo tài chính và chỉ số phân tích khác hoàn toàn.
* **Nhóm phi tài chính nhưng có logic vận hành đặc biệt**: vẫn dùng khung chung, nhưng cần thêm module chuyên sâu theo ngành.

## 3. Quy tắc cấu trúc dashboard chuẩn

Mọi dashboard đều nên theo cấu trúc:

* **Hàng 1**: 4–6 KPI lớn
* **Hàng 2**: 2 chart chính để nhìn tổng quan
* **Hàng 3**: 2–4 chart giải thích nguyên nhân
* **Hàng 4**: 1 vùng insight, cảnh báo, benchmark hoặc scorecard

## 4. Nguyên tắc màu sắc

* **Cam**: hoạt động kinh doanh lõi, doanh thu, tăng trưởng, tài sản ngắn hạn
* **Xanh lá**: tích cực, an toàn, vốn chủ, dòng tiền tốt
* **Đỏ**: rủi ro, suy giảm, nợ xấu, áp lực thanh khoản
* **Xanh dương**: tài sản, thanh khoản, thông tin trung tính
* **Tím**: phân tích phụ, decomposition, chỉ số hỗ trợ

## 5. Nguyên tắc KPI đầu trang

Mỗi KPI card phải có:

* tên chỉ tiêu
* giá trị hiện tại
* thay đổi QoQ hoặc so với kỳ trước
* thay đổi YoY nếu có
* icon trực quan
* tooltip giải thích ý nghĩa chỉ tiêu

## 6. Nguyên tắc tooltip cho mọi chart

Tooltip của mọi chart phải có đủ:

1. Tên chỉ tiêu hoặc series
2. Giá trị hiện tại
3. Thay đổi so với kỳ trước
4. Thay đổi cùng kỳ năm trước
5. Tỷ trọng hoặc contribution nếu phù hợp
6. Ý nghĩa nghiệp vụ ngắn gọn, ví dụ:

   * “Biên gộp tăng cho thấy giá bán hoặc cơ cấu sản phẩm cải thiện.”
   * “Tỷ lệ nợ cao cho thấy doanh nghiệp đang dùng đòn bẩy mạnh.”
   * “Dòng tiền kinh doanh thấp hơn lợi nhuận ròng, cần theo dõi chất lượng lợi nhuận.”

## 7. Nguyên tắc tab chuẩn cho dashboard phi tài chính

Với nhóm phi tài chính, mặc định nên có 3 tab chính như bộ mẫu:

* **Bảng Cân Đối Kế Toán**
* **Kết Quả Kinh Doanh**
* **Lưu Chuyển Tiền Tệ**

Có thể thêm tab thứ 4 nếu cần:

* **Vận hành ngành / Operational Drivers**
* hoặc **Benchmark ngành**

## 8. Nguyên tắc chia nhóm ngành

Khi đọc dataset, không nên tách dashboard cho từng tên ngành nhỏ ngay. Nên gom về 4 cấp:

* **Nhóm A — Dùng gần như nguyên bản dashboard hiện tại**
* **Nhóm B — Dùng dashboard hiện tại nhưng thêm module riêng theo ngành**
* **Nhóm C — Cần dashboard riêng hoàn toàn vì là tài chính đặc thù**
* **Nhóm D — Chưa rõ hoặc nên tạm map vào nhóm gần nhất**

---

# PHẦN 2 — PHÂN NHÓM CÁC NGÀNH TRONG DATASET

## Danh sách ngành trong dataset đã được chuẩn hóa theo nhóm

Các ngành xuất hiện trong dataset:

* Viễn thông
* Truyền thông
* Bán lẻ
* Y tế
* Bảo hiểm
* Công nghệ Thông tin
* Hàng cá nhân & Gia dụng
* OTHER
* Hàng & Dịch vụ Công nghiệp
* Tài nguyên Cơ bản
* Du lịch và Giải trí
* Thực phẩm và đồ uống
* Bất động sản
* Ô tô và phụ tùng
* Điện, nước & xăng dầu khí đốt
* Dầu khí
* Xây dựng và Vật liệu
* Hóa chất
* Ngân hàng
* Dịch vụ tài chính

---

# PHẦN 3 — NHÓM A: CÁC NGÀNH CÓ THỂ DÙNG GẦN NHƯ NGUYÊN BẢN BỘ DASHBOARD HIỆN TẠI

## Kết luận nhóm A

Các ngành dưới đây có thể dùng **bộ dashboard hiện tại làm khung chuẩn**, chỉ cần tinh chỉnh nhẹ về nhãn, benchmark và một vài chart phụ:

* Bán lẻ
* Hàng cá nhân & Gia dụng
* Thực phẩm và đồ uống
* Ô tô và phụ tùng
* Hóa chất
* Tài nguyên Cơ bản
* Hàng & Dịch vụ Công nghiệp
* Xây dựng và Vật liệu
* Công nghệ Thông tin
* Truyền thông
* Viễn thông
* Du lịch và Giải trí
* Y tế
* Dầu khí
* Điện, nước & xăng dầu khí đốt

## Vì sao nhóm này dùng được dashboard hiện tại

Vì các ngành này nhìn chung vẫn đi theo logic doanh nghiệp phi tài chính:

* có doanh thu từ hoạt động kinh doanh
* có giá vốn / chi phí hoạt động
* có tài sản ngắn hạn, tài sản dài hạn, nợ, vốn chủ
* cần phân tích tăng trưởng doanh thu, biên lợi nhuận, cơ cấu tài sản, đòn bẩy, thanh khoản, dòng tiền

Dashboard hiện tại của bạn đang rất mạnh ở các lớp này:

* cơ cấu tài sản / nguồn vốn
* nợ và thanh khoản
* hiệu quả sinh lời
* DuPont
* FCF, CAPEX, earnings quality
* cơ cấu chi phí, profit funnel

Do đó, đây là nhóm có thể dùng khung cốt lõi chung.

## Cách áp dụng cho nhóm A

Dùng 3 tab chuẩn:

1. **Bảng Cân Đối Kế Toán**
2. **Kết Quả Kinh Doanh**
3. **Lưu Chuyển Tiền Tệ**

Giữ nguyên phần lớn chart hiện tại, chỉ cần điều chỉnh:

* ngưỡng cảnh báo theo ngành
* benchmark ngành
* tên các insight box
* thêm 1–2 chart vận hành đặc thù nếu cần

---

# PHẦN 4 — NHÓM B: CÁC NGÀNH DÙNG ĐƯỢC KHUNG CHUNG NHƯNG CẦN THÊM MODULE RIÊNG

## Kết luận nhóm B

Các ngành sau vẫn thuộc phi tài chính, nhưng nếu chỉ dùng nguyên bản dashboard hiện tại thì sẽ **thiếu chiều sâu nghiệp vụ**. Nên dùng dashboard hiện tại làm lõi, nhưng thêm module riêng:

* Bất động sản
* Bán lẻ
* Xây dựng và Vật liệu
* Dầu khí
* Điện, nước & xăng dầu khí đốt
* Viễn thông
* Công nghệ Thông tin
* Y tế
* Du lịch và Giải trí

Lưu ý: một số ngành vừa thuộc nhóm A vừa thuộc nhóm B theo nghĩa:

* có thể chạy bằng dashboard chung ở mức overview
* nhưng nếu muốn phân tích tốt thì nên có module riêng ngành

## 1. Bất động sản

### Có nên dùng nguyên dashboard hiện tại không?

Chỉ dùng một phần. Không nên dùng nguyên xi.

### Vì sao?

Bất động sản có nhiều đặc thù:

* tồn kho không giống hàng tồn kho thông thường mà có thể là quỹ đất, dự án dở dang, BĐS xây để bán
* doanh thu và lợi nhuận mang tính bàn giao theo dự án, không đều giữa các kỳ
* người mua trả tiền trước là chỉ tiêu rất quan trọng
* nợ vay, chi phí lãi vay, dòng tiền dự án, backlog bàn giao quan trọng hơn CCC thông thường

### Nên giữ gì từ dashboard hiện tại?

* cơ cấu tài sản / nguồn vốn
* nợ phải trả, vốn chủ, đòn bẩy
* doanh thu, lợi nhuận, ROS, ROA, ROE
* CFO/CFI/CFF tổng quan

### Nên bỏ hoặc giảm vai trò

* CCC truyền thống
* vòng quay hàng tồn kho kiểu bán lẻ / sản xuất
* phân tích tồn kho như hàng hóa đơn thuần

### Nên thêm module riêng

#### Tab Bảng Cân Đối

* Cơ cấu tài sản: tiền, hàng tồn kho dự án, phải thu, tài sản dở dang
* Cơ cấu nguồn vốn: người mua trả tiền trước, nợ vay ngắn/dài hạn, trái phiếu, vốn chủ
* Net debt / equity
* Hàng tồn kho dự án / tổng tài sản
* Người mua trả tiền trước / hàng tồn kho

#### Tab KQKD

* Doanh thu bàn giao theo kỳ
* Biên lợi nhuận gộp dự án
* Doanh thu tài chính, lợi nhuận khác
* Tỷ trọng lợi nhuận cốt lõi vs bất thường

#### Tab Dòng tiền

* CFO theo kỳ
* Dòng tiền đầu tư dự án
* Dòng tiền huy động nợ / trái phiếu
* FCF theo logic bất động sản

#### Tab bổ sung riêng

* Backlog / quỹ đất / số dự án / tiến độ bàn giao
* Tỷ lệ hấp thụ, presales nếu có

## 2. Bán lẻ

### Dùng dashboard hiện tại có ổn không?

Khá ổn, đây là một trong những ngành phù hợp nhất.

### Nhưng cần thêm gì?

* same-store sales growth nếu có
* số lượng cửa hàng / doanh thu mỗi cửa hàng
* vòng quay hàng tồn kho sâu hơn
* tỷ lệ markdown / shrinkage nếu có
* doanh thu online / offline

### Module riêng khuyên thêm

* Tab vận hành bán lẻ
* Cơ cấu doanh thu theo kênh
* Vòng quay tồn kho theo nhóm hàng
* Biên gộp theo nhóm sản phẩm

## 3. Xây dựng và Vật liệu

### Vì sao cần module riêng?

* doanh thu phụ thuộc tiến độ công trình
* backlog cực quan trọng
* phải thu, contract assets, dở dang lớn
* dòng tiền nhiều khi yếu hơn lợi nhuận kế toán

### Nên thêm

* Backlog và tốc độ thực hiện backlog
* Phải thu / doanh thu
* OCF / LNST
* Dở dang / tổng tài sản
* Nợ vay tài trợ dự án

## 4. Dầu khí

### Vì sao cần module riêng?

Dầu khí rất nhạy với:

* giá dầu
* sản lượng
* crack spread / margin ngành hạ nguồn
* CAPEX lớn
* chu kỳ đầu tư dài

### Nên thêm

* Sản lượng khai thác / bán hàng
* EBITDA
* CAPEX và tiến độ dự án
* OCF vs CAPEX
* Cost of production nếu có

## 5. Điện, nước & xăng dầu khí đốt

### Vì sao cần module riêng?

Đây là nhóm utility / hạ tầng dòng tiền ổn định hơn, nhưng:

* tài sản cố định lớn
* khấu hao lớn
* nợ vay dài hạn đáng kể
* CAPEX và DSCR quan trọng
* với điện: sản lượng, giá bán, công suất; với nước/gas: volume, tariff

### Nên thêm

* EBITDA / EBIT
* DSCR
* CAPEX duy trì và mở rộng
* Sản lượng tiêu thụ
* Công suất / asset utilization
* Giá bán bình quân

## 6. Viễn thông

### Vì sao cần module riêng?

* CAPEX lớn
* tài sản vô hình / hạ tầng mạng quan trọng
* ARPU, thuê bao, churn là chỉ số vận hành chính
* EBITDA margin thường quan trọng hơn biên gộp đơn thuần

### Nên thêm

* ARPU
* Số thuê bao
* Churn rate
* CAPEX / Revenue
* EBITDA margin
* Data revenue ratio nếu có

## 7. Công nghệ Thông tin

### Vì sao cần module riêng?

* nhiều doanh nghiệp IT không cần CCC như doanh nghiệp thương mại
* gross margin / recurring revenue / headcount productivity quan trọng hơn
* tài sản vô hình, R&D, backlog hợp đồng có thể quan trọng

### Nên thêm

* Doanh thu dịch vụ / license / recurring
* Gross margin theo mảng
* Revenue per employee
* R&D / revenue
* Backlog hợp đồng / ARR nếu có

## 8. Y tế

### Vì sao cần module riêng?

Y tế có thể gồm bệnh viện, dược, thiết bị y tế. Logic tài chính khác nhau.

### Nên thêm tùy nhánh

* với bệnh viện: số lượt khám, công suất giường, doanh thu theo dịch vụ
* với dược: tồn kho, vòng quay, biên gộp theo nhóm thuốc, kênh ETC/OTC
* với thiết bị y tế: công nợ, backlog, biên sản phẩm

## 9. Du lịch và Giải trí

### Vì sao cần module riêng?

* phụ thuộc mùa vụ mạnh
* công suất sử dụng, occupancy, RevPAR, số khách, chi tiêu mỗi khách quan trọng
* dòng tiền và khả năng chống chu kỳ cũng quan trọng

### Nên thêm

* doanh thu theo phân khúc khách
* occupancy / load factor
* giá bán bình quân
* EBITDA margin
* cash burn trong mùa thấp điểm

---

# PHẦN 5 — NHÓM C: CÁC NGÀNH CẦN DASHBOARD RIÊNG HOÀN TOÀN

## Kết luận nhóm C

Các ngành sau **không nên dùng bộ dashboard hiện tại làm dashboard chính**, vì bản chất tài chính khác biệt rõ ràng:

* Ngân hàng
* Bảo hiểm
* Dịch vụ tài chính

## 1. Ngân hàng

### Vì sao phải tách riêng?

Ngân hàng không phân tích theo logic:

* tồn kho
* CCC
* doanh thu thuần / giá vốn kiểu phi tài chính
* FCF / CAPEX làm trung tâm

Ngân hàng phải phân tích theo:

* tăng trưởng tín dụng
* huy động
* NIM
* CASA
* NPL
* Coverage
* CAR
* LDR
* CIR
* ROA, ROE theo logic ngân hàng

### Dashboard riêng cho ngân hàng nên có tab

1. **Tổng Quan Ngân Hàng**

   * Tổng tài sản
   * Dư nợ cho vay
   * Tiền gửi khách hàng
   * NIM
   * ROA
   * ROE
   * Cơ cấu tài sản sinh lãi
   * Cơ cấu nguồn vốn huy động

2. **Chất Lượng Tài Sản & Rủi Ro Tín Dụng**

   * NPL
   * Group 2
   * Coverage ratio
   * Credit cost
   * Write-off
   * Cơ cấu nợ theo nhóm
   * Phân khúc tín dụng

3. **Khả Năng Sinh Lời**

   * NII
   * Fee income
   * PPOP
   * LNTT
   * NIM trend
   * CIR
   * Profit bridge

4. **Thanh Khoản & Nguồn Vốn**

   * CASA
   * LDR
   * Cost of funds
   * Maturity mismatch
   * Tăng trưởng tín dụng vs huy động

5. **Vốn & An Toàn Hoạt Động**

   * CAR
   * Tier 1
   * RWA
   * Leverage ratio
   * Capital buffer

## 2. Bảo hiểm

### Vì sao phải tách riêng?

Bảo hiểm không đọc theo logic hàng tồn kho, CCC, biên gộp thông thường. Chỉ số trọng tâm là:

* doanh thu phí bảo hiểm
* phí giữ lại
* bồi thường
* loss ratio
* expense ratio
* combined ratio
* dự phòng nghiệp vụ
* khả năng thanh toán
* thu nhập đầu tư

### Dashboard riêng cho bảo hiểm nên có tab

1. **Tổng Quan Kinh Doanh Bảo Hiểm**

   * Tổng tài sản
   * Phí bảo hiểm gốc
   * Phí giữ lại
   * PBT
   * ROE
   * Solvency

2. **Hiệu Quả Nghiệp Vụ Bảo Hiểm**

   * Loss ratio
   * Expense ratio
   * Combined ratio
   * Retention ratio
   * Cơ cấu bồi thường theo line of business

3. **Dự Phòng & Khả Năng Thanh Toán**

   * Dự phòng nghiệp vụ
   * Reserve adequacy
   * Solvency ratio
   * Asset-liability coverage

4. **Danh Mục Đầu Tư & Lợi Nhuận**

   * Investment income
   * Investment yield
   * Underwriting vs investment profit
   * Profit bridge

5. **Tăng Trưởng, Hiệu Quả & Rủi Ro**

   * tăng trưởng premium
   * combined ratio trend
   * risk heatmap
   * KPI scorecard

## 3. Dịch vụ tài chính

### Vì sao phải tách riêng?

Trong dataset, “Dịch vụ tài chính” thường là nhóm rất rộng, có thể gồm:

* công ty tài chính tiêu dùng
* cho thuê tài chính
* chứng khoán
* quản lý quỹ
* holding đầu tư tài chính

Nhóm này không nên dùng chung dashboard phi tài chính. Nên tách ít nhất thành 2 nhánh chính nếu dữ liệu cho phép:

* **Công ty tài chính / consumer finance / leasing**
* **Chứng khoán / investment services**

### Nếu chưa đủ dữ liệu để tách sâu

Thì vẫn phải có dashboard riêng cấp “Dịch vụ tài chính”, với trọng tâm:

* loan book hoặc tài sản tài chính
* margin / receivables / AUM tùy mô hình
* funding cost
* cost of risk
* fee income
* capital adequacy
* leverage
* collection / PAR nếu là consumer finance

### Dashboard riêng cho dịch vụ tài chính nên có tab

1. **Tổng Quan Hoạt Động**

   * Gross loan book hoặc tài sản tài chính
   * Net receivables / AUM / margin book
   * Active customers / client accounts
   * NIM hoặc fee yield
   * PBT
   * ROE

2. **Chất Lượng Danh Mục & Rủi Ro**

   * PAR30 / PAR90 nếu là consumer finance
   * Coverage
   * Write-off
   * Cost of risk
   * Collection rate

3. **Doanh Thu, Biên Lãi & Chi Phí**

   * Interest income
   * Funding cost
   * Fee income
   * Opex
   * Cost-to-income
   * Profit bridge

4. **Nguồn Vốn, Thanh Khoản & Vốn**

   * Debt/equity
   * Cost of funds
   * Funding maturity
   * Capital buffer

5. **Tăng Trưởng & Hiệu Suất Kinh Doanh**

   * disbursement
   * approval rate
   * segment profitability
   * vintage performance

---

# PHẦN 6 — NHÓM D: OTHER

## OTHER nên xử lý thế nào?

Không nên thiết kế dashboard riêng cho “OTHER”.

### Nguyên tắc xử lý

* Nếu chưa phân loại được, tạm map vào **dashboard phi tài chính chung**.
* Sau đó dùng rule-based mapping theo đặc điểm dữ liệu để đẩy về nhóm gần nhất.

### Rule gợi ý

* Nếu có chỉ tiêu đặc trưng ngân hàng như NIM, NPL, CASA → map ngân hàng
* Nếu có premium, combined ratio, reserve → map bảo hiểm
* Nếu có PAR, write-off, collection → map dịch vụ tài chính
* Nếu có hàng tồn kho, doanh thu thuần, giá vốn, CAPEX → map phi tài chính

---

# PHẦN 7 — KIẾN TRÚC DASHBOARD ĐỀ XUẤT TỐI ƯU CHO DATASET NÀY

## Phương án tối ưu nhất

Thay vì xây dashboard cho từng ngành nhỏ, hãy xây **5 bộ dashboard cấp nền tảng**:

### Bộ 1 — Dashboard Phi tài chính chuẩn

Áp dụng cho:

* Bán lẻ
* Hàng cá nhân & Gia dụng
* Thực phẩm và đồ uống
* Ô tô và phụ tùng
* Hóa chất
* Tài nguyên Cơ bản
* Hàng & Dịch vụ Công nghiệp
* Truyền thông
* Công nghệ Thông tin
* Viễn thông
* Y tế
* Du lịch và Giải trí
* Dầu khí
* Điện, nước & xăng dầu khí đốt
* Xây dựng và Vật liệu
* OTHER tạm thời

### Bộ 2 — Dashboard Phi tài chính mở rộng cho ngành tài sản lớn / dự án lớn

Áp dụng cho:

* Bất động sản
* Xây dựng và Vật liệu
* Dầu khí
* Điện, nước & xăng dầu khí đốt

Đây vẫn là phi tài chính nhưng thêm module sâu về:

* CAPEX
* backlog / dự án / công suất / sản lượng
* nợ vay dự án
* OCF vs lợi nhuận

### Bộ 3 — Dashboard Ngân hàng

Áp dụng cho:

* Ngân hàng

### Bộ 4 — Dashboard Bảo hiểm

Áp dụng cho:

* Bảo hiểm

### Bộ 5 — Dashboard Dịch vụ tài chính

Áp dụng cho:

* Dịch vụ tài chính

---

# PHẦN 8 — PROMPT AI TỔNG HỢP ĐỂ COPY VIBE CODING

## Prompt tổng quát

Hãy thiết kế hệ thống dashboard tài chính theo ngành dựa trên một bộ dashboard mẫu có phong cách hiện đại, sáng, card-based, executive-friendly, gồm nhiều tab, KPI lớn ở đầu tab và các biểu đồ phân tích chuyên sâu phía dưới.

Mục tiêu là không dùng một dashboard cho mọi ngành, mà phân nhóm ngành theo logic tài chính để tối ưu độ đúng nghiệp vụ.

### Yêu cầu chung

1. Mọi dashboard phải bám phong cách UI/UX của dashboard mẫu:

* nền sáng
* card bo góc lớn
* shadow nhẹ
* header có tên dashboard, kỳ báo cáo, doanh nghiệp, đơn vị
* tab ngang rõ ràng
* KPI card lớn ở đầu mỗi tab
* chart sắp xếp theo cấp độ ưu tiên

2. Mọi dashboard phải có tooltip chuẩn:

* tên chỉ tiêu
* giá trị hiện tại
* QoQ
* YoY
* tỷ trọng nếu có
* ý nghĩa nghiệp vụ

3. Phải phân nhóm ngành theo 4 lớp:

* lớp 1: dùng nguyên dashboard phi tài chính chung
* lớp 2: dùng dashboard phi tài chính chung nhưng thêm module riêng
* lớp 3: cần dashboard riêng hoàn toàn
* lớp 4: ngành chưa rõ map tạm vào nhóm gần nhất

### Phân nhóm cụ thể

#### Nhóm dùng dashboard phi tài chính chung

* Bán lẻ
* Hàng cá nhân & Gia dụng
* Thực phẩm và đồ uống
* Ô tô và phụ tùng
* Hóa chất
* Tài nguyên Cơ bản
* Hàng & Dịch vụ Công nghiệp
* Truyền thông
* Công nghệ Thông tin
* Viễn thông
* Y tế
* Du lịch và Giải trí
* Dầu khí
* Điện, nước & xăng dầu khí đốt
* Xây dựng và Vật liệu
* OTHER tạm thời

Dashboard phi tài chính chung phải có 3 tab:

1. Bảng Cân Đối Kế Toán
2. Kết Quả Kinh Doanh
3. Lưu Chuyển Tiền Tệ

Trong đó:

* Tab Bảng Cân Đối gồm KPI lớn: Tổng tài sản, Vốn chủ sở hữu, Nợ phải trả, Tài sản ngắn hạn
* Có chart: cơ cấu tài sản, cấu trúc nguồn vốn, cơ cấu tài sản & nguồn vốn nhiều kỳ, nợ và khả năng thanh toán, cấu trúc hàng tồn kho, đòn bẩy tài chính, CCC, thanh khoản, sức khỏe tài chính và rủi ro
* Tab KQKD gồm KPI lớn: Doanh thu thuần, Lợi nhuận gộp, Lợi nhuận ròng, hiệu quả sinh lời
* Có chart: DuPont, diễn biến doanh thu & chi phí, cơ cấu chi phí, tăng trưởng YoY, hiệu quả quản lý chi phí, cơ cấu nguồn thu, động lực lợi nhuận trước thuế, profit funnel
* Tab Dòng tiền gồm KPI và chart: tỷ lệ tái đầu tư, FCF margin, khả năng tự tài trợ & FCF, earnings quality, diễn biến 3 dòng tiền chính, phân bổ dòng tiền đầu tư & cổ tức, tổng quan dòng chảy tiền tệ

#### Nhóm dùng dashboard phi tài chính chung nhưng cần module riêng

* Bất động sản
* Bán lẻ
* Xây dựng và Vật liệu
* Dầu khí
* Điện, nước & xăng dầu khí đốt
* Viễn thông
* Công nghệ Thông tin
* Y tế
* Du lịch và Giải trí

Với từng ngành này, ngoài bộ khung 3 tab chuẩn, cần thêm module riêng:

* Bất động sản: backlog, quỹ đất, người mua trả tiền trước, hàng tồn kho dự án, nợ vay dự án
* Bán lẻ: same-store sales, doanh thu theo kênh, vòng quay tồn kho, doanh thu/cửa hàng
* Xây dựng và Vật liệu: backlog, contract assets, phải thu, dở dang, OCF vs LNST
* Dầu khí: giá dầu, sản lượng, EBITDA, CAPEX, OCF vs CAPEX
* Điện/nước/gas: sản lượng, công suất, tariff, DSCR, CAPEX
* Viễn thông: ARPU, thuê bao, churn, CAPEX/revenue, EBITDA margin
* Công nghệ thông tin: recurring revenue, gross margin theo mảng, revenue per employee, R&D/revenue, backlog hợp đồng
* Y tế: tùy nhánh bệnh viện/dược/thiết bị mà thêm chỉ số vận hành riêng
* Du lịch và giải trí: occupancy, load factor, RevPAR, số khách, EBITDA margin

#### Nhóm cần dashboard riêng hoàn toàn

* Ngân hàng
* Bảo hiểm
* Dịch vụ tài chính

### Dashboard riêng cho ngân hàng

Phải có 5 tab:

1. Tổng Quan Ngân Hàng
2. Chất Lượng Tài Sản & Rủi Ro Tín Dụng
3. Khả Năng Sinh Lời
4. Thanh Khoản & Nguồn Vốn
5. Vốn & An Toàn Hoạt Động

Các KPI và chart phải xoay quanh:

* tổng tài sản
* dư nợ
* tiền gửi
* NIM
* CASA
* NPL
* coverage
* CAR
* LDR
* CIR
* ROA
* ROE

### Dashboard riêng cho bảo hiểm

Phải có 5 tab:

1. Tổng Quan Kinh Doanh Bảo Hiểm
2. Hiệu Quả Nghiệp Vụ Bảo Hiểm
3. Dự Phòng & Khả Năng Thanh Toán
4. Danh Mục Đầu Tư & Lợi Nhuận
5. Tăng Trưởng, Hiệu Quả & Rủi Ro

Các KPI và chart phải xoay quanh:

* premium
* net premium
* loss ratio
* expense ratio
* combined ratio
* reserve
* solvency
* investment income
* ROE

### Dashboard riêng cho dịch vụ tài chính

Phải có 5 tab:

1. Tổng Quan Hoạt Động
2. Chất Lượng Danh Mục & Rủi Ro
3. Doanh Thu, Biên Lãi & Chi Phí
4. Nguồn Vốn, Thanh Khoản & Vốn
5. Tăng Trưởng & Hiệu Suất Kinh Doanh

Các KPI và chart phải xoay quanh:

* loan book
* net receivables
* active customers
* NIM hoặc fee yield
* PAR30 / PAR90
* coverage
* write-off
* collection
* funding cost
* debt/equity
* cost-to-income
* segment profitability

### Yêu cầu đầu ra cuối cùng

Hãy thiết kế một hệ sinh thái dashboard gồm:

* 1 dashboard phi tài chính chuẩn
* 1 dashboard phi tài chính mở rộng cho ngành dự án/tài sản lớn
* 1 dashboard ngân hàng
* 1 dashboard bảo hiểm
* 1 dashboard dịch vụ tài chính

Mỗi dashboard phải mô tả rõ:

* tab nào có trong dashboard
* KPI lớn đầu trang là gì
* từng chart dùng loại biểu đồ nào
* dữ liệu đầu vào là gì
* tooltip hiển thị những gì
* màu sắc nào đại diện cho ý nghĩa nào
* chart nào là chart chính, chart nào là chart phụ
* insight box nên viết theo logic nào

---

# PHẦN 9 — KẾT LUẬN RA QUYẾT ĐỊNH

## Kết luận vận hành

Với dataset hiện tại, phương án tối ưu không phải là xây 20 dashboard khác nhau, mà là:

* xây **1 dashboard chuẩn cho phi tài chính**
* xây **1 dashboard phi tài chính mở rộng cho nhóm ngành có logic tài sản/dự án lớn**
* xây **3 dashboard riêng cho tài chính đặc thù** gồm ngân hàng, bảo hiểm, dịch vụ tài chính

## Kết luận áp dụng thực tế

Nếu triển khai thật, nên đi theo thứ tự:

1. Chuẩn hóa dashboard hiện tại thành bộ **phi tài chính chuẩn**
2. Tạo module riêng cho bất động sản, utility, dầu khí, bán lẻ, viễn thông, IT
3. Xây dashboard riêng cho ngân hàng
4. Xây dashboard riêng cho bảo hiểm
5. Xây dashboard riêng cho dịch vụ tài chính

Như vậy sẽ tối ưu giữa:

* độ đúng nghiệp vụ
* chi phí phát triển
* khả năng mở rộng
* trải nghiệm người dùng
