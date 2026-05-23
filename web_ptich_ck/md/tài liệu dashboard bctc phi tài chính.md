# Tài liệu mô tả chi tiết bộ dashboard phân tích công ty phi tài chính

## 1. Mục tiêu tài liệu

Tài liệu này mô tả chi tiết bộ dashboard phân tích doanh nghiệp **phi tài chính** được xây dựng từ các nguồn dữ liệu chính sau:

- **Báo cáo tài chính theo quý**
  - Bảng cân đối kế toán
  - Báo cáo kết quả kinh doanh
  - Báo cáo lưu chuyển tiền tệ
- **Dữ liệu chỉ số tài chính**
  - Chỉ số thanh khoản
  - Chỉ số đòn bẩy
  - Chỉ số hiệu quả hoạt động
  - Chỉ số sinh lời
  - Chỉ số chất lượng lợi nhuận và dòng tiền
- **Dữ liệu giá hiện hành**
  - Giá thị trường hiện tại
  - Vốn hóa, định giá hoặc các hệ số liên quan nếu có tích hợp thêm

Mục tiêu của dashboard là giúp người dùng:

1. Nắm nhanh bức tranh tài chính tổng thể của doanh nghiệp.
2. Đi sâu vào cấu trúc tài sản, nguồn vốn, hiệu quả hoạt động, khả năng sinh lời và dòng tiền.
3. Phục vụ nghiệp vụ phân tích cơ bản, phân tích xu hướng, phân tích rủi ro và hỗ trợ định giá.
4. Chuẩn hóa cách đọc hiểu các chỉ tiêu tài chính theo logic: **Tổng quan → Chi tiết → Nghiệp vụ phân tích → Ý nghĩa**.

---

## 2. Phạm vi dashboard

Bộ dashboard gồm 3 nhóm phân tích chính:

1. **Phân tích báo cáo tài chính**
   - Tập trung vào tài sản, nguồn vốn, khả năng thanh toán, cấu trúc vốn, hàng tồn kho, công nợ, sức khỏe tài chính.
   - Tương ứng với **ảnh 2 + ảnh 3**.

2. **Phân tích hoạt động và tình hình kinh doanh**
   - Tập trung vào doanh thu, lợi nhuận, biên lợi nhuận, ROS/ROA/ROE, Dupont, cơ cấu chi phí, động lực tăng trưởng.
   - Tương ứng với **ảnh 4 + ảnh 5**.

3. **Phân tích lưu chuyển tiền tệ**
   - Tập trung vào CFO, CFI, CFF, FCF, chất lượng lợi nhuận, quan hệ giữa lợi nhuận và dòng tiền.
   - Tương ứng với **ảnh 6**.

Ngoài ra có một lớp dùng chung gồm:

4. **Bộ lọc và thanh điều hướng**
   - Tương ứng với **ảnh 1**.

---

## 3. Đối tượng sử dụng

Dashboard phù hợp với các nhóm người dùng sau:

- Chuyên viên phân tích đầu tư
- Chuyên viên phân tích tín dụng
- Bộ phận quản trị tài chính doanh nghiệp
- Nhà đầu tư cá nhân chuyên phân tích cơ bản
- Ban lãnh đạo cần theo dõi sức khỏe tài chính doanh nghiệp
- Bộ phận quan hệ nhà đầu tư hoặc nghiên cứu thị trường

---

## 4. Cấu trúc logic đọc dashboard

Để sử dụng dashboard hiệu quả, nên đọc theo thứ tự sau:

### 4.1. Bước 1: Đọc tổng quan
Xem các KPI headline để trả lời nhanh:

- Quy mô doanh nghiệp hiện tại ra sao?
- Tài sản tăng hay giảm?
- Nợ đang chiếm tỷ trọng lớn hay nhỏ?
- Doanh thu, EBIT, EBITDA, lợi nhuận ròng tăng hay giảm?
- Tiền đang tạo ra hay bị tiêu hao?

### 4.2. Bước 2: Đọc cấu trúc
Xem các biểu đồ cơ cấu để hiểu:

- Tài sản đang nằm ở đâu?
- Nguồn vốn đến từ nợ hay vốn chủ?
- Chi phí nào đang chi phối lợi nhuận?
- Dòng tiền đến từ hoạt động nào?

### 4.3. Bước 3: Đọc xu hướng
Xem biểu đồ chuỗi thời gian để xác định:

- Doanh nghiệp đang tốt lên hay xấu đi?
- Sự thay đổi là ngắn hạn hay bền vững?
- Tăng trưởng doanh thu có đi kèm tăng trưởng lợi nhuận không?

### 4.4. Bước 4: Đọc nghiệp vụ phân tích
Kết hợp chỉ tiêu để kết luận:

- Tăng trưởng có chất lượng không?
- Lợi nhuận đến từ hoạt động cốt lõi hay yếu tố bất thường?
- Dòng tiền có xác nhận lợi nhuận không?
- Mức đòn bẩy hiện tại có rủi ro không?
- Doanh nghiệp có đang vận hành hiệu quả hơn không?

---

# PHẦN A. FILTER VÀ THANH ĐIỀU HƯỚNG DÙNG CHUNG

## 5. Ảnh 1 – Bộ lọc và thanh điều hướng dùng chung

### 5.1. Mục đích
Đây là lớp điều hướng chung cho toàn bộ dashboard, cho phép người dùng chọn đúng **doanh nghiệp**, **kỳ báo cáo** và **đơn vị hiển thị**, đồng thời chuyển nhanh giữa các nhóm phân tích.

### 5.2. Thành phần chính

#### a. Tên dashboard
- **Financial Analysis DeepDive**
- Thể hiện đây là dashboard chuyên sâu, không chỉ dừng ở hiển thị số liệu mà còn hướng tới phân tích.

#### b. Thanh tab điều hướng
Gồm 3 tab chính:
- **Bảng cân đối kế toán**
- **Kết quả kinh doanh**
- **Lưu chuyển tiền tệ**

**Ý nghĩa nghiệp vụ**:
- Giúp người dùng tiếp cận theo từng khối báo cáo tài chính chuẩn.
- Phù hợp quy trình phân tích thông thường: cân đối tài sản – nguồn vốn → hiệu quả kinh doanh → chất lượng dòng tiền.

#### c. Bộ lọc doanh nghiệp
- Ví dụ: **VIC**

**Ý nghĩa**:
- Cho phép dashboard tái sử dụng cho nhiều doanh nghiệp phi tài chính.
- Mọi chart và KPI đều cập nhật theo mã doanh nghiệp được chọn.

#### d. Bộ lọc kỳ báo cáo
- Ví dụ: **Q4/2025**

**Ý nghĩa**:
- Xác định kỳ hiện hành dùng làm mốc đọc chính.
- Đồng thời làm cơ sở so sánh với kỳ trước, cùng kỳ, hoặc chuỗi nhiều quý.

#### e. Bộ chọn đơn vị hiển thị
- Ví dụ: **Tỷ VND**

**Ý nghĩa**:
- Chuẩn hóa cách đọc số liệu.
- Tránh hiểu sai khi quy mô doanh nghiệp lớn.

### 5.3. Tại sao cần lớp dùng chung này
- Giảm thao tác lặp lại khi người dùng phân tích nhiều tab.
- Bảo đảm mọi thành phần trong dashboard cùng dùng một ngữ cảnh dữ liệu.
- Tăng tính nhất quán và khả năng tái sử dụng của sản phẩm phân tích.

---

# PHẦN B. PHÂN TÍCH BÁO CÁO TÀI CHÍNH

> Tương ứng ảnh 2 và ảnh 3.

## 6. Mục tiêu nghiệp vụ của phân tích báo cáo tài chính

Khối này trả lời các câu hỏi cốt lõi:

- Doanh nghiệp đang có quy mô tài sản như thế nào?
- Tài sản được phân bổ vào ngắn hạn hay dài hạn?
- Nguồn tài trợ đến từ nợ hay vốn chủ?
- Khả năng thanh toán có an toàn không?
- Hàng tồn kho, công nợ, vốn lưu động có đang bị giam giữ?
- Sức khỏe tài chính hiện tại ở mức nào?

---

## 7. Hàng KPI tổng quan đầu trang

### 7.1. Các KPI hiển thị
- **Tổng tài sản**
- **Vốn chủ sở hữu**
- **Nợ phải trả**
- **Tài sản ngắn hạn**
- Kèm biến động so với kỳ trước

### 7.2. Mục đích
Đây là lớp tổng quan nhanh nhất của khối bảng cân đối kế toán.

### 7.3. Ý nghĩa từng KPI

#### a. Tổng tài sản
Phản ánh quy mô nguồn lực mà doanh nghiệp đang kiểm soát.

**Dùng để**:
- Đánh giá quy mô doanh nghiệp.
- So sánh tốc độ mở rộng tài sản qua thời gian.
- Là mẫu số của nhiều chỉ tiêu như ROA, vòng quay tài sản, nợ/tài sản.

**Tại sao quan trọng**:
- Doanh nghiệp tăng trưởng bền vững thường có quy mô tài sản mở rộng đi kèm hiệu quả sử dụng tài sản.

#### b. Vốn chủ sở hữu
Phản ánh phần lợi ích còn lại thuộc cổ đông sau khi trừ nợ.

**Dùng để**:
- Đánh giá nền tảng vốn tự có.
- Xem khả năng chống đỡ rủi ro.
- Là cơ sở tính ROE, D/E.

**Tại sao quan trọng**:
- Vốn chủ mạnh thường giúp doanh nghiệp ít phụ thuộc nợ hơn.

#### c. Nợ phải trả
Phản ánh nghĩa vụ tài chính hiện tại.

**Dùng để**:
- Đánh giá đòn bẩy tài chính.
- So sánh với vốn chủ và tổng tài sản.
- Nhận diện rủi ro thanh toán và tái cấp vốn.

#### d. Tài sản ngắn hạn
Phản ánh phần tài sản có thể chuyển đổi thành tiền hoặc sử dụng trong vòng 12 tháng.

**Dùng để**:
- Phân tích khả năng thanh toán ngắn hạn.
- Đánh giá vốn lưu động.
- Là nguồn bảo đảm cho nghĩa vụ nợ ngắn hạn.

### 7.4. Cách đọc nghiệp vụ
- **Tổng tài sản tăng**, nhưng **vốn chủ không tăng tương ứng** và **nợ tăng mạnh**: tăng trưởng dựa nhiều vào đòn bẩy.
- **Tài sản ngắn hạn tăng nhanh** nhưng chủ yếu do **hàng tồn kho/phải thu**: cần cảnh giác chất lượng tài sản ngắn hạn.
- **Vốn chủ giảm** trong khi lợi nhuận yếu: doanh nghiệp có thể đang suy giảm nền tảng tài chính.

---

## 8. Chart “Cơ cấu tài sản”

### 8.1. Nội dung
Biểu đồ donut thể hiện tỷ trọng:
- **Ngắn hạn**
- **Dài hạn**

### 8.2. Mục đích
Giúp người dùng nhìn ngay doanh nghiệp có thiên về:
- Mô hình tài sản lưu động cao
- Hay mô hình đầu tư tài sản dài hạn lớn

### 8.3. Ý nghĩa nghiệp vụ
- **Tỷ trọng tài sản ngắn hạn cao** thường thấy ở doanh nghiệp thương mại, phân phối, bán lẻ hoặc công ty có chu kỳ kinh doanh nhanh.
- **Tỷ trọng tài sản dài hạn cao** thường gặp ở doanh nghiệp bất động sản, hạ tầng, sản xuất thâm dụng vốn.

### 8.4. Tại sao cần biểu đồ này
Vì quy mô tài sản lớn chưa đủ để kết luận tốt hay xấu; điều quan trọng là **tài sản nằm ở đâu**.

### 8.5. Cách diễn giải
- Nếu **tài sản dài hạn tăng mạnh**, cần kiểm tra đó là đầu tư hiệu quả hay tài sản kém thanh khoản.
- Nếu **tài sản ngắn hạn cao**, cần kiểm tra chất lượng bên trong: tiền thật hay phải thu/hàng tồn kho.

---

## 9. Chart “Cấu trúc nguồn vốn”

### 9.1. Nội dung
Biểu đồ donut thể hiện tỷ trọng:
- **Vốn chủ sở hữu**
- **Nợ phải trả**

### 9.2. Mục đích
Cho biết doanh nghiệp đang tài trợ tài sản bằng nguồn vốn nào.

### 9.3. Ý nghĩa nghiệp vụ
- **Nợ cao**: có thể giúp tăng ROE khi vận hành tốt, nhưng làm tăng rủi ro lãi vay và thanh toán.
- **Vốn chủ cao**: an toàn hơn, nhưng có thể phản ánh doanh nghiệp chưa tận dụng đòn bẩy.

### 9.4. Chỉ báo phân tích liên quan
- D/E
- Nợ/Tổng tài sản
- Khả năng trả lãi
- Dòng tiền hoạt động

### 9.5. Cách đọc
- Nếu **nợ phải trả > 80% tổng nguồn vốn**, cần theo dõi rất sát thanh khoản và chi phí lãi vay.
- Nếu **vốn chủ tăng dần**, có thể là dấu hiệu tích lũy lợi nhuận hoặc phát hành thêm vốn.

---

## 10. Chart “Cấu trúc tài sản & nguồn vốn (5 năm)”

### 10.1. Nội dung
Biểu đồ cột chồng theo thời gian, thể hiện sự biến động tỷ trọng các cấu phần lớn của tài sản và/hoặc nguồn vốn qua nhiều quý/năm.

### 10.2. Mục đích
Không chỉ nhìn snapshot tại một kỳ, mà còn thấy được **quá trình dịch chuyển cơ cấu**.

### 10.3. Ý nghĩa nghiệp vụ
Chart này rất quan trọng trong phân tích xu hướng:
- Tỷ trọng TS ngắn hạn tăng dần hay giảm dần?
- Tài sản dài hạn có phình to quá mức không?
- Nợ có trở thành nguồn tài trợ chi phối không?

### 10.4. Tại sao cần theo chuỗi 5 năm
Một kỳ riêng lẻ có thể bị méo bởi yếu tố mùa vụ hoặc giao dịch bất thường. Chuỗi dài giúp đánh giá:
- Tính ổn định
- Tính chiến lược
- Chu kỳ mở rộng/thu hẹp của doanh nghiệp

### 10.5. Cách sử dụng
- Kết hợp với CAPEX, doanh thu, EBITDA để xem tăng tài sản có tạo hiệu quả hay không.
- Kết hợp với nợ vay để xem đầu tư tăng lên bằng vốn nào.

---

## 11. Chart “Phân tích nợ & khả năng thanh toán”

### 11.1. Nội dung
Biểu đồ cột chồng theo thời gian cho các cấu phần như:
- Nợ ngắn hạn
- Nợ dài hạn
- Vốn chủ sở hữu

### 11.2. Mục đích
Giúp đọc song song:
- Quy mô nguồn vốn
- Mức độ đòn bẩy
- Khả năng hấp thụ nợ bằng vốn chủ

### 11.3. Ý nghĩa nghiệp vụ
- **Nợ ngắn hạn tăng mạnh**: áp lực thanh toán ngắn hạn lớn hơn.
- **Nợ dài hạn tăng**: doanh nghiệp có thể đang mở rộng đầu tư.
- **Vốn chủ tăng chậm hơn nợ**: chất lượng cân đối vốn suy yếu.

### 11.4. Tại sao chart này quan trọng
Nhiều doanh nghiệp nhìn tổng nợ chưa lớn, nhưng cơ cấu nợ không hợp lý, nhất là lệ thuộc nợ ngắn hạn cho tài sản dài hạn.

### 11.5. Góc nhìn phân tích sâu
- So sánh nợ ngắn hạn với tài sản ngắn hạn.
- So sánh nợ vay với EBITDA/CFO.
- Kiểm tra doanh nghiệp có rủi ro mismatch kỳ hạn vốn hay không.

---

## 12. Khối “Cơ cấu hàng tồn kho / vốn lưu động”

### 12.1. Nội dung
Các thanh ngang cho các thành phần lớn của tài sản/vốn lưu động như:
- Hàng tồn kho
- Tiền mặt và tương đương tiền
- Phải thu ngắn hạn
- Khác

Kèm KPI phụ như:
- Tổng HTK
- Vòng quay HTK
- Số ngày HTK

### 12.2. Mục đích
Đi sâu vào **chất lượng tài sản ngắn hạn** và hiệu quả quản trị vốn lưu động.

### 12.3. Ý nghĩa từng thành phần

#### a. Hàng tồn kho
- Phản ánh lượng vốn bị giam trong tồn kho.
- Rất quan trọng với doanh nghiệp sản xuất, bán lẻ, bất động sản.

**Ý nghĩa phân tích**:
- Tồn kho tăng nhanh hơn doanh thu có thể là tín hiệu tiêu thụ chậm.
- Tồn kho cao không phải lúc nào cũng xấu, nhưng cần xem vòng quay.

#### b. Tiền mặt và tương đương tiền
- Phản ánh “đệm thanh khoản” tức thời.
- Càng quan trọng khi doanh nghiệp có nợ ngắn hạn lớn.

#### c. Phải thu ngắn hạn
- Phản ánh doanh thu chưa thu được tiền.
- Tăng mạnh kéo dài có thể báo hiệu rủi ro chất lượng doanh thu.

### 12.4. Các KPI vận hành liên quan

#### Vòng quay hàng tồn kho
Cho biết tồn kho luân chuyển nhanh hay chậm.

#### Số ngày tồn kho
Cho biết trung bình mất bao lâu để chuyển hàng tồn kho thành giá vốn.

### 12.5. Tại sao khối này quan trọng
Nhiều doanh nghiệp báo lãi nhưng tiền không về do:
- Tồn kho phình to
- Phải thu kéo dài
- Vốn lưu động bị giam giữ

---

## 13. Khối “Các chỉ số đòn bẩy tài chính”

### 13.1. Nội dung
Hiển thị các chỉ tiêu dạng thanh mức độ, ví dụ:
- **D/E (Nợ/Vốn chủ sở hữu)**
- **Net Debt / EBITDA**
- **D/A (Nợ/Tổng tài sản)**
- **Nợ ngắn hạn / Tổng nợ**
- **Interest Coverage (EBIT / Chi phí lãi vay)**

### 13.2. Mục đích
Chuẩn hóa việc đọc đòn bẩy tài chính qua các tỷ lệ thay vì chỉ nhìn số tuyệt đối.

### 13.3. Ý nghĩa từng chỉ số

#### a. D/E
Đo mức độ doanh nghiệp dùng nợ so với vốn chủ.

- Cao: đòn bẩy lớn
- Thấp: cấu trúc vốn an toàn hơn

#### b. Net Debt / EBITDA
Đo số năm cần thiết để trả nợ ròng bằng EBITDA nếu giữ nguyên hiệu quả hiện tại.

- Rất hữu ích trong đánh giá sức chịu nợ.
- Thường dùng trong phân tích tín dụng.

#### c. D/A
Cho biết bao nhiêu phần tài sản được tài trợ bằng nợ.

#### d. Nợ ngắn hạn / Tổng nợ
Đánh giá mức độ áp lực thanh toán ngắn hạn.

#### e. Interest Coverage
Đánh giá khả năng doanh nghiệp trả lãi vay từ lợi nhuận hoạt động.

### 13.4. Tại sao các chỉ số này cần đi cùng nhau
Một chỉ số đơn lẻ có thể gây hiểu nhầm. Ví dụ:
- D/E cao nhưng Interest Coverage vẫn tốt → chưa chắc rủi ro ngay.
- D/E không quá cao nhưng Net Debt/EBITDA xấu → gánh nặng nợ thực sự lớn.

---

## 14. Khối “Chu kỳ tiền mặt (CCC)”

### 14.1. Nội dung
Thể hiện các cấu phần:
- **Số ngày tồn kho**
- **Số ngày phải thu**
- **Số ngày phải trả**
- **Chu kỳ tiền mặt (CCC)**

Công thức khái quát:
**CCC = DIO + DSO - DPO**

### 14.2. Mục đích
Đo thời gian vốn bị khóa trong chu kỳ vận hành.

### 14.3. Ý nghĩa nghiệp vụ
- **CCC thấp**: doanh nghiệp quay vòng tiền nhanh.
- **CCC cao**: cần nhiều vốn lưu động để duy trì hoạt động.
- **CCC âm**: doanh nghiệp thu tiền trước, trả tiền sau, rất tốt cho dòng tiền vận hành.

### 14.4. Tại sao cần phân tích CCC
CCC là cầu nối giữa:
- Bảng cân đối kế toán
- Kết quả kinh doanh
- Lưu chuyển tiền tệ

### 14.5. Cách đọc
- **DIO tăng**: tồn kho luân chuyển chậm.
- **DSO tăng**: khách hàng thanh toán chậm.
- **DPO tăng**: doanh nghiệp kéo dài thời gian trả nhà cung cấp.

### 14.6. Ý nghĩa chiến lược
Doanh nghiệp quản trị CCC tốt thường:
- Ít cần vay vốn lưu động hơn
- Tạo tiền tốt hơn dù biên lợi nhuận không quá cao

---

## 15. Khối “Thanh khoản”

### 15.1. Nội dung
Các thanh chỉ báo cho:
- **Hệ số thanh toán hiện hành**
- **Hệ số thanh toán nhanh**
- **Hệ số tỷ lệ tiền mặt**

### 15.2. Mục đích
Đo khả năng đáp ứng nợ ngắn hạn.

### 15.3. Ý nghĩa từng chỉ số

#### a. Current Ratio
Tài sản ngắn hạn / Nợ ngắn hạn

- > 1: cơ bản đủ tài sản ngắn hạn để chi trả nợ ngắn hạn
- Quá cao: có thể vốn lưu động chưa tối ưu

#### b. Quick Ratio
(Tài sản ngắn hạn - Hàng tồn kho) / Nợ ngắn hạn

- Phản ánh khả năng thanh toán mà không phụ thuộc tồn kho
- Hữu ích với ngành tồn kho kém thanh khoản

#### c. Cash Ratio
Tiền và tương đương tiền / Nợ ngắn hạn

- Đo “đạn tiền mặt” tức thời
- Thấp quá sẽ tăng rủi ro thanh toán ngắn hạn

### 15.4. Tại sao phải tách 3 chỉ số
Vì tài sản ngắn hạn không đồng đều về chất lượng:
- Tiền mặt là mạnh nhất
- Phải thu có độ trễ
- Tồn kho kém thanh khoản hơn

---

## 16. Khối “Sức khỏe tài chính & rủi ro”

### 16.1. Nội dung
Gồm:
- Đồng hồ **Altman Z-Score**
- Một nhóm chỉ số thành phần như:
  - X1: Vốn lưu động / Tổng tài sản
  - X2: Lợi nhuận giữ lại / Tổng tài sản
  - X3: EBIT / Tổng tài sản
  - X4: Vốn hóa / Tổng nợ hoặc Vốn chủ / Tổng nợ
  - X5: Doanh thu / Tổng tài sản

### 16.2. Mục đích
Tổng hợp đánh giá xác suất rủi ro tài chính hoặc nguy cơ suy yếu sức khỏe doanh nghiệp.

### 16.3. Ý nghĩa nghiệp vụ
Altman Z-Score không phải công cụ dự báo tuyệt đối, nhưng rất hữu ích như một **cảnh báo sớm**.

### 16.4. Tại sao cần khối này
Người dùng không chỉ cần biết doanh nghiệp đang lớn hay nhỏ, mà cần biết:
- Có an toàn không?
- Có áp lực tài chính không?
- Hiệu quả tạo lợi nhuận trên tài sản có đủ để bù rủi ro không?

### 16.5. Cách dùng đúng
- Không dùng riêng lẻ để kết luận phá sản.
- Luôn kết hợp với CFO, nợ vay, khả năng trả lãi, chất lượng lợi nhuận.

---

## 17. Bảng chi tiết số liệu theo quý

### 17.1. Nội dung
Bảng liệt kê theo chuỗi quý các chỉ tiêu như:
- Tổng tài sản
- Tài sản ngắn hạn / dài hạn
- Tiền và tương đương tiền
- Đầu tư tài chính
- Phải thu
- Hàng tồn kho
- Nợ phải trả
- Nợ ngắn hạn / dài hạn
- Vốn chủ sở hữu

Kèm cột:
- Thay đổi tuyệt đối
- % so với kỳ trước
- % tỷ trọng

### 17.2. Mục đích
Cho phép kiểm tra chi tiết đằng sau biểu đồ tổng hợp.

### 17.3. Vai trò nghiệp vụ
- Là lớp xác minh số liệu khi cần truy vết.
- Hữu ích cho phân tích chuyên sâu và kiểm tra biến động bất thường.

### 17.4. Tại sao bảng vẫn cần thiết
Biểu đồ giúp nhìn nhanh, nhưng bảng giúp:
- Tra chính xác số liệu
- So sánh nhiều kỳ
- Xuất báo cáo chuyên môn

---

# PHẦN C. PHÂN TÍCH HOẠT ĐỘNG VÀ TÌNH HÌNH KINH DOANH

> Tương ứng ảnh 4 và ảnh 5.

## 18. Mục tiêu nghiệp vụ của khối phân tích kinh doanh

Khối này trả lời các câu hỏi:
- Doanh nghiệp bán hàng có tăng trưởng không?
- Biên lợi nhuận có cải thiện không?
- Lợi nhuận đến từ cốt lõi hay bất thường?
- Tăng trưởng doanh thu có chuyển hóa thành lợi nhuận không?
- Hiệu quả sử dụng tài sản, vốn chủ ra sao?

---

## 19. Hàng KPI đầu trang

### 19.1. Các KPI chính
- **Doanh thu thuần**
- **Lợi nhuận gộp**
- **EBIT**
- **EBITDA**
- **Lợi nhuận ròng**
- Có thể kèm **ROS, ROA, ROE**

### 19.2. Mục đích
Đây là lớp đọc nhanh nhất về hiệu quả kinh doanh tại kỳ hiện tại.

### 19.3. Ý nghĩa từng KPI

#### a. Doanh thu thuần
Đo quy mô bán hàng và cung cấp dịch vụ sau giảm trừ.

**Tại sao quan trọng**:
- Là điểm bắt đầu của toàn bộ phân tích hoạt động.
- Cho biết doanh nghiệp còn đang tăng trưởng đầu ra hay không.

#### b. Lợi nhuận gộp
Đo phần giá trị còn lại sau giá vốn.

**Ý nghĩa**:
- Phản ánh năng lực tạo giá trị cốt lõi từ sản phẩm/dịch vụ.
- Là nền của biên gộp.

#### c. EBIT
Lợi nhuận trước lãi vay và thuế.

**Ý nghĩa**:
- Đo hiệu quả hoạt động trước tác động cấu trúc vốn và thuế.
- Phù hợp để so sánh giữa các doanh nghiệp khác nhau về đòn bẩy.

#### d. EBITDA
EBIT cộng khấu hao/amortization.

**Ý nghĩa**:
- Gần với dòng tiền hoạt động trước vốn lưu động và CAPEX hơn EBIT.
- Rất hữu ích trong định giá và phân tích nợ.

#### e. Lợi nhuận ròng
Phản ánh kết quả cuối cùng thuộc về cổ đông.

**Lưu ý**:
- Có thể bị ảnh hưởng mạnh bởi doanh thu tài chính, chi phí tài chính, thu nhập khác, thuế.

### 19.4. Cách đọc nghiệp vụ
- Doanh thu tăng nhưng EBIT giảm → chi phí hoạt động hoặc giá vốn đang xấu đi.
- EBITDA tăng nhưng lợi nhuận ròng thấp → gánh nặng lãi vay, khấu hao hoặc thuế lớn.
- Lợi nhuận ròng tăng mạnh bất thường nhưng EBIT yếu → có thể đến từ lợi nhuận không cốt lõi.

---

## 20. Khối “Phân tích Dupont 5 yếu tố”

### 20.1. Nội dung
Sơ đồ Dupont thể hiện mối quan hệ của các chỉ số như:
- Gánh nặng thuế
- Gánh nặng lãi vay
- Biên EBIT
- Vòng quay tài sản
- Đòn bẩy tài chính
- Kết quả cuối cùng: **ROE** hoặc chỉ tiêu sinh lời đầu ra

### 20.2. Mục đích
Phân rã hiệu quả sinh lời để biết **ROE/ROS tốt lên vì điều gì**.

### 20.3. Ý nghĩa nghiệp vụ
Dupont là chart rất quan trọng vì nó chuyển câu hỏi từ “lợi nhuận cao hay thấp” sang “**vì sao** lợi nhuận cao hay thấp”.

### 20.4. Ý nghĩa từng nhánh
- **Gánh nặng thuế**: cho biết thuế đang ăn mòn lợi nhuận ra sao.
- **Gánh nặng lãi vay**: cho biết cấu trúc vốn ảnh hưởng thế nào tới lợi nhuận sau cùng.
- **Biên EBIT**: cho biết hiệu quả hoạt động.
- **Vòng quay tài sản**: cho biết khả năng tạo doanh thu từ tài sản.
- **Đòn bẩy tài chính**: cho biết doanh nghiệp khuếch đại lợi nhuận bằng vốn vay đến mức nào.

### 20.5. Tại sao cần chart này
Cùng ROE 15%, nhưng bản chất có thể rất khác:
- Một doanh nghiệp đến từ biên tốt và vận hành tốt.
- Một doanh nghiệp đến từ đòn bẩy rất cao.

### 20.6. Ứng dụng phân tích
- Xác định nguồn gốc ROE.
- Phân biệt tăng trưởng chất lượng với tăng trưởng do nợ.
- Hỗ trợ định giá và đánh giá tính bền vững của sinh lời.

---

## 21. Khối “Chi tiết tỷ suất”

### 21.1. Nội dung
Các thanh đo tỷ suất như:
- **Gross Margin**
- **Operating Margin**
- **ROS**

### 21.2. Mục đích
Cho người dùng nhìn nhanh cấu trúc lợi nhuận theo tầng.

### 21.3. Ý nghĩa từng chỉ số

#### Gross Margin
Phản ánh sức mạnh giá bán, cơ cấu sản phẩm, khả năng kiểm soát giá vốn.

#### Operating Margin
Phản ánh hiệu quả sau chi phí bán hàng và quản lý.

#### ROS
Phản ánh cứ 100 đồng doanh thu tạo ra bao nhiêu đồng lợi nhuận ròng.

### 21.4. Tại sao cần hiển thị cùng nhau
Vì doanh nghiệp có thể:
- Biên gộp tốt nhưng chi phí bán hàng lớn → biên hoạt động thấp.
- Biên hoạt động tốt nhưng chi phí tài chính cao → biên ròng thấp.

---

## 22. Chart “Động lực lợi nhuận trước thuế”

### 22.1. Nội dung
Biểu đồ waterfall/thanh phân rã lợi nhuận trước thuế theo các nguồn:
- Hoạt động cốt lõi
- Tài chính thuần
- Hoạt động khác
- Kết quả cuối cùng là LNTT

### 22.2. Mục đích
Cho biết lợi nhuận đến từ đâu.

### 22.3. Ý nghĩa nghiệp vụ
Đây là chart cốt lõi để đánh giá **chất lượng lợi nhuận**.

### 22.4. Cách đọc
- Nếu LNTT chủ yếu đến từ **HĐKD cốt lõi**, chất lượng tốt hơn.
- Nếu lợi nhuận đến từ **thu nhập khác** hoặc **tài chính** trong khi cốt lõi yếu, tính bền vững thấp hơn.

### 22.5. Tại sao chart này quan trọng
Nhiều doanh nghiệp “lãi đẹp” nhưng phần lớn do:
- Bán tài sản
- Đánh giá lại khoản đầu tư
- Lãi tài chính bất thường

Chart này giúp tránh nhầm lẫn giữa **lợi nhuận kế toán** và **năng lực kinh doanh thật**.

---

## 23. Chart “Phễu hiệu quả (Profit Funnel)”

### 23.1. Nội dung
Biểu diễn dạng phễu từ:
- Doanh thu
- Lợi nhuận gộp
- EBIT
- Lợi nhuận ròng

### 23.2. Mục đích
Giúp người dùng thấy trực quan mức hao hụt lợi nhuận qua từng tầng chi phí.

### 23.3. Ý nghĩa nghiệp vụ
- Khoảng cách lớn từ **doanh thu → lợi nhuận gộp**: giá vốn cao.
- Khoảng cách lớn từ **lợi nhuận gộp → EBIT**: chi phí bán hàng & quản lý cao.
- Khoảng cách lớn từ **EBIT → Lợi nhuận ròng**: lãi vay, thuế hoặc hoạt động ngoài cốt lõi tác động mạnh.

### 23.4. Tại sao cần chart này
Phễu giúp người đọc không chuyên vẫn hiểu được lợi nhuận bị “ăn mòn” ở đâu.

---

## 24. Chart “Diễn biến doanh thu & chi phí”

### 24.1. Nội dung
Biểu đồ kết hợp theo chuỗi quý cho:
- Doanh thu
- Giá vốn
- Lợi nhuận gộp hoặc đường lợi nhuận liên quan

### 24.2. Mục đích
Theo dõi động lực kinh doanh qua thời gian.

### 24.3. Ý nghĩa nghiệp vụ
- Doanh thu tăng nhưng giá vốn tăng nhanh hơn → biên gộp giảm.
- Doanh thu giảm nhưng lợi nhuận gộp không giảm mạnh → cơ cấu sản phẩm có thể cải thiện.
- Biến động mạnh theo quý → có yếu tố mùa vụ hoặc ghi nhận dự án.

### 24.4. Tại sao chart này cần thiết
Tăng trưởng một kỳ không quan trọng bằng **quy luật tăng trưởng qua chuỗi**.

---

## 25. Khối “Cơ cấu chi phí”

### 25.1. Nội dung
Biểu đồ donut về cơ cấu chi phí chung, có thể gồm:
- Mua hàng hóa
- Logistics / phân phối
- Chi phí quản lý thị trường
- Chi phí lãi vay
- Chi phí bán hàng
- Chi phí khác

### 25.2. Mục đích
Giúp nhận diện nhóm chi phí đang chi phối mô hình kinh doanh.

### 25.3. Ý nghĩa nghiệp vụ
- Doanh nghiệp thương mại thường chi phí mua hàng lớn.
- Doanh nghiệp phân phối có thể chịu logistics cao.
- Doanh nghiệp đòn bẩy cao có chi phí lãi vay đáng kể.

### 25.4. Tại sao cần chart này
Không thể tối ưu lợi nhuận nếu không biết chi phí tập trung ở đâu.

---

## 26. Chart “Hiệu quả quản lý chi phí”

### 26.1. Nội dung
Biểu đồ theo thời gian thể hiện mức độ cải thiện/suy giảm hiệu quả kiểm soát chi phí.

### 26.2. Mục đích
Đánh giá doanh nghiệp có đang vận hành tinh gọn hơn hay không.

### 26.3. Ý nghĩa nghiệp vụ
- Xu hướng cải thiện → ban điều hành kiểm soát chi phí tốt hơn.
- Xu hướng xấu đi → tăng trưởng doanh thu có thể không chuyển hóa thành lợi nhuận.

### 26.4. Cách sử dụng
Nên đọc cùng:
- Operating Margin
- SG&A/Doanh thu
- EBIT growth

---

## 27. Chart “Cơ cấu nguồn thu”

### 27.1. Nội dung
Biểu đồ donut thể hiện nguồn tạo thu nhập, ví dụ:
- Doanh thu cốt lõi
- Thu nhập tài chính
- Thu nhập khác

### 27.2. Mục đích
Xác định lợi nhuận/doanh thu đến từ hoạt động chính hay phụ.

### 27.3. Ý nghĩa nghiệp vụ
- Tỷ trọng doanh thu cốt lõi cao → mô hình kinh doanh rõ ràng, dễ dự báo hơn.
- Tỷ trọng thu nhập khác cao → cần cảnh giác tính bền vững.

### 27.4. Tại sao quan trọng
Trong phân tích đầu tư, thị trường thường đánh giá cao lợi nhuận đến từ hoạt động cốt lõi hơn lợi nhuận bất thường.

---

## 28. Chart “Tốc độ tăng trưởng (YoY Growth %)”

### 28.1. Nội dung
Biểu đồ đường thể hiện tốc độ tăng trưởng theo năm của:
- Doanh thu
- Lợi nhuận ròng

### 28.2. Mục đích
Đánh giá sự đồng pha giữa tăng trưởng đầu ra và tăng trưởng kết quả cuối cùng.

### 28.3. Ý nghĩa nghiệp vụ
- Doanh thu tăng, lợi nhuận tăng nhanh hơn → có đòn bẩy hoạt động tích cực.
- Doanh thu tăng, lợi nhuận giảm → biên suy yếu hoặc chi phí tăng.
- Lợi nhuận tăng quá mạnh so với doanh thu → có thể do nền thấp hoặc yếu tố bất thường.

### 28.4. Tại sao chart này quan trọng
Tăng trưởng tuyệt đối dễ gây hiểu nhầm. Tăng trưởng tương đối giúp nhận diện:
- Tốc độ
- Gia tốc
- Tính bền vững

---

## 29. Bảng “Chi tiết báo cáo & tăng trưởng YoY”

### 29.1. Nội dung
Bảng chuỗi quý cho các dòng chính:
- Doanh thu thuần
- Giá vốn hàng bán
- Lợi nhuận gộp
- Chi phí bán hàng
- Chi phí quản lý
- Lợi nhuận hoạt động
- Lợi nhuận trước thuế
- Lợi nhuận sau thuế

### 29.2. Mục đích
Cung cấp lớp dữ liệu chi tiết cho chart tăng trưởng và phễu lợi nhuận.

### 29.3. Vai trò nghiệp vụ
- Truy vết nguyên nhân tăng/giảm lợi nhuận.
- Kiểm tra số liệu gốc khi phát hiện bất thường trên biểu đồ.

---

# PHẦN D. PHÂN TÍCH LƯU CHUYỂN TIỀN TỆ

> Tương ứng ảnh 6.

## 30. Mục tiêu nghiệp vụ của khối dòng tiền

Khối này trả lời các câu hỏi:
- Doanh nghiệp có thực sự tạo tiền từ hoạt động kinh doanh không?
- Lợi nhuận có được chuyển hóa thành tiền không?
- Doanh nghiệp đang đầu tư mạnh hay thu hẹp đầu tư?
- Nguồn tài trợ tiền đến từ đâu?
- Dòng tiền tự do có dương và bền vững không?

---

## 31. Khối “Quality of Revenue / Earnings”

### 31.1. Nội dung
Các chỉ báo như:
- **CFO / Net Income**
- **Accrual Ratio**
- **Receivables / Revenue**
- **Inventory / COGS**
- **Other Income / PBT**

### 31.2. Mục đích
Đánh giá **chất lượng lợi nhuận** và **chất lượng doanh thu**.

### 31.3. Ý nghĩa từng chỉ báo

#### a. CFO / Net Income
So sánh dòng tiền từ hoạt động kinh doanh với lợi nhuận ròng.

- > 1 trong dài hạn thường tích cực
- < 1 kéo dài cần cảnh giác lợi nhuận chưa chuyển hóa thành tiền

#### b. Accrual Ratio
Đo mức độ lợi nhuận kế toán dựa trên khoản dồn tích.

- Thấp thường tốt hơn
- Cao cho thấy lợi nhuận phụ thuộc nhiều vào bút toán kế toán hơn dòng tiền

#### c. Receivables / Revenue
Phản ánh tốc độ tích tụ phải thu so với doanh thu.

- Cao lên nhanh có thể báo hiệu doanh thu ghi nhận trước tiền về

#### d. Inventory / COGS
Đánh giá mức độ tồn kho so với giá vốn.

- Cao có thể là hàng chậm luân chuyển hoặc dự trữ cao

#### e. Other Income / PBT
Phản ánh mức độ phụ thuộc vào thu nhập ngoài cốt lõi trong lợi nhuận trước thuế.

### 31.4. Tại sao cần khối này
Đây là lớp kiểm định cực kỳ quan trọng đối với nhà phân tích chuyên sâu vì:
- Lợi nhuận đẹp chưa chắc tiền đẹp
- Tăng trưởng mạnh chưa chắc bền vững

---

## 32. Khối “Hiệu quả tái đầu tư & cổ tức”

### 32.1. Nội dung
Các chỉ số như:
- **Tỷ lệ tái đầu tư (CAPEX / CFO)**
- **FCF Margin (FCF / Revenue)**
- **CAPEX Coverage**
- **Dividend Coverage**
- Kèm các số tuyệt đối của CFO, CAPEX, FCF

### 32.2. Mục đích
Đánh giá doanh nghiệp có đủ khả năng:
- Tự tài trợ đầu tư
- Tạo dòng tiền tự do
- Chi trả cổ tức bền vững

### 32.3. Ý nghĩa nghiệp vụ

#### a. CAPEX / CFO
- Cao: doanh nghiệp đang đầu tư mạnh, nhưng cần xem hiệu quả.
- Quá cao kéo dài: áp lực vốn lớn.

#### b. FCF Margin
- Đo mức tiền tự do tạo ra trên mỗi đồng doanh thu.
- Là chỉ tiêu rất quan trọng trong định giá.

#### c. CAPEX Coverage
- Đánh giá CFO có đủ bù cho CAPEX không.

#### d. Dividend Coverage
- Đánh giá khả năng chi trả cổ tức từ dòng tiền.

### 32.4. Tại sao cần khối này
Nhiều doanh nghiệp lợi nhuận kế toán tốt nhưng không tạo ra FCF do phải đầu tư quá lớn hoặc vốn lưu động ăn mòn tiền.

---

## 33. Chart “Tương quan lợi nhuận ròng và dòng tiền kinh doanh”

### 33.1. Nội dung
Biểu đồ theo thời gian so sánh:
- **Lợi nhuận ròng**
- **Dòng tiền từ HĐKD (OCF/CFO)**

### 33.2. Mục đích
Kiểm tra mức độ đồng pha giữa lợi nhuận và tiền thực.

### 33.3. Ý nghĩa nghiệp vụ
- Cùng tăng: chất lượng lợi nhuận tốt.
- Lợi nhuận tăng nhưng CFO giảm: cần phân tích vốn lưu động, phải thu, tồn kho.
- CFO biến động mạnh hơn nhiều so với lợi nhuận: doanh nghiệp có thể nhạy cảm với chu kỳ vốn lưu động.

### 33.4. Tại sao chart này quan trọng
Đây là chart phát hiện rất nhanh hiện tượng:
- “Lãi mà không có tiền”
- “Tiền tốt hơn lợi nhuận”
- “Lợi nhuận kế toán mang tính thời điểm”

---

## 34. Chart “Diễn biến 3 dòng tiền chính”

### 34.1. Nội dung
Biểu đồ theo thời gian cho:
- **Dòng tiền kinh doanh (CFO)**
- **Dòng tiền đầu tư (CFI)**
- **Dòng tiền tài chính (CFF)**

### 34.2. Mục đích
Cho biết doanh nghiệp đang tạo tiền, đầu tư và huy động vốn như thế nào qua các quý.

### 34.3. Ý nghĩa nghiệp vụ

#### CFO
- Dương ổn định: nền tảng vận hành tốt.
- Âm kéo dài: hoạt động không tự nuôi được chính nó.

#### CFI
- Âm: thường là đầu tư CAPEX, M&A, mua tài sản.
- Dương: có thể do thoái vốn, bán tài sản, thu hồi đầu tư.

#### CFF
- Dương: tăng vay, tăng vốn.
- Âm: trả nợ, trả cổ tức, mua cổ phiếu quỹ.

### 34.4. Tại sao cần đọc cùng nhau
Một dòng tiền đơn lẻ không phản ánh đầy đủ bức tranh.
Ví dụ:
- CFO âm nhưng CFF dương → doanh nghiệp sống nhờ huy động vốn.
- CFO dương, CFI âm → mô hình đầu tư mở rộng lành mạnh nếu dự án hiệu quả.

---

## 35. Chart “Phân bổ dòng tiền đầu tư & cổ tức”

### 35.1. Nội dung
Biểu đồ cho thấy mối quan hệ giữa:
- Dòng tiền tự do (FCF)
- Cổ tức chi trả
- Hoặc CAPEX và các khoản phân phối vốn

### 35.2. Mục đích
Đánh giá doanh nghiệp có đang phân bổ vốn hợp lý không.

### 35.3. Ý nghĩa nghiệp vụ
- FCF âm nhưng vẫn chia cổ tức cao → có thể không bền vững.
- FCF dương lớn nhưng CAPEX thấp kéo dài → doanh nghiệp vào giai đoạn khai thác, ít mở rộng.

### 35.4. Tại sao cần chart này
Nhà đầu tư không chỉ quan tâm doanh nghiệp kiếm được tiền, mà còn quan tâm doanh nghiệp **dùng tiền như thế nào**.

---

## 36. Chart “Tổng quan dòng chảy tiền tệ”

### 36.1. Nội dung
Biểu đồ waterfall/tổng hợp cuối kỳ cho:
- CFO
- CFI
- CFF
- Tiền tăng/giảm ròng

### 36.2. Mục đích
Tóm tắt nhanh toàn bộ chuyển động tiền trong kỳ.

### 36.3. Ý nghĩa nghiệp vụ
Giúp trả lời câu hỏi cuối cùng:
- Tại sao tiền mặt cuối kỳ tăng/giảm?

### 36.4. Cách đọc
- CFO âm + CFI âm + CFF dương → doanh nghiệp phải đi vay/huy động để bù dòng tiền.
- CFO dương mạnh đủ bù CFI và vẫn tăng tiền → mô hình tài chính rất khỏe.

---

# PHẦN E. NGHIỆP VỤ PHÂN TÍCH TỔNG HỢP

## 37. Quy trình phân tích đề xuất khi sử dụng dashboard

### 37.1. Bước 1 – Xác định quy mô và cấu trúc vốn
Đọc:
- Tổng tài sản
- Nợ phải trả
- Vốn chủ
- Cơ cấu tài sản
- Cấu trúc nguồn vốn

**Câu hỏi cần trả lời**:
- Doanh nghiệp lớn lên nhờ tài sản nào?
- Tăng trưởng đang dựa vào nợ hay vốn chủ?

### 37.2. Bước 2 – Kiểm tra thanh khoản và vốn lưu động
Đọc:
- Current ratio, quick ratio, cash ratio
- CCC
- Hàng tồn kho, phải thu, tiền mặt

**Câu hỏi cần trả lời**:
- Doanh nghiệp có rủi ro thiếu tiền ngắn hạn không?
- Vốn có bị giam ở tồn kho hoặc phải thu không?

### 37.3. Bước 3 – Đánh giá hiệu quả kinh doanh cốt lõi
Đọc:
- Doanh thu, lợi nhuận gộp, EBIT, EBITDA
- Gross margin, operating margin, ROS
- Profit funnel
- Động lực LNTT

**Câu hỏi cần trả lời**:
- Doanh nghiệp có kiếm tiền từ hoạt động cốt lõi không?
- Biên lợi nhuận cải thiện do vận hành hay do yếu tố bất thường?

### 37.4. Bước 4 – Phân tích chất lượng lợi nhuận
Đọc:
- CFO/Net income
- Other income/PBT
- Thu nhập tài chính, hoạt động khác
- Tương quan lợi nhuận và CFO

**Câu hỏi cần trả lời**:
- Lợi nhuận có thật không?
- Lợi nhuận có bền vững không?

### 37.5. Bước 5 – Kiểm tra đòn bẩy và rủi ro tài chính
Đọc:
- D/E
- Net debt/EBITDA
- Interest coverage
- Altman Z-score

**Câu hỏi cần trả lời**:
- Doanh nghiệp chịu nợ tới mức nào?
- Có rủi ro thanh toán/lãi vay không?

### 37.6. Bước 6 – Đánh giá chất lượng dòng tiền và phân bổ vốn
Đọc:
- CFO, CFI, CFF
- CAPEX/CFO
- FCF margin
- Dividend coverage

**Câu hỏi cần trả lời**:
- Doanh nghiệp có tự nuôi tăng trưởng được không?
- Có đang đốt tiền hay tạo tiền?

---

## 38. Một số mẫu kết luận nghiệp vụ có thể rút ra từ dashboard

### 38.1. Doanh nghiệp tăng trưởng lành mạnh
Dấu hiệu:
- Doanh thu tăng đều
- EBIT/EBITDA tăng đồng pha
- Gross margin ổn định hoặc cải thiện
- CFO dương và theo kịp lợi nhuận
- Nợ tăng vừa phải, interest coverage tốt

### 38.2. Doanh nghiệp tăng trưởng nhưng chất lượng thấp
Dấu hiệu:
- Doanh thu tăng mạnh
- Lợi nhuận tăng nhưng CFO yếu
- Phải thu/tồn kho tăng nhanh
- Other income/PBT cao
- CCC kéo dài

### 38.3. Doanh nghiệp rủi ro đòn bẩy
Dấu hiệu:
- Nợ/Tài sản cao
- D/E cao
- Net debt/EBITDA cao
- Interest coverage thấp
- Cash ratio thấp

### 38.4. Doanh nghiệp có thể đang trong chu kỳ đầu tư mạnh
Dấu hiệu:
- CFI âm lớn
- CAPEX/CFO cao
- FCF âm trong ngắn hạn
- Tài sản dài hạn tăng
- Nếu EBIT/CFO cải thiện dần về sau thì có thể là tích cực

### 38.5. Doanh nghiệp có khả năng tối ưu vận hành tốt
Dấu hiệu:
- CCC giảm
- Vòng quay tài sản tăng
- Operating margin cải thiện
- Chi phí/doanh thu giảm

---

# PHẦN F. Ý NGHĨA THIẾT KẾ DASHBOARD

## 39. Vì sao dashboard được tổ chức theo 3 lớp

### 39.1. Lớp 1 – Tổng quan
Giúp lãnh đạo hoặc người dùng mới nắm nhanh tình trạng doanh nghiệp chỉ sau vài phút.

### 39.2. Lớp 2 – Chi tiết
Giúp chuyên viên phân tích truy tới nguyên nhân gốc rễ.

### 39.3. Lớp 3 – Nghiệp vụ
Giúp chuyển từ “xem số” sang “ra kết luận”.

---

## 40. Giá trị sử dụng thực tế

Dashboard này có thể dùng cho:

- **Phân tích đầu tư cổ phiếu**: đánh giá chất lượng doanh nghiệp trước khi định giá.
- **Phân tích tín dụng**: đánh giá sức khỏe tài chính, dòng tiền, khả năng trả nợ.
- **So sánh doanh nghiệp cùng ngành**: nếu bổ sung benchmark ngành.
- **Quản trị nội bộ**: theo dõi hiệu quả vận hành theo quý.
- **Trình bày cho lãnh đạo/nhà đầu tư**: vì dashboard có cả lớp trực quan và lớp giải thích nghiệp vụ.

---

# PHẦN G. KHUYẾN NGHỊ MỞ RỘNG

## 41. Các nâng cấp nên cân nhắc

### 41.1. So sánh cùng ngành
Thêm:
- Median ngành
- Percentile ngành
- Xếp hạng doanh nghiệp theo từng chỉ tiêu

### 41.2. Kết nối dữ liệu giá hiện hành sâu hơn
Thêm:
- P/E, P/B, EV/EBITDA
- Market Cap / Sales
- FCF Yield
- PEG nếu có dự phóng tăng trưởng

### 41.3. Tính năng cảnh báo tự động
Ví dụ:
- CCC tăng 3 quý liên tiếp
- CFO âm 2 quý liên tiếp
- Interest coverage xuống dưới ngưỡng
- Other income/PBT vượt tỷ lệ cảnh báo

### 41.4. Kịch bản phân tích theo ngành
Vì doanh nghiệp phi tài chính rất đa dạng, nên nên có lớp logic riêng cho:
- Bất động sản
- Bán lẻ
- Sản xuất
- Hạ tầng
- Logistics
- Hàng tiêu dùng

---

# 42. Kết luận

Bộ dashboard này là một hệ thống phân tích tài chính chuyên sâu cho doanh nghiệp phi tài chính, được thiết kế theo tư duy:

**Tổng quan → Chi tiết → Nghiệp vụ → Ý nghĩa**

Điểm mạnh lớn nhất của bộ dashboard là không chỉ hiển thị số liệu kế toán, mà còn hỗ trợ người dùng trả lời các câu hỏi quan trọng nhất trong phân tích doanh nghiệp:

- Doanh nghiệp mạnh ở đâu?
- Rủi ro nằm ở đâu?
- Lợi nhuận có bền vững không?
- Tăng trưởng có chất lượng không?
- Dòng tiền có xác nhận lợi nhuận không?
- Cấu trúc vốn hiện tại có an toàn không?

Nếu được kết hợp thêm dữ liệu giá hiện hành, chỉ số định giá và benchmark ngành, dashboard này có thể trở thành nền tảng hoàn chỉnh cho:
- phân tích đầu tư,
- phân tích tín dụng,
- quản trị hiệu quả doanh nghiệp,
- và ra quyết định chiến lược.

