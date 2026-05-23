# ĐẶC TẢ NGHIỆP VỤ & VIBECODING: DASHBOARD DOANH NGHIỆP NGÀNH TÀI CHÍNH

**Phiên bản:** 2.0 — BA rewrite theo yêu cầu: chart insight lớn đặt đầu, chart giải thích đặt sau, mọi tab có bảng số liệu.  
**Vai trò tài liệu:** Đặc tả nghiệp vụ + data mapping để AI/vibecoding sinh dashboard, chart, tooltip và SQL đúng `ind_name`.  
**Đối tượng sử dụng:** Ban điều hành, CFO, CRO, Khối ALM/Treasury, Investor Relations, Chuyên viên phân tích đầu tư.  
**Nguồn mapping:** danh sách `select distinct ind_name` đã được chuẩn hóa thành `raw_name`, `old_ind_code`, `norm_name`.  
**Số dòng mapping gốc:** 1,720. **Số `norm_name` chuẩn:** 658.  

> **Role BA được áp dụng:** Không chỉ liệt kê chart. Mỗi chart phải trả lời một câu hỏi kinh doanh, có ý nghĩa phân tích, logic tính, mapping dữ liệu, tooltip và bảng số liệu để kiểm chứng.

---

## 1. Mục tiêu sản phẩm

Dashboard này phục vụ phân tích doanh nghiệp ngành tài chính gồm ngân hàng, công ty tài chính tiêu dùng, công ty chứng khoán và các doanh nghiệp tài chính có BCTC đặc thù. Tài liệu cũ thiên về mô tả ý tưởng; bản này biến ý tưởng thành đặc tả có thể đưa trực tiếp cho AI/vibecoding.

### 1.1. Vấn đề cần giải quyết

Dữ liệu lấy từ nhiều nguồn nên cùng một chỉ tiêu có thể được ghi bằng nhiều tên khác nhau. Ví dụ cùng là **Thu nhập lãi thuần** có thể đi qua tiếng Việt, tiếng Anh hoặc cách viết có dấu/không đồng nhất; cùng là **Vốn chủ sở hữu** có thể xuất hiện dưới dạng `Vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU`, hoặc có hậu tố `(đồng)`. Vì vậy, dashboard **không được query bằng một tên `ind_name` đơn lẻ**.

### 1.2. Nguyên tắc bắt buộc khi vibecoding

1. `norm_name` là tên chuẩn nghiệp vụ để AI hiểu chỉ tiêu.
2. `raw_name` là tên thực tế để query cột `ind_name`.
3. `old_ind_code` chỉ dùng để đối chiếu, **không dùng làm khóa duy nhất**, vì cùng một mã cũ có thể xuất hiện ở nhiều diễn giải.
4. Khi sinh SQL, mọi chỉ tiêu phải query theo dạng:

```sql
WHERE ind_name IN (<toàn bộ aliases raw_name thuộc metric_key>)
```

5. Nếu chart cần dữ liệu không có trong mapping BCTC chính, ví dụ **nợ nhóm 2, nợ xấu, write-off, cơ cấu sản phẩm cho vay, maturity bucket**, AI phải dùng **extension table** hoặc hiển thị empty state. Không được tự suy diễn từ BCTC.

---

## 2. Data contract khuyến nghị

### 2.1. Bảng dữ liệu BCTC chính

```sql
financial_statement_fact(
  ticker               text,
  company_name         text,
  sector               text,
  report_type          text,   -- balance_sheet | income_statement | cash_flow | note
  period_type          text,   -- quarter | year | ttm
  fiscal_year          int,
  fiscal_quarter       int,
  period_end_date      date,
  ind_name             text,
  value                numeric,
  unit                 text,
  source               text,
  updated_at           timestamp
)
```

### 2.2. Bảng mapping chỉ tiêu

Nên tạo bảng mapping từ phần `Metric Registry` của tài liệu này:

```sql
metric_indicator_alias(
  metric_key           text,
  business_name        text,
  norm_name            text,
  ind_name_alias       text,
  source_type          text, -- financial_statement | extension
  priority             int,
  is_active            boolean
)
```

### 2.3. Extension tables cần có nếu muốn chart rủi ro chuyên sâu

```sql
credit_quality_fact(
  ticker, period_end_date,
  loan_group,          -- group1 | group2 | group3 | group4 | group5
  balance,
  writeoff_amount,
  product_type,        -- cash_loan | motorbike | durables | credit_card | other
  source
)

alm_maturity_fact(
  ticker, period_end_date,
  side,                -- asset | liability
  maturity_bucket,     -- on_demand | lt_1m | m1_3 | m3_12 | y1_5 | gt_5y
  amount,
  source
)
```

---

## 3. UX information architecture

### 3.1. Global layout

- **Header filters:** Ticker/company, kỳ báo cáo, quý/năm/TTM, đơn vị hiển thị, loại hình doanh nghiệp: `bank | consumer_finance | securities | other_financial`.
- **Insight banner:** Luôn nằm trên cùng. Chỉ hiện khi có cảnh báo: leverage tăng mạnh, credit cost tăng, thanh khoản proxy thấp, PBT giảm dù NII tăng.
- **Tab layout:** Mỗi tab theo cấu trúc 3 tầng:
  1. **Insight layer:** 1-2 chart lớn nhất, trả lời câu hỏi quan trọng nhất.
  2. **Explanation layer:** chart nhỏ hơn để giải thích nguyên nhân.
  3. **Data table layer:** bảng số liệu bắt buộc, có export CSV và hiển thị alias được match.

### 3.2. Quy tắc màu

| Nhóm chỉ tiêu | Tăng là tốt/xấu | Màu khi tăng | Ví dụ |
|---|---|---|---|
| Tăng trưởng tốt | Tốt | Xanh | NII, PAT, VCSH, CFO dương |
| Chi phí/rủi ro | Xấu | Đỏ | Credit cost, CIR, NPL, provision expense |
| Đòn bẩy/thanh khoản | Ngữ cảnh | Cam/Đỏ khi vượt ngưỡng | Leverage, wholesale funding ratio |
| Khe hở âm | Xấu | Đỏ | Maturity gap âm |

### 3.3. Tooltip chuẩn cho mọi chart

Tooltip không chỉ hiện số. Tooltip phải trả lời “con số này nghĩa là gì”. Cấu trúc:

```text
[Metric / Series name]
Kỳ: Qx/YYYY
Giá trị: 12,345 tỷ VND
YoY: +8.2%  |  QoQ: -1.1%
Tỷ trọng: 42.0% của tổng nguồn vốn
Công thức: borrowings_credit_institutions / total_sources
BA insight: Phụ thuộc vốn bán buôn tăng; kiểm tra rủi ro rollover.
Data mapping: ind_name matched = [...]
```

---

## 4. Metric Registry cốt lõi

Bảng này là registry dùng trong dashboard. Phần chi tiết alias đầy đủ nằm ở Appendix A.

| metric_key | Tên nghiệp vụ | Source | Norm names | Số alias | Ghi chú |
|---|---|---|---|---:|---|
| `total_assets` | Tổng tài sản | financial_statement.ind_name | Tổng cộng tài sản | 3 | Quy mô tài sản của doanh nghiệp tài chính. |
| `total_liabilities` | Nợ phải trả | financial_statement.ind_name | Nợ phải trả | 3 | Tổng nghĩa vụ phải trả. |
| `total_equity` | Vốn chủ sở hữu | financial_statement.ind_name | Vốn chủ sở hữu<br>Nguồn vốn chủ sở hữu | 5 | Bộ đệm vốn hấp thụ rủi ro. |
| `total_sources` | Tổng nguồn vốn | financial_statement.ind_name | Tổng cộng nguồn vốn<br>Tổng cộng nợ phải trả và vốn chủ sở hữu<br>Tổng nợ phải trả và vốn chủ sở hữu | 5 | Đối soát với tổng tài sản. |
| `customer_loans_gross` | Cho vay khách hàng / khoản cho vay gộp | financial_statement.ind_name | Cho vay khách hàng<br>Các khoản cho vay | 4 | Dư nợ gốc cho vay trước dự phòng nếu dữ liệu có dòng gộp. |
| `customer_loans_net` | Cho vay khách hàng ròng | financial_statement.ind_name | Cho vay khách hàng ròng | 1 | Dư nợ cho vay sau dự phòng. |
| `loan_loss_allowance` | Dự phòng cho vay / tổn thất tín dụng | financial_statement.ind_name | Dự phòng rủi ro cho vay khách hàng<br>Dự phòng rủi ro tín dụng<br>Dự phòng tổn thất tín dụng | 5 | Số dư dự phòng trên bảng cân đối. |
| `cash_and_equivalents` | Tiền và tương đương tiền | financial_statement.ind_name | Tiền và các khoản tương đương tiền | 3 | Tài sản thanh khoản cao nhất. |
| `cash_begin` | Tiền và tương đương tiền đầu kỳ | financial_statement.ind_name | Tiền và các khoản tương đương tiền đầu kỳ | 2 | Số dư tiền đầu kỳ. |
| `cash_end` | Tiền và tương đương tiền cuối kỳ | financial_statement.ind_name | Tiền và các khoản tương đương tiền cuối kỳ | 2 | Số dư tiền cuối kỳ. |
| `sbv_balance` | Tiền gửi tại NHNN | financial_statement.ind_name | Tiền gửi tại ngân hàng nhà nước Việt Nam<br>Tiền gửi tại Ngân hàng Nhà nước | 2 | Tiền gửi bắt buộc/thanh toán tại NHNN. |
| `placements_credit_institutions` | Tiền gửi/cho vay TCTD khác | financial_statement.ind_name | Tiền gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác<br>Tiền gửi và cho vay các tổ chức tín dụng khác<br>Tiền, vàng gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác<br>Tiền, Vàng gửi tại các tổ chức tín dụng khác<br>… (+1) | 6 | Nguồn thanh khoản và tài sản sinh lãi liên ngân hàng. |
| `trading_securities_asset` | Chứng khoán kinh doanh | financial_statement.ind_name | Chứng khoán kinh doanh<br>Chứng khoán kinh doanh ròng | 4 | Danh mục FVTPL/trading. |
| `investment_securities_asset` | Chứng khoán đầu tư | financial_statement.ind_name | Chứng khoán đầu tư<br>Chứng khoán đầu tư sẵn sàng để bán<br>Chứng khoán đầu tư giữ đến ngày đáo hạn | 6 | Danh mục đầu tư AFS/HTM. |
| `customer_deposits` | Tiền gửi khách hàng | financial_statement.ind_name | Tiền gửi của khách hàng<br>Tiền gửi khách hàng | 3 | Nguồn vốn lõi của ngân hàng; với FinCo thường không có hoặc không được dùng. |
| `borrowings_credit_institutions` | Tiền gửi và vay TCTD khác | financial_statement.ind_name | Tiền gửi và vay các Tổ chức tín dụng khác<br>Tiền gửi và vay các Tổ chức tín dụng khác<br>Vay các tổ chức tín dụng khác | 2 | Nguồn vốn wholesale, nhạy cảm với rollover risk. |
| `valuable_papers_issued` | Giấy tờ có giá phát hành | financial_statement.ind_name | Giấy tờ có giá phát hành<br>Phát hành giấy tờ có giá | 2 | CD, trái phiếu, giấy tờ có giá đã phát hành. |
| `short_term_debt` | Vay và nợ ngắn hạn | financial_statement.ind_name | Vay và nợ ngắn hạn<br>Vay ngắn hạn<br>Trái phiếu phát hành ngắn hạn<br>Nợ ngắn hạn | 5 | Nợ đáo hạn ngắn, trọng yếu cho thanh khoản. |
| `long_term_debt` | Vay và nợ dài hạn | financial_statement.ind_name | Vay và nợ dài hạn<br>Vay dài hạn<br>Trái phiếu phát hành dài hạn<br>Nợ dài hạn | 5 | Nguồn vốn trung/dài hạn. |
| `interest_income` | Thu nhập lãi | financial_statement.ind_name | Thu nhập lãi<br>Thu nhập lãi và các khoản tương tự | 3 | Lãi từ cho vay, tiền gửi, chứng khoán nợ. |
| `interest_expense` | Chi phí lãi | financial_statement.ind_name | Chi phí lãi và các khoản tương tự<br>Chi phí lãi và các chi phí tương tự<br>Chi phí Lãi vay<br>Chi phí tiền lãi vay<br>… (+1) | 6 | Chi phí vốn; với FinCo là chi phí funding bán buôn. |
| `net_interest_income` | Thu nhập lãi thuần / NII | financial_statement.ind_name | Thu nhập lãi thuần | 2 | Thu nhập lãi sau chi phí lãi. |
| `fee_income` | Thu nhập dịch vụ | financial_statement.ind_name | Thu nhập từ hoạt động dịch vụ | 2 | Phí dịch vụ, hoa hồng. |
| `fee_expense` | Chi phí dịch vụ | financial_statement.ind_name | Chi phí hoạt động dịch vụ | 2 | Chi phí liên quan dịch vụ. |
| `net_fee_income` | Lãi thuần dịch vụ | financial_statement.ind_name | Lãi thuần từ hoạt động dịch vụ | 2 | Thu nhập dịch vụ ròng. |
| `fx_gold_result` | Lãi/lỗ ngoại hối và vàng | financial_statement.ind_name | Kinh doanh ngoại hối và vàng<br>Lãi/lỗ thuần từ kinh doanh ngoại hối và vàng | 2 | Kết quả hoạt động ngoại hối/vàng. |
| `securities_trading_result` | Lãi/lỗ kinh doanh chứng khoán | financial_statement.ind_name | Lãi/lỗ thuần từ kinh doanh chứng khoán<br>Lãi/lỗ thuần từ mua bán chứng khoán kinh doanh | 2 | Kết quả tự doanh/trading securities. |
| `investment_securities_result` | Lãi/lỗ chứng khoán đầu tư | financial_statement.ind_name | Lãi/lỗ thuần từ mua bán chứng khoán đầu tư<br>Lãi/lỗ thuần từ thanh lý chứng khoán đầu tư | 2 | Kết quả thanh lý/mua bán chứng khoán đầu tư. |
| `total_operating_income` | Tổng thu nhập hoạt động / TOI | financial_statement.ind_name | Tổng thu nhập hoạt động | 2 | Tổng thu nhập hoạt động trước chi phí vận hành. |
| `operating_expenses` | Chi phí hoạt động / Opex | financial_statement.ind_name | Chi phí hoạt động<br>Cộng chi phí hoạt động<br>Chi phí quản lý doanh nghiệp<br>Chi phí bán hàng<br>… (+1) | 6 | Chi phí vận hành; cần tránh cộng trùng nếu có dòng tổng và dòng con. |
| `credit_provision_expense` | Chi phí dự phòng rủi ro tín dụng | financial_statement.ind_name | Chi phí dự phòng rủi ro tín dụng | 1 | Chi phí rủi ro tín dụng trong kỳ. |
| `pbt` | Lợi nhuận trước thuế / PBT | financial_statement.ind_name | Lợi nhuận trước thuế<br>Lãi/lỗ ròng trước thuế<br>Lợi nhuận/lỗ thuần trước thuế<br>Tổng lợi nhuận kế toán trước thuế<br>… (+3) | 8 | Lợi nhuận trước thuế. |
| `pat` | Lợi nhuận sau thuế / PAT | financial_statement.ind_name | Lợi nhuận sau thuế thu nhập doanh nghiệp<br>Lợi nhuận kế toán sau thuế thu nhập doanh nghiệp | 3 | Lợi nhuận sau thuế của toàn doanh nghiệp. |
| `pat_parent` | LNST cổ đông công ty mẹ | financial_statement.ind_name | Lợi nhuận sau thuế của Cổ đông công ty mẹ<br>Lợi nhuận sau thuế của Cổ đông công ty mẹ | 1 | Lợi nhuận thuộc cổ đông công ty mẹ, ưu tiên khi tính EPS/ROE hợp nhất. |
| `eps_basic` | EPS cơ bản | financial_statement.ind_name | Lãi cơ bản trên cổ phiếu | 3 | Lãi cơ bản trên cổ phiếu. |
| `cfo` | Lưu chuyển tiền thuần từ HĐKD / CFO | financial_statement.ind_name | Lưu chuyển tiền thuần từ hoạt động kinh doanh<br>Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh | 3 | Dòng tiền hoạt động kinh doanh. |
| `cfo_before_working_capital` | CFO trước thay đổi vốn lưu động | financial_statement.ind_name | Lưu chuyển tiền thuần từ hoạt động kinh doanh trước thay đổi vốn lưu động<br>Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động | 3 | Sức tạo tiền trước biến động vốn lưu động/tài sản hoạt động. |
| `cfi` | Lưu chuyển tiền thuần từ HĐ đầu tư / CFI | financial_statement.ind_name | Lưu chuyển tiền thuần từ hoạt động đầu tư | 2 | Dòng tiền đầu tư. |
| `cff` | Lưu chuyển tiền thuần từ HĐ tài chính / CFF | financial_statement.ind_name | Lưu chuyển tiền thuần từ hoạt động tài chính | 2 | Dòng tiền tài chính. |
| `net_cash_flow` | Lưu chuyển tiền thuần trong kỳ | financial_statement.ind_name | Lưu chuyển tiền thuần trong kỳ | 1 | Chênh lệch tiền trong kỳ. |
| `interest_paid_cf` | Lãi vay đã trả | financial_statement.ind_name | Chi phí lãi vay đã trả<br>Tiền lãi vay đã trả<br>Chi phí lãi và các chi phí tương tự đã trả | 3 | Dòng tiền lãi vay thực trả. |
| `tax_paid_cf` | Thuế TNDN đã nộp | financial_statement.ind_name | Thuế thu nhập doanh nghiệp đã nộp<br>Tiền thu nhập doanh nghiệp đã trả | 3 | Thuế TNDN đã nộp bằng tiền. |
| `brokerage_revenue` | Doanh thu môi giới chứng khoán | financial_statement.ind_name | Doanh thu môi giới chứng khoán | 1 | Doanh thu môi giới. |
| `brokerage_expense` | Chi phí môi giới chứng khoán | financial_statement.ind_name | Chi phí môi giới chứng khoán | 1 | Chi phí môi giới. |
| `custody_revenue` | Doanh thu lưu ký chứng khoán | financial_statement.ind_name | Doanh thu lưu ký chứng khoán | 1 | Doanh thu lưu ký. |
| `custody_expense` | Chi phí lưu ký chứng khoán | financial_statement.ind_name | Chi phí lưu ký chứng khoán | 1 | Chi phí lưu ký. |
| `margin_lending_receivable` | Phải thu về cho vay | financial_statement.ind_name | Phải thu về cho vay ngắn hạn<br>Phải thu về cho vay dài hạn | 4 | Proxy cho dư nợ margin nếu dữ liệu không có bảng margin riêng. |
| `npl_balance` | Nợ xấu nhóm 3-5 | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng thuyết minh nhóm nợ. |
| `group2_balance` | Nợ nhóm 2 | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng thuyết minh nhóm nợ. |
| `writeoff_amount` | Xóa nợ trong kỳ | extension table |  | 0 | Không có trong mapping BCTC chính; cần thuyết minh dự phòng/loan roll-forward. |
| `loan_product_cash` | Dư nợ vay tiền mặt | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay. |
| `loan_product_motorbike` | Dư nợ vay xe máy | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay. |
| `loan_product_durables` | Dư nợ vay điện máy | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay. |
| `loan_product_credit_card` | Dư nợ thẻ tín dụng | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay. |
| `maturity_asset_bucket` | Tài sản theo kỳ hạn | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng ALM maturity bucket. |
| `maturity_liability_bucket` | Nợ phải trả theo kỳ hạn | extension table |  | 0 | Không có trong mapping BCTC chính; cần bảng ALM maturity bucket. |

---

## Tab 0 - Executive Insight

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### EXE_01 — Financial Health Scorecard

- **Loại chart / kích thước:** KPI cards + alert banner — Full width hero, 4-6 KPI cards.
- **Insight cần trả lời:** Doanh nghiệp đang tăng trưởng an toàn hay đang tăng quy mô bằng rủi ro?
- **Ý nghĩa BA:** Đặt ngay đầu dashboard để người dùng thấy “sức khỏe hiện tại” trước khi xem chi tiết. Với doanh nghiệp tài chính, tăng tài sản/cho vay chỉ tốt nếu vốn, thanh khoản và chi phí dự phòng không xấu đi.
- **Công thức / logic:** Hiển thị latest period; delta YoY/QoQ = current / comparable - 1. Với chỉ tiêu chi phí/dự phòng, tăng được đánh màu đỏ theo quy tắc lower-is-better.
- **Tooltip bắt buộc:** Tên KPI, kỳ báo cáo, giá trị, YoY/QoQ badge, công thức, nhận định tự động: ví dụ “Tài sản tăng 12% nhưng VCSH giảm 3% → leverage tăng, cần kiểm tra rủi ro vốn”.
- **Bảng số liệu bắt buộc:** Bảng Executive Summary gồm metric, kỳ hiện tại, cùng kỳ, YoY, quý trước, QoQ, đơn vị, nguồn alias được match.
- **Metric keys & mapping dùng cho chart:**
  - `total_assets` — Tổng tài sản — **WHERE ind_name IN:** `TỔNG CỘNG TÀI SẢN`, `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`
  - `customer_loans_net` — Cho vay khách hàng ròng — **WHERE ind_name IN:** `Loans and advances to customers, net`
  - `total_equity` — Vốn chủ sở hữu — **WHERE ind_name IN:** `NGUỒN VỐN CHỦ SỞ HỮU`, `Nguồn vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU`, `Vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU (đồng)`
  - `net_interest_income` — Thu nhập lãi thuần / NII — **WHERE ind_name IN:** `Net Interest Income`, `Thu nhập lãi thuần`
  - `pbt` — Lợi nhuận trước thuế / PBT — **WHERE ind_name IN:** `LN trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận trước thuế`, `Lợi nhuận trước Thuế Thu nhập doanh nghiệp`, `Lợi nhuận/Lỗ thuần trước thuế`, `Tổng lợi nhuận kế toán`, `TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ`, `Tổng lợi nhuận trước thuế`
  - `pat_parent` — LNST cổ đông công ty mẹ — **WHERE ind_name IN:** `Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)`
  - `credit_provision_expense` — Chi phí dự phòng rủi ro tín dụng — **WHERE ind_name IN:** `Chi phí dự phòng rủi ro tín dụng`

### EXE_02 — Profit Bridge: từ NII/TOI đến LNST

- **Loại chart / kích thước:** Waterfall chart — Large 8/12 width.
- **Insight cần trả lời:** Lợi nhuận bị kéo xuống bởi chi phí vốn, Opex hay dự phòng?
- **Ý nghĩa BA:** Chart insight quan trọng nhất vì doanh nghiệp tài chính thường có doanh thu lãi lớn nhưng lợi nhuận cuối cùng phụ thuộc vào chi phí vốn và dự phòng.
- **Công thức / logic:** Waterfall ưu tiên dùng chỉ tiêu tổng nếu có: NII → +Net fee/trading/other income → TOI → -Opex → -Credit provision → PBT → -Tax → PAT/PAT parent. Không cộng trùng dòng tổng và dòng con.
- **Tooltip bắt buộc:** Mỗi cột hiển thị giá trị, % TOI, YoY, tác động tăng/giảm lên PBT. Cột dự phòng luôn có tooltip “chi phí rủi ro tín dụng”.
- **Bảng số liệu bắt buộc:** Bảng P&L bridge theo kỳ: từng line item, giá trị, % TOI, YoY, QoQ.
- **Metric keys & mapping dùng cho chart:**
  - `interest_income` — Thu nhập lãi — **WHERE ind_name IN:** `Interest and Similar Income`, `Thu nhập lãi`, `Thu nhập lãi và các khoản tương tự`
  - `interest_expense` — Chi phí lãi — **WHERE ind_name IN:** `Chi phí Lãi vay`, `Chi phí lãi và các chi phí tương tự`, `Chi phí lãi và các khoản tương tự`, `Chi phí tiền lãi vay`, `Interest and Similar Expenses`, `Trong đó: Chi phí lãi vay`
  - `net_interest_income` — Thu nhập lãi thuần / NII — **WHERE ind_name IN:** `Net Interest Income`, `Thu nhập lãi thuần`
  - `fee_income` — Thu nhập dịch vụ — **WHERE ind_name IN:** `Fees and Comission Income`, `Thu nhập từ hoạt động dịch vụ`
  - `fee_expense` — Chi phí dịch vụ — **WHERE ind_name IN:** `Chi phí hoạt động dịch vụ`, `Fees and Comission Expenses`
  - `total_operating_income` — Tổng thu nhập hoạt động / TOI — **WHERE ind_name IN:** `Total operating revenue`, `Tổng thu nhập hoạt động`
  - `operating_expenses` — Chi phí hoạt động / Opex — **WHERE ind_name IN:** `Chi phí bán hàng`, `Chi phí hoạt động`, `CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN`, `Chi phí quản lý DN`, `Chi phí quản lý doanh nghiệp`, `Cộng chi phí hoạt động`
  - `credit_provision_expense` — Chi phí dự phòng rủi ro tín dụng — **WHERE ind_name IN:** `Chi phí dự phòng rủi ro tín dụng`
  - `pbt` — Lợi nhuận trước thuế / PBT — **WHERE ind_name IN:** `LN trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận trước thuế`, `Lợi nhuận trước Thuế Thu nhập doanh nghiệp`, `Lợi nhuận/Lỗ thuần trước thuế`, `Tổng lợi nhuận kế toán`, `TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ`, `Tổng lợi nhuận trước thuế`
  - `pat` — Lợi nhuận sau thuế / PAT — **WHERE ind_name IN:** `LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN`, `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp`
  - `pat_parent` — LNST cổ đông công ty mẹ — **WHERE ind_name IN:** `Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)`

---

## Tab 1 - Balance Sheet & Funding

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### BSF_01 — Asset–Funding Map

- **Loại chart / kích thước:** Dual stacked bar + line leverage — Hero full width.
- **Insight cần trả lời:** Quy mô tài sản được tài trợ bởi vốn ổn định hay vốn ngắn hạn/bán buôn?
- **Ý nghĩa BA:** Đây là chart đầu tab vì trong ngành tài chính, cấu trúc funding quyết định khả năng tăng trưởng. Với FinCo, phụ thuộc quá nhiều vào vay TCTD/giấy tờ có giá làm tăng rollover risk; với bank, tiền gửi khách hàng là nguồn lõi.
- **Công thức / logic:** Asset stack = loans + securities + placements + cash + other residual. Funding stack = deposits + borrowings from CIs + valuable papers + debt + equity + residual. Leverage = total_assets / total_equity.
- **Tooltip bắt buộc:** Khi hover từng stack: giá trị, % total assets/sources, YoY, QoQ, risk note. Ví dụ “Vay TCTD khác: 42% nguồn vốn, tăng 18% YoY → rủi ro rollover tăng”.
- **Bảng số liệu bắt buộc:** Bảng cơ cấu bảng cân đối: asset/funding bucket, metric_key, giá trị, tỷ trọng, YoY, QoQ, aliases matched.
- **Metric keys & mapping dùng cho chart:**
  - `total_assets` — Tổng tài sản — **WHERE ind_name IN:** `TỔNG CỘNG TÀI SẢN`, `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`
  - `customer_loans_net` — Cho vay khách hàng ròng — **WHERE ind_name IN:** `Loans and advances to customers, net`
  - `trading_securities_asset` — Chứng khoán kinh doanh — **WHERE ind_name IN:** `_Chứng khoán kinh doanh`, `Chứng khoán kinh doanh`, `Trading Securities`, `Trading Securities, net`
  - `investment_securities_asset` — Chứng khoán đầu tư — **WHERE ind_name IN:** `Available-for Sales Securities`, `Chứng khoán đầu tư`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Chứng khoán đầu tư sẵn sàng để bán`, `Held-to-Maturity Securities`, `Investment Securities`
  - `cash_and_equivalents` — Tiền và tương đương tiền — **WHERE ind_name IN:** `Tiền và các khoản tương đương tiền`, `Tiền và tương đương tiền`, `Tiền và tương đương tiền (đồng)`
  - `placements_credit_institutions` — Tiền gửi/cho vay TCTD khác — **WHERE ind_name IN:** `Cho vay các TCTD khác`, `Placements with and loans to other credit institutions`, `Tiền gửi tại các TCTD khác và cho vay các TCTD khác`, `Tiền gửi và cho vay các TCTD khác`, `Tiền, Vàng gửi tại các TCTD khác`, `Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác`
  - `total_equity` — Vốn chủ sở hữu — **WHERE ind_name IN:** `NGUỒN VỐN CHỦ SỞ HỮU`, `Nguồn vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU`, `Vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU (đồng)`
  - `customer_deposits` — Tiền gửi khách hàng — **WHERE ind_name IN:** `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng`
  - `borrowings_credit_institutions` — Tiền gửi và vay TCTD khác — **WHERE ind_name IN:** `Tiền gửi và vay các Tổ chức tín dụng khác`, `Vay các TCTD khác`
  - `valuable_papers_issued` — Giấy tờ có giá phát hành — **WHERE ind_name IN:** `Convertible bonds/CDs and other valuable papers issued`, `Phát hành giấy tờ có giá`
  - `short_term_debt` — Vay và nợ ngắn hạn — **WHERE ind_name IN:** `Nợ ngắn hạn`, `Nợ ngắn hạn (đồng)`, `Trái phiếu phát hành ngắn hạn`, `Vay ngắn hạn`, `Vay và nợ ngắn hạn`
  - `long_term_debt` — Vay và nợ dài hạn — **WHERE ind_name IN:** `Nợ dài hạn`, `Nợ dài hạn (đồng)`, `Trái phiếu phát hành dài hạn`, `Vay dài hạn`, `Vay và nợ dài hạn`

### BSF_02 — Loan & Earning Asset Growth

- **Loại chart / kích thước:** Combo line/bar — Large 6/12.
- **Insight cần trả lời:** Tăng trưởng tài sản sinh lãi đến từ cho vay hay chứng khoán/tiền gửi TCTD?
- **Ý nghĩa BA:** Giúp phân biệt tăng trưởng chất lượng cao (dư nợ cho vay tốt, NIM cao) với tăng trưởng phòng thủ (tiền gửi/chứng khoán).
- **Công thức / logic:** Earning assets proxy = customer_loans_net + placements + trading/investment securities. Growth = current/comparable - 1.
- **Tooltip bắt buộc:** Kỳ, từng bucket, giá trị, tỷ trọng, YoY/QoQ, ghi chú: “proxy” nếu không có bảng tài sản sinh lãi chuẩn.
- **Bảng số liệu bắt buộc:** Bảng tài sản sinh lãi theo kỳ.
- **Metric keys & mapping dùng cho chart:**
  - `customer_loans_gross` — Cho vay khách hàng / khoản cho vay gộp — **WHERE ind_name IN:** `_Cho vay khách hàng`, `Cho vay khách hàng`, `Các khoản cho vay`, `Loans and advances to customers`
  - `customer_loans_net` — Cho vay khách hàng ròng — **WHERE ind_name IN:** `Loans and advances to customers, net`
  - `placements_credit_institutions` — Tiền gửi/cho vay TCTD khác — **WHERE ind_name IN:** `Cho vay các TCTD khác`, `Placements with and loans to other credit institutions`, `Tiền gửi tại các TCTD khác và cho vay các TCTD khác`, `Tiền gửi và cho vay các TCTD khác`, `Tiền, Vàng gửi tại các TCTD khác`, `Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác`
  - `trading_securities_asset` — Chứng khoán kinh doanh — **WHERE ind_name IN:** `_Chứng khoán kinh doanh`, `Chứng khoán kinh doanh`, `Trading Securities`, `Trading Securities, net`
  - `investment_securities_asset` — Chứng khoán đầu tư — **WHERE ind_name IN:** `Available-for Sales Securities`, `Chứng khoán đầu tư`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Chứng khoán đầu tư sẵn sàng để bán`, `Held-to-Maturity Securities`, `Investment Securities`

### BSF_03 — Wholesale Funding Dependency

- **Loại chart / kích thước:** Stacked area trend — Medium 6/12.
- **Insight cần trả lời:** Nguồn vốn có phụ thuộc quá mức vào vay TCTD và giấy tờ có giá không?
- **Ý nghĩa BA:** Đặc biệt quan trọng với công ty tài chính vì không có CASA. Chart này giải thích rủi ro funding sau hero chart.
- **Công thức / logic:** Wholesale funding ratio = (borrowings_credit_institutions + valuable_papers_issued + short_term_debt + long_term_debt) / total_sources. Với bank, deposits ratio = customer_deposits / total_sources.
- **Tooltip bắt buộc:** Nguồn vốn, giá trị, % tổng nguồn vốn, YoY; cảnh báo nếu wholesale ratio tăng nhanh hoặc short-term debt chiếm tỷ trọng lớn.
- **Bảng số liệu bắt buộc:** Bảng funding mix theo kỳ và loại nguồn vốn.
- **Metric keys & mapping dùng cho chart:**
  - `borrowings_credit_institutions` — Tiền gửi và vay TCTD khác — **WHERE ind_name IN:** `Tiền gửi và vay các Tổ chức tín dụng khác`, `Vay các TCTD khác`
  - `valuable_papers_issued` — Giấy tờ có giá phát hành — **WHERE ind_name IN:** `Convertible bonds/CDs and other valuable papers issued`, `Phát hành giấy tờ có giá`
  - `short_term_debt` — Vay và nợ ngắn hạn — **WHERE ind_name IN:** `Nợ ngắn hạn`, `Nợ ngắn hạn (đồng)`, `Trái phiếu phát hành ngắn hạn`, `Vay ngắn hạn`, `Vay và nợ ngắn hạn`
  - `long_term_debt` — Vay và nợ dài hạn — **WHERE ind_name IN:** `Nợ dài hạn`, `Nợ dài hạn (đồng)`, `Trái phiếu phát hành dài hạn`, `Vay dài hạn`, `Vay và nợ dài hạn`
  - `customer_deposits` — Tiền gửi khách hàng — **WHERE ind_name IN:** `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng`
  - `total_sources` — Tổng nguồn vốn — **WHERE ind_name IN:** `TỔNG CỘNG NGUỒN VỐN`, `Tổng cộng nguồn vốn`, `TỔNG CỘNG NGUỒN VỐN (đồng)`, `TỔNG CỘNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU`, `TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU`

---

## Tab 2 - Credit & Asset Quality

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### CRQ_01 — Credit Risk Burden: Provision vs Loan Book

- **Loại chart / kích thước:** Hero combo chart: provision expense bar + loans line + credit cost line — Full width.
- **Insight cần trả lời:** Tăng trưởng dư nợ có đang phải trả giá bằng chi phí dự phòng cao hơn không?
- **Ý nghĩa BA:** Đây là insight cốt lõi cho doanh nghiệp tài chính. Nếu dư nợ tăng nhưng chi phí dự phòng tăng nhanh hơn, chất lượng lợi nhuận xấu đi.
- **Công thức / logic:** Credit cost proxy = annualized(credit_provision_expense) / average(customer_loans_gross hoặc customer_loans_net). Coverage proxy = loan_loss_allowance / customer_loans_gross. Nếu thiếu gross loan, dùng net loan và label “proxy”.
- **Tooltip bắt buộc:** Kỳ, dư nợ, dự phòng trong kỳ, credit cost, coverage proxy, YoY/QoQ. Tooltip phải ghi rõ “proxy” nếu không có dữ liệu nhóm nợ.
- **Bảng số liệu bắt buộc:** Bảng credit metrics: loans, allowance, provision expense, credit cost proxy, coverage proxy, YoY, QoQ.
- **Metric keys & mapping dùng cho chart:**
  - `customer_loans_gross` — Cho vay khách hàng / khoản cho vay gộp — **WHERE ind_name IN:** `_Cho vay khách hàng`, `Cho vay khách hàng`, `Các khoản cho vay`, `Loans and advances to customers`
  - `customer_loans_net` — Cho vay khách hàng ròng — **WHERE ind_name IN:** `Loans and advances to customers, net`
  - `loan_loss_allowance` — Dự phòng cho vay / tổn thất tín dụng — **WHERE ind_name IN:** `Dự phòng RR tín dụng`, `Dự phòng rủi  ro cho vay khách hàng`, `Dự phòng rủi ro cho vay khách hàng`, `Dự phòng tổn thất tín dụng`, `Less: Provision for losses on loans and advances to customers`
  - `credit_provision_expense` — Chi phí dự phòng rủi ro tín dụng — **WHERE ind_name IN:** `Chi phí dự phòng rủi ro tín dụng`

### CRQ_02 — NPL / Group 2 / Write-off Monitor

- **Loại chart / kích thước:** Stacked column + line NPL ratio — Large 8/12, chỉ render khi có extension data.
- **Insight cần trả lời:** Nợ nhóm 2 và nợ xấu đang cải thiện hay đang bị che bởi write-off?
- **Ý nghĩa BA:** Chart này rất quan trọng nhưng không được suy diễn từ BCTC nếu dữ liệu không có nhóm nợ. BA rule: nếu thiếu extension table, hiển thị empty state yêu cầu dữ liệu thuyết minh.
- **Công thức / logic:** NPL ratio = npl_balance / gross_loans. Group2 ratio = group2_balance / gross_loans. Write-off ratio = writeoff_amount / avg gross_loans.
- **Tooltip bắt buộc:** Nhóm nợ, giá trị, tỷ lệ trên dư nợ, YoY; warning “write-off tăng nhưng NPL giảm → kiểm tra chất lượng cải thiện thật hay do xóa nợ”.
- **Bảng số liệu bắt buộc:** Bảng nhóm nợ theo kỳ: group1, group2, group3, group4, group5, NPL, write-off, ratios.
- **Metric keys & mapping dùng cho chart:**
  - `group2_balance` — Nợ nhóm 2 — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng thuyết minh nhóm nợ.
  - `npl_balance` — Nợ xấu nhóm 3-5 — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng thuyết minh nhóm nợ.
  - `writeoff_amount` — Xóa nợ trong kỳ — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần thuyết minh dự phòng/loan roll-forward.
  - `customer_loans_gross` — Cho vay khách hàng / khoản cho vay gộp — **WHERE ind_name IN:** `_Cho vay khách hàng`, `Cho vay khách hàng`, `Các khoản cho vay`, `Loans and advances to customers`

### CRQ_03 — Loan Product Risk Mix

- **Loại chart / kích thước:** Horizontal bar sorted by risk — Medium 4/12, chỉ render khi có extension data.
- **Insight cần trả lời:** Dư nợ tập trung vào sản phẩm rủi ro cao nào?
- **Ý nghĩa BA:** Với FinCo, cash loan/thẻ tín dụng thường rủi ro hơn vay có tài sản/điểm bán. Chart này giải thích vì sao credit cost thay đổi.
- **Công thức / logic:** Product share = product_loan_balance / total_product_loan_balance.
- **Tooltip bắt buộc:** Sản phẩm, dư nợ, tỷ trọng, risk label, YoY, NPL nếu có.
- **Bảng số liệu bắt buộc:** Bảng dư nợ theo sản phẩm và tỷ trọng.
- **Metric keys & mapping dùng cho chart:**
  - `loan_product_cash` — Dư nợ vay tiền mặt — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.
  - `loan_product_motorbike` — Dư nợ vay xe máy — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.
  - `loan_product_durables` — Dư nợ vay điện máy — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.
  - `loan_product_credit_card` — Dư nợ thẻ tín dụng — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.

---

## Tab 3 - Profitability & DuPont

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### PRF_01 — ROE Decomposition for Financial Business

- **Loại chart / kích thước:** DuPont tree + waterfall — Hero full width.
- **Insight cần trả lời:** ROE đến từ NIM/fee, kiểm soát chi phí, chi phí rủi ro hay đòn bẩy?
- **Ý nghĩa BA:** Chart này biến ROE từ một con số thành câu chuyện vận hành. Với ngành tài chính, đòn bẩy cao có thể làm ROE đẹp nhưng rủi ro vốn tăng.
- **Công thức / logic:** ROE = PAT parent / avg equity. ROA = PAT / avg total assets. Leverage = avg total assets / avg equity. CIR = operating_expenses / total_operating_income. Credit burden = credit_provision_expense / total_operating_income. NIM proxy = net_interest_income / avg earning assets.
- **Tooltip bắt buộc:** Node, công thức, giá trị, delta, diễn giải. Ví dụ “Credit burden 72% TOI: phần lớn thu nhập hoạt động bị hấp thụ bởi dự phòng”.
- **Bảng số liệu bắt buộc:** Bảng DuPont: ROE, ROA, leverage, NIM proxy, CIR, credit burden, tax burden theo kỳ.
- **Metric keys & mapping dùng cho chart:**
  - `pat_parent` — LNST cổ đông công ty mẹ — **WHERE ind_name IN:** `Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)`
  - `pat` — Lợi nhuận sau thuế / PAT — **WHERE ind_name IN:** `LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN`, `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp`
  - `pbt` — Lợi nhuận trước thuế / PBT — **WHERE ind_name IN:** `LN trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận trước thuế`, `Lợi nhuận trước Thuế Thu nhập doanh nghiệp`, `Lợi nhuận/Lỗ thuần trước thuế`, `Tổng lợi nhuận kế toán`, `TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ`, `Tổng lợi nhuận trước thuế`
  - `total_assets` — Tổng tài sản — **WHERE ind_name IN:** `TỔNG CỘNG TÀI SẢN`, `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`
  - `total_equity` — Vốn chủ sở hữu — **WHERE ind_name IN:** `NGUỒN VỐN CHỦ SỞ HỮU`, `Nguồn vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU`, `Vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU (đồng)`
  - `net_interest_income` — Thu nhập lãi thuần / NII — **WHERE ind_name IN:** `Net Interest Income`, `Thu nhập lãi thuần`
  - `total_operating_income` — Tổng thu nhập hoạt động / TOI — **WHERE ind_name IN:** `Total operating revenue`, `Tổng thu nhập hoạt động`
  - `operating_expenses` — Chi phí hoạt động / Opex — **WHERE ind_name IN:** `Chi phí bán hàng`, `Chi phí hoạt động`, `CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN`, `Chi phí quản lý DN`, `Chi phí quản lý doanh nghiệp`, `Cộng chi phí hoạt động`
  - `credit_provision_expense` — Chi phí dự phòng rủi ro tín dụng — **WHERE ind_name IN:** `Chi phí dự phòng rủi ro tín dụng`
  - `customer_loans_net` — Cho vay khách hàng ròng — **WHERE ind_name IN:** `Loans and advances to customers, net`

### PRF_02 — NIM / Asset Yield / Cost of Fund Trend

- **Loại chart / kích thước:** Multi-line trend — Large 8/12.
- **Insight cần trả lời:** Biên lãi thay đổi do yield giảm hay chi phí vốn tăng?
- **Ý nghĩa BA:** Giải thích sâu cho lợi nhuận. Đặc biệt với FinCo, cost of fund tăng có thể làm lợi nhuận giảm dù yield vẫn cao.
- **Công thức / logic:** Earning assets proxy = loans + placements + securities. Interest-bearing liabilities proxy = deposits + borrowings + valuable papers. Asset yield = annualized(interest_income)/avg earning assets. Cost of fund = annualized(interest_expense)/avg interest-bearing liabilities. NIM proxy = annualized(NII)/avg earning assets.
- **Tooltip bắt buộc:** Kỳ, yield, cost of fund, NIM, driver note. Gắn nhãn proxy nếu thiếu earning asset/liability chuẩn.
- **Bảng số liệu bắt buộc:** Bảng margin metrics theo kỳ.
- **Metric keys & mapping dùng cho chart:**
  - `interest_income` — Thu nhập lãi — **WHERE ind_name IN:** `Interest and Similar Income`, `Thu nhập lãi`, `Thu nhập lãi và các khoản tương tự`
  - `interest_expense` — Chi phí lãi — **WHERE ind_name IN:** `Chi phí Lãi vay`, `Chi phí lãi và các chi phí tương tự`, `Chi phí lãi và các khoản tương tự`, `Chi phí tiền lãi vay`, `Interest and Similar Expenses`, `Trong đó: Chi phí lãi vay`
  - `net_interest_income` — Thu nhập lãi thuần / NII — **WHERE ind_name IN:** `Net Interest Income`, `Thu nhập lãi thuần`
  - `customer_loans_net` — Cho vay khách hàng ròng — **WHERE ind_name IN:** `Loans and advances to customers, net`
  - `placements_credit_institutions` — Tiền gửi/cho vay TCTD khác — **WHERE ind_name IN:** `Cho vay các TCTD khác`, `Placements with and loans to other credit institutions`, `Tiền gửi tại các TCTD khác và cho vay các TCTD khác`, `Tiền gửi và cho vay các TCTD khác`, `Tiền, Vàng gửi tại các TCTD khác`, `Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác`
  - `trading_securities_asset` — Chứng khoán kinh doanh — **WHERE ind_name IN:** `_Chứng khoán kinh doanh`, `Chứng khoán kinh doanh`, `Trading Securities`, `Trading Securities, net`
  - `investment_securities_asset` — Chứng khoán đầu tư — **WHERE ind_name IN:** `Available-for Sales Securities`, `Chứng khoán đầu tư`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Chứng khoán đầu tư sẵn sàng để bán`, `Held-to-Maturity Securities`, `Investment Securities`
  - `borrowings_credit_institutions` — Tiền gửi và vay TCTD khác — **WHERE ind_name IN:** `Tiền gửi và vay các Tổ chức tín dụng khác`, `Vay các TCTD khác`
  - `valuable_papers_issued` — Giấy tờ có giá phát hành — **WHERE ind_name IN:** `Convertible bonds/CDs and other valuable papers issued`, `Phát hành giấy tờ có giá`
  - `customer_deposits` — Tiền gửi khách hàng — **WHERE ind_name IN:** `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng`

### PRF_03 — Profitability Peer / Period Ranking

- **Loại chart / kích thước:** Heatmap table — Medium 4/12.
- **Insight cần trả lời:** Kỳ nào tạo giá trị tốt/xấu nhất?
- **Ý nghĩa BA:** Bảng heatmap không thay chart hero nhưng bắt buộc có để kiểm toán số liệu và so sánh nhanh.
- **Công thức / logic:** Derived metrics từ các metric_key đã định nghĩa; không query trực tiếp `ind_name` cho ratio nếu ratio không có trong dữ liệu.
- **Tooltip bắt buộc:** Hover từng ô giải thích higher/lower is better và công thức.
- **Bảng số liệu bắt buộc:** Chính là bảng heatmap; có export CSV.
- **Metric keys & mapping dùng cho chart:**
  - `roe` — derived metric, không query trực tiếp `ind_name`.
  - `roa` — derived metric, không query trực tiếp `ind_name`.
  - `nim_proxy` — derived metric, không query trực tiếp `ind_name`.
  - `cir` — derived metric, không query trực tiếp `ind_name`.
  - `credit_cost_proxy` — derived metric, không query trực tiếp `ind_name`.

---

## Tab 4 - Income & Expense

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### INE_01 — Revenue Quality Mix

- **Loại chart / kích thước:** Stacked bar + % contribution — Hero 8/12.
- **Insight cần trả lời:** Thu nhập phụ thuộc vào lãi thuần hay có đa dạng hóa phí/tự doanh?
- **Ý nghĩa BA:** Trong ngân hàng/FinCo, NII thường là lõi; với công ty chứng khoán, tự doanh/môi giới có thể chi phối. Chart này cho thấy chất lượng và mức bền vững của doanh thu.
- **Công thức / logic:** Revenue mix dùng line item net nếu có; nếu không có net fee thì fee_income - fee_expense. Tỷ trọng = từng bucket / total_operating_income. Không cộng cùng lúc gross và net.
- **Tooltip bắt buộc:** Bucket, giá trị, % TOI, YoY, volatility label. Tự doanh/chứng khoán gắn nhãn “biến động cao”.
- **Bảng số liệu bắt buộc:** Bảng doanh thu theo bucket, % TOI, YoY, QoQ.
- **Metric keys & mapping dùng cho chart:**
  - `net_interest_income` — Thu nhập lãi thuần / NII — **WHERE ind_name IN:** `Net Interest Income`, `Thu nhập lãi thuần`
  - `net_fee_income` — Lãi thuần dịch vụ — **WHERE ind_name IN:** `Lãi thuần từ hoạt động dịch vụ`, `Net Fee and Commission Income`
  - `fee_income` — Thu nhập dịch vụ — **WHERE ind_name IN:** `Fees and Comission Income`, `Thu nhập từ hoạt động dịch vụ`
  - `fee_expense` — Chi phí dịch vụ — **WHERE ind_name IN:** `Chi phí hoạt động dịch vụ`, `Fees and Comission Expenses`
  - `fx_gold_result` — Lãi/lỗ ngoại hối và vàng — **WHERE ind_name IN:** `Kinh doanh ngoại hối và vàng`, `Net gain (loss) from foreign currency and gold dealings`
  - `securities_trading_result` — Lãi/lỗ kinh doanh chứng khoán — **WHERE ind_name IN:** `Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh`, `Net gain (loss) from trading of trading securities`
  - `investment_securities_result` — Lãi/lỗ chứng khoán đầu tư — **WHERE ind_name IN:** `Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư`, `Net gain (loss) from disposal of investment securities`
  - `total_operating_income` — Tổng thu nhập hoạt động / TOI — **WHERE ind_name IN:** `Total operating revenue`, `Tổng thu nhập hoạt động`
  - `brokerage_revenue` — Doanh thu môi giới chứng khoán — **WHERE ind_name IN:** `Doanh thu môi giới chứng khoán`
  - `custody_revenue` — Doanh thu lưu ký chứng khoán — **WHERE ind_name IN:** `Doanh thu lưu ký chứng khoán`

### INE_02 — Cost Drag Map

- **Loại chart / kích thước:** Stacked bar of Opex + provision + interest expense — Hero 4/12.
- **Insight cần trả lời:** Chi phí nào đang ăn mòn thu nhập mạnh nhất?
- **Ý nghĩa BA:** Chart đặt cạnh revenue mix để người dùng thấy ngay doanh thu có bị hấp thụ bởi chi phí vốn, vận hành hay rủi ro.
- **Công thức / logic:** Cost drag ratio = cost bucket / total_operating_income. Với interest_expense, có thể hiển thị riêng trước NII hoặc trong bảng chi phí vốn tùy mô hình báo cáo.
- **Tooltip bắt buộc:** Chi phí, giá trị, % TOI, YoY, lower-is-better badge, diễn giải.
- **Bảng số liệu bắt buộc:** Bảng cost drag: interest expense, opex, provision, tax nếu có.
- **Metric keys & mapping dùng cho chart:**
  - `interest_expense` — Chi phí lãi — **WHERE ind_name IN:** `Chi phí Lãi vay`, `Chi phí lãi và các chi phí tương tự`, `Chi phí lãi và các khoản tương tự`, `Chi phí tiền lãi vay`, `Interest and Similar Expenses`, `Trong đó: Chi phí lãi vay`
  - `operating_expenses` — Chi phí hoạt động / Opex — **WHERE ind_name IN:** `Chi phí bán hàng`, `Chi phí hoạt động`, `CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN`, `Chi phí quản lý DN`, `Chi phí quản lý doanh nghiệp`, `Cộng chi phí hoạt động`
  - `credit_provision_expense` — Chi phí dự phòng rủi ro tín dụng — **WHERE ind_name IN:** `Chi phí dự phòng rủi ro tín dụng`
  - `total_operating_income` — Tổng thu nhập hoạt động / TOI — **WHERE ind_name IN:** `Total operating revenue`, `Tổng thu nhập hoạt động`
  - `pbt` — Lợi nhuận trước thuế / PBT — **WHERE ind_name IN:** `LN trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận trước thuế`, `Lợi nhuận trước Thuế Thu nhập doanh nghiệp`, `Lợi nhuận/Lỗ thuần trước thuế`, `Tổng lợi nhuận kế toán`, `TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ`, `Tổng lợi nhuận trước thuế`

### INE_03 — Divergence: NII vs PBT/PAT

- **Loại chart / kích thước:** Indexed line chart base=100 — Full width explainer.
- **Insight cần trả lời:** Doanh thu tăng có chuyển hóa thành lợi nhuận không?
- **Ý nghĩa BA:** Một chart giải thích rất mạnh: nếu NII tăng nhưng PBT/PAT đi ngang hoặc giảm, vấn đề nằm ở chi phí/rủi ro.
- **Công thức / logic:** Index mỗi series = value / value_base_period * 100. Có thể thêm shaded area cho giai đoạn provision spike.
- **Tooltip bắt buộc:** Series, index, giá trị gốc, YoY, driver gợi ý từ cost/provision.
- **Bảng số liệu bắt buộc:** Bảng indexed values và raw values.
- **Metric keys & mapping dùng cho chart:**
  - `net_interest_income` — Thu nhập lãi thuần / NII — **WHERE ind_name IN:** `Net Interest Income`, `Thu nhập lãi thuần`
  - `total_operating_income` — Tổng thu nhập hoạt động / TOI — **WHERE ind_name IN:** `Total operating revenue`, `Tổng thu nhập hoạt động`
  - `pbt` — Lợi nhuận trước thuế / PBT — **WHERE ind_name IN:** `LN trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận trước thuế`, `Lợi nhuận trước Thuế Thu nhập doanh nghiệp`, `Lợi nhuận/Lỗ thuần trước thuế`, `Tổng lợi nhuận kế toán`, `TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ`, `Tổng lợi nhuận trước thuế`
  - `pat` — Lợi nhuận sau thuế / PAT — **WHERE ind_name IN:** `LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN`, `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp`
  - `pat_parent` — LNST cổ đông công ty mẹ — **WHERE ind_name IN:** `Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)`
  - `operating_expenses` — Chi phí hoạt động / Opex — **WHERE ind_name IN:** `Chi phí bán hàng`, `Chi phí hoạt động`, `CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN`, `Chi phí quản lý DN`, `Chi phí quản lý doanh nghiệp`, `Cộng chi phí hoạt động`
  - `credit_provision_expense` — Chi phí dự phòng rủi ro tín dụng — **WHERE ind_name IN:** `Chi phí dự phòng rủi ro tín dụng`

---

## Tab 5 - Liquidity, Cash Flow & ALM

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### LQA_01 — Liquidity Survival Snapshot

- **Loại chart / kích thước:** Hero KPI + stacked bar — Full width.
- **Insight cần trả lời:** Doanh nghiệp có đủ tài sản thanh khoản để chịu áp lực funding ngắn hạn không?
- **Ý nghĩa BA:** Đặt đầu tab vì rủi ro thanh khoản có thể xảy ra trước khi lợi nhuận xấu đi. Với FinCo, rủi ro là borrow short - lend long.
- **Công thức / logic:** Liquid asset proxy = cash + SBV balance + placements + trading securities haircut + liquid investment securities haircut. Short-term wholesale funding proxy = short_term_debt + borrowings_credit_institutions + valuable_papers_issued due < 1Y nếu có maturity. Liquidity proxy = liquid assets / short-term wholesale funding.
- **Tooltip bắt buộc:** Bucket, giá trị, haircut, proxy note, YoY. Cảnh báo nếu liquidity proxy < 1 hoặc giảm mạnh.
- **Bảng số liệu bắt buộc:** Bảng thanh khoản: liquid assets, funding ngắn hạn, liquidity proxy, assumptions/haircuts.
- **Metric keys & mapping dùng cho chart:**
  - `cash_and_equivalents` — Tiền và tương đương tiền — **WHERE ind_name IN:** `Tiền và các khoản tương đương tiền`, `Tiền và tương đương tiền`, `Tiền và tương đương tiền (đồng)`
  - `sbv_balance` — Tiền gửi tại NHNN — **WHERE ind_name IN:** `Tiền gửi tại ngân hàng nhà nước Việt Nam`, `Tiền gửi tại NHNN`
  - `placements_credit_institutions` — Tiền gửi/cho vay TCTD khác — **WHERE ind_name IN:** `Cho vay các TCTD khác`, `Placements with and loans to other credit institutions`, `Tiền gửi tại các TCTD khác và cho vay các TCTD khác`, `Tiền gửi và cho vay các TCTD khác`, `Tiền, Vàng gửi tại các TCTD khác`, `Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác`
  - `trading_securities_asset` — Chứng khoán kinh doanh — **WHERE ind_name IN:** `_Chứng khoán kinh doanh`, `Chứng khoán kinh doanh`, `Trading Securities`, `Trading Securities, net`
  - `investment_securities_asset` — Chứng khoán đầu tư — **WHERE ind_name IN:** `Available-for Sales Securities`, `Chứng khoán đầu tư`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Chứng khoán đầu tư sẵn sàng để bán`, `Held-to-Maturity Securities`, `Investment Securities`
  - `short_term_debt` — Vay và nợ ngắn hạn — **WHERE ind_name IN:** `Nợ ngắn hạn`, `Nợ ngắn hạn (đồng)`, `Trái phiếu phát hành ngắn hạn`, `Vay ngắn hạn`, `Vay và nợ ngắn hạn`
  - `borrowings_credit_institutions` — Tiền gửi và vay TCTD khác — **WHERE ind_name IN:** `Tiền gửi và vay các Tổ chức tín dụng khác`, `Vay các TCTD khác`
  - `valuable_papers_issued` — Giấy tờ có giá phát hành — **WHERE ind_name IN:** `Convertible bonds/CDs and other valuable papers issued`, `Phát hành giấy tờ có giá`

### LQA_02 — Cash Flow Engine: CFO/CFI/CFF

- **Loại chart / kích thước:** Stacked column + net cash line — Large 8/12.
- **Insight cần trả lời:** Tiền tăng/giảm đến từ hoạt động kinh doanh, đầu tư hay tài chính?
- **Ý nghĩa BA:** Doanh nghiệp tài chính có lợi nhuận kế toán nhưng dòng tiền âm kéo dài có thể là tín hiệu tăng trưởng tín dụng quá nhanh hoặc funding căng.
- **Công thức / logic:** Net cash flow = CFO + CFI + CFF + FX effect nếu có. Reconcile: cash_end ≈ cash_begin + net_cash_flow + fx_effect.
- **Tooltip bắt buộc:** Kỳ, CFO/CFI/CFF, net cash, reconcile warning nếu lệch.
- **Bảng số liệu bắt buộc:** Bảng lưu chuyển tiền tệ đầy đủ theo kỳ.
- **Metric keys & mapping dùng cho chart:**
  - `cfo` — Lưu chuyển tiền thuần từ HĐKD / CFO — **WHERE ind_name IN:** `Lưu chuyển tiền thuần từ hoạt động kinh doanh`, `Lưu chuyển tiền thuần từ HĐKD`, `Lưu chuyển tiền tệ ròng từ các hoạt động SXKD`
  - `cfi` — Lưu chuyển tiền thuần từ HĐ đầu tư / CFI — **WHERE ind_name IN:** `Lưu chuyển tiền thuần từ hoạt động đầu tư`, `Lưu chuyển tiền thuần từ HĐ đầu tư`
  - `cff` — Lưu chuyển tiền thuần từ HĐ tài chính / CFF — **WHERE ind_name IN:** `Lưu chuyển tiền thuần từ hoạt động tài chính`, `Lưu chuyển tiền thuần từ HĐ tài chính`
  - `net_cash_flow` — Lưu chuyển tiền thuần trong kỳ — **WHERE ind_name IN:** `Lưu chuyển tiền thuần trong kỳ`
  - `cash_begin` — Tiền và tương đương tiền đầu kỳ — **WHERE ind_name IN:** `Tiền và các khoản tương đương tiền đầu kỳ`, `Tiền và tương đương tiền đầu kỳ`
  - `cash_end` — Tiền và tương đương tiền cuối kỳ — **WHERE ind_name IN:** `Tiền và các khoản tương đương tiền cuối kỳ`, `Tiền và tương đương tiền cuối kỳ`
  - `interest_paid_cf` — Lãi vay đã trả — **WHERE ind_name IN:** `Chi phí lãi vay đã trả`, `Chi phí lãi và các chi phí tương tự đã trả`, `Tiền lãi vay đã trả`
  - `tax_paid_cf` — Thuế TNDN đã nộp — **WHERE ind_name IN:** `Thuế thu nhập doanh nghiệp đã nộp`, `Thuế TNDN đã nộp`, `Tiền thu nhập doanh nghiệp đã trả`

### LQA_03 — Maturity Gap Matrix

- **Loại chart / kích thước:** Heatmap matrix + cumulative line — Full width explainer, chỉ render khi có extension ALM.
- **Insight cần trả lời:** Khe hở đáo hạn âm tập trung ở bucket nào?
- **Ý nghĩa BA:** Không có trong BCTC line item thông thường. Nếu có bảng ALM, đây là chart giải thích rủi ro rollover tốt nhất.
- **Công thức / logic:** Gap bucket = assets_due_bucket - liabilities_due_bucket. Cumulative gap = running sum gap. Lower-is-better cho gap âm tuyệt đối lớn.
- **Tooltip bắt buộc:** Bucket kỳ hạn, asset due, liability due, gap, cumulative gap, risk note.
- **Bảng số liệu bắt buộc:** Bảng ALM maturity bucket: on demand, <1M, 1-3M, 3-12M, 1-5Y, >5Y.
- **Metric keys & mapping dùng cho chart:**
  - `maturity_asset_bucket` — Tài sản theo kỳ hạn — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng ALM maturity bucket.
  - `maturity_liability_bucket` — Nợ phải trả theo kỳ hạn — **source:** extension table. **Rule:** Không có trong mapping BCTC chính; cần bảng ALM maturity bucket.

---

## Tab 6 - Securities / Investment Business Lens

**Nguyên tắc bố cục tab:** chart insight lớn đặt đầu tab; các chart giải thích đặt sau; cuối tab luôn có bảng số liệu để đối soát và export.

### SEC_01 — Securities Business Revenue Mix

- **Loại chart / kích thước:** Hero stacked bar — Full width, render cho CTCK hoặc DN có chỉ tiêu chứng khoán.
- **Insight cần trả lời:** Doanh thu chứng khoán đến từ môi giới, tự doanh, lưu ký hay bảo lãnh?
- **Ý nghĩa BA:** Với công ty chứng khoán, lợi nhuận có thể biến động mạnh nếu phụ thuộc tự doanh. Chart này tách doanh thu recurring và market-sensitive.
- **Công thức / logic:** Recurring fee = brokerage + custody + advisory/underwriting nếu có. Market-sensitive = trading result + investment securities result.
- **Tooltip bắt buộc:** Bucket, giá trị, % tổng doanh thu hoạt động, volatility label, YoY.
- **Bảng số liệu bắt buộc:** Bảng doanh thu chứng khoán theo bucket.
- **Metric keys & mapping dùng cho chart:**
  - `brokerage_revenue` — Doanh thu môi giới chứng khoán — **WHERE ind_name IN:** `Doanh thu môi giới chứng khoán`
  - `custody_revenue` — Doanh thu lưu ký chứng khoán — **WHERE ind_name IN:** `Doanh thu lưu ký chứng khoán`
  - `securities_trading_result` — Lãi/lỗ kinh doanh chứng khoán — **WHERE ind_name IN:** `Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh`, `Net gain (loss) from trading of trading securities`
  - `investment_securities_result` — Lãi/lỗ chứng khoán đầu tư — **WHERE ind_name IN:** `Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư`, `Net gain (loss) from disposal of investment securities`
  - `fee_income` — Thu nhập dịch vụ — **WHERE ind_name IN:** `Fees and Comission Income`, `Thu nhập từ hoạt động dịch vụ`
  - `total_operating_income` — Tổng thu nhập hoạt động / TOI — **WHERE ind_name IN:** `Total operating revenue`, `Tổng thu nhập hoạt động`

### SEC_02 — Margin Lending Proxy & Funding

- **Loại chart / kích thước:** Combo chart — Large 8/12.
- **Insight cần trả lời:** Dư nợ cho vay/margin tăng có đi cùng áp lực vốn vay không?
- **Ý nghĩa BA:** Nếu không có trường margin lending riêng, dùng phải thu về cho vay như proxy, nhưng phải gắn nhãn rõ để tránh hiểu sai.
- **Công thức / logic:** Margin lending proxy = phải thu về cho vay ngắn hạn + dài hạn. Funding cost = interest_expense / avg debt funding.
- **Tooltip bắt buộc:** Giá trị proxy, funding, cost, YoY, cảnh báo proxy.
- **Bảng số liệu bắt buộc:** Bảng margin/funding proxy.
- **Metric keys & mapping dùng cho chart:**
  - `margin_lending_receivable` — Phải thu về cho vay — **WHERE ind_name IN:** `Phải thu về cho vay dài hạn`, `Phải thu về cho vay dài hạn (đồng)`, `Phải thu về cho vay ngắn hạn`, `Phải thu về cho vay ngắn hạn (đồng)`
  - `short_term_debt` — Vay và nợ ngắn hạn — **WHERE ind_name IN:** `Nợ ngắn hạn`, `Nợ ngắn hạn (đồng)`, `Trái phiếu phát hành ngắn hạn`, `Vay ngắn hạn`, `Vay và nợ ngắn hạn`
  - `long_term_debt` — Vay và nợ dài hạn — **WHERE ind_name IN:** `Nợ dài hạn`, `Nợ dài hạn (đồng)`, `Trái phiếu phát hành dài hạn`, `Vay dài hạn`, `Vay và nợ dài hạn`
  - `interest_income` — Thu nhập lãi — **WHERE ind_name IN:** `Interest and Similar Income`, `Thu nhập lãi`, `Thu nhập lãi và các khoản tương tự`
  - `interest_expense` — Chi phí lãi — **WHERE ind_name IN:** `Chi phí Lãi vay`, `Chi phí lãi và các chi phí tương tự`, `Chi phí lãi và các khoản tương tự`, `Chi phí tiền lãi vay`, `Interest and Similar Expenses`, `Trong đó: Chi phí lãi vay`

---


## 11. SQL/vibecoding implementation rules

### 11.1. Không query trực tiếp bằng một `ind_name`

Sai:

```sql
SELECT *
FROM financial_statement_fact
WHERE ind_name = 'Lợi nhuận trước thuế';
```

Đúng:

```sql
SELECT *
FROM financial_statement_fact
WHERE ind_name IN ('LN trước thuế', 'Lãi/Lỗ ròng trước thuế', 'Lợi nhuận trước thuế', 'Lợi nhuận trước Thuế Thu nhập doanh nghiệp', 'Lợi nhuận/Lỗ thuần trước thuế', 'Tổng lợi nhuận kế toán', 'TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ', 'Tổng lợi nhuận trước thuế');
```

### 11.2. CTE chuẩn hóa chỉ tiêu

```sql
WITH metric_map AS (
  -- Generate từ Appendix A hoặc bảng metric_indicator_alias
  SELECT 'pbt' AS metric_key, 'Lợi nhuận trước thuế' AS business_name, unnest(ARRAY[
    'LN trước thuế', 'Lãi/Lỗ ròng trước thuế', 'Lợi nhuận trước thuế', 'Lợi nhuận trước Thuế Thu nhập doanh nghiệp', 'Lợi nhuận/Lỗ thuần trước thuế', 'Tổng lợi nhuận kế toán', 'TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ', 'Tổng lợi nhuận trước thuế'
  ]) AS ind_name_alias
),
normalized AS (
  SELECT
    f.ticker,
    f.period_end_date,
    m.metric_key,
    m.business_name,
    f.ind_name,
    f.value,
    f.unit
  FROM financial_statement_fact f
  JOIN metric_map m
    ON lower(trim(f.ind_name)) = lower(trim(m.ind_name_alias))
)
SELECT * FROM normalized;
```

### 11.3. Derived metrics không được map `ind_name`

Các chỉ số như `ROE`, `ROA`, `NIM`, `CIR`, `credit_cost_proxy`, `wholesale_funding_ratio`, `liquidity_proxy` là **derived metrics**. AI không được tìm `ind_name = 'ROE'` trừ khi hệ thống có bảng ratio riêng. Phải tính từ các metric gốc.

### 11.4. Chống cộng trùng dòng tổng và dòng con

Nếu cùng một chart có cả line item tổng và dòng con, ví dụ `Tổng thu nhập hoạt động` và các thành phần `Thu nhập lãi thuần`, `Lãi thuần dịch vụ`, AI phải:

1. Ưu tiên dùng dòng tổng cho tổng số.
2. Dùng dòng con cho cơ cấu.
3. Không cộng dòng tổng với dòng con.
4. Nếu không có dòng tổng, mới cộng các thành phần và gắn nhãn `calculated_total`.

---

## 12. Empty state & data quality rules

### 12.1. Khi thiếu dữ liệu

- Nếu không match được alias nào cho metric: hiển thị `No mapped financial statement indicator found` và log `metric_key`.
- Nếu thiếu kỳ so sánh YoY/QoQ: vẫn hiển thị giá trị hiện tại, delta để `N/A`.
- Nếu chart yêu cầu extension table nhưng chưa có: hiển thị thẻ hướng dẫn dữ liệu cần bổ sung, không render chart giả.

### 12.2. Data quality checks

| Check | Logic | UI behavior |
|---|---|---|
| Balance sheet reconcile | `total_assets ≈ total_sources` | Nếu lệch > 1%, hiện warning |
| Cash flow reconcile | `cash_end ≈ cash_begin + net_cash_flow + fx_effect` | Nếu lệch, gắn nhãn kiểm tra dữ liệu |
| Duplicate mapping | Một kỳ có nhiều alias cùng metric | Ưu tiên alias theo priority; nếu không có priority, lấy tổng khi đó là dòng con, lấy latest/unique khi là dòng tổng |
| Negative expense convention | Chi phí có thể âm/dương tùy nguồn | Chuẩn hóa display: chi phí hiển thị là số dương trong chart cost; lưu raw value trong table |

---

## 13. Acceptance criteria cho AI/vibecoding

1. Mỗi tab có ít nhất 1 chart insight lớn ở đầu tab.
2. Mỗi tab có ít nhất 1 bảng số liệu cuối tab.
3. Mọi chart có tooltip custom theo cấu trúc chuẩn.
4. Mọi query chỉ tiêu BCTC dùng `metric_key -> where_ind_name_aliases`, không hardcode một tên chỉ tiêu.
5. Chart NPL, group 2, write-off, product mix, maturity gap chỉ render khi có extension table.
6. Dashboard hiển thị rõ `proxy` khi dùng công thức gần đúng từ BCTC.
7. Có log unmapped indicators để BA bổ sung mapping.
8. Có export CSV cho bảng số liệu của từng tab.
9. Dữ liệu chart và bảng phải cùng một nguồn normalized query để tránh lệch số.
10. Tooltip phải hiển thị được alias `ind_name` đã match để debug.

---

## Appendix A — Core metric mapping JSON dùng trực tiếp cho vibecoding

```json
[
  {
    "metric_key": "total_assets",
    "business_name": "Tổng tài sản",
    "category": "Bảng cân đối",
    "description": "Quy mô tài sản của doanh nghiệp tài chính.",
    "norm_names": [
      "Tổng cộng tài sản"
    ],
    "where_ind_name_aliases": [
      "TỔNG CỘNG TÀI SẢN",
      "Tổng cộng tài sản",
      "TỔNG CỘNG TÀI SẢN (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tong_ts"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "total_liabilities",
    "business_name": "Nợ phải trả",
    "category": "Bảng cân đối",
    "description": "Tổng nghĩa vụ phải trả.",
    "norm_names": [
      "Nợ phải trả"
    ],
    "where_ind_name_aliases": [
      "NỢ PHẢI TRẢ",
      "Nợ phải trả",
      "NỢ PHẢI TRẢ (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "no_phai_tra"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "total_equity",
    "business_name": "Vốn chủ sở hữu",
    "category": "Bảng cân đối",
    "description": "Bộ đệm vốn hấp thụ rủi ro.",
    "norm_names": [
      "Vốn chủ sở hữu",
      "Nguồn vốn chủ sở hữu"
    ],
    "where_ind_name_aliases": [
      "NGUỒN VỐN CHỦ SỞ HỮU",
      "Nguồn vốn chủ sở hữu",
      "VỐN CHỦ SỞ HỮU",
      "Vốn chủ sở hữu",
      "VỐN CHỦ SỞ HỮU (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "vcsh"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "total_sources",
    "business_name": "Tổng nguồn vốn",
    "category": "Bảng cân đối",
    "description": "Đối soát với tổng tài sản.",
    "norm_names": [
      "Tổng cộng nguồn vốn",
      "Tổng cộng nợ phải trả và vốn chủ sở hữu",
      "Tổng nợ phải trả và vốn chủ sở hữu"
    ],
    "where_ind_name_aliases": [
      "TỔNG CỘNG NGUỒN VỐN",
      "Tổng cộng nguồn vốn",
      "TỔNG CỘNG NGUỒN VỐN (đồng)",
      "TỔNG CỘNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU",
      "TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU"
    ],
    "old_ind_codes_reference_only": [
      "no_phai_tra",
      "tong_nv"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "customer_loans_gross",
    "business_name": "Cho vay khách hàng / khoản cho vay gộp",
    "category": "Tài sản sinh lãi",
    "description": "Dư nợ gốc cho vay trước dự phòng nếu dữ liệu có dòng gộp.",
    "norm_names": [
      "Cho vay khách hàng",
      "Các khoản cho vay"
    ],
    "where_ind_name_aliases": [
      "_Cho vay khách hàng",
      "Cho vay khách hàng",
      "Các khoản cho vay",
      "Loans and advances to customers"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_cho_vay",
      "cho_vay_khach_hang"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "customer_loans_net",
    "business_name": "Cho vay khách hàng ròng",
    "category": "Tài sản sinh lãi",
    "description": "Dư nợ cho vay sau dự phòng.",
    "norm_names": [
      "Cho vay khách hàng ròng"
    ],
    "where_ind_name_aliases": [
      "Loans and advances to customers, net"
    ],
    "old_ind_codes_reference_only": [
      "cho_vay_khach_hang_rong"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "loan_loss_allowance",
    "business_name": "Dự phòng cho vay / tổn thất tín dụng",
    "category": "Rủi ro tín dụng",
    "description": "Số dư dự phòng trên bảng cân đối.",
    "norm_names": [
      "Dự phòng rủi ro cho vay khách hàng",
      "Dự phòng rủi ro tín dụng",
      "Dự phòng tổn thất tín dụng"
    ],
    "where_ind_name_aliases": [
      "Dự phòng RR tín dụng",
      "Dự phòng rủi  ro cho vay khách hàng",
      "Dự phòng rủi ro cho vay khách hàng",
      "Dự phòng tổn thất tín dụng",
      "Less: Provision for losses on loans and advances to customers"
    ],
    "old_ind_codes_reference_only": [
      "dp_rr_td",
      "du_phong_rui_ro_cho_vay_khach_hang",
      "du_phong_ton_that_tin_dung"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cash_and_equivalents",
    "business_name": "Tiền và tương đương tiền",
    "category": "Thanh khoản",
    "description": "Tài sản thanh khoản cao nhất.",
    "norm_names": [
      "Tiền và các khoản tương đương tiền"
    ],
    "where_ind_name_aliases": [
      "Tiền và các khoản tương đương tiền",
      "Tiền và tương đương tiền",
      "Tiền và tương đương tiền (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tien_va_tuong_duong_tien"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cash_begin",
    "business_name": "Tiền và tương đương tiền đầu kỳ",
    "category": "Lưu chuyển tiền tệ",
    "description": "Số dư tiền đầu kỳ.",
    "norm_names": [
      "Tiền và các khoản tương đương tiền đầu kỳ"
    ],
    "where_ind_name_aliases": [
      "Tiền và các khoản tương đương tiền đầu kỳ",
      "Tiền và tương đương tiền đầu kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_va_tuong_duong_tien_dau_ky"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cash_end",
    "business_name": "Tiền và tương đương tiền cuối kỳ",
    "category": "Lưu chuyển tiền tệ",
    "description": "Số dư tiền cuối kỳ.",
    "norm_names": [
      "Tiền và các khoản tương đương tiền cuối kỳ"
    ],
    "where_ind_name_aliases": [
      "Tiền và các khoản tương đương tiền cuối kỳ",
      "Tiền và tương đương tiền cuối kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_va_tuong_duong_tien_cuoi_ky"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "sbv_balance",
    "business_name": "Tiền gửi tại NHNN",
    "category": "Thanh khoản ngân hàng",
    "description": "Tiền gửi bắt buộc/thanh toán tại NHNN.",
    "norm_names": [
      "Tiền gửi tại ngân hàng nhà nước Việt Nam",
      "Tiền gửi tại Ngân hàng Nhà nước"
    ],
    "where_ind_name_aliases": [
      "Tiền gửi tại ngân hàng nhà nước Việt Nam",
      "Tiền gửi tại NHNN"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_ngan_hang_nha_nuoc_viet_nam"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "placements_credit_institutions",
    "business_name": "Tiền gửi/cho vay TCTD khác",
    "category": "Tài sản sinh lãi",
    "description": "Nguồn thanh khoản và tài sản sinh lãi liên ngân hàng.",
    "norm_names": [
      "Tiền gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác",
      "Tiền gửi và cho vay các tổ chức tín dụng khác",
      "Tiền, vàng gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác",
      "Tiền, Vàng gửi tại các tổ chức tín dụng khác",
      "Cho vay các tổ chức tín dụng khác"
    ],
    "where_ind_name_aliases": [
      "Cho vay các TCTD khác",
      "Placements with and loans to other credit institutions",
      "Tiền gửi tại các TCTD khác và cho vay các TCTD khác",
      "Tiền gửi và cho vay các TCTD khác",
      "Tiền, Vàng gửi tại các TCTD khác",
      "Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "cho_vay_cac_tctd_khac",
      "tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac",
      "tien_vang_gui_tai_cac_tctd_khac"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "trading_securities_asset",
    "business_name": "Chứng khoán kinh doanh",
    "category": "Tài sản tài chính",
    "description": "Danh mục FVTPL/trading.",
    "norm_names": [
      "Chứng khoán kinh doanh",
      "Chứng khoán kinh doanh ròng"
    ],
    "where_ind_name_aliases": [
      "_Chứng khoán kinh doanh",
      "Chứng khoán kinh doanh",
      "Trading Securities",
      "Trading Securities, net"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_kinh_doanh",
      "chung_khoan_kinh_doanh_rong"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "investment_securities_asset",
    "business_name": "Chứng khoán đầu tư",
    "category": "Tài sản tài chính",
    "description": "Danh mục đầu tư AFS/HTM.",
    "norm_names": [
      "Chứng khoán đầu tư",
      "Chứng khoán đầu tư sẵn sàng để bán",
      "Chứng khoán đầu tư giữ đến ngày đáo hạn"
    ],
    "where_ind_name_aliases": [
      "Available-for Sales Securities",
      "Chứng khoán đầu tư",
      "Chứng khoán đầu tư giữ đến ngày đáo hạn",
      "Chứng khoán đầu tư sẵn sàng để bán",
      "Held-to-Maturity Securities",
      "Investment Securities"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu",
      "chung_khoan_dau_tu_giu_den_ngay_dao_han",
      "chung_khoan_dau_tu_san_sang_de_ban"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "customer_deposits",
    "business_name": "Tiền gửi khách hàng",
    "category": "Nguồn vốn",
    "description": "Nguồn vốn lõi của ngân hàng; với FinCo thường không có hoặc không được dùng.",
    "norm_names": [
      "Tiền gửi của khách hàng",
      "Tiền gửi khách hàng"
    ],
    "where_ind_name_aliases": [
      "Deposits from customers",
      "Tiền gửi của khách hàng",
      "Tiền gửi khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_cua_khach_hang"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "borrowings_credit_institutions",
    "business_name": "Tiền gửi và vay TCTD khác",
    "category": "Nguồn vốn bán buôn",
    "description": "Nguồn vốn wholesale, nhạy cảm với rollover risk.",
    "norm_names": [
      "Tiền gửi và vay các Tổ chức tín dụng khác",
      "Tiền gửi và vay các Tổ chức tín dụng khác",
      "Vay các tổ chức tín dụng khác"
    ],
    "where_ind_name_aliases": [
      "Tiền gửi và vay các Tổ chức tín dụng khác",
      "Vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_va_vay_cac_to_chuc_tin_dung_khac",
      "vay_cac_tctd_khac"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "valuable_papers_issued",
    "business_name": "Giấy tờ có giá phát hành",
    "category": "Nguồn vốn bán buôn",
    "description": "CD, trái phiếu, giấy tờ có giá đã phát hành.",
    "norm_names": [
      "Giấy tờ có giá phát hành",
      "Phát hành giấy tờ có giá"
    ],
    "where_ind_name_aliases": [
      "Convertible bonds/CDs and other valuable papers issued",
      "Phát hành giấy tờ có giá"
    ],
    "old_ind_codes_reference_only": [
      "giay_to_co_gia_phat_hanh",
      "phat_hanh_giay_to_co_gia"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "short_term_debt",
    "business_name": "Vay và nợ ngắn hạn",
    "category": "Nguồn vốn",
    "description": "Nợ đáo hạn ngắn, trọng yếu cho thanh khoản.",
    "norm_names": [
      "Vay và nợ ngắn hạn",
      "Vay ngắn hạn",
      "Trái phiếu phát hành ngắn hạn",
      "Nợ ngắn hạn"
    ],
    "where_ind_name_aliases": [
      "Nợ ngắn hạn",
      "Nợ ngắn hạn (đồng)",
      "Trái phiếu phát hành ngắn hạn",
      "Vay ngắn hạn",
      "Vay và nợ ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "no_ngan_han",
      "trai_phieu_phat_hanh_ngan_han",
      "vay_ngan_han",
      "vay_va_no_ngan_han"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "long_term_debt",
    "business_name": "Vay và nợ dài hạn",
    "category": "Nguồn vốn",
    "description": "Nguồn vốn trung/dài hạn.",
    "norm_names": [
      "Vay và nợ dài hạn",
      "Vay dài hạn",
      "Trái phiếu phát hành dài hạn",
      "Nợ dài hạn"
    ],
    "where_ind_name_aliases": [
      "Nợ dài hạn",
      "Nợ dài hạn (đồng)",
      "Trái phiếu phát hành dài hạn",
      "Vay dài hạn",
      "Vay và nợ dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "no_dai_han",
      "trai_phieu_phat_hanh_dai_han",
      "vay_dai_han",
      "vay_va_no_dai_han"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "interest_income",
    "business_name": "Thu nhập lãi",
    "category": "KQKD",
    "description": "Lãi từ cho vay, tiền gửi, chứng khoán nợ.",
    "norm_names": [
      "Thu nhập lãi",
      "Thu nhập lãi và các khoản tương tự"
    ],
    "where_ind_name_aliases": [
      "Interest and Similar Income",
      "Thu nhập lãi",
      "Thu nhập lãi và các khoản tương tự"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_lai",
      "thu_nhap_lai_va_cac_khoan_tuong_tu"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "interest_expense",
    "business_name": "Chi phí lãi",
    "category": "KQKD",
    "description": "Chi phí vốn; với FinCo là chi phí funding bán buôn.",
    "norm_names": [
      "Chi phí lãi và các khoản tương tự",
      "Chi phí lãi và các chi phí tương tự",
      "Chi phí Lãi vay",
      "Chi phí tiền lãi vay",
      "Trong đó: Chi phí lãi vay"
    ],
    "where_ind_name_aliases": [
      "Chi phí Lãi vay",
      "Chi phí lãi và các chi phí tương tự",
      "Chi phí lãi và các khoản tương tự",
      "Chi phí tiền lãi vay",
      "Interest and Similar Expenses",
      "Trong đó: Chi phí lãi vay"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_lai_va_cac_khoan_tuong_tu",
      "cp_lai_vay"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "net_interest_income",
    "business_name": "Thu nhập lãi thuần / NII",
    "category": "KQKD",
    "description": "Thu nhập lãi sau chi phí lãi.",
    "norm_names": [
      "Thu nhập lãi thuần"
    ],
    "where_ind_name_aliases": [
      "Net Interest Income",
      "Thu nhập lãi thuần"
    ],
    "old_ind_codes_reference_only": [
      "tn_lai_thuan"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "fee_income",
    "business_name": "Thu nhập dịch vụ",
    "category": "KQKD",
    "description": "Phí dịch vụ, hoa hồng.",
    "norm_names": [
      "Thu nhập từ hoạt động dịch vụ"
    ],
    "where_ind_name_aliases": [
      "Fees and Comission Income",
      "Thu nhập từ hoạt động dịch vụ"
    ],
    "old_ind_codes_reference_only": [
      "tn_dv"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "fee_expense",
    "business_name": "Chi phí dịch vụ",
    "category": "KQKD",
    "description": "Chi phí liên quan dịch vụ.",
    "norm_names": [
      "Chi phí hoạt động dịch vụ"
    ],
    "where_ind_name_aliases": [
      "Chi phí hoạt động dịch vụ",
      "Fees and Comission Expenses"
    ],
    "old_ind_codes_reference_only": [
      "cp_dv"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "net_fee_income",
    "business_name": "Lãi thuần dịch vụ",
    "category": "KQKD",
    "description": "Thu nhập dịch vụ ròng.",
    "norm_names": [
      "Lãi thuần từ hoạt động dịch vụ"
    ],
    "where_ind_name_aliases": [
      "Lãi thuần từ hoạt động dịch vụ",
      "Net Fee and Commission Income"
    ],
    "old_ind_codes_reference_only": [
      "ln_thuan_dv"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "fx_gold_result",
    "business_name": "Lãi/lỗ ngoại hối và vàng",
    "category": "KQKD ngân hàng",
    "description": "Kết quả hoạt động ngoại hối/vàng.",
    "norm_names": [
      "Kinh doanh ngoại hối và vàng",
      "Lãi/lỗ thuần từ kinh doanh ngoại hối và vàng"
    ],
    "where_ind_name_aliases": [
      "Kinh doanh ngoại hối và vàng",
      "Net gain (loss) from foreign currency and gold dealings"
    ],
    "old_ind_codes_reference_only": [
      "kinh_doanh_ngoai_hoi_va_vang",
      "lai_lo_thuan_tu_kinh_doanh_ngoai_hoi_va_vang"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "securities_trading_result",
    "business_name": "Lãi/lỗ kinh doanh chứng khoán",
    "category": "KQKD chứng khoán/ngân hàng",
    "description": "Kết quả tự doanh/trading securities.",
    "norm_names": [
      "Lãi/lỗ thuần từ kinh doanh chứng khoán",
      "Lãi/lỗ thuần từ mua bán chứng khoán kinh doanh"
    ],
    "where_ind_name_aliases": [
      "Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh",
      "Net gain (loss) from trading of trading securities"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_kinh_doanh_chung_khoan",
      "lai_lo_thuan_tu_mua_ban_chung_khoan_kinh_doanh"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "investment_securities_result",
    "business_name": "Lãi/lỗ chứng khoán đầu tư",
    "category": "KQKD ngân hàng",
    "description": "Kết quả thanh lý/mua bán chứng khoán đầu tư.",
    "norm_names": [
      "Lãi/lỗ thuần từ mua bán chứng khoán đầu tư",
      "Lãi/lỗ thuần từ thanh lý chứng khoán đầu tư"
    ],
    "where_ind_name_aliases": [
      "Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư",
      "Net gain (loss) from disposal of investment securities"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_mua_ban_chung_khoan_dau_tu",
      "lai_lo_thuan_tu_thanh_ly_chung_khoan_dau_tu"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "total_operating_income",
    "business_name": "Tổng thu nhập hoạt động / TOI",
    "category": "KQKD",
    "description": "Tổng thu nhập hoạt động trước chi phí vận hành.",
    "norm_names": [
      "Tổng thu nhập hoạt động"
    ],
    "where_ind_name_aliases": [
      "Total operating revenue",
      "Tổng thu nhập hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "tong_tn_hd"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "operating_expenses",
    "business_name": "Chi phí hoạt động / Opex",
    "category": "KQKD",
    "description": "Chi phí vận hành; cần tránh cộng trùng nếu có dòng tổng và dòng con.",
    "norm_names": [
      "Chi phí hoạt động",
      "Cộng chi phí hoạt động",
      "Chi phí quản lý doanh nghiệp",
      "Chi phí bán hàng",
      "Chi phí quản lý công ty chứng khoán"
    ],
    "where_ind_name_aliases": [
      "Chi phí bán hàng",
      "Chi phí hoạt động",
      "CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN",
      "Chi phí quản lý DN",
      "Chi phí quản lý doanh nghiệp",
      "Cộng chi phí hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_ban_hang",
      "chi_phi_hoat_dong",
      "chi_phi_quan_ly_cong_ty_chung_khoan",
      "cp_qldn",
      "tong_chi_phi_hoat_dong"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "credit_provision_expense",
    "business_name": "Chi phí dự phòng rủi ro tín dụng",
    "category": "KQKD",
    "description": "Chi phí rủi ro tín dụng trong kỳ.",
    "norm_names": [
      "Chi phí dự phòng rủi ro tín dụng"
    ],
    "where_ind_name_aliases": [
      "Chi phí dự phòng rủi ro tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_du_phong_rui_ro_tin_dung"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "pbt",
    "business_name": "Lợi nhuận trước thuế / PBT",
    "category": "KQKD",
    "description": "Lợi nhuận trước thuế.",
    "norm_names": [
      "Lợi nhuận trước thuế",
      "Lãi/lỗ ròng trước thuế",
      "Lợi nhuận/lỗ thuần trước thuế",
      "Tổng lợi nhuận kế toán trước thuế",
      "Tổng lợi nhuận trước thuế",
      "Tổng lợi nhuận kế toán",
      "Lợi nhuận trước Thuế Thu nhập doanh nghiệp"
    ],
    "where_ind_name_aliases": [
      "LN trước thuế",
      "Lãi/Lỗ ròng trước thuế",
      "Lợi nhuận trước thuế",
      "Lợi nhuận trước Thuế Thu nhập doanh nghiệp",
      "Lợi nhuận/Lỗ thuần trước thuế",
      "Tổng lợi nhuận kế toán",
      "TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ",
      "Tổng lợi nhuận trước thuế"
    ],
    "old_ind_codes_reference_only": [
      "lntt",
      "tong_loi_nhuan_ke_toan"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": [
      "LN trước thuế"
    ]
  },
  {
    "metric_key": "pat",
    "business_name": "Lợi nhuận sau thuế / PAT",
    "category": "KQKD",
    "description": "Lợi nhuận sau thuế của toàn doanh nghiệp.",
    "norm_names": [
      "Lợi nhuận sau thuế thu nhập doanh nghiệp",
      "Lợi nhuận kế toán sau thuế thu nhập doanh nghiệp"
    ],
    "where_ind_name_aliases": [
      "LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN",
      "Lợi nhuận sau thuế thu nhập DN",
      "Lợi nhuận sau thuế thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_ke_toan_sau_thue_tndn",
      "loi_nhuan_sau_thue_thu_nhap_dn"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "pat_parent",
    "business_name": "LNST cổ đông công ty mẹ",
    "category": "KQKD",
    "description": "Lợi nhuận thuộc cổ đông công ty mẹ, ưu tiên khi tính EPS/ROE hợp nhất.",
    "norm_names": [
      "Lợi nhuận sau thuế của Cổ đông công ty mẹ",
      "Lợi nhuận sau thuế của Cổ đông công ty mẹ"
    ],
    "where_ind_name_aliases": [
      "Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_cua_co_dong_cong_ty_me"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": [
      "LNST của cổ đông công ty mẹ"
    ]
  },
  {
    "metric_key": "eps_basic",
    "business_name": "EPS cơ bản",
    "category": "KQKD",
    "description": "Lãi cơ bản trên cổ phiếu.",
    "norm_names": [
      "Lãi cơ bản trên cổ phiếu"
    ],
    "where_ind_name_aliases": [
      "EPS_basis",
      "Lãi cơ bản trên cổ phiếu",
      "Lãi cơ bản trên cổ phiếu (Đồng/1 cổ phiếu)"
    ],
    "old_ind_codes_reference_only": [
      "eps_basis",
      "lai_co_ban_tren_co_phieu"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cfo",
    "business_name": "Lưu chuyển tiền thuần từ HĐKD / CFO",
    "category": "Lưu chuyển tiền tệ",
    "description": "Dòng tiền hoạt động kinh doanh.",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
      "Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh"
    ],
    "where_ind_name_aliases": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
      "Lưu chuyển tiền thuần từ HĐKD",
      "Lưu chuyển tiền tệ ròng từ các hoạt động SXKD"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_te_rong_tu_cac_hoat_dong_sxkd",
      "luu_chuyen_tien_thuan_tu_hdkd"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cfo_before_working_capital",
    "business_name": "CFO trước thay đổi vốn lưu động",
    "category": "Lưu chuyển tiền tệ",
    "description": "Sức tạo tiền trước biến động vốn lưu động/tài sản hoạt động.",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh trước thay đổi vốn lưu động",
      "Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động"
    ],
    "where_ind_name_aliases": [
      "Lưu chuyển tiền thuần từ HĐKD trước thay đổi VLĐ",
      "Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động",
      "Lợi nhuận từ HĐKD trước thay đổi vốn lưu động"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_tu_hdkd_truoc_thay_doi_von_luu_dong",
      "luu_chuyen_tien_thuan_tu_hdkd_truoc_thay_doi_vld"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cfi",
    "business_name": "Lưu chuyển tiền thuần từ HĐ đầu tư / CFI",
    "category": "Lưu chuyển tiền tệ",
    "description": "Dòng tiền đầu tư.",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động đầu tư"
    ],
    "where_ind_name_aliases": [
      "Lưu chuyển tiền thuần từ hoạt động đầu tư",
      "Lưu chuyển tiền thuần từ HĐ đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "lctt_thuan_hd_dt"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "cff",
    "business_name": "Lưu chuyển tiền thuần từ HĐ tài chính / CFF",
    "category": "Lưu chuyển tiền tệ",
    "description": "Dòng tiền tài chính.",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động tài chính"
    ],
    "where_ind_name_aliases": [
      "Lưu chuyển tiền thuần từ hoạt động tài chính",
      "Lưu chuyển tiền thuần từ HĐ tài chính"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_tu_hd_tai_chinh"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "net_cash_flow",
    "business_name": "Lưu chuyển tiền thuần trong kỳ",
    "category": "Lưu chuyển tiền tệ",
    "description": "Chênh lệch tiền trong kỳ.",
    "norm_names": [
      "Lưu chuyển tiền thuần trong kỳ"
    ],
    "where_ind_name_aliases": [
      "Lưu chuyển tiền thuần trong kỳ"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_trong_ky"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "interest_paid_cf",
    "business_name": "Lãi vay đã trả",
    "category": "Lưu chuyển tiền tệ",
    "description": "Dòng tiền lãi vay thực trả.",
    "norm_names": [
      "Chi phí lãi vay đã trả",
      "Tiền lãi vay đã trả",
      "Chi phí lãi và các chi phí tương tự đã trả"
    ],
    "where_ind_name_aliases": [
      "Chi phí lãi vay đã trả",
      "Chi phí lãi và các chi phí tương tự đã trả",
      "Tiền lãi vay đã trả"
    ],
    "old_ind_codes_reference_only": [
      "lai_vay_da_tra"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "tax_paid_cf",
    "business_name": "Thuế TNDN đã nộp",
    "category": "Lưu chuyển tiền tệ",
    "description": "Thuế TNDN đã nộp bằng tiền.",
    "norm_names": [
      "Thuế thu nhập doanh nghiệp đã nộp",
      "Tiền thu nhập doanh nghiệp đã trả"
    ],
    "where_ind_name_aliases": [
      "Thuế thu nhập doanh nghiệp đã nộp",
      "Thuế TNDN đã nộp",
      "Tiền thu nhập doanh nghiệp đã trả"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_da_nop"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "brokerage_revenue",
    "business_name": "Doanh thu môi giới chứng khoán",
    "category": "Công ty chứng khoán",
    "description": "Doanh thu môi giới.",
    "norm_names": [
      "Doanh thu môi giới chứng khoán"
    ],
    "where_ind_name_aliases": [
      "Doanh thu môi giới chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_moi_gioi_chung_khoan"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "brokerage_expense",
    "business_name": "Chi phí môi giới chứng khoán",
    "category": "Công ty chứng khoán",
    "description": "Chi phí môi giới.",
    "norm_names": [
      "Chi phí môi giới chứng khoán"
    ],
    "where_ind_name_aliases": [
      "Chi phí môi giới chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_moi_gioi_chung_khoan"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "custody_revenue",
    "business_name": "Doanh thu lưu ký chứng khoán",
    "category": "Công ty chứng khoán",
    "description": "Doanh thu lưu ký.",
    "norm_names": [
      "Doanh thu lưu ký chứng khoán"
    ],
    "where_ind_name_aliases": [
      "Doanh thu lưu ký chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_luu_ky_chung_khoan"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "custody_expense",
    "business_name": "Chi phí lưu ký chứng khoán",
    "category": "Công ty chứng khoán",
    "description": "Chi phí lưu ký.",
    "norm_names": [
      "Chi phí lưu ký chứng khoán"
    ],
    "where_ind_name_aliases": [
      "Chi phí lưu ký chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_luu_ky_chung_khoan"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "margin_lending_receivable",
    "business_name": "Phải thu về cho vay",
    "category": "Công ty chứng khoán",
    "description": "Proxy cho dư nợ margin nếu dữ liệu không có bảng margin riêng.",
    "norm_names": [
      "Phải thu về cho vay ngắn hạn",
      "Phải thu về cho vay dài hạn"
    ],
    "where_ind_name_aliases": [
      "Phải thu về cho vay dài hạn",
      "Phải thu về cho vay dài hạn (đồng)",
      "Phải thu về cho vay ngắn hạn",
      "Phải thu về cho vay ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_ve_cho_vay_dai_han",
      "phai_thu_ve_cho_vay_ngan_han"
    ],
    "requires_extension_table": false,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "npl_balance",
    "business_name": "Nợ xấu nhóm 3-5",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần bảng thuyết minh nhóm nợ.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "group2_balance",
    "business_name": "Nợ nhóm 2",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần bảng thuyết minh nhóm nợ.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "writeoff_amount",
    "business_name": "Xóa nợ trong kỳ",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần thuyết minh dự phòng/loan roll-forward.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "loan_product_cash",
    "business_name": "Dư nợ vay tiền mặt",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "loan_product_motorbike",
    "business_name": "Dư nợ vay xe máy",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "loan_product_durables",
    "business_name": "Dư nợ vay điện máy",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "loan_product_credit_card",
    "business_name": "Dư nợ thẻ tín dụng",
    "category": "Extension/thuyết minh",
    "description": "Không có trong mapping BCTC chính; cần bảng sản phẩm cho vay.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "maturity_asset_bucket",
    "business_name": "Tài sản theo kỳ hạn",
    "category": "Extension/ALM",
    "description": "Không có trong mapping BCTC chính; cần bảng ALM maturity bucket.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  },
  {
    "metric_key": "maturity_liability_bucket",
    "business_name": "Nợ phải trả theo kỳ hạn",
    "category": "Extension/ALM",
    "description": "Không có trong mapping BCTC chính; cần bảng ALM maturity bucket.",
    "norm_names": [],
    "where_ind_name_aliases": [],
    "old_ind_codes_reference_only": [],
    "requires_extension_table": true,
    "missing_norm_names_from_mapping": []
  }
]
```

---

## Appendix B — Full mapping `norm_name -> aliases_for_where_ind_name`

Phần này giữ toàn bộ mapping chuẩn hóa từ file chỉ tiêu gốc. Khi AI cần query một chỉ tiêu ngoài core dashboard, hãy tìm `norm_name` phù hợp rồi dùng toàn bộ `aliases_for_where_ind_name` trong điều kiện `WHERE ind_name IN (...)`.

```json
[
  {
    "norm_name": "Bất động sản đầu tư",
    "aliases_for_where_ind_name": [
      "Bất động sản đầu tư",
      "Investment in properties"
    ],
    "old_ind_codes_reference_only": [
      "bat_dong_san_dau_tu"
    ]
  },
  {
    "norm_name": "Bồi thường thuộc phần trách nhiệm giữ lại",
    "aliases_for_where_ind_name": [
      "Bồi thường thuộc phần trách nhiệm giữ lại"
    ],
    "old_ind_codes_reference_only": [
      "boi_thuong_thuoc_phan_trach_nhiem_giu_lai"
    ]
  },
  {
    "norm_name": "Chi bán hàng",
    "aliases_for_where_ind_name": [
      "CHI BÁN HÀNG"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_ban_hang"
    ]
  },
  {
    "norm_name": "Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm",
    "aliases_for_where_ind_name": [
      "Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "chi_boi_thuong_bao_hiem_goc_tra_tien_bao_hiem"
    ]
  },
  {
    "norm_name": "Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm",
    "aliases_for_where_ind_name": [
      "Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "chi_boi_thuong_nhan_tai_bao_hiem_tra_tien_bao_hiem"
    ]
  },
  {
    "norm_name": "Chi bồi thường từ dự phòng dao động lớn",
    "aliases_for_where_ind_name": [
      "Chi bồi thường từ dự phòng dao động lớn"
    ],
    "old_ind_codes_reference_only": [
      "chi_boi_thuong_tu_du_phong_dao_dong_lon"
    ]
  },
  {
    "norm_name": "Chi hoa hồng",
    "aliases_for_where_ind_name": [
      "Chi hoa hồng"
    ],
    "old_ind_codes_reference_only": [
      "chi_hoa_hong"
    ]
  },
  {
    "norm_name": "Chi hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Chi hoạt động tài chính"
    ],
    "old_ind_codes_reference_only": [
      "chi_hoat_dong_tai_chinh"
    ]
  },
  {
    "norm_name": "Chi khác",
    "aliases_for_where_ind_name": [
      "Chi khác"
    ],
    "old_ind_codes_reference_only": [
      "chi_khac"
    ]
  },
  {
    "norm_name": "Chi khác hoạt động kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Chi khác hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "chi_khac_hoat_dong_kinh_doanh_bao_hiem"
    ]
  },
  {
    "norm_name": "Chi khác hoạt động kinh doanh bảo hiểm gốc",
    "aliases_for_where_ind_name": [
      "Chi khác hoạt động kinh doanh bảo hiểm gốc"
    ],
    "old_ind_codes_reference_only": [
      "chi_khac_hoat_dong_kinh_doanh_bao_hiem_goc"
    ]
  },
  {
    "norm_name": "Chi phí bán hàng",
    "aliases_for_where_ind_name": [
      "Chi phí bán hàng"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_ban_hang"
    ]
  },
  {
    "norm_name": "Chi phí dự phòng rủi ro tín dụng",
    "aliases_for_where_ind_name": [
      "Chi phí dự phòng rủi ro tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_du_phong_rui_ro_tin_dung"
    ]
  },
  {
    "norm_name": "Chi phí giao dịch mua các tài sản tài chính FVTPL",
    "aliases_for_where_ind_name": [
      "c.Chi phí giao dịch mua các tài sản tài chính FVTPL"
    ],
    "old_ind_codes_reference_only": [
      "c_chi_phi_giao_dich_mua_cac_tai_san_tai_chinh_fvtpl"
    ]
  },
  {
    "norm_name": "Chi phí hoạt động",
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_hoat_dong"
    ]
  },
  {
    "norm_name": "Chi phí hoạt động bảo lãnh, đại lý phát hành chứng khoán",
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động bảo lãnh, đại lý phát hành chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_hoat_dong_bao_lanh_dai_ly_phat_hanh_chung_khoan"
    ]
  },
  {
    "norm_name": "Chi phí hoạt động dịch vụ",
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động dịch vụ",
      "Fees and Comission Expenses"
    ],
    "old_ind_codes_reference_only": [
      "cp_dv"
    ]
  },
  {
    "norm_name": "Chi phí hoạt động khác",
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Chi phí hoạt động tự doanh",
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động tự doanh"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_hoat_dong_tu_doanh"
    ]
  },
  {
    "norm_name": "Chi phí hoạt động đấu giá, ủy thác",
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động đấu giá, ủy thác"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_hoat_dong_dau_gia_uy_thac"
    ]
  },
  {
    "norm_name": "Chi phí khác",
    "aliases_for_where_ind_name": [
      "Chi phí khác",
      "Other expenses"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_khac"
    ]
  },
  {
    "norm_name": "Chi phí lãi vay",
    "aliases_for_where_ind_name": [
      "Chi phí lãi vay"
    ],
    "old_ind_codes_reference_only": [
      "cp_lai_vay"
    ]
  },
  {
    "norm_name": "Chi phí Lãi vay",
    "aliases_for_where_ind_name": [
      "Chi phí Lãi vay"
    ],
    "old_ind_codes_reference_only": [
      "cp_lai_vay"
    ]
  },
  {
    "norm_name": "Chi phí lãi vay trong lưu chuyển tiền tệ",
    "aliases_for_where_ind_name": [
      "Chi phí lãi vay (Lưu chuyển tiền tệ)"
    ],
    "old_ind_codes_reference_only": [
      "cp_lai_vay_lctt"
    ]
  },
  {
    "norm_name": "Chi phí lãi vay đã trả",
    "aliases_for_where_ind_name": [
      "Chi phí lãi vay đã trả"
    ],
    "old_ind_codes_reference_only": [
      "lai_vay_da_tra"
    ]
  },
  {
    "norm_name": "Chi phí lãi vay, lỗ từ các khoản cho vay và phải thu",
    "aliases_for_where_ind_name": [
      "Chi phí lãi vay, lỗ từ các khoản cho vay và phải thu"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_lai_vay_lo_tu_cac_khoan_cho_vay_va_phai_thu"
    ]
  },
  {
    "norm_name": "Chi phí lãi và các chi phí tương tự",
    "aliases_for_where_ind_name": [
      "Chi phí lãi và các chi phí tương tự"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_lai_va_cac_khoan_tuong_tu"
    ]
  },
  {
    "norm_name": "Chi phí lãi và các chi phí tương tự đã trả",
    "aliases_for_where_ind_name": [
      "Chi phí lãi và các chi phí tương tự đã trả"
    ],
    "old_ind_codes_reference_only": [
      "lai_vay_da_tra"
    ]
  },
  {
    "norm_name": "Chi phí lãi và các khoản tương tự",
    "aliases_for_where_ind_name": [
      "Chi phí lãi và các khoản tương tự",
      "Interest and Similar Expenses"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_lai_va_cac_khoan_tuong_tu"
    ]
  },
  {
    "norm_name": "Chi phí lưu ký chứng khoán",
    "aliases_for_where_ind_name": [
      "Chi phí lưu ký chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_luu_ky_chung_khoan"
    ]
  },
  {
    "norm_name": "Chi phí môi giới chứng khoán",
    "aliases_for_where_ind_name": [
      "Chi phí môi giới chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_moi_gioi_chung_khoan"
    ]
  },
  {
    "norm_name": "Chi phí phải trả",
    "aliases_for_where_ind_name": [
      "Chi phí phải trả"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_phai_tra"
    ]
  },
  {
    "norm_name": "Chi phí phải trả dài hạn",
    "aliases_for_where_ind_name": [
      "Chi phí phải trả dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_phai_tra_dai_han"
    ]
  },
  {
    "norm_name": "Chi phí phải trả ngắn hạn",
    "aliases_for_where_ind_name": [
      "Chi phí phải trả ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_phai_tra_ngan_han"
    ]
  },
  {
    "norm_name": "Chi phí phải trả, chi phí trả trước",
    "aliases_for_where_ind_name": [
      "Chi phí phải trả, chi phí trả trước"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_phai_tra_va_chi_phi_tra_truoc"
    ]
  },
  {
    "norm_name": "Chi phí quản lý công ty chứng khoán",
    "aliases_for_where_ind_name": [
      "CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_quan_ly_cong_ty_chung_khoan"
    ]
  },
  {
    "norm_name": "Chi phí quản lý doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Chi phí quản lý DN",
      "Chi phí quản lý doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "cp_qldn"
    ]
  },
  {
    "norm_name": "Chi phí sản xuất, kinh doanh dở dang dài hạn",
    "aliases_for_where_ind_name": [
      "Chi phí sản xuất, kinh doanh dở dang dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_san_xuat_kinh_doanh_do_dang_dai_han"
    ]
  },
  {
    "norm_name": "Chi phí thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Chi phí thuế TNDN",
      "CHI PHÍ THUẾ TNDN",
      "Tax For the Year"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn"
    ]
  },
  {
    "norm_name": "Chi phí thuế thu nhập doanh nghiệp +",
    "aliases_for_where_ind_name": [
      "Chi phí thuế TNDN (16)+(17)"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn"
    ]
  },
  {
    "norm_name": "Chi phí thuế thu nhập doanh nghiệp giữ lại",
    "aliases_for_where_ind_name": [
      "Chi phí thuế TNDN giữ lại"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_thue_tndn_giu_lai"
    ]
  },
  {
    "norm_name": "Chi phí thuế thu nhập doanh nghiệp hiện hành",
    "aliases_for_where_ind_name": [
      "Chi phí thuế TNDN hiện hành"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hh"
    ]
  },
  {
    "norm_name": "Chi phí thuế thu nhập doanh nghiệp hoãn lại",
    "aliases_for_where_ind_name": [
      "Chi phí thuế TNDN hoãn lại"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hl"
    ]
  },
  {
    "norm_name": "Chi phí thuế thu nhập hiện hành",
    "aliases_for_where_ind_name": [
      "Chi phí thuế thu nhập hiện hành"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hh"
    ]
  },
  {
    "norm_name": "Chi phí tiền lãi vay",
    "aliases_for_where_ind_name": [
      "Chi phí tiền lãi vay"
    ],
    "old_ind_codes_reference_only": [
      "cp_lai_vay"
    ]
  },
  {
    "norm_name": "Chi phí trả trước dài hạn",
    "aliases_for_where_ind_name": [
      "Chi phí trả trước dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_tra_truoc_dai_han"
    ]
  },
  {
    "norm_name": "Chi phí trả trước ngắn hạn",
    "aliases_for_where_ind_name": [
      "Chi phí trả trước ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_tra_truoc_ngan_han"
    ]
  },
  {
    "norm_name": "Chi phí tài chính",
    "aliases_for_where_ind_name": [
      "Chi phí tài chính"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_tai_chinh"
    ]
  },
  {
    "norm_name": "Chi phí tư vấn",
    "aliases_for_where_ind_name": [
      "Chi phí tư vấn"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_tu_van"
    ]
  },
  {
    "norm_name": "Chi phí xây dựng cơ bản dở dang",
    "aliases_for_where_ind_name": [
      "chi phí xây dựng cơ bản dở dang",
      "Chi phí xây dựng cơ bản dở dang"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_xay_dung_co_ban_do_dang"
    ]
  },
  {
    "norm_name": "Chi phí đầu tư khác",
    "aliases_for_where_ind_name": [
      "Chi phí đầu tư khác"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_dau_tu_khac"
    ]
  },
  {
    "norm_name": "Chi trả cho việc mua lại, trả cổ phiếu",
    "aliases_for_where_ind_name": [
      "Chi trả cho việc mua lại, trả cổ phiếu"
    ],
    "old_ind_codes_reference_only": [
      "chi_tra_cho_viec_mua_lai_tra_co_phieu"
    ]
  },
  {
    "norm_name": "Chi từ các quỹ của tổ chức tín dụng",
    "aliases_for_where_ind_name": [
      "Chi từ các quỹ của TCTD",
      "Payment from reserves"
    ],
    "old_ind_codes_reference_only": [
      "chi_tu_cac_quy_cua_tctd"
    ]
  },
  {
    "norm_name": "Chi đầu tư ngắn hạn",
    "aliases_for_where_ind_name": [
      "Chi đầu tư ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "chi_dau_tu_ngan_han"
    ]
  },
  {
    "norm_name": "Cho vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "cho_vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Cho vay khách hàng",
    "aliases_for_where_ind_name": [
      "_Cho vay khách hàng",
      "Cho vay khách hàng",
      "Loans and advances to customers"
    ],
    "old_ind_codes_reference_only": [
      "cho_vay_khach_hang"
    ]
  },
  {
    "norm_name": "Cho vay khách hàng ròng",
    "aliases_for_where_ind_name": [
      "Loans and advances to customers, net"
    ],
    "old_ind_codes_reference_only": [
      "cho_vay_khach_hang_rong"
    ]
  },
  {
    "norm_name": "Chênh lệch giảm đánh giá lại các tài sản tài chính thông qua lãi/lỗ",
    "aliases_for_where_ind_name": [
      "Chênh lệch giảm đánh giá lại các TSTC thông qua lãi/lỗ"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_giam_danh_gia_lai_cac_tstc_thong_qua_lai_lo"
    ]
  },
  {
    "norm_name": "Chênh lệch lãi tỷ giá hối đoái đã và chưa thực hiện",
    "aliases_for_where_ind_name": [
      "Chênh lệch lãi tỷ giá hối đoái đã và chưa thực hiện"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_lai_ty_gia_hoi_doai_da_va_chua_thuc_hien"
    ]
  },
  {
    "norm_name": "Chênh lệch lỗ tỷ giá hối đoái đã và chưa thực hiện",
    "aliases_for_where_ind_name": [
      "Chênh lệch lỗ tỷ giá hối đoái đã và chưa thực hiện"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_lo_ty_gia_hoi_doai_da_va_chua_thuc_hien"
    ]
  },
  {
    "norm_name": "Chênh lệch số tiền thực thu/thực chi từ hoạt động kinh doanh (ngoại tệ, vàng bạc, chứng khoán)",
    "aliases_for_where_ind_name": [
      "Chênh lệch số tiền thực thu/ thực chi từ hoạt động kinh doanh (ngoại tệ, vàng bạc, chứng khoán)"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_so_tien_thuc_thu_thuc_chi_tu_hoat_dong_kinh_doanh_ngoai_te_vang_bac_chung_khoan"
    ]
  },
  {
    "norm_name": "Chênh lệch tăng đánh giá lại các tài sản tài chính thông qua lãi/lỗ",
    "aliases_for_where_ind_name": [
      "Chênh lệch tăng đánh giá lại các TSTC thông qua lãi/lỗ"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_tang_danh_gia_lai_cac_tstc_thong_qua_lai_lo"
    ]
  },
  {
    "norm_name": "Chênh lệch tỷ giá hối đoái",
    "aliases_for_where_ind_name": [
      "Chênh lệch tỷ giá hối đoái",
      "Foreign Currency Difference reserve"
    ],
    "old_ind_codes_reference_only": [
      "cl_tygia"
    ]
  },
  {
    "norm_name": "Chênh lệch đánh giá lại tài sản",
    "aliases_for_where_ind_name": [
      "Chênh lệch đánh giá lại tài sản",
      "Difference upon Assets Revaluation"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_danh_gia_lai_tai_san"
    ]
  },
  {
    "norm_name": "Chênh lệch đánh giá tài sản theo giá trị hợp lý",
    "aliases_for_where_ind_name": [
      "Chênh lệch đánh giá tài sản theo giá trị hợp lý"
    ],
    "old_ind_codes_reference_only": [
      "chenh_lech_danh_gia_tai_san_theo_gia_tri_hop_ly"
    ]
  },
  {
    "norm_name": "Chứng khoán kinh doanh",
    "aliases_for_where_ind_name": [
      "_Chứng khoán kinh doanh",
      "Chứng khoán kinh doanh",
      "Trading Securities"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_kinh_doanh"
    ]
  },
  {
    "norm_name": "Chứng khoán kinh doanh ròng",
    "aliases_for_where_ind_name": [
      "Trading Securities, net"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_kinh_doanh_rong"
    ]
  },
  {
    "norm_name": "Chứng khoán đầu tư",
    "aliases_for_where_ind_name": [
      "Chứng khoán đầu tư",
      "Investment Securities"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu"
    ]
  },
  {
    "norm_name": "Chứng khoán đầu tư giữ đến ngày đáo hạn",
    "aliases_for_where_ind_name": [
      "Chứng khoán đầu tư giữ đến ngày đáo hạn",
      "Held-to-Maturity Securities"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Chứng khoán đầu tư sẵn sàng để bán",
    "aliases_for_where_ind_name": [
      "Available-for Sales Securities",
      "Chứng khoán đầu tư sẵn sàng để bán"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Các công cụ tài chính phái sinh và các khoản nợ tài chính khác",
    "aliases_for_where_ind_name": [
      "_Các công cụ tài chính phái sinh và khoản nợ tài chính khác",
      "_Derivatives and other financial liabilities",
      "Các công cụ tài chính phái sinh và các khoản nợ tài chính khác",
      "Các công cụ tài chính phái sinh và khoản nợ tài chính khác",
      "Derivatives and other financial liabilities"
    ],
    "old_ind_codes_reference_only": [
      "phai_sinh_va_no_tc_khac"
    ]
  },
  {
    "norm_name": "Các công cụ tài chính phái sinh và các tài sản tài chính khác",
    "aliases_for_where_ind_name": [
      "Các công cụ tài chính phái sinh và các tài sản tài chính khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_sinh_va_ts_tc_khac"
    ]
  },
  {
    "norm_name": "Các khoản chi trực tiếp từ lợi nhuận",
    "aliases_for_where_ind_name": [
      "Các khoản chi trực tiếp từ lợi nhuận"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_chi_truc_tiep_tu_loi_nhuan"
    ]
  },
  {
    "norm_name": "Các khoản cho vay",
    "aliases_for_where_ind_name": [
      "Các khoản cho vay"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_cho_vay"
    ]
  },
  {
    "norm_name": "Các khoản dự phòng",
    "aliases_for_where_ind_name": [
      "Các khoản dự phòng"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_du_phong"
    ]
  },
  {
    "norm_name": "Các khoản dự phòng rủi ro cho các tài sản có nội bảng khác",
    "aliases_for_where_ind_name": [
      "Các khoản dự phòng rủi ro cho các tài sản có nội bảng khác"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_du_phong_rui_ro_cho_cac_tai_san_co_noi_bang_khac"
    ]
  },
  {
    "norm_name": "Các khoản giảm trừ",
    "aliases_for_where_ind_name": [
      "Các khoản giảm trừ"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_giam_tru"
    ]
  },
  {
    "norm_name": "Các khoản giảm trừ doanh thu",
    "aliases_for_where_ind_name": [
      "Các khoản giảm trừ doanh thu"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_giam_tru_doanh_thu"
    ]
  },
  {
    "norm_name": "Các khoản ký quỹ, ký cược dài hạn",
    "aliases_for_where_ind_name": [
      "Các khoản ký quỹ, ký cược dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_ky_quy_ky_cuoc_dai_han"
    ]
  },
  {
    "norm_name": "Các khoản lãi, phí phải thu",
    "aliases_for_where_ind_name": [
      "Các khoản lãi, phí phải thu"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_lai_phi_phai_thu"
    ]
  },
  {
    "norm_name": "Các khoản lãi, phí phải trả",
    "aliases_for_where_ind_name": [
      "Các khoản lãi, phí phải trả"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_lai_phi_phai_tra"
    ]
  },
  {
    "norm_name": "Các khoản nợ Chính phủ và Ngân hàng Nhà nước",
    "aliases_for_where_ind_name": [
      "Các khoản nợ chính phủ và NHNN"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_no_chinh_phu_va_nhnn"
    ]
  },
  {
    "norm_name": "Các khoản nợ Chính phủ và Ngân hàng Nhà nước Việt Nam",
    "aliases_for_where_ind_name": [
      "Các khoản nợ chính phủ và NHNN Việt Nam",
      "Due to Gov and borrowings from SBV"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_no_chinh_phu_va_nhnn_viet_nam"
    ]
  },
  {
    "norm_name": "Các khoản nợ khác",
    "aliases_for_where_ind_name": [
      "Các khoản nợ khác"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_no_khac"
    ]
  },
  {
    "norm_name": "Các khoản phải thu",
    "aliases_for_where_ind_name": [
      "Các khoản phải thu"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_thu"
    ]
  },
  {
    "norm_name": "Các khoản phải thu dài hạn",
    "aliases_for_where_ind_name": [
      "Các khoản phải thu dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_thu_dai_han"
    ]
  },
  {
    "norm_name": "Các khoản phải thu khác",
    "aliases_for_where_ind_name": [
      "Các khoản phải thu khác"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_thu_khac"
    ]
  },
  {
    "norm_name": "Các khoản phải thu ngắn hạn",
    "aliases_for_where_ind_name": [
      "Các khoản phải thu ngắn hạn",
      "Các khoản phải thu ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_thu"
    ]
  },
  {
    "norm_name": "Các khoản phải trả và công nợ khác",
    "aliases_for_where_ind_name": [
      "Các khoản phải trả và công nợ khác"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_tra_va_cong_no_khac"
    ]
  },
  {
    "norm_name": "Các khoản phải trả, phải nộp khác dài hạn",
    "aliases_for_where_ind_name": [
      "Các khoản phải trả, phải nộp khác dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_tra_phai_nop_khac_dai_han"
    ]
  },
  {
    "norm_name": "Các khoản phải trả, phải nộp khác ngắn hạn",
    "aliases_for_where_ind_name": [
      "Các khoản phải trả, phải nộp khác ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_tra_phai_nop_khac_ngan_han"
    ]
  },
  {
    "norm_name": "Các khoản phải trả, phải nộp ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Các khoản phải trả, phải nộp ngắn hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_phai_tra_phai_nop_ngan_han_khac"
    ]
  },
  {
    "norm_name": "Các khoản trích nộp phúc lợi nhân viên",
    "aliases_for_where_ind_name": [
      "Các khoản trích nộp phúc lợi nhân viên"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_trich_nop_phuc_loi_nhan_vien"
    ]
  },
  {
    "norm_name": "Các khoản tương đương tiền",
    "aliases_for_where_ind_name": [
      "Các khoản tương đương tiền"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_tuong_duong_tien"
    ]
  },
  {
    "norm_name": "Các khoản điều chỉnh khác",
    "aliases_for_where_ind_name": [
      "Các khoản điều chỉnh khác"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_dieu_chinh_khac"
    ]
  },
  {
    "norm_name": "Các khoản đầu tư",
    "aliases_for_where_ind_name": [
      "Các khoản đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_dau_tu"
    ]
  },
  {
    "norm_name": "Các khoản đầu tư giữ đến ngày đáo hạn (HTM)",
    "aliases_for_where_ind_name": [
      "Các  khoản đầu tư  giữ đến ngày đáo hạn (HTM)"
    ],
    "old_ind_codes_reference_only": [
      "cac_khoan_dau_tu_giu_den_ngay_dao_han_htm"
    ]
  },
  {
    "norm_name": "Các khoản đầu tư nắm giữ đến ngày đáo hạn",
    "aliases_for_where_ind_name": [
      "Các khoản đầu tư nắm giữ đến ngày đáo hạn"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Các khoản đầu tư tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Các khoản đầu tư tài chính dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "dt_tc_dh"
    ]
  },
  {
    "norm_name": "Các khoản đầu tư tài chính ngắn hạn",
    "aliases_for_where_ind_name": [
      "Các khoản đầu tư tài chính ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_tai_chinh_ngan_han"
    ]
  },
  {
    "norm_name": "Các Quỹ khác thuộc vốn chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Các Quỹ khác thuộc vốn chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "quy_khac"
    ]
  },
  {
    "norm_name": "Các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)",
    "aliases_for_where_ind_name": [
      "Các tài sản tài chính ghi nhận thông qua lãi lỗ (FVTPL)"
    ],
    "old_ind_codes_reference_only": [
      "cac_tai_san_tai_chinh_ghi_nhan_thong_qua_lai_lo_fvtpl"
    ]
  },
  {
    "norm_name": "Các tài sản tài chính sẵn sàng để bán (AFS)",
    "aliases_for_where_ind_name": [
      "Các tài sản tài chính sẵn sàng để bán (AFS)"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Cầm cố, ký quỹ, ký cược dài hạn khác",
    "aliases_for_where_ind_name": [
      "Cầm cố, ký quỹ, ký cược dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "cam_co_ky_quy_ky_cuoc_dai_han_khac"
    ]
  },
  {
    "norm_name": "Cầm cố, thế chấp, ký quỹ, ký cược dài hạn",
    "aliases_for_where_ind_name": [
      "Cầm cố, thế chấp, ký quỹ, ký cược dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "cam_co_the_chap_ky_quy_ky_cuoc_dai_han"
    ]
  },
  {
    "norm_name": "Cầm cố, thế chấp, ký quỹ, ký cược ngắn hạn",
    "aliases_for_where_ind_name": [
      "Cầm cố, thế chấp, ký quỹ, ký cược ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "cam_co_the_chap_ky_quy_ky_cuoc_ngan_han"
    ]
  },
  {
    "norm_name": "Cổ phiếu phổ thông",
    "aliases_for_where_ind_name": [
      "Cổ phiếu phổ thông",
      "Cổ phiếu phổ thông (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "cp_pho_thong"
    ]
  },
  {
    "norm_name": "Cổ phiếu quỹ",
    "aliases_for_where_ind_name": [
      "Cổ phiếu quỹ"
    ],
    "old_ind_codes_reference_only": [
      "co_phieu_quy"
    ]
  },
  {
    "norm_name": "Cổ tức trả cho cổ đông, lợi nhuận đã chia",
    "aliases_for_where_ind_name": [
      "Cổ tức trả cho cổ đông, lợi nhuận đã chia"
    ],
    "old_ind_codes_reference_only": [
      "co_tuc_tra_cho_co_dong_loi_nhuan_da_chia"
    ]
  },
  {
    "norm_name": "Cổ tức đã nhận",
    "aliases_for_where_ind_name": [
      "Cố tức đã nhận",
      "Cổ tức đã nhận",
      "Dividends received"
    ],
    "old_ind_codes_reference_only": [
      "co_tuc_da_nhan"
    ]
  },
  {
    "norm_name": "Cổ tức đã trả",
    "aliases_for_where_ind_name": [
      "Cổ tức đã trả"
    ],
    "old_ind_codes_reference_only": [
      "co_tuc_da_tra"
    ]
  },
  {
    "norm_name": "Cổ tức, lợi nhuận đã trả cho chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Cổ tức, lợi nhuận đã trả cho chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "co_tuc_loi_nhuan_da_tra_cho_chu_so_huu"
    ]
  },
  {
    "norm_name": "Cổ tức, tiền lãi phát sinh từ tài sản tài chính PVTPL",
    "aliases_for_where_ind_name": [
      "Cổ tức, tiền lãi phát sinh từ tài sản tài chính PVTPL"
    ],
    "old_ind_codes_reference_only": [
      "co_tuc_tien_lai_phat_sinh_tu_tai_san_tai_chinh_pvtpl"
    ]
  },
  {
    "norm_name": "Cổ đông của Công ty mẹ",
    "aliases_for_where_ind_name": [
      "Cổ đông của Công ty mẹ"
    ],
    "old_ind_codes_reference_only": [
      "co_dong_cua_cong_ty_me"
    ]
  },
  {
    "norm_name": "Cộng chi phí hoạt động",
    "aliases_for_where_ind_name": [
      "Cộng chi phí hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "tong_chi_phi_hoat_dong"
    ]
  },
  {
    "norm_name": "Cộng chi phí tài chính",
    "aliases_for_where_ind_name": [
      "Cộng chi phí tài chính"
    ],
    "old_ind_codes_reference_only": [
      "chi_phi_tai_chinh"
    ]
  },
  {
    "norm_name": "Cộng doanh thu hoạt động",
    "aliases_for_where_ind_name": [
      "Cộng doanh thu hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "tong_tn_hd"
    ]
  },
  {
    "norm_name": "Cộng doanh thu hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Cộng doanh thu hoạt động tài chính"
    ],
    "old_ind_codes_reference_only": [
      "dt_tc"
    ]
  },
  {
    "norm_name": "Cộng kết quả hoạt động khác",
    "aliases_for_where_ind_name": [
      "Cộng kết quả hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "ket_qua_hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Doanh thu",
    "aliases_for_where_ind_name": [
      "Doanh thu",
      "Doanh thu (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu"
    ]
  },
  {
    "norm_name": "Doanh thu bán hàng",
    "aliases_for_where_ind_name": [
      "Doanh thu bán hàng"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_ban_hang"
    ]
  },
  {
    "norm_name": "Doanh thu bán hàng và cung cấp dịch vụ",
    "aliases_for_where_ind_name": [
      "Doanh thu bán hàng và cung cấp dịch vụ"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_ban_hang_va_cung_cap_dich_vu"
    ]
  },
  {
    "norm_name": "Doanh thu bảo lãnh, đại lý phát hành chứng khoán",
    "aliases_for_where_ind_name": [
      "Doanh thu bảo lãnh, đại lý phát hành chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_bao_lanh_dai_ly_phat_hanh_chung_khoan"
    ]
  },
  {
    "norm_name": "Doanh thu chưa thực hiện dài hạn",
    "aliases_for_where_ind_name": [
      "Doanh thu chưa thực hiện dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_chua_thuc_hien_dai_han"
    ]
  },
  {
    "norm_name": "Doanh thu chưa thực hiện ngắn hạn",
    "aliases_for_where_ind_name": [
      "Doanh thu chưa thực hiện ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_chua_thuc_hien_ngan_han"
    ]
  },
  {
    "norm_name": "Doanh thu hoạt động nhận ủy thác, đấu giá",
    "aliases_for_where_ind_name": [
      "Doanh thu hoạt động nhận ủy thác, đấu giá"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_hoat_dong_nhan_uy_thac_dau_gia"
    ]
  },
  {
    "norm_name": "Doanh thu hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Doanh thu hoạt động tài chính",
      "Doanh thu tài chính",
      "Thu nhập tài chính"
    ],
    "old_ind_codes_reference_only": [
      "dt_tc"
    ]
  },
  {
    "norm_name": "Doanh thu khác về đầu tư",
    "aliases_for_where_ind_name": [
      "Doanh thu khác về đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_khac_ve_dau_tu"
    ]
  },
  {
    "norm_name": "Doanh thu lưu ký chứng khoán",
    "aliases_for_where_ind_name": [
      "Doanh thu lưu ký chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_luu_ky_chung_khoan"
    ]
  },
  {
    "norm_name": "Doanh thu môi giới chứng khoán",
    "aliases_for_where_ind_name": [
      "Doanh thu môi giới chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_moi_gioi_chung_khoan"
    ]
  },
  {
    "norm_name": "Doanh thu thuần",
    "aliases_for_where_ind_name": [
      "Doanh thu thuần"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_thuan"
    ]
  },
  {
    "norm_name": "Doanh thu thuần -",
    "aliases_for_where_ind_name": [
      "Doanh thu thuần (1)-(2)"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_thuan"
    ]
  },
  {
    "norm_name": "Doanh thu thuần hoạt động kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Doanh thu thuần hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_thuan"
    ]
  },
  {
    "norm_name": "Doanh thu tư vấn",
    "aliases_for_where_ind_name": [
      "Doanh thu tư vấn"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_tu_van"
    ]
  },
  {
    "norm_name": "Doanh thu, dự thu cổ tức, lãi tiền gửi không cố định phát sinh trong kỳ",
    "aliases_for_where_ind_name": [
      "Doanh thu, dự thu cổ tức, lãi tiền gửi không cố định phát sinh trong kỳ"
    ],
    "old_ind_codes_reference_only": [
      "doanh_thu_du_thu_co_tuc_lai_tien_gui_khong_co_dinh_phat_sinh_trong_ky"
    ]
  },
  {
    "norm_name": "Dự phòng bảo đảm cân đối",
    "aliases_for_where_ind_name": [
      "Dự phòng bảo đảm cân đối"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_bao_dam_can_doi"
    ]
  },
  {
    "norm_name": "Dự phòng bồi thường",
    "aliases_for_where_ind_name": [
      "Dự phòng bồi thường"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_boi_thuong"
    ]
  },
  {
    "norm_name": "Dự phòng bồi thường thiệt hại cho nhà đầu tư",
    "aliases_for_where_ind_name": [
      "Dự phòng bồi thường thiệt hại cho nhà đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_boi_thuong_thiet_hai_cho_nha_dau_tu"
    ]
  },
  {
    "norm_name": "Dự phòng chia lãi",
    "aliases_for_where_ind_name": [
      "Dự phòng chia lãi"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_chia_lai"
    ]
  },
  {
    "norm_name": "Dự phòng các khoản phải thu khó đòi",
    "aliases_for_where_ind_name": [
      "Dự phòng các khoản phải thu khó đòi (*)"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_cac_khoan_phai_thu_kho_doi"
    ]
  },
  {
    "norm_name": "Dự phòng dao động lớn",
    "aliases_for_where_ind_name": [
      "Dự phòng dao động lớn"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_dao_dong_lon"
    ]
  },
  {
    "norm_name": "Dự phòng giảm giá chứng khoán kinh doanh",
    "aliases_for_where_ind_name": [
      "Dự phòng giảm giá chứng khoán kinh doanh",
      "Provision for diminution in value of Trading Securities"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_giam_gia_chung_khoan_kinh_doanh"
    ]
  },
  {
    "norm_name": "Dự phòng giảm giá chứng khoán đầu tư",
    "aliases_for_where_ind_name": [
      "Dự phòng giảm giá chứng khoán đầu tư",
      "Less: Provision for diminution in value of investment securities"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_giam_gia_chung_khoan_dau_tu"
    ]
  },
  {
    "norm_name": "Dự phòng giảm giá chứng khoán đầu tư ngắn hạn",
    "aliases_for_where_ind_name": [
      "Dự phòng giảm giá chứng khoán đầu tư ngắn hạn (*)"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_giam_gia_chung_khoan_dau_tu"
    ]
  },
  {
    "norm_name": "Dự phòng giảm giá hàng tồn kho",
    "aliases_for_where_ind_name": [
      "Dự phòng giảm giá hàng tồn kho"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_giam_gia_hang_ton_kho"
    ]
  },
  {
    "norm_name": "Dự phòng giảm giá đầu tư dài hạn",
    "aliases_for_where_ind_name": [
      "Dự phòng giảm giá đầu tư dài hạn",
      "Less: Provision for diminuation in value of long term investments"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_giam_gia_dau_tu_dai_han"
    ]
  },
  {
    "norm_name": "Dự phòng giảm giá đầu tư tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Dự phòng giảm giá đầu tư tài chính dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_giam_gia_dau_tu_dai_han"
    ]
  },
  {
    "norm_name": "Dự phòng nghiệp vụ",
    "aliases_for_where_ind_name": [
      "Dự phòng nghiệp vụ"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_nghiep_vu"
    ]
  },
  {
    "norm_name": "Dự phòng phí",
    "aliases_for_where_ind_name": [
      "Dự phòng phí"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_phi"
    ]
  },
  {
    "norm_name": "Dự phòng phải thu dài hạn khó đòi",
    "aliases_for_where_ind_name": [
      "Dự phòng phải thu dài hạn khó đòi"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_phai_thu_dai_han_kho_doi"
    ]
  },
  {
    "norm_name": "Dự phòng phải thu ngắn hạn khó đòi",
    "aliases_for_where_ind_name": [
      "Dự phòng phải thu ngắn hạn khó đòi"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_phai_thu_ngan_han_kho_doi"
    ]
  },
  {
    "norm_name": "Dự phòng phải trả dài hạn",
    "aliases_for_where_ind_name": [
      "Dự phòng phải trả dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_phai_tra_dai_han"
    ]
  },
  {
    "norm_name": "Dự phòng phải trả ngắn hạn",
    "aliases_for_where_ind_name": [
      "Dự phòng phải trả ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_phai_tra_ngan_han"
    ]
  },
  {
    "norm_name": "Dự phòng rủi ro cho vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Dự phòng rủi ro cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_rui_ro_cho_vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Dự phòng rủi ro cho vay khách hàng",
    "aliases_for_where_ind_name": [
      "Dự phòng rủi  ro cho vay khách hàng",
      "Dự phòng rủi ro cho vay khách hàng",
      "Less: Provision for losses on loans and advances to customers"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_rui_ro_cho_vay_khach_hang"
    ]
  },
  {
    "norm_name": "Dự phòng rủi ro khác",
    "aliases_for_where_ind_name": [
      "Dự phòng rủi ro khác"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_rui_ro_khac"
    ]
  },
  {
    "norm_name": "Dự phòng rủi ro tín dụng",
    "aliases_for_where_ind_name": [
      "Dự phòng RR tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "dp_rr_td"
    ]
  },
  {
    "norm_name": "Dự phòng suy giảm giá trị các khoản phải thu",
    "aliases_for_where_ind_name": [
      "Dự phòng suy giảm giá trị các khoản phải thu (*)"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_suy_giam_gia_tri_cac_khoan_phai_thu"
    ]
  },
  {
    "norm_name": "Dự phòng suy giảm giá trị các tài sản tài chính và tài sản thế chấp",
    "aliases_for_where_ind_name": [
      "Dự phòng suy giảm giá trị các tài sản tài chính và tài sản thế chấp"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_suy_giam_gia_tri_cac_tai_san_tai_chinh_va_tai_san_the_chap"
    ]
  },
  {
    "norm_name": "Dự phòng suy giảm giá trị tài sản dài hạn",
    "aliases_for_where_ind_name": [
      "Dự phòng suy giảm giá trị tài sản dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_suy_giam_gia_tri_tai_san_dai_han"
    ]
  },
  {
    "norm_name": "Dự phòng suy giảm giá trị tài sản ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Dự phòng suy giảm giá trị tài sản ngắn hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_suy_giam_gia_tri_tai_san_ngan_han_khac"
    ]
  },
  {
    "norm_name": "Dự phòng thuế nhà thầu nước ngoài",
    "aliases_for_where_ind_name": [
      "Dự phòng thuế nhà thầu nước ngoài"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_thue_nha_thau_nuoc_ngoai"
    ]
  },
  {
    "norm_name": "Dự phòng toán học",
    "aliases_for_where_ind_name": [
      "Dự phòng toán học"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_toan_hoc"
    ]
  },
  {
    "norm_name": "Dự phòng trợ cấp mất việc làm",
    "aliases_for_where_ind_name": [
      "Dự phòng trợ cấp mất việc làm"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_tro_cap_mat_viec_lam"
    ]
  },
  {
    "norm_name": "Dự phòng tổn thất tín dụng",
    "aliases_for_where_ind_name": [
      "Dự phòng tổn thất tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "du_phong_ton_that_tin_dung"
    ]
  },
  {
    "norm_name": "Dự thu cổ tức, tiền lãi chưa đến ngày nhận",
    "aliases_for_where_ind_name": [
      "Dự thu cổ tức, tiền lãi chưa đến ngày nhận"
    ],
    "old_ind_codes_reference_only": [
      "du_thu_co_tuc_tien_lai_chua_den_ngay_nhan"
    ]
  },
  {
    "norm_name": "Dự thu tiền lãi",
    "aliases_for_where_ind_name": [
      "Dự thu tiền lãi"
    ],
    "old_ind_codes_reference_only": [
      "du_thu_tien_lai"
    ]
  },
  {
    "norm_name": "Giao dịch mua bán lại trái phiếu chính phủ",
    "aliases_for_where_ind_name": [
      "Giao dịch mua bán lại trái phiếu chính phủ"
    ],
    "old_ind_codes_reference_only": [
      "giao_dich_mua_ban_lai_trai_phieu_chinh_phu"
    ]
  },
  {
    "norm_name": "Giá trị hao mòn lũy kế",
    "aliases_for_where_ind_name": [
      "Giá trị hao mòn lũy kế"
    ],
    "old_ind_codes_reference_only": [
      "gia_tri_hao_mon_luy_ke"
    ]
  },
  {
    "norm_name": "Giá trị ròng tài sản đầu tư",
    "aliases_for_where_ind_name": [
      "Giá trị ròng tài sản đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "gia_tri_rong_tai_san_dau_tu"
    ]
  },
  {
    "norm_name": "Giá trị thuần đầu tư ngắn hạn",
    "aliases_for_where_ind_name": [
      "Giá trị thuần đầu tư ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "gia_tri_thuan_dau_tu_ngan_han"
    ]
  },
  {
    "norm_name": "Giá vốn hàng bán",
    "aliases_for_where_ind_name": [
      "Giá vốn hàng bán"
    ],
    "old_ind_codes_reference_only": [
      "gia_von_hang_ban"
    ]
  },
  {
    "norm_name": "Giảm các doanh thu phi tiền tệ",
    "aliases_for_where_ind_name": [
      "Giảm các doanh thu phi tiền tệ"
    ],
    "old_ind_codes_reference_only": [
      "giam_cac_doanh_thu_phi_tien_te"
    ]
  },
  {
    "norm_name": "Giảm phí bảo hiểm",
    "aliases_for_where_ind_name": [
      "Giảm phí bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "giam_phi_bao_hiem"
    ]
  },
  {
    "norm_name": "Giấy tờ có giá phát hành",
    "aliases_for_where_ind_name": [
      "Convertible bonds/CDs and other valuable papers issued"
    ],
    "old_ind_codes_reference_only": [
      "giay_to_co_gia_phat_hanh"
    ]
  },
  {
    "norm_name": "Góp vốn liên doanh",
    "aliases_for_where_ind_name": [
      "Góp vốn liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cong_ty_lien_doanh"
    ]
  },
  {
    "norm_name": "Góp vốn đầu tư dài hạn",
    "aliases_for_where_ind_name": [
      "Góp vốn đầu tư dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "gop_von_dau_tu_dai_han"
    ]
  },
  {
    "norm_name": "Hoàn phí bảo hiểm",
    "aliases_for_where_ind_name": [
      "Hoàn phí bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "hoan_phi_bao_hiem"
    ]
  },
  {
    "norm_name": "Hoạt động khác",
    "aliases_for_where_ind_name": [
      "Hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Hàng tồn kho",
    "aliases_for_where_ind_name": [
      "Hàng tồn kho"
    ],
    "old_ind_codes_reference_only": [
      "hang_ton_kho"
    ]
  },
  {
    "norm_name": "Hàng tồn kho ròng",
    "aliases_for_where_ind_name": [
      "Hàng tồn kho ròng"
    ],
    "old_ind_codes_reference_only": [
      "htk_rong"
    ]
  },
  {
    "norm_name": "Hàng tồn kho, ròng",
    "aliases_for_where_ind_name": [
      "Hàng tồn kho, ròng (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "htk_rong"
    ]
  },
  {
    "norm_name": "Khấu hao tài sản cố định",
    "aliases_for_where_ind_name": [
      "Khấu hao TSCĐ",
      "Khấu hao tài sản cố định"
    ],
    "old_ind_codes_reference_only": [
      "khau_hao_tscd"
    ]
  },
  {
    "norm_name": "Khấu hao và hao mòn",
    "aliases_for_where_ind_name": [
      "Khấu hao và hao mòn"
    ],
    "old_ind_codes_reference_only": [
      "khau_hao_va_hao_mon"
    ]
  },
  {
    "norm_name": "Kinh doanh ngoại hối và vàng",
    "aliases_for_where_ind_name": [
      "Kinh doanh ngoại hối và vàng"
    ],
    "old_ind_codes_reference_only": [
      "kinh_doanh_ngoai_hoi_va_vang"
    ]
  },
  {
    "norm_name": "Kết quả hoạt động",
    "aliases_for_where_ind_name": [
      "KẾT QUẢ HOẠT ĐỘNG"
    ],
    "old_ind_codes_reference_only": [
      "ket_qua_hoat_dong"
    ]
  },
  {
    "norm_name": "Lãi bán các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Lãi bán các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "lai_ban_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Lãi bán, thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh",
    "aliases_for_where_ind_name": [
      "Lãi bán, thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "lai_ban_thanh_ly_cac_khoan_dau_tu_vao_cong_ty_con_lien_ket_lien_doanh"
    ]
  },
  {
    "norm_name": "Lãi cơ bản trên cổ phiếu",
    "aliases_for_where_ind_name": [
      "EPS_basis",
      "Lãi cơ bản trên cổ phiếu",
      "Lãi cơ bản trên cổ phiếu (Đồng/1 cổ phiếu)"
    ],
    "old_ind_codes_reference_only": [
      "eps_basis",
      "lai_co_ban_tren_co_phieu"
    ]
  },
  {
    "norm_name": "Lãi lỗ trong công ty liên doanh, liên kết",
    "aliases_for_where_ind_name": [
      "Lãi lỗ trong công ty liên doanh, liên kết"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_trong_cong_ty_lien_doanh_lien_ket"
    ]
  },
  {
    "norm_name": "Lãi lỗ từ hoạt động đầu tư",
    "aliases_for_where_ind_name": [
      "Lãi lỗ từ hoạt động đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_hoat_dong_dau_tu"
    ]
  },
  {
    "norm_name": "Lãi thuần từ hoạt động dịch vụ",
    "aliases_for_where_ind_name": [
      "Lãi thuần từ hoạt động dịch vụ",
      "Net Fee and Commission Income"
    ],
    "old_ind_codes_reference_only": [
      "ln_thuan_dv"
    ]
  },
  {
    "norm_name": "Lãi tiền gửi",
    "aliases_for_where_ind_name": [
      "Lãi tiền gửi"
    ],
    "old_ind_codes_reference_only": [
      "lai_tien_gui"
    ]
  },
  {
    "norm_name": "Lãi tiền gửi và cổ tức",
    "aliases_for_where_ind_name": [
      "Lãi tiền gửi và cổ tức"
    ],
    "old_ind_codes_reference_only": [
      "lai_tien_gui_va_co_tuc"
    ]
  },
  {
    "norm_name": "Lãi tiền gửi đã thu",
    "aliases_for_where_ind_name": [
      "Lãi tiền gửi đã thu"
    ],
    "old_ind_codes_reference_only": [
      "lai_tien_gui_da_thu"
    ]
  },
  {
    "norm_name": "Lãi từ các khoản cho vay và phải thu",
    "aliases_for_where_ind_name": [
      "Lãi từ các khoản cho vay và phải thu"
    ],
    "old_ind_codes_reference_only": [
      "lai_tu_cac_khoan_cho_vay_va_phai_thu"
    ]
  },
  {
    "norm_name": "Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)",
    "aliases_for_where_ind_name": [
      "Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)",
    "aliases_for_where_ind_name": [
      "Lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)"
    ],
    "old_ind_codes_reference_only": [
      "lai_tu_cac_tai_san_tai_chinh_ghi_nhan_thong_qua_lai_lo_fvtpl"
    ]
  },
  {
    "norm_name": "Lãi từ các tài sản tài chính sẵn sàng để bán (AFS)",
    "aliases_for_where_ind_name": [
      "Lãi từ các tài sản tài chính sẵn sàng để bán (AFS)"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Lãi từ thanh lý các tài sản tài chính sẵn sàng để bán",
    "aliases_for_where_ind_name": [
      "Lãi từ thanh lý các tài sản tài chính sẵn sàng để bán"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Lãi đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh",
    "aliases_for_where_ind_name": [
      "Lãi đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "lai_danh_gia_gia_tri_cac_tai_san_tai_chinh_ghi_nhan_thong_qua_ket_qua_kinh_doanh"
    ]
  },
  {
    "norm_name": "Lãi/lỗ chênh lệch tỷ giá của hoạt động tại nước ngoài",
    "aliases_for_where_ind_name": [
      "Lãi/(lỗ) chênh lệch tỷ giá của hoạt động tại nước ngoài"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_chenh_lech_ty_gia_cua_hoat_dong_tai_nuoc_ngoai"
    ]
  },
  {
    "norm_name": "Lãi/lỗ chênh lệch tỷ giá hối đoái",
    "aliases_for_where_ind_name": [
      "Lãi, lỗ chênh lệch tỷ giá hối đoái"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_chenh_lech_ty_gia_hoi_doai"
    ]
  },
  {
    "norm_name": "Lãi/lỗ chênh lệch tỷ giá hối đoái chưa thực hiện",
    "aliases_for_where_ind_name": [
      "(- Lãi) hoặc (+ lỗ) chênh lệch tỷ giá hối đoái chưa thực hiện",
      "Lãi, lỗ chênh lệch tỷ giá hối đoái chưa thực hiện",
      "Lãi/Lỗ chênh lệch tỷ giá chưa thực hiện",
      "Lãi/lỗ chênh lệch tỷ giá chưa thực hiện"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_chenh_lech_ty_gia_chua_thuc_hien",
      "lai_lo_chenh_lech_ty_gia_hoi_doai_chua_thuc_hien"
    ]
  },
  {
    "norm_name": "Lãi/lỗ các hoạt động khác",
    "aliases_for_where_ind_name": [
      "(Lãi)/lỗ các hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_cac_hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Lãi/lỗ ròng trước thuế",
    "aliases_for_where_ind_name": [
      "Lãi/Lỗ ròng trước thuế"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ hoạt động dịch vụ",
    "aliases_for_where_ind_name": [
      "Lãi/Lỗ thuần từ hoạt động dịch vụ"
    ],
    "old_ind_codes_reference_only": [
      "tn_dv"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ hoạt động khác",
    "aliases_for_where_ind_name": [
      "Lãi/lỗ thuần từ hoạt động khác",
      "Lãi/Lỗ thuần từ hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ hoạt động kinh doanh ngoại hối",
    "aliases_for_where_ind_name": [
      "Lãi/Lỗ thuần từ hoạt động kinh doanh ngoại hối"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_hoat_dong_kinh_doanh_ngoai_hoi"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ kinh doanh chứng khoán",
    "aliases_for_where_ind_name": [
      "Net gain (loss) from trading of trading securities"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_kinh_doanh_chung_khoan"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ kinh doanh ngoại hối và vàng",
    "aliases_for_where_ind_name": [
      "Net gain (loss) from foreign currency and gold dealings"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_kinh_doanh_ngoai_hoi_va_vang"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ mua bán chứng khoán kinh doanh",
    "aliases_for_where_ind_name": [
      "Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_mua_ban_chung_khoan_kinh_doanh"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ mua bán chứng khoán đầu tư",
    "aliases_for_where_ind_name": [
      "Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_mua_ban_chung_khoan_dau_tu"
    ]
  },
  {
    "norm_name": "Lãi/lỗ thuần từ thanh lý chứng khoán đầu tư",
    "aliases_for_where_ind_name": [
      "Net gain (loss) from disposal of investment securities"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_thuan_tu_thanh_ly_chung_khoan_dau_tu"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ công ty liên doanh",
    "aliases_for_where_ind_name": [
      "Lãi/lỗ từ công ty liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_cong_ty_lien_doanh"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ công ty liên doanh, liên kết",
    "aliases_for_where_ind_name": [
      "Lãi/lỗ từ công ty liên doanh liên kết"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_cong_ty_lien_doanh_lien_ket"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Lãi/Lỗ từ hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ hoạt động đầu tư",
    "aliases_for_where_ind_name": [
      "Lãi, lỗ từ hoạt động đầu tư",
      "Lãi/Lỗ từ hoạt động đầu tư",
      "Lãi/lỗ từ hoạt động đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_hoat_dong_dau_tu"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ hoạt động đầu tư (đầu tư công ty con, liên doanh, liên kết)",
    "aliases_for_where_ind_name": [
      "Lãi, lỗ từ hoạt động đầu tư (đầu tư công ty con, liên doanh, liên kết)"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_hoat_dong_dau_tu_dau_tu_cong_ty_con_lien_doanh_lien_ket"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ thanh lý tài sản cố định",
    "aliases_for_where_ind_name": [
      "Lãi, lỗ từ thanh lý TSCĐ",
      "Lãi/Lỗ từ thanh lý tài sản cố định",
      "Profit/Loss from disposal of fixed assets"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_tu_thanh_ly_tai_san_co_dinh",
      "lai_lo_tu_thanh_ly_tscd"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ đánh giá lại các các khoản đầu tư giữ đến ngày đáo hạn",
    "aliases_for_where_ind_name": [
      "Lãi/(Lỗ) từ đánh giá lại các các khoản đầu tư giữ đến ngày đáo hạn"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Lãi/lỗ từ đánh giá lại các tài sản tài chính sẵn sàng để bán",
    "aliases_for_where_ind_name": [
      "Lãi/(Lỗ) từ đánh giá lại các tài sản tài chính sẵn sàng để bán"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Lãi/lỗ đánh giá công cụ phái sinh",
    "aliases_for_where_ind_name": [
      "Lãi, lỗ đánh giá công cụ phái sinh"
    ],
    "old_ind_codes_reference_only": [
      "lai_lo_danh_gia_cong_cu_phai_sinh"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần trong kỳ",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần trong kỳ"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_trong_ky"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
      "Lưu chuyển tiền thuần từ HĐKD"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_tu_hdkd"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần từ hoạt động kinh doanh trước những thay đổi về tài sản và vốn lưu động",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh trước những thay đổi về tài sản và vốn lưu động"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_tu_hdkd_truoc_thay_doi_vld"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần từ hoạt động kinh doanh trước thay đổi vốn lưu động",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐKD trước thay đổi VLĐ"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_tu_hdkd_truoc_thay_doi_vld"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần từ hoạt động kinh doanh trước thuế",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐKD trước thuế",
      "Net Cash Flows from Operating Activities before BIT"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_tu_hdkd_truoc_thue",
      "net_cash_flows_from_operating_activities_before_bit"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần từ hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ hoạt động tài chính",
      "Lưu chuyển tiền thuần từ HĐ tài chính"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_tu_hd_tai_chinh"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền thuần từ hoạt động đầu tư",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ hoạt động đầu tư",
      "Lưu chuyển tiền thuần từ HĐ đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "lctt_thuan_hd_dt"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền tệ ròng từ các hoạt động SXKD"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_te_rong_tu_cac_hoat_dong_sxkd"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền từ hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền từ hoạt động tài chính"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_tu_hoat_dong_tai_chinh"
    ]
  },
  {
    "norm_name": "Lưu chuyển tiền từ hoạt động đầu tư",
    "aliases_for_where_ind_name": [
      "Lưu chuyển từ hoạt động đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "lctt_hd_dt"
    ]
  },
  {
    "norm_name": "Lỗ bán các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Lỗ bán các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "lo_ban_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Lỗ bán các tài sản tài chính sẵn sàng để bán (AFS)",
    "aliases_for_where_ind_name": [
      "Lỗ bán các tài sản tài chính sẵn sàng để bán (AFS)"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Lỗ bán, thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh",
    "aliases_for_where_ind_name": [
      "Lỗ bán, thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "lo_ban_thanh_ly_cac_khoan_dau_tu_vao_cong_ty_con_lien_ket_lien_doanh"
    ]
  },
  {
    "norm_name": "Lỗ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)",
    "aliases_for_where_ind_name": [
      "Lỗ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Lỗ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)",
    "aliases_for_where_ind_name": [
      "Lỗ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)"
    ],
    "old_ind_codes_reference_only": [
      "lo_cac_tai_san_tai_chinh_ghi_nhan_thong_qua_lai_lo_fvtpl"
    ]
  },
  {
    "norm_name": "Lỗ từ thanh lý các tài sản tài chính sẵn sàng để bán",
    "aliases_for_where_ind_name": [
      "Lỗ từ thanh lý các tài sản tài chính sẵn sàng để bán"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Lỗ đánh giá giá trị các công cụ tài chính phái sinh",
    "aliases_for_where_ind_name": [
      "Lỗ đánh giá giá trị các công cụ tài chính phái sinh"
    ],
    "old_ind_codes_reference_only": [
      "lo_danh_gia_gia_tri_cac_cong_cu_tai_chinh_phai_sinh"
    ]
  },
  {
    "norm_name": "Lỗ đánh giá giá trị các công cụ tài chính phái sinh cho mục đích phòng ngừa rủi ro",
    "aliases_for_where_ind_name": [
      "Lỗ đánh giá giá trị các công cụ tài chính phái sinh cho mục đích phòng ngừa rủi ro"
    ],
    "old_ind_codes_reference_only": [
      "lo_danh_gia_gia_tri_cac_cong_cu_tai_chinh_phai_sinh_cho_muc_dich_phong_ngua_rui_ro"
    ]
  },
  {
    "norm_name": "Lỗ đánh giá giá trị các công nợ tài chính ghi nhận thông qua kết quả kinh doanh",
    "aliases_for_where_ind_name": [
      "Lỗ đánh giá giá trị các công nợ tài chính ghi nhận thông qua kết quả kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "lo_danh_gia_gia_tri_cac_cong_no_tai_chinh_ghi_nhan_thong_qua_ket_qua_kinh_doanh"
    ]
  },
  {
    "norm_name": "Lỗ đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh",
    "aliases_for_where_ind_name": [
      "Lỗ đánh giá giá trị các tài sản tài chính ghi nhận thông qua kết quả kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "lo_danh_gia_gia_tri_cac_tai_san_tai_chinh_ghi_nhan_thong_qua_ket_qua_kinh_doanh"
    ]
  },
  {
    "norm_name": "Lợi nhuận chưa phân phối",
    "aliases_for_where_ind_name": [
      "Lợi nhuận chưa phân phối"
    ],
    "old_ind_codes_reference_only": [
      "lnst_chua_pp"
    ]
  },
  {
    "norm_name": "Lợi nhuận chưa phân phối/Lỗ lũy kế",
    "aliases_for_where_ind_name": [
      "Lợi nhuận chưa phân phối/Lỗ lũy kế"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_chua_phan_phoi_lo_luy_ke"
    ]
  },
  {
    "norm_name": "Lợi nhuận chưa thực hiện",
    "aliases_for_where_ind_name": [
      "Lợi nhuận chưa thực hiện"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_chua_thuc_hien"
    ]
  },
  {
    "norm_name": "Lợi nhuận chịu thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Lợi nhuận chịu thuế thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_chiu_thue_thu_nhap_doanh_nghiep"
    ]
  },
  {
    "norm_name": "Lợi nhuận gộp",
    "aliases_for_where_ind_name": [
      "Lãi gộp",
      "Lợi nhuận gộp"
    ],
    "old_ind_codes_reference_only": [
      "ln_gop"
    ]
  },
  {
    "norm_name": "Lợi nhuận gộp -",
    "aliases_for_where_ind_name": [
      "Lợi nhuận gộp (3)-(4)"
    ],
    "old_ind_codes_reference_only": [
      "ln_gop"
    ]
  },
  {
    "norm_name": "Lợi nhuận gộp hoạt động kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Lợi nhuận gộp hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "ln_gop"
    ]
  },
  {
    "norm_name": "Lợi nhuận hoạt động khác",
    "aliases_for_where_ind_name": [
      "Lợi nhuận hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Lợi nhuận hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Lợi nhuận hoạt động tài chính"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_hoat_dong_tai_chinh"
    ]
  },
  {
    "norm_name": "Lợi nhuận khác",
    "aliases_for_where_ind_name": [
      "Lợi nhuận khác",
      "Profits from other activities"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_khac"
    ]
  },
  {
    "norm_name": "Lợi nhuận khác -",
    "aliases_for_where_ind_name": [
      "Lợi nhuận khác (12)-(13)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_khac_12_13"
    ]
  },
  {
    "norm_name": "Lợi nhuận kế toán sau thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_ke_toan_sau_thue_tndn"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau khi điều chỉnh lợi ích của cổ đông thiểu số và cổ tức ưu đãi",
    "aliases_for_where_ind_name": [
      "LNST sau khi điều chỉnh Lợi ích của CĐTS và Cổ tức ưu đãi"
    ],
    "old_ind_codes_reference_only": [
      "lnst_sau_khi_dieu_chinh_loi_ich_cua_cdts_va_co_tuc_uu_dai"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế chưa phân phối",
    "aliases_for_where_ind_name": [
      "LNST chưa phân phối",
      "Lãi chưa phân phối (đồng)",
      "Lợi nhuận sau thuế chưa phân phối"
    ],
    "old_ind_codes_reference_only": [
      "lnst_chua_pp"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế chưa phân phối kỳ này",
    "aliases_for_where_ind_name": [
      "LNST chưa phân phối kỳ này"
    ],
    "old_ind_codes_reference_only": [
      "lnst_chua_pp"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế chưa phân phối lũy kế đến cuối kỳ trước",
    "aliases_for_where_ind_name": [
      "LNST chưa phân phối lũy kế đến cuối kỳ trước"
    ],
    "old_ind_codes_reference_only": [
      "lnst_chua_pp"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế của chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế phân bổ cho chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_phan_bo_cho_chu_so_huu"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế của cổ đông công ty mẹ",
    "aliases_for_where_ind_name": [
      "LNST của cổ đông công ty mẹ",
      "Lợi nhuận sau thuế của cổ đông công ty mẹ"
    ],
    "old_ind_codes_reference_only": [
      "lnst_cua_co_dong_cong_ty_me",
      "loi_nhuan_sau_thue_cua_co_dong_cong_ty_me"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế của Cổ đông công ty mẹ",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_cua_co_dong_cong_ty_me"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế của cổ đông của công ty mẹ -",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế của cổ đông của công ty mẹ (19)-(20)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_cua_co_dong_cong_ty_me"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế của cổ đông không kiểm soát",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế của cổ đông không kiểm soát"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_cua_co_dong_khong_kiem_soat"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế phân bổ cho cổ đông công ty mẹ",
    "aliases_for_where_ind_name": [
      "LNST phân bổ cho CĐ công ty mẹ"
    ],
    "old_ind_codes_reference_only": [
      "lnst_phan_bo_cho_cd_cong_ty_me"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế thu nhập DN",
      "Lợi nhuận sau thuế thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_thu_nhap_dn"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế thu nhập doanh nghiệp -",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế thu nhập doanh nghiệp (15)-(18)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_thu_nhap_dn"
    ]
  },
  {
    "norm_name": "Lợi nhuận sau thuế trích các Quỹ dự trữ điều lệ, Quỹ Dự phòng tài chính và rủi ro nghề nghiệp theo quy định của Điều lệ Công ty là %)",
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế trích các Quỹ dự trữ điều lệ, Quỹ Dự phòng tài chính và rủi ro nghề nghiệp theo quy định của Điều lệ Công ty là %)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_sau_thue_trich_cac_quy_du_tru_dieu_le_quy_du_phong_tai_chinh_va_rui_ro_nghe_nghiep_theo_quy_dinh_cua_dieu_le_c"
    ]
  },
  {
    "norm_name": "Lợi nhuận thuần",
    "aliases_for_where_ind_name": [
      "Lợi nhuận thuần"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_thuan"
    ]
  },
  {
    "norm_name": "Lợi nhuận thuần hoạt động kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Lợi nhuận thuần hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_thuan_hoat_dong_kinh_doanh_bao_hiem"
    ]
  },
  {
    "norm_name": "Lợi nhuận thuần phân bổ cho lợi ích của cổ đông không kiểm soát",
    "aliases_for_where_ind_name": [
      "Lợi nhuận thuần phân bổ cho lợi ích của cổ đông không kiểm soát"
    ],
    "old_ind_codes_reference_only": [
      "loi_ich_cd_ts"
    ]
  },
  {
    "norm_name": "Lợi nhuận thuần từ hoạt động kinh doanh + - + - -",
    "aliases_for_where_ind_name": [
      "Lợi nhuận thuần từ hoạt động kinh doanh (5)+(6)-(7)+(8)-(9)-(10)"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_thuan_tu_hoat_dong_kinh_doanh_5_6_7_8_9_10"
    ]
  },
  {
    "norm_name": "Lợi nhuận thuần từ đầu tư vào công ty liên kết",
    "aliases_for_where_ind_name": [
      "Lợi nhuận thuần từ đầu tư vào công ty liên kết"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_thuan_tu_dau_tu_vao_cong_ty_lien_ket"
    ]
  },
  {
    "norm_name": "Lợi nhuận trước thuế",
    "aliases_for_where_ind_name": [
      "LN trước thuế",
      "Lợi nhuận trước thuế"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Lợi nhuận trước Thuế Thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Lợi nhuận trước Thuế Thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Lợi nhuận từ hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Lợi nhuận từ HĐKD"
    ],
    "old_ind_codes_reference_only": [
      "ln_tu_hdkd"
    ]
  },
  {
    "norm_name": "Lợi nhuận từ hoạt động kinh doanh trước chi phí dự phòng",
    "aliases_for_where_ind_name": [
      "LN từ HĐKD trước CF dự phòng",
      "Operating Profit before Provision"
    ],
    "old_ind_codes_reference_only": [
      "ln_tu_hdkd_truoc_cf_du_phong"
    ]
  },
  {
    "norm_name": "Lợi nhuận từ hoạt động kinh doanh trước chi phí dự phòng rủi ro tín dụng",
    "aliases_for_where_ind_name": [
      "Lợi nhuận từ HDKD trước chi phí dự phòng rủi ro tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "ln_tu_hdkd_truoc_cf_du_phong"
    ]
  },
  {
    "norm_name": "Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động",
    "aliases_for_where_ind_name": [
      "Lợi nhuận từ hoạt động kinh doanh trước thay đổi vốn lưu động",
      "Lợi nhuận từ HĐKD trước thay đổi vốn lưu động"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_tu_hdkd_truoc_thay_doi_von_luu_dong"
    ]
  },
  {
    "norm_name": "Lợi nhuận đã phân phối cho nhà đầu tư",
    "aliases_for_where_ind_name": [
      "LỢI NHUẬN ĐÃ PHÂN PHỐI CHO NHÀ ĐẦU TƯ"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_da_phan_phoi_cho_nha_dau_tu"
    ]
  },
  {
    "norm_name": "Lợi nhuận đã phân phối cho Nhà đầu tư trong năm",
    "aliases_for_where_ind_name": [
      "Lợi nhuận đã phân phối cho Nhà đầu tư trong năm"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_da_phan_phoi_cho_nha_dau_tu_trong_nam"
    ]
  },
  {
    "norm_name": "Lợi nhuận đã thực hiện",
    "aliases_for_where_ind_name": [
      "Lợi nhuận đã thực hiện"
    ],
    "old_ind_codes_reference_only": [
      "loi_nhuan_da_thuc_hien"
    ]
  },
  {
    "norm_name": "Lợi nhuận/lỗ thuần trước thuế",
    "aliases_for_where_ind_name": [
      "Lợi nhuận/Lỗ thuần trước thuế"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Lợi thế thương mại",
    "aliases_for_where_ind_name": [
      "Goodwill",
      "Lợi thế thương mại",
      "Lợi thế thương mại (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "loi_the_tm"
    ]
  },
  {
    "norm_name": "Lợi ích của cổ đông không kiểm soát",
    "aliases_for_where_ind_name": [
      "Cổ đông thiểu số",
      "Lợi ích cổ đông thiểu số",
      "LỢI ÍCH CỔ ĐÔNG THIỂU SỐ",
      "Lợi ích cổ đông thiểu số (Nguồn vốn)",
      "Lợi ích của cổ đông không kiểm soát",
      "Lợi ích của cổ đông không nắm quyền kiểm soát",
      "LỢI ÍCH CỦA CỔ ĐÔNG THIỂU SỐ"
    ],
    "old_ind_codes_reference_only": [
      "loi_ich_cd_ts"
    ]
  },
  {
    "norm_name": "Lợi ích của cổ đông thiểu số và cổ tức ưu đãi",
    "aliases_for_where_ind_name": [
      "Lợi ích của cổ đông thiểu số và cổ tức ưu đãi"
    ],
    "old_ind_codes_reference_only": [
      "loi_ich_cd_ts"
    ]
  },
  {
    "norm_name": "Mua sắm bất động sản đầu tư",
    "aliases_for_where_ind_name": [
      "Mua sắm bất động sản đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "bat_dong_san_dau_tu"
    ]
  },
  {
    "norm_name": "Mua sắm tài sản cố định",
    "aliases_for_where_ind_name": [
      "Mua sắm TSCĐ"
    ],
    "old_ind_codes_reference_only": [
      "mua_sam_tscd"
    ]
  },
  {
    "norm_name": "Nguyên giá",
    "aliases_for_where_ind_name": [
      "Nguyên giá"
    ],
    "old_ind_codes_reference_only": [
      "nguyen_gia"
    ]
  },
  {
    "norm_name": "Nguồn kinh phí",
    "aliases_for_where_ind_name": [
      "Nguồn kinh phí"
    ],
    "old_ind_codes_reference_only": [
      "nguon_kinh_phi"
    ]
  },
  {
    "norm_name": "Nguồn kinh phí và quỹ khác",
    "aliases_for_where_ind_name": [
      "Nguồn kinh phí và quỹ khác"
    ],
    "old_ind_codes_reference_only": [
      "nguon_kinh_phi_va_quy_khac"
    ]
  },
  {
    "norm_name": "Nguồn kinh phí đã hình thành tài sản cố định",
    "aliases_for_where_ind_name": [
      "Nguồn kinh phí đã hình thành tài sản cố định"
    ],
    "old_ind_codes_reference_only": [
      "nguon_kinh_phi_da_hinh_thanh_tai_san_co_dinh"
    ]
  },
  {
    "norm_name": "Nguồn kinh phí, quỹ khác",
    "aliases_for_where_ind_name": [
      "Nguồn kinh phí, quỹ khác"
    ],
    "old_ind_codes_reference_only": [
      "nguon_kinh_phi_quy_khac"
    ]
  },
  {
    "norm_name": "Nguồn vốn chủ sở hữu",
    "aliases_for_where_ind_name": [
      "NGUỒN VỐN CHỦ SỞ HỮU",
      "Nguồn vốn chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "vcsh"
    ]
  },
  {
    "norm_name": "Nguồn vốn đầu tư xây dựng cơ bản",
    "aliases_for_where_ind_name": [
      "Nguồn vốn đầu tư xây dựng cơ bản"
    ],
    "old_ind_codes_reference_only": [
      "nguon_von_dau_tu_xay_dung_co_ban"
    ]
  },
  {
    "norm_name": "Người mua trả tiền trước",
    "aliases_for_where_ind_name": [
      "Người mua trả tiền trước"
    ],
    "old_ind_codes_reference_only": [
      "nguoi_mua_tra_tien_truoc"
    ]
  },
  {
    "norm_name": "Người mua trả tiền trước ngắn hạn",
    "aliases_for_where_ind_name": [
      "Người mua trả tiền trước ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "nguoi_mua_tra_tien_truoc"
    ]
  },
  {
    "norm_name": "Nhận ký quỹ, ký cược dài hạn",
    "aliases_for_where_ind_name": [
      "Nhận ký quỹ, ký cược dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "nhan_ky_quy_ky_cuoc_dai_han"
    ]
  },
  {
    "norm_name": "Nhận ký quỹ, ký cược ngắn hạn",
    "aliases_for_where_ind_name": [
      "Nhận ký quỹ, ký cược ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "nhan_ky_quy_ky_cuoc_ngan_han"
    ]
  },
  {
    "norm_name": "Nợ dài hạn",
    "aliases_for_where_ind_name": [
      "Nợ dài hạn",
      "Nợ dài hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "no_dai_han"
    ]
  },
  {
    "norm_name": "Nợ khác",
    "aliases_for_where_ind_name": [
      "Nợ khác",
      "Other liabilities"
    ],
    "old_ind_codes_reference_only": [
      "no_khac"
    ]
  },
  {
    "norm_name": "Nợ ngắn hạn",
    "aliases_for_where_ind_name": [
      "Nợ ngắn hạn",
      "Nợ ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "no_ngan_han"
    ]
  },
  {
    "norm_name": "Nợ phải trả",
    "aliases_for_where_ind_name": [
      "Nợ phải trả",
      "NỢ PHẢI TRẢ",
      "NỢ PHẢI TRẢ (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "no_phai_tra"
    ]
  },
  {
    "norm_name": "Nợ phải trả dài hạn",
    "aliases_for_where_ind_name": [
      "Nợ phải trả dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "no_dai_han"
    ]
  },
  {
    "norm_name": "Nợ phải trả ngắn hạn",
    "aliases_for_where_ind_name": [
      "Nợ phải trả ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "no_ngan_han"
    ]
  },
  {
    "norm_name": "Nợ thuê tài sản tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Nợ thuê tài sản tài chính dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "no_thue_tai_san_tai_chinh_dai_han"
    ]
  },
  {
    "norm_name": "Nợ thuê tài sản tài chính ngắn hạn",
    "aliases_for_where_ind_name": [
      "Nợ thuê tài sản tài chính ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "no_thue_tai_san_tai_chinh_ngan_han"
    ]
  },
  {
    "norm_name": "Phát hành giấy tờ có giá",
    "aliases_for_where_ind_name": [
      "Phát hành giấy tờ có giá"
    ],
    "old_ind_codes_reference_only": [
      "phat_hanh_giay_to_co_gia"
    ]
  },
  {
    "norm_name": "Phí nhượng tái bảo hiểm",
    "aliases_for_where_ind_name": [
      "Phí nhượng tái bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "phi_nhuong_tai_bao_hiem"
    ]
  },
  {
    "norm_name": "Phải thu bán các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Phải thu bán các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_ban_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Phải thu các dịch vụ công ty chứng khoán cung cấp",
    "aliases_for_where_ind_name": [
      "Phải thu các dịch vụ CTCK cung cấp"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_cac_dich_vu_ctck_cung_cap"
    ]
  },
  {
    "norm_name": "Phải thu cổ tức, tiền lãi đến ngày nhận",
    "aliases_for_where_ind_name": [
      "Phải thu cổ tức, tiền lãi đến ngày nhận"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_co_tuc_tien_lai_den_ngay_nhan"
    ]
  },
  {
    "norm_name": "Phải thu của khách hàng",
    "aliases_for_where_ind_name": [
      "Phải thu của khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_cua_khach_hang"
    ]
  },
  {
    "norm_name": "Phải thu dài hạn",
    "aliases_for_where_ind_name": [
      "Phải thu dài hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_dai_han"
    ]
  },
  {
    "norm_name": "Phải thu dài hạn của khách hàng",
    "aliases_for_where_ind_name": [
      "Phải thu dài hạn của khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_dai_han_cua_khach_hang"
    ]
  },
  {
    "norm_name": "Phải thu dài hạn khác",
    "aliases_for_where_ind_name": [
      "Phải thu dài hạn khác",
      "Phải thu dài hạn khác (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_dai_han_khac"
    ]
  },
  {
    "norm_name": "Phải thu dài hạn nội bộ",
    "aliases_for_where_ind_name": [
      "Phải thu dài hạn nội bộ"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_dai_han_noi_bo"
    ]
  },
  {
    "norm_name": "Phải thu ngắn hạn của khách hàng",
    "aliases_for_where_ind_name": [
      "Phải thu ngắn hạn của khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_cua_khach_hang"
    ]
  },
  {
    "norm_name": "Phải thu ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Phải thu ngắn hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_ngan_han_khac"
    ]
  },
  {
    "norm_name": "Phải thu nội bộ",
    "aliases_for_where_ind_name": [
      "Phải thu nội bộ"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_noi_bo"
    ]
  },
  {
    "norm_name": "Phải thu nội bộ ngắn hạn",
    "aliases_for_where_ind_name": [
      "Phải thu nội bộ ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_noi_bo_ngan_han"
    ]
  },
  {
    "norm_name": "Phải thu theo tiến độ hợp đồng xây dựng",
    "aliases_for_where_ind_name": [
      "Phải thu theo tiến độ hợp đồng xây dựng"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_theo_tien_do_hop_dong_xay_dung"
    ]
  },
  {
    "norm_name": "Phải thu và dự thu cổ tức, tiền lãi các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Phải thu và dự thu cổ tức, tiền lãi các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_va_du_thu_co_tuc_tien_lai_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Phải thu về cho vay dài hạn",
    "aliases_for_where_ind_name": [
      "Phải thu về cho vay dài hạn",
      "Phải thu về cho vay dài hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_ve_cho_vay_dai_han"
    ]
  },
  {
    "norm_name": "Phải thu về cho vay ngắn hạn",
    "aliases_for_where_ind_name": [
      "Phải thu về cho vay ngắn hạn",
      "Phải thu về cho vay ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "phai_thu_ve_cho_vay_ngan_han"
    ]
  },
  {
    "norm_name": "Phải trả dài hạn khác",
    "aliases_for_where_ind_name": [
      "Phải trả dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_dai_han_khac"
    ]
  },
  {
    "norm_name": "Phải trả hoạt động giao dịch chứng khoán",
    "aliases_for_where_ind_name": [
      "Phải trả hoạt động giao dịch chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_hoat_dong_giao_dich_chung_khoan"
    ]
  },
  {
    "norm_name": "Phải trả người bán",
    "aliases_for_where_ind_name": [
      "Phải trả người bán"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_nguoi_ban"
    ]
  },
  {
    "norm_name": "Phải trả người bán dài hạn",
    "aliases_for_where_ind_name": [
      "Phải trả người bán dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_nguoi_ban_dai_han"
    ]
  },
  {
    "norm_name": "Phải trả người bán ngắn hạn",
    "aliases_for_where_ind_name": [
      "Phải trả người bán ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_nguoi_ban"
    ]
  },
  {
    "norm_name": "Phải trả người lao động",
    "aliases_for_where_ind_name": [
      "Phải trả người lao động"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_nguoi_lao_dong"
    ]
  },
  {
    "norm_name": "Phải trả ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Phải trả ngắn hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_ngan_han_khac"
    ]
  },
  {
    "norm_name": "Phải trả nội bộ dài hạn",
    "aliases_for_where_ind_name": [
      "Phải trả nội bộ dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_noi_bo_dai_han"
    ]
  },
  {
    "norm_name": "Phải trả nội bộ ngắn hạn",
    "aliases_for_where_ind_name": [
      "Phải trả nội bộ ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_noi_bo_ngan_han"
    ]
  },
  {
    "norm_name": "Phải trả nội bộ về vốn kinh doanh",
    "aliases_for_where_ind_name": [
      "Phải trả nội bộ về vốn kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_noi_bo_ve_von_kinh_doanh"
    ]
  },
  {
    "norm_name": "Phải trả theo tiến độ kế hoạch hợp đồng xây dựng",
    "aliases_for_where_ind_name": [
      "Phải trả theo tiến độ kế hoạch hợp đồng xây dựng"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_theo_tien_do_ke_hoach_hop_dong_xay_dung"
    ]
  },
  {
    "norm_name": "Phải trả về lỗi giao dịch các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Phải trả về lỗi giao dịch các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_ve_loi_giao_dich_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Phần lợi nhuận hoặc lỗ trong công ty liên kết liên doanh",
    "aliases_for_where_ind_name": [
      "Phần lợi nhuận hoặc lỗ trong công ty liên kết liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "phan_loi_nhuan_hoac_lo_trong_cong_ty_lien_ket_lien_doanh"
    ]
  },
  {
    "norm_name": "Quyền chọn chuyển đổi trái phiếu",
    "aliases_for_where_ind_name": [
      "Quyền chọn chuyển đổi trái phiếu"
    ],
    "old_ind_codes_reference_only": [
      "quyen_chon_chuyen_doi_trai_phieu"
    ]
  },
  {
    "norm_name": "Quỹ bình ổn giá",
    "aliases_for_where_ind_name": [
      "Quỹ bình ổn giá"
    ],
    "old_ind_codes_reference_only": [
      "quy_binh_on_gia"
    ]
  },
  {
    "norm_name": "Quỹ của tổ chức tín dụng",
    "aliases_for_where_ind_name": [
      "Quỹ của TCTD",
      "Quỹ của tổ chức tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "quy_cua_to_chuc_tin_dung"
    ]
  },
  {
    "norm_name": "Quỹ dự phòng trợ cấp mất việc làm",
    "aliases_for_where_ind_name": [
      "Quỹ dự phòng trợ cấp mất việc làm"
    ],
    "old_ind_codes_reference_only": [
      "quy_du_phong_tro_cap_mat_viec_lam"
    ]
  },
  {
    "norm_name": "Quỹ dự phòng tài chính",
    "aliases_for_where_ind_name": [
      "Quỹ dự phòng tài chính"
    ],
    "old_ind_codes_reference_only": [
      "quy_du_phong_tai_chinh"
    ]
  },
  {
    "norm_name": "Quỹ dự phòng tài chính và rủi ro nghề nghiệp",
    "aliases_for_where_ind_name": [
      "Quỹ dự phòng tài chính và rủi ro nghề nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "quy_du_phong_tai_chinh_va_rui_ro_nghe_nghiep"
    ]
  },
  {
    "norm_name": "Quỹ dự trữ",
    "aliases_for_where_ind_name": [
      "Reserves"
    ],
    "old_ind_codes_reference_only": [
      "quy_du_tru"
    ]
  },
  {
    "norm_name": "Quỹ dự trữ bắt buộc",
    "aliases_for_where_ind_name": [
      "Quỹ dự trữ bắt buộc"
    ],
    "old_ind_codes_reference_only": [
      "quy_du_tru_bat_buoc"
    ]
  },
  {
    "norm_name": "Quỹ dự trữ điều lệ",
    "aliases_for_where_ind_name": [
      "Quỹ dự trữ điều lệ"
    ],
    "old_ind_codes_reference_only": [
      "quy_du_tru_dieu_le"
    ]
  },
  {
    "norm_name": "Quỹ hỗ trợ sắp xếp doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Quỹ hỗ trợ sắp xếp doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "quy_ho_tro_sap_xep_doanh_nghiep"
    ]
  },
  {
    "norm_name": "Quỹ khen thưởng phúc lợi",
    "aliases_for_where_ind_name": [
      "Quỹ khen thưởng phúc lợi"
    ],
    "old_ind_codes_reference_only": [
      "quy_khen_thuong_phuc_loi"
    ]
  },
  {
    "norm_name": "Quỹ khác",
    "aliases_for_where_ind_name": [
      "_Các quỹ khác",
      "_Other Reserves",
      "Các quỹ khác",
      "Other Reserves"
    ],
    "old_ind_codes_reference_only": [
      "quy_khac",
      "quy_khac_khac"
    ]
  },
  {
    "norm_name": "Quỹ khác thuộc vốn chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Quỹ khác thuộc vốn chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "quy_khac"
    ]
  },
  {
    "norm_name": "Quỹ phát triển khoa học và công nghệ",
    "aliases_for_where_ind_name": [
      "Quỹ phát triển khoa học và công nghệ"
    ],
    "old_ind_codes_reference_only": [
      "quy_phat_trien_khoa_hoc_va_cong_nghe"
    ]
  },
  {
    "norm_name": "Quỹ đầu tư phát triển",
    "aliases_for_where_ind_name": [
      "Quỹ đầu tư phát triển"
    ],
    "old_ind_codes_reference_only": [
      "quy_dtpt"
    ]
  },
  {
    "norm_name": "Quỹ đầu tư và phát triển",
    "aliases_for_where_ind_name": [
      "Quỹ đầu tư và phát triển (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "quy_dtpt"
    ]
  },
  {
    "norm_name": "Suy giảm giá trị của các tài sản tài chính sẵn sàng để bán",
    "aliases_for_where_ind_name": [
      "Suy giảm giá trị của các tài sản tài chính sẵn sàng để bán"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Số lượng cổ phiếu đang lưu hành",
    "aliases_for_where_ind_name": [
      "Số lượng cổ phiếu đang lưu hành"
    ],
    "old_ind_codes_reference_only": [
      "so_luong_co_phieu_dang_luu_hanh"
    ]
  },
  {
    "norm_name": "Số trích dự phòng dao động lớn trong năm",
    "aliases_for_where_ind_name": [
      "Số trích dự phòng dao động lớn trong năm"
    ],
    "old_ind_codes_reference_only": [
      "so_trich_du_phong_dao_dong_lon_trong_nam"
    ]
  },
  {
    "norm_name": "Thay đổi tài sản và nợ phải trả hoạt động",
    "aliases_for_where_ind_name": [
      "Thay đổi tài sản và nợ phải trả hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "thay_doi_tai_san_va_no_phai_tra_hoat_dong"
    ]
  },
  {
    "norm_name": "Thu bồi thường nhượng tái bảo hiểm",
    "aliases_for_where_ind_name": [
      "Thu bồi thường nhượng tái bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "thu_boi_thuong_nhuong_tai_bao_hiem"
    ]
  },
  {
    "norm_name": "Thu hoa hồng nhượng tái bảo hiểm",
    "aliases_for_where_ind_name": [
      "Thu hoa hồng nhượng tái bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "thu_hoa_hong_nhuong_tai_bao_hiem"
    ]
  },
  {
    "norm_name": "Thu hàng đã xử lý bồi thường 100%",
    "aliases_for_where_ind_name": [
      "Thu hàng đã xử lý bồi thường 100%"
    ],
    "old_ind_codes_reference_only": [
      "thu_hang_da_xu_ly_boi_thuong_100"
    ]
  },
  {
    "norm_name": "Thu khác (Giám định, đại lý...)",
    "aliases_for_where_ind_name": [
      "Thu khác (Giám định, đại lý...)"
    ],
    "old_ind_codes_reference_only": [
      "thu_khac_giam_dinh_dai_ly"
    ]
  },
  {
    "norm_name": "Thu khác hoạt động kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Thu khác hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "thu_khac_hoat_dong_kinh_doanh_bao_hiem"
    ]
  },
  {
    "norm_name": "Thu lãi và cổ tức",
    "aliases_for_where_ind_name": [
      "Thu lãi và cổ tức"
    ],
    "old_ind_codes_reference_only": [
      "thu_lai_va_co_tuc"
    ]
  },
  {
    "norm_name": "Thu nhập (lỗ) toàn diện khác sau thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "THU NHẬP (LỖ) TOÀN DIỆN KHÁC SAU THUẾ TNDN"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_lo_toan_dien_khac_sau_thue_tndn"
    ]
  },
  {
    "norm_name": "Thu nhập hoạt động khác",
    "aliases_for_where_ind_name": [
      "Thu nhập hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_khac"
    ]
  },
  {
    "norm_name": "Thu nhập khác",
    "aliases_for_where_ind_name": [
      "Thu nhập khác"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_khac"
    ]
  },
  {
    "norm_name": "Thu nhập lãi",
    "aliases_for_where_ind_name": [
      "Thu nhập lãi"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_lai"
    ]
  },
  {
    "norm_name": "Thu nhập lãi thuần",
    "aliases_for_where_ind_name": [
      "Net Interest Income",
      "Thu nhập lãi thuần"
    ],
    "old_ind_codes_reference_only": [
      "tn_lai_thuan"
    ]
  },
  {
    "norm_name": "Thu nhập lãi và các khoản thu nhập tương tự nhận được",
    "aliases_for_where_ind_name": [
      "Thu nhập lãi và các khoản thu nhập tương tự nhận được"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_lai_va_cac_khoan_tuong_tu"
    ]
  },
  {
    "norm_name": "Thu nhập lãi và các khoản tương tự",
    "aliases_for_where_ind_name": [
      "Interest and Similar Income",
      "Thu nhập lãi và các khoản tương tự"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_lai_va_cac_khoan_tuong_tu"
    ]
  },
  {
    "norm_name": "Thu nhập pha loãng trên cổ phiếu",
    "aliases_for_where_ind_name": [
      "Thu nhập pha loãng trên cổ phiếu (Đồng/1 cổ phiếu)"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_pha_loang_tren_co_phieu_dong_1_co_phieu"
    ]
  },
  {
    "norm_name": "Thu nhập thuần trên cổ phiếu phổ thông",
    "aliases_for_where_ind_name": [
      "THU NHẬP THUẦN TRÊN CỔ PHIẾU PHỔ THÔNG"
    ],
    "old_ind_codes_reference_only": [
      "cp_pho_thong"
    ]
  },
  {
    "norm_name": "Thu nhập thuần từ công ty liên kết",
    "aliases_for_where_ind_name": [
      "Net income from associated companies"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_thuan_tu_cong_ty_lien_ket"
    ]
  },
  {
    "norm_name": "Thu nhập toàn diện phân bổ cho chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Thu nhập toàn diện phân bổ cho chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_toan_dien_phan_bo_cho_chu_so_huu"
    ]
  },
  {
    "norm_name": "Thu nhập toàn diện phân bổ cho cổ đông không nắm quyền kiểm soát",
    "aliases_for_where_ind_name": [
      "Thu nhập toàn diện phân bổ cho cổ đông không nắm quyền kiểm soát"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_toan_dien_phan_bo_cho_co_dong_khong_nam_quyen_kiem_soat"
    ]
  },
  {
    "norm_name": "Thu nhập trên 1 cổ phiếu (EPS điều chỉnh)",
    "aliases_for_where_ind_name": [
      "Thu nhập trên 1 cổ phiếu (EPS điều chỉnh)"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_tren_1_co_phieu_eps_dieu_chinh"
    ]
  },
  {
    "norm_name": "Thu nhập từ hoạt động dịch vụ",
    "aliases_for_where_ind_name": [
      "Fees and Comission Income",
      "Thu nhập từ hoạt động dịch vụ"
    ],
    "old_ind_codes_reference_only": [
      "tn_dv"
    ]
  },
  {
    "norm_name": "Thu nhập từ hoạt động dịch vụ nhận được",
    "aliases_for_where_ind_name": [
      "Thu nhập từ hoạt động dịch vụ nhận được"
    ],
    "old_ind_codes_reference_only": [
      "tn_dv"
    ]
  },
  {
    "norm_name": "Thu nhập từ hoạt động góp vốn mua cổ phần",
    "aliases_for_where_ind_name": [
      "Thu nhập từ hoạt động góp vốn mua cổ phần"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_tu_hoat_dong_gop_von_mua_co_phan"
    ]
  },
  {
    "norm_name": "Thu nhập từ hoạt động khác",
    "aliases_for_where_ind_name": [
      "Thu nhập từ hoạt động khác"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_tu_hoat_dong_khac"
    ]
  },
  {
    "norm_name": "Thu nhập từ lãi và các khoản thu nhập tương tự",
    "aliases_for_where_ind_name": [
      "Thu nhập từ lãi và các khoản thu nhập tương tự"
    ],
    "old_ind_codes_reference_only": [
      "thu_nhap_lai_va_cac_khoan_tuong_tu"
    ]
  },
  {
    "norm_name": "Thu nhập/chi phí khác",
    "aliases_for_where_ind_name": [
      "Thu nhập/Chi phí khác"
    ],
    "old_ind_codes_reference_only": [
      "tn_cp_khac"
    ]
  },
  {
    "norm_name": "Thu nhập/chi phí khác thuần",
    "aliases_for_where_ind_name": [
      "Net Other income/(expenses)",
      "Net Other income/expenses"
    ],
    "old_ind_codes_reference_only": [
      "tn_cp_khac_thuan"
    ]
  },
  {
    "norm_name": "Thu phí bảo hiểm gốc",
    "aliases_for_where_ind_name": [
      "Thu phí bảo hiểm gốc"
    ],
    "old_ind_codes_reference_only": [
      "thu_phi_bao_hiem_goc"
    ]
  },
  {
    "norm_name": "Thu phí nhận tái bảo hiểm",
    "aliases_for_where_ind_name": [
      "Thu phí nhận tái bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "thu_phi_nhan_tai_bao_hiem"
    ]
  },
  {
    "norm_name": "Thu đòi người thứ ba bồi hoàn",
    "aliases_for_where_ind_name": [
      "Thu đòi người thứ ba bồi hoàn"
    ],
    "old_ind_codes_reference_only": [
      "thu_doi_nguoi_thu_ba_boi_hoan"
    ]
  },
  {
    "norm_name": "Thuế giá trị gia tăng được khấu trừ",
    "aliases_for_where_ind_name": [
      "Thuế giá trị gia tăng được khấu trừ"
    ],
    "old_ind_codes_reference_only": [
      "thue_gia_tri_gia_tang_duoc_khau_tru"
    ]
  },
  {
    "norm_name": "Thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Thuế TNDN"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn"
    ]
  },
  {
    "norm_name": "Thuế thu nhập doanh nghiệp hiện hành",
    "aliases_for_where_ind_name": [
      "Thuế TNDN hiện hành"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hh"
    ]
  },
  {
    "norm_name": "Thuế thu nhập doanh nghiệp hoãn lại",
    "aliases_for_where_ind_name": [
      "Thuế TNDN hoãn lại"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hl"
    ]
  },
  {
    "norm_name": "Thuế thu nhập doanh nghiệp hoãn lại phải trả",
    "aliases_for_where_ind_name": [
      "Thuế TNDN hoãn lại phải trả"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hl"
    ]
  },
  {
    "norm_name": "Thuế thu nhập doanh nghiệp phải nộp",
    "aliases_for_where_ind_name": [
      "Thuế thu nhập doanh nghiệp phải nộp"
    ],
    "old_ind_codes_reference_only": [
      "thue_thu_nhap_doanh_nghiep_phai_nop"
    ]
  },
  {
    "norm_name": "Thuế thu nhập doanh nghiệp đã nộp",
    "aliases_for_where_ind_name": [
      "Thuế thu nhập doanh nghiệp đã nộp",
      "Thuế TNDN đã nộp"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_da_nop"
    ]
  },
  {
    "norm_name": "Thuế thu nhập hoãn lại phải trả",
    "aliases_for_where_ind_name": [
      "Thuế thu nhập hoãn lại phải trả"
    ],
    "old_ind_codes_reference_only": [
      "thue_thu_nhap_hoan_lai_phai_tra"
    ]
  },
  {
    "norm_name": "Thuế và các khoản phải nộp nhà nước",
    "aliases_for_where_ind_name": [
      "Thuế và các khoản phải nộp nhà nước"
    ],
    "old_ind_codes_reference_only": [
      "thue_va_cac_khoan_phai_nop_nha_nuoc"
    ]
  },
  {
    "norm_name": "Thuế và các khoản phải thu Nhà nước",
    "aliases_for_where_ind_name": [
      "Thuế và các khoản phải thu Nhà nước"
    ],
    "old_ind_codes_reference_only": [
      "thue_va_cac_khoan_phai_thu_nha_nuoc"
    ]
  },
  {
    "norm_name": "Thặng dư vốn cổ phần",
    "aliases_for_where_ind_name": [
      "Thặng dư vốn cổ phần"
    ],
    "old_ind_codes_reference_only": [
      "thang_du_von_co_phan"
    ]
  },
  {
    "norm_name": "Tiền",
    "aliases_for_where_ind_name": [
      "Tiền"
    ],
    "old_ind_codes_reference_only": [
      "tien"
    ]
  },
  {
    "norm_name": "Tiền chi cho vay, mua các công cụ nợ của các đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền chi cho vay, mua các công cụ nợ của các đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_cho_vay_mua_cac_cong_cu_no_cua_cac_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền chi cho vay, mua các công cụ nợ của đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền chi cho vay, mua các công cụ nợ của đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_cho_vay_mua_cac_cong_cu_no_cua_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền chi cho vay, mua công cụ nợ của đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền chi cho vay, mua công cụ nợ của đơn vị khác (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_cho_vay_mua_cong_cu_no_cua_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền chi khác cho hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Tiền chi khác cho hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_khac_tu_cac_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Tiền chi khác từ các hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Tiền chi khác từ các hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_khac_tu_cac_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Tiền chi khác từ hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Other payments on operating activities",
      "Tiền chi khác từ hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_khac_tu_cac_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Tiền chi khác từ hoạt động tài chính",
    "aliases_for_where_ind_name": [
      "Tiền chi khác từ hoạt động tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_khac_tu_hoat_dong_tai_chinh"
    ]
  },
  {
    "norm_name": "Tiền chi mua lại phần vốn góp của các cổ đông thiểu số",
    "aliases_for_where_ind_name": [
      "Tiền chi mua lại phần vốn góp của các cổ đông thiểu số"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_mua_lai_phan_von_gop_cua_cac_co_dong_thieu_so"
    ]
  },
  {
    "norm_name": "Tiền chi mua sắm tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền chi mua sắm TSCĐ"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_mua_sam_tscd"
    ]
  },
  {
    "norm_name": "Tiền chi nộp Quỹ Hỗ trợ thanh toán",
    "aliases_for_where_ind_name": [
      "Tiền chi nộp Quỹ Hỗ trợ thanh toán"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_nop_quy_ho_tro_thanh_toan"
    ]
  },
  {
    "norm_name": "Tiền chi nộp thuế giá trị gia tăng",
    "aliases_for_where_ind_name": [
      "Tiền chi nộp thuế giá trị gia tăng"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_nop_thue_gia_tri_gia_tang"
    ]
  },
  {
    "norm_name": "Tiền chi nộp thuế liên quan đến hoạt động công ty chứng khoán",
    "aliases_for_where_ind_name": [
      "Tiền chi nộp thuế liên quan đến hoạt động CTCK"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_nop_thue_lien_quan_den_hoat_dong_ctck"
    ]
  },
  {
    "norm_name": "Tiền chi nộp thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Tiền chi nộp thuế thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_nop_thue_thu_nhap_doanh_nghiep"
    ]
  },
  {
    "norm_name": "Tiền chi thanh toán các chi phí cho hoạt động mua, bán các tài sản tài chính (chi phí giao dịch, phí chuyển tiền)",
    "aliases_for_where_ind_name": [
      "Tiền chi thanh toán các chi phí cho hoạt động mua, bán các tài sản tài chính (chi phí giao dịch, phí chuyển tiền)"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_thanh_toan_cac_chi_phi_cho_hoat_dong_mua_ban_cac_tai_san_tai_chinh_chi_phi_giao_dich_phi_chuyen_tien"
    ]
  },
  {
    "norm_name": "Tiền chi thanh toán giấy tờ có giá dài hạn có đủ điều kiện tính vào vốn tự có và các khoản vốn vay dài hạn khác",
    "aliases_for_where_ind_name": [
      "Tiền chi thanh toán giấy tờ có giá dài hạn có đủ điều kiện tính vào  vốn tự có và các khoản vốn vay dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_thanh_toan_giay_to_co_gia_dai_han_co_du_dieu_kien_tinh_vao_von_tu_co_va_cac_khoan_von_vay_dai_han_khac"
    ]
  },
  {
    "norm_name": "Tiền chi trả cho người cung cấp hàng hóa và dịch vụ",
    "aliases_for_where_ind_name": [
      "Tiền chi trả cho người cung cấp hàng hóa và dịch vụ"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_cho_nguoi_cung_cap_hang_hoa_va_dich_vu"
    ]
  },
  {
    "norm_name": "Tiền chi trả cho người lao động",
    "aliases_for_where_ind_name": [
      "Tiền chi trả cho người lao động"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_cho_nguoi_lao_dong"
    ]
  },
  {
    "norm_name": "Tiền chi trả cho nhân viên và hoạt động quản lý, công vụ",
    "aliases_for_where_ind_name": [
      "Tiền chi trả cho nhân viên và hoạt động quản lý, công vụ"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_cho_nhan_vien_va_hoat_dong_quan_ly_cong_vu"
    ]
  },
  {
    "norm_name": "Tiền chi trả gốc nợ vay khác",
    "aliases_for_where_ind_name": [
      "Tiền chi trả gốc nợ vay khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_goc_no_vay_khac"
    ]
  },
  {
    "norm_name": "Tiền chi trả lãi vay",
    "aliases_for_where_ind_name": [
      "Tiền chi trả lãi vay"
    ],
    "old_ind_codes_reference_only": [
      "lai_vay_da_tra"
    ]
  },
  {
    "norm_name": "Tiền chi trả lãi vay cho hoạt động của công ty chứng khoán",
    "aliases_for_where_ind_name": [
      "Tiền chi trả lãi vay cho hoạt động của CTCK"
    ],
    "old_ind_codes_reference_only": [
      "lai_vay_da_tra"
    ]
  },
  {
    "norm_name": "Tiền chi trả nợ gốc vay",
    "aliases_for_where_ind_name": [
      "Tiền chi trả nợ gốc vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_tra_no_goc_vay"
    ]
  },
  {
    "norm_name": "Tiền chi trả nợ thuê tài chính",
    "aliases_for_where_ind_name": [
      "Tiền chi trả nợ thuê tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tien_tra_no_goc_thue_tai_chinh"
    ]
  },
  {
    "norm_name": "Tiền chi trả Tổ chức cung cấp dịch vụ cho công ty chứng khoán",
    "aliases_for_where_ind_name": [
      "Tiền chi trả Tổ chức cung cấp dịch vụ cho CTCK"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_to_chuc_cung_cap_dich_vu_cho_ctck"
    ]
  },
  {
    "norm_name": "Tiền chi trả từ cổ phần hóa",
    "aliases_for_where_ind_name": [
      "Tiền chi trả từ cổ phần hóa"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_tu_co_phan_hoa"
    ]
  },
  {
    "norm_name": "Tiền chi trả vốn góp cho chủ sở hữu, mua lại cổ phiếu quỹ",
    "aliases_for_where_ind_name": [
      "Tiền chi trả vốn góp cho chủ sở hữu, mua lại cổ phiếu quỹ"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_von_gop_mua_lai_co_phieu"
    ]
  },
  {
    "norm_name": "Tiền chi trả vốn góp cho các chủ sở hữu, mua cổ phiếu quỹ",
    "aliases_for_where_ind_name": [
      "Tiền chi trả vốn góp cho các chủ sở hữu, mua cổ phiếu quỹ"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_von_gop_mua_lai_co_phieu"
    ]
  },
  {
    "norm_name": "Tiền chi trả vốn góp cho các chủ sở hữu, mua lại cổ phiếu của doanh nghiệp đã phát hành",
    "aliases_for_where_ind_name": [
      "Tiền chi trả vốn góp cho các chủ sở hữu, mua lại cổ phiếu của doanh nghiệp đã phát hành"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_von_gop_mua_lai_co_phieu"
    ]
  },
  {
    "norm_name": "Tiền chi trả vốn góp, mua lại cổ phiếu",
    "aliases_for_where_ind_name": [
      "Tiền chi trả vốn góp, mua lại cổ phiếu"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tra_von_gop_mua_lai_co_phieu"
    ]
  },
  {
    "norm_name": "Tiền chi từ thanh lý, nhượng bán tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền chi từ thanh lý, nhượng bán TSCĐ"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_tu_thanh_ly_nhuong_ban_tscd"
    ]
  },
  {
    "norm_name": "Tiền chi đầu tư góp vốn vào đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền chi đầu tư góp vốn vào đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_dau_tu_gop_von_vao_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền chi đầu tư vốn vào công ty con, công ty liên doanh, liên kết và đầu tư khác",
    "aliases_for_where_ind_name": [
      "Tiền chi đầu tư vốn vào công ty con, công ty liên doanh, liên kết và đầu tư khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_dau_tu_von_vao_cong_ty_con_cong_ty_lien_doanh_lien_ket_va_dau_tu_khac"
    ]
  },
  {
    "norm_name": "Tiền chi đầu tư, góp vốn vào các đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền chi đầu tư, góp vốn vào các đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_dau_tu_gop_von_vao_cac_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền chi để mua sắm, xây dựng tài sản cố định và các tài sản dài hạn khác",
    "aliases_for_where_ind_name": [
      "Tiền chi để mua sắm, xây dựng TSCĐ và các TS dài hạn khác",
      "Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_mua_sam_tscd",
      "ts_dh_khac"
    ]
  },
  {
    "norm_name": "Tiền chi để mua sắm, xây dựng tài sản cố định, BĐS đầu tư",
    "aliases_for_where_ind_name": [
      "Tiền chi để mua sắm, xây dựng TSCĐ, BĐS đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_mua_sam_tscd"
    ]
  },
  {
    "norm_name": "Tiền chi để mua sắm, xây dựng tài sản cố định, BĐSĐT và các tài sản khác",
    "aliases_for_where_ind_name": [
      "Tiền chi để mua sắm, xây dựng TSCĐ, BĐSĐT và các tài sản khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_chi_mua_sam_tscd"
    ]
  },
  {
    "norm_name": "Tiền cho vay, mua công cụ nợ",
    "aliases_for_where_ind_name": [
      "Tiền cho vay, mua công cụ nợ"
    ],
    "old_ind_codes_reference_only": [
      "tien_cho_vay_mua_cong_cu_no"
    ]
  },
  {
    "norm_name": "Tiền gửi các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Tiền gửi các tổ chức tín dụng khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_cac_to_chuc_tin_dung_khac"
    ]
  },
  {
    "norm_name": "Tiền gửi của khách hàng",
    "aliases_for_where_ind_name": [
      "Deposits from customers",
      "Tiền gửi của khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_cua_khach_hang"
    ]
  },
  {
    "norm_name": "Tiền gửi khách hàng",
    "aliases_for_where_ind_name": [
      "Tiền gửi khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_cua_khach_hang"
    ]
  },
  {
    "norm_name": "Tiền gửi ngân hàng cho hoạt động công ty chứng khoán",
    "aliases_for_where_ind_name": [
      "Tiền gửi ngân hàng cho hoạt động CTCK"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_ngan_hang_cho_hoat_dong_ctck"
    ]
  },
  {
    "norm_name": "Tiền gửi ngân hàng cuối kỳ",
    "aliases_for_where_ind_name": [
      "Tiền gửi ngân hàng cuối kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_ngan_hang_cuoi_ky"
    ]
  },
  {
    "norm_name": "Tiền gửi ngân hàng đầu kỳ",
    "aliases_for_where_ind_name": [
      "Tiền gửi ngân hàng đầu kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_ngan_hang_dau_ky"
    ]
  },
  {
    "norm_name": "Tiền gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Placements with and loans to other credit institutions",
      "Tiền gửi tại các TCTD khác và cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Tiền gửi tại Ngân hàng Nhà nước",
    "aliases_for_where_ind_name": [
      "Tiền gửi tại NHNN"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_ngan_hang_nha_nuoc_viet_nam"
    ]
  },
  {
    "norm_name": "Tiền gửi tại Ngân hàng Nhà nước Việt Nam",
    "aliases_for_where_ind_name": [
      "Balances with the SBV"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_ngan_hang_nha_nuoc_viet_nam"
    ]
  },
  {
    "norm_name": "Tiền gửi tại ngân hàng nhà nước Việt Nam",
    "aliases_for_where_ind_name": [
      "Tiền gửi tại ngân hàng nhà nước Việt Nam"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_ngan_hang_nha_nuoc_viet_nam"
    ]
  },
  {
    "norm_name": "Tiền gửi và cho vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Tiền gửi và cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Tiền gửi và vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Deposits and borrowings from other credit institutions"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_va_vay_cac_to_chuc_tin_dung_khac"
    ]
  },
  {
    "norm_name": "Tiền gửi và vay các Tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Tiền gửi và vay các Tổ chức tín dụng khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_va_vay_cac_to_chuc_tin_dung_khac"
    ]
  },
  {
    "norm_name": "Tiền lãi vay phải trả",
    "aliases_for_where_ind_name": [
      "Tiền lãi vay phải trả"
    ],
    "old_ind_codes_reference_only": [
      "tien_lai_vay_phai_tra"
    ]
  },
  {
    "norm_name": "Tiền lãi vay đã trả",
    "aliases_for_where_ind_name": [
      "Tiền lãi vay đã trả"
    ],
    "old_ind_codes_reference_only": [
      "lai_vay_da_tra"
    ]
  },
  {
    "norm_name": "Tiền lãi đã thu",
    "aliases_for_where_ind_name": [
      "Tiền lãi đã thu"
    ],
    "old_ind_codes_reference_only": [
      "tien_lai_da_thu"
    ]
  },
  {
    "norm_name": "Tiền lãi đã trả cho các nhà đầu tư vào doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Tiền lãi đã trả cho các nhà đầu tư vào doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "tien_lai_da_tra_cho_cac_nha_dau_tu_vao_doanh_nghiep"
    ]
  },
  {
    "norm_name": "Tiền mua tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền mua tài sản cố định"
    ],
    "old_ind_codes_reference_only": [
      "mua_sam_tscd"
    ]
  },
  {
    "norm_name": "Tiền mặt tại quỹ (gồm cả ngân phiếu)",
    "aliases_for_where_ind_name": [
      "Tiền mặt tại quỹ (gồm cả ngân phiếu)"
    ],
    "old_ind_codes_reference_only": [
      "tien_mat_tai_quy"
    ]
  },
  {
    "norm_name": "Tiền mặt, chứng từ có giá trị, ngoại tệ, kim loại quý, đá quý",
    "aliases_for_where_ind_name": [
      "Tiền mặt, chứng từ có giá trị, ngoại tệ, kim loại quý, đá quý"
    ],
    "old_ind_codes_reference_only": [
      "tien_mat_chung_tu_co_gia_tri_ngoai_te_kim_loai_quy_da_quy"
    ]
  },
  {
    "norm_name": "Tiền nộp Quỹ Hỗ trợ thanh toán",
    "aliases_for_where_ind_name": [
      "Tiền nộp Quỹ Hỗ trợ thanh toán"
    ],
    "old_ind_codes_reference_only": [
      "tien_nop_quy_ho_tro_thanh_toan"
    ]
  },
  {
    "norm_name": "Tiền thanh lý các khoản đầu tư vào công ty con, công ty liên doanh, liên kết và đầu tư khác",
    "aliases_for_where_ind_name": [
      "Tiền thanh lý các khoản đầu tư vào công ty con, công ty liên doanh, liên kết và đầu tư khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thanh_ly_cac_khoan_dau_tu_vao_cong_ty_con_cong_ty_lien_doanh_lien_ket_va_dau_tu_khac"
    ]
  },
  {
    "norm_name": "Tiền thanh toán vốn gốc đi thuê tài chính",
    "aliases_for_where_ind_name": [
      "Tiền thanh toán vốn gốc đi thuê tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tien_thanh_toan_von_goc_di_thue_tai_chinh"
    ]
  },
  {
    "norm_name": "Tiền thu các khoản nợ đã được xử lý xóa, bù đắp bằng nguồn rủi ro",
    "aliases_for_where_ind_name": [
      "Tiền thu các khoản nợ đã được xử lý xóa, bù đắp bằng nguồn rủi ro"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_cac_khoan_no_da_duoc_xu_ly_xoa_bu_dap_bang_nguon_rui_ro"
    ]
  },
  {
    "norm_name": "Tiền thu cổ tức và lợi nhuận được chia",
    "aliases_for_where_ind_name": [
      "Tiền thu cổ tức và lợi nhuận được chia"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_co_tuc_va_loi_nhuan_duoc_chia"
    ]
  },
  {
    "norm_name": "Tiền thu cổ tức và lợi nhuận được chia từ các khoản đầu tư, góp vốn dài hạn",
    "aliases_for_where_ind_name": [
      "Tiền thu cổ tức và lợi nhuận được chia từ các khoản đầu tư, góp vốn dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_co_tuc_va_loi_nhuan_duoc_chia"
    ]
  },
  {
    "norm_name": "Tiền thu do bán tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền thu do bán tài sản cố định"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_do_ban_tai_san_co_dinh"
    ]
  },
  {
    "norm_name": "Tiền thu do các chủ sở hữu góp vốn",
    "aliases_for_where_ind_name": [
      "Tiền thu do các chủ sở hữu góp vốn"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_do_cac_chu_so_huu_gop_von"
    ]
  },
  {
    "norm_name": "Tiền thu do đi vay",
    "aliases_for_where_ind_name": [
      "Tiền thu do đi vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_di_vay"
    ]
  },
  {
    "norm_name": "Tiền thu hồi cho vay, bán công cụ nợ",
    "aliases_for_where_ind_name": [
      "Tiền thu hồi cho vay, bán công cụ nợ"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_hoi_cho_vay_ban_cong_cu_no"
    ]
  },
  {
    "norm_name": "Tiền thu hồi cho vay, bán lại các công cụ nợ của các đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền thu hồi cho vay, bán lại các công cụ nợ của các đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_hoi_cho_vay_ban_lai_cac_cong_cu_no_cua_cac_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác",
      "Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_hoi_cho_vay_ban_lai_cac_cong_cu_no_cua_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền thu hồi đầu tư góp vốn vào đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền thu hồi đầu tư góp vốn vào đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_hoi_dau_tu_gop_von_vao_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền thu khác từ các hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Tiền thu khác từ các hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_khac_tu_cac_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Tiền thu khác từ hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Other receipts from operating activities",
      "Tiền thu khác từ hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_khac_tu_cac_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia",
    "aliases_for_where_ind_name": [
      "Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_lai_cho_vay_co_tuc_va_loi_nhuan_duoc_chia"
    ]
  },
  {
    "norm_name": "Tiền thu lãi đầu tư",
    "aliases_for_where_ind_name": [
      "Tiền thu lãi đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_lai_dau_tu"
    ]
  },
  {
    "norm_name": "Tiền thu nhập doanh nghiệp đã trả",
    "aliases_for_where_ind_name": [
      "Tiền thu nhập doanh nghiệp đã trả"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_da_nop"
    ]
  },
  {
    "norm_name": "Tiền thu thanh lý tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền thu thanh lý TSCĐ"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_thanh_ly_tscd"
    ]
  },
  {
    "norm_name": "Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_ban_hang_cung_cap_dich_vu_va_doanh_thu_khac"
    ]
  },
  {
    "norm_name": "Tiền thu từ bán, thanh lý bất động sản đầu tư",
    "aliases_for_where_ind_name": [
      "Tiền thu từ bán, thanh lý bất động sản đầu tư"
    ],
    "old_ind_codes_reference_only": [
      "bat_dong_san_dau_tu"
    ]
  },
  {
    "norm_name": "Tiền thu từ các hoạt động kinh doanh khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ các hoạt động kinh doanh khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_cac_hoat_dong_kinh_doanh_khac"
    ]
  },
  {
    "norm_name": "Tiền thu từ các khoản thu được giảm chi",
    "aliases_for_where_ind_name": [
      "Tiền thu từ các khoản thu được giảm chi"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_cac_khoan_thu_duoc_giam_chi"
    ]
  },
  {
    "norm_name": "Tiền thu từ các khoản đầu tư vào đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ các khoản đầu tư vào đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_cac_khoan_dau_tu_vao_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền thu từ phát hành cổ phiếu, nhận vốn góp",
    "aliases_for_where_ind_name": [
      "Tiền thu từ phát hành cổ phiếu, nhận vốn góp"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_phat_hanh_co_phieu_nhan_von_gop"
    ]
  },
  {
    "norm_name": "Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Tiền thu từ phát hành cổ phiếu, nhận vốn góp của chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_phat_hanh_co_phieu_nhan_von_gop"
    ]
  },
  {
    "norm_name": "Tiền thu từ phát hành giấy tờ có giá dài hạn có đủ điều kiện tính vào vốn tự có và các khoản vốn vay dài hạn khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ phát hành giấy tờ có giá dài hạn có đủ điều kiện tính vào vốn tự có và các khoản vốn vay dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "phat_hanh_giay_to_co_gia"
    ]
  },
  {
    "norm_name": "Tiền thu từ thanh lý, nhượng bán tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền thu từ thanh lý, nhượng bán TSCĐ"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_thanh_ly_tscd"
    ]
  },
  {
    "norm_name": "Tiền thu từ thanh lý, nhượng bán tài sản cố định và các tài sản dài hạn khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ thanh lý, nhượng bán TSCĐ và các TS dài hạn khác",
      "Tiền thu từ thanh lý, nhượng bán TSCĐ và các tài sản dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_thanh_ly_tscd",
      "ts_dh_khac"
    ]
  },
  {
    "norm_name": "Tiền thu từ thanh lý, nhượng bán tài sản cố định, BĐSĐT và các tài sản khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ thanh lý, nhượng bán TSCĐ, BĐSĐT và các tài sản khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_thanh_ly_tscd"
    ]
  },
  {
    "norm_name": "Tiền thu từ việc bán các khoản đầu tư vào doanh nghiệp khác",
    "aliases_for_where_ind_name": [
      "Tiền thu từ việc bán các khoản đầu tư vào doanh nghiệp khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_viec_ban_cac_khoan_dau_tu_vao_doanh_nghiep_khac"
    ]
  },
  {
    "norm_name": "Tiền thu từ đi vay",
    "aliases_for_where_ind_name": [
      "Tiền thu từ đi vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_tu_di_vay"
    ]
  },
  {
    "norm_name": "Tiền thu về cổ tức và lợi nhuận được chia",
    "aliases_for_where_ind_name": [
      "Tiền thu về cổ tức và lợi nhuận được chia"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_ve_co_tuc_va_loi_nhuan_duoc_chia"
    ]
  },
  {
    "norm_name": "Tiền thu được các khoản đi vay",
    "aliases_for_where_ind_name": [
      "Tiền thu được các khoản đi vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_duoc_cac_khoan_di_vay"
    ]
  },
  {
    "norm_name": "Tiền thu được do bán cổ phiếu ngân quỹ",
    "aliases_for_where_ind_name": [
      "Tiền thu được do bán cổ phiếu ngân quỹ"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_duoc_do_ban_co_phieu_ngan_quy"
    ]
  },
  {
    "norm_name": "Tiền thu được từ thanh lý tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tiền thu được từ thanh lý tài sản cố định"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_duoc_tu_thanh_ly_tai_san_co_dinh"
    ]
  },
  {
    "norm_name": "Tiền thu đầu tư, góp vốn vào các đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền thu đầu tư, góp vốn vào các đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_thu_dau_tu_gop_von_vao_cac_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền thuế thu nhập thực nộp trong kỳ",
    "aliases_for_where_ind_name": [
      "Tiền thuế thu nhập thực nộp trong kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_thue_thu_nhap_thuc_nop_trong_ky"
    ]
  },
  {
    "norm_name": "Tiền trả các khoản đi vay",
    "aliases_for_where_ind_name": [
      "Tiền trả các khoản đi vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_tra_cac_khoan_di_vay"
    ]
  },
  {
    "norm_name": "Tiền trả nợ gốc thuê tài chính",
    "aliases_for_where_ind_name": [
      "Tiền trả nợ gốc thuê tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tien_tra_no_goc_thue_tai_chinh"
    ]
  },
  {
    "norm_name": "Tiền trả nợ gốc vay",
    "aliases_for_where_ind_name": [
      "Tiền trả nợ gốc vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_tra_no_goc_vay"
    ]
  },
  {
    "norm_name": "Tiền tạm ứng cho cán bộ công nhân viên và ứng trước cho người bán",
    "aliases_for_where_ind_name": [
      "Tiền tạm ứng cho cán bộ công nhân viên và ứng trước cho người bán"
    ],
    "old_ind_codes_reference_only": [
      "tien_tam_ung_cho_can_bo_cong_nhan_vien_va_ung_truoc_cho_nguoi_ban"
    ]
  },
  {
    "norm_name": "Tiền từ thu phí và hoa hồng",
    "aliases_for_where_ind_name": [
      "Tiền từ thu phí và hoa hồng"
    ],
    "old_ind_codes_reference_only": [
      "tien_tu_thu_phi_va_hoa_hong"
    ]
  },
  {
    "norm_name": "Tiền vay gốc",
    "aliases_for_where_ind_name": [
      "Tiền vay gốc"
    ],
    "old_ind_codes_reference_only": [
      "tien_vay_goc"
    ]
  },
  {
    "norm_name": "Tiền vay khác",
    "aliases_for_where_ind_name": [
      "Tiền vay khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_vay_khac"
    ]
  },
  {
    "norm_name": "Tiền vay ngắn hạn, dài hạn nhận được",
    "aliases_for_where_ind_name": [
      "Tiền vay ngắn hạn, dài hạn nhận được"
    ],
    "old_ind_codes_reference_only": [
      "tien_vay_ngan_han_dai_han_nhan_duoc"
    ]
  },
  {
    "norm_name": "Tiền vay Quỹ Hỗ trợ thanh toán",
    "aliases_for_where_ind_name": [
      "Tiền vay Quỹ Hỗ trợ thanh toán"
    ],
    "old_ind_codes_reference_only": [
      "tien_vay_quy_ho_tro_thanh_toan"
    ]
  },
  {
    "norm_name": "Tiền và các khoản tương đương tiền",
    "aliases_for_where_ind_name": [
      "Tiền và các khoản tương đương tiền",
      "Tiền và tương đương tiền",
      "Tiền và tương đương tiền (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tien_va_tuong_duong_tien"
    ]
  },
  {
    "norm_name": "Tiền và các khoản tương đương tiền cuối kỳ",
    "aliases_for_where_ind_name": [
      "Tiền và các khoản tương đương tiền cuối kỳ",
      "Tiền và tương đương tiền cuối kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_va_tuong_duong_tien_cuoi_ky"
    ]
  },
  {
    "norm_name": "Tiền và các khoản tương đương tiền đầu kỳ",
    "aliases_for_where_ind_name": [
      "Tiền và các khoản tương đương tiền đầu kỳ",
      "Tiền và tương đương tiền đầu kỳ"
    ],
    "old_ind_codes_reference_only": [
      "tien_va_tuong_duong_tien_dau_ky"
    ]
  },
  {
    "norm_name": "Tiền đã chi mua các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Tiền đã chi mua các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tien_da_chi_mua_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Tiền đã hoàn vốn cho các chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Tiền đã hoàn vốn cho các chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "tien_da_hoan_von_cho_cac_chu_so_huu"
    ]
  },
  {
    "norm_name": "Tiền đã thu từ bán các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Tiền đã thu từ bán các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tien_da_thu_tu_ban_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Tiền đã trả nợ vay",
    "aliases_for_where_ind_name": [
      "Tiền đã trả nợ vay"
    ],
    "old_ind_codes_reference_only": [
      "tien_da_tra_no_vay"
    ]
  },
  {
    "norm_name": "Tiền đầu tư vào các đơn vị khác",
    "aliases_for_where_ind_name": [
      "Tiền đầu tư vào các đơn vị khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_dau_tu_vao_cac_don_vi_khac"
    ]
  },
  {
    "norm_name": "Tiền, Vàng gửi tại các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Tiền, Vàng gửi tại các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_vang_gui_tai_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Tiền, vàng gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Tiền, vàng gửi tại các TCTD khác và cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Trong đó: Chi phí lãi vay",
    "aliases_for_where_ind_name": [
      "Trong đó: Chi phí lãi vay"
    ],
    "old_ind_codes_reference_only": [
      "cp_lai_vay"
    ]
  },
  {
    "norm_name": "Trong đó: Chi phí sửa lỗi giao dịch chứng khoán, lỗi khác",
    "aliases_for_where_ind_name": [
      "Trong đó: Chi phí sửa lỗi giao dịch chứng khoán, lỗi khác"
    ],
    "old_ind_codes_reference_only": [
      "trong_do_chi_phi_sua_loi_giao_dich_chung_khoan_loi_khac"
    ]
  },
  {
    "norm_name": "Trong đó: Lợi thế thương mại",
    "aliases_for_where_ind_name": [
      "Trong đó: Lợi thế thương mại"
    ],
    "old_ind_codes_reference_only": [
      "loi_the_tm"
    ]
  },
  {
    "norm_name": "Trái phiếu chuyển đổi",
    "aliases_for_where_ind_name": [
      "Convertible bonds (Bn. VND)",
      "Trái phiếu chuyển đổi",
      "Trái phiếu chuyển đổi (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tp_chuyen_doi"
    ]
  },
  {
    "norm_name": "Trái phiếu phát hành dài hạn",
    "aliases_for_where_ind_name": [
      "Trái phiếu phát hành dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "trai_phieu_phat_hanh_dai_han"
    ]
  },
  {
    "norm_name": "Trái phiếu phát hành ngắn hạn",
    "aliases_for_where_ind_name": [
      "Trái phiếu phát hành ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "trai_phieu_phat_hanh_ngan_han"
    ]
  },
  {
    "norm_name": "Trả tiền bồi thường bảo hiểm",
    "aliases_for_where_ind_name": [
      "Trả tiền bồi thường bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "tra_tien_boi_thuong_bao_hiem"
    ]
  },
  {
    "norm_name": "Trả tiền cho các khoản nợ khác",
    "aliases_for_where_ind_name": [
      "Trả tiền cho các khoản nợ khác"
    ],
    "old_ind_codes_reference_only": [
      "tra_tien_cho_cac_khoan_no_khac"
    ]
  },
  {
    "norm_name": "Trả tiền cho cán bộ công nhân viên",
    "aliases_for_where_ind_name": [
      "Trả tiền cho cán bộ công nhân viên"
    ],
    "old_ind_codes_reference_only": [
      "tra_tien_cho_can_bo_cong_nhan_vien"
    ]
  },
  {
    "norm_name": "Trả tiền cho người bán, người cung cấp dịch vụ",
    "aliases_for_where_ind_name": [
      "Trả tiền cho người bán, người cung cấp dịch vụ"
    ],
    "old_ind_codes_reference_only": [
      "tra_tien_cho_nguoi_ban_nguoi_cung_cap_dich_vu"
    ]
  },
  {
    "norm_name": "Trả tiền hoa hồng và các khoản nợ khác của kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Trả tiền hoa hồng và các khoản nợ khác của kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "tra_tien_hoa_hong_va_cac_khoan_no_khac_cua_kinh_doanh_bao_hiem"
    ]
  },
  {
    "norm_name": "Trả tiền nộp thuế và các khoản nợ Nhà nước",
    "aliases_for_where_ind_name": [
      "Trả tiền nộp thuế và các khoản nợ Nhà nước"
    ],
    "old_ind_codes_reference_only": [
      "tra_tien_nop_thue_va_cac_khoan_no_nha_nuoc"
    ]
  },
  {
    "norm_name": "Trả trước cho người bán",
    "aliases_for_where_ind_name": [
      "Trả trước cho người bán"
    ],
    "old_ind_codes_reference_only": [
      "tra_truoc_cho_nguoi_ban"
    ]
  },
  {
    "norm_name": "Trả trước cho người bán ngắn hạn",
    "aliases_for_where_ind_name": [
      "Trả trước cho người bán ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tra_truoc_cho_nguoi_ban"
    ]
  },
  {
    "norm_name": "Trả trước dài hạn",
    "aliases_for_where_ind_name": [
      "Trả trước dài hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tra_truoc_dai_han"
    ]
  },
  {
    "norm_name": "Tài sản có khác",
    "aliases_for_where_ind_name": [
      "Other Assets",
      "Tài sản Có khác",
      "Tài sản có khác"
    ],
    "old_ind_codes_reference_only": [
      "ts_co_khac"
    ]
  },
  {
    "norm_name": "Tài sản cố định",
    "aliases_for_where_ind_name": [
      "Tài sản cố định",
      "Tài sản cố định (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tscd"
    ]
  },
  {
    "norm_name": "Tài sản cố định hữu hình",
    "aliases_for_where_ind_name": [
      "Tangible fixed assets",
      "Tài sản cố định hữu hình"
    ],
    "old_ind_codes_reference_only": [
      "tscd_hh"
    ]
  },
  {
    "norm_name": "Tài sản cố định thuê tài chính",
    "aliases_for_where_ind_name": [
      "Tài sản cố định thuê tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_co_dinh_thue_tai_chinh"
    ]
  },
  {
    "norm_name": "Tài sản cố định và đầu tư dài hạn",
    "aliases_for_where_ind_name": [
      "Tài sản cố định và đầu tư dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_co_dinh_va_dau_tu_dai_han"
    ]
  },
  {
    "norm_name": "Tài sản cố định vô hình",
    "aliases_for_where_ind_name": [
      "Intagible fixed assets",
      "Tài sản cố định vô hình"
    ],
    "old_ind_codes_reference_only": [
      "tscd_vh"
    ]
  },
  {
    "norm_name": "Tài sản dài hạn",
    "aliases_for_where_ind_name": [
      "Tài sản dài hạn",
      "TÀI SẢN DÀI HẠN",
      "TÀI SẢN DÀI HẠN (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "ts_dh"
    ]
  },
  {
    "norm_name": "Tài sản dài hạn khác",
    "aliases_for_where_ind_name": [
      "Tài sản dài hạn khác",
      "Tài sản dài hạn khác (Bn)",
      "Tài sản dài hạn khác (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "ts_dh_khac"
    ]
  },
  {
    "norm_name": "Tài sản dở dang dài hạn",
    "aliases_for_where_ind_name": [
      "Tài sản dở dang dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_do_dang_dai_han"
    ]
  },
  {
    "norm_name": "Tài sản lưu động khác",
    "aliases_for_where_ind_name": [
      "Tài sản lưu động khác",
      "Tài sản lưu động khác (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tsld_khac"
    ]
  },
  {
    "norm_name": "Tài sản lưu động và đầu tư ngắn hạn",
    "aliases_for_where_ind_name": [
      "Tài sản lưu động và đầu tư ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_luu_dong_va_dau_tu_ngan_han"
    ]
  },
  {
    "norm_name": "Tài sản ngắn hạn",
    "aliases_for_where_ind_name": [
      "TÀI SẢN NGẮN HẠN",
      "Tài sản ngắn hạn",
      "TÀI SẢN NGẮN HẠN (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "ts_nh"
    ]
  },
  {
    "norm_name": "Tài sản ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Tài sản ngắn hạn khác",
      "Tài sản ngắn hạn khác (Bn)"
    ],
    "old_ind_codes_reference_only": [
      "ts_nh_khac"
    ]
  },
  {
    "norm_name": "Tài sản thuê tài chính",
    "aliases_for_where_ind_name": [
      "Leased assets"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_thue_tai_chinh"
    ]
  },
  {
    "norm_name": "Tài sản thuế thu nhập doanh nghiệp hoãn lại",
    "aliases_for_where_ind_name": [
      "Tài sản thuế TNDN hoãn lại"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_hl"
    ]
  },
  {
    "norm_name": "Tài sản thuế thu nhập hoãn lãi",
    "aliases_for_where_ind_name": [
      "Tài sản thuế thu nhập hoãn lãi"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_thue_thu_nhap_hoan_lai"
    ]
  },
  {
    "norm_name": "Tài sản Thuế thu nhập hoãn lại",
    "aliases_for_where_ind_name": [
      "Tài sản Thuế thu nhập hoãn lại"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_thue_thu_nhap_hoan_lai"
    ]
  },
  {
    "norm_name": "Tài sản thuế thu nhập hoãn lại",
    "aliases_for_where_ind_name": [
      "Tài sản thuế thu nhập hoãn lại"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_thue_thu_nhap_hoan_lai"
    ]
  },
  {
    "norm_name": "Tài sản tài chính",
    "aliases_for_where_ind_name": [
      "Tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Tài sản tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Tài sản tài chính dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "tai_san_tai_chinh_dai_han"
    ]
  },
  {
    "norm_name": "Tăng các chi phí phi tiền tệ",
    "aliases_for_where_ind_name": [
      "Tăng các chi phí phi tiền tệ"
    ],
    "old_ind_codes_reference_only": [
      "tang_cac_chi_phi_phi_tien_te"
    ]
  },
  {
    "norm_name": "Tăng trưởng doanh thu (%)",
    "aliases_for_where_ind_name": [
      "Tăng trưởng doanh thu (%)"
    ],
    "old_ind_codes_reference_only": [
      "tang_truong_doanh_thu_phan_tram"
    ]
  },
  {
    "norm_name": "Tăng trưởng doanh thu YoY",
    "aliases_for_where_ind_name": [
      "Tăng trưởng doanh thu YoY"
    ],
    "old_ind_codes_reference_only": [
      "tang_truong_doanh_thu_yoy"
    ]
  },
  {
    "norm_name": "Tăng trưởng lợi nhuận (%)",
    "aliases_for_where_ind_name": [
      "Tăng trưởng lợi nhuận (%)"
    ],
    "old_ind_codes_reference_only": [
      "tang_truong_loi_nhuan_phan_tram"
    ]
  },
  {
    "norm_name": "Tăng trưởng lợi nhuận sau thuế mẹ YoY",
    "aliases_for_where_ind_name": [
      "Tăng trưởng LNST mẹ YoY"
    ],
    "old_ind_codes_reference_only": [
      "tang_truong_lnst_me_yoy"
    ]
  },
  {
    "norm_name": "Tăng vốn cổ phần từ góp vốn và phát hành cổ phiếu",
    "aliases_for_where_ind_name": [
      "Tăng vốn cổ phần từ góp vốn và phát hành cổ phiếu"
    ],
    "old_ind_codes_reference_only": [
      "tang_von_co_phan_tu_gop_von_va_hoac_phat_hanh_co_phieu"
    ]
  },
  {
    "norm_name": "Tăng vốn cổ phần từ góp vốn và/hoặc phát hành cổ phiếu",
    "aliases_for_where_ind_name": [
      "Tăng vốn cổ phần từ góp vốn và/hoặc phát hành cổ phiếu"
    ],
    "old_ind_codes_reference_only": [
      "tang_von_co_phan_tu_gop_von_va_hoac_phat_hanh_co_phieu"
    ]
  },
  {
    "norm_name": "Tăng/giảm chi phí trả trước",
    "aliases_for_where_ind_name": [
      "Tăng giảm chi phí trả trước",
      "Tăng/Giảm chi phí trả trước"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_chi_phi_tra_truoc"
    ]
  },
  {
    "norm_name": "Tăng/giảm các công cụ tài chính phái sinh và các khoản nợ tài chính khác",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) các công cụ tài chính phái sinh và các khoản nợ tài chính khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_sinh_va_no_tc_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm các công cụ tài chính phái sinh và các tài sản tài chính khác",
    "aliases_for_where_ind_name": [
      "(Tăng)/Giảm các công cụ tài chính phái sinh và các tài sản tài chính khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_sinh_va_ts_tc_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản cho vay",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) các khoản cho vay"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_cho_vay"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản cho vay khách hàng",
    "aliases_for_where_ind_name": [
      "(Tăng)/Giảm các khoản cho vay khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cho_vay_khach_hang"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản nợ chính phủ và Ngân hàng Nhà nước",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) các khoản nợ chính phủ và NHNN"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_no_chinh_phu_va_nhnn"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản phải thu",
    "aliases_for_where_ind_name": [
      "_Tăng/Giảm các khoản phải thu",
      "Tăng giảm các khoản phải thu",
      "Tăng, giảm các khoản phải thu",
      "Tăng/Giảm các khoản phải thu"
    ],
    "old_ind_codes_reference_only": [
      "tg_pt"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản phải thu các dịch vụ công ty chứng khoán cung cấp",
    "aliases_for_where_ind_name": [
      "(-) Tăng, (+) giảm các khoản phải thu các dịch vụ CTCK cung cấp"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_phai_thu_cac_dich_vu_ctck_cung_cap"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản phải thu khác",
    "aliases_for_where_ind_name": [
      "(-) Tăng, (+) giảm các khoản phải thu khác"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_phai_thu_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản phải trả",
    "aliases_for_where_ind_name": [
      "_Tăng/Giảm các khoản phải trả",
      "Tăng/Giảm các khoản phải trả"
    ],
    "old_ind_codes_reference_only": [
      "tg_ptr"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản phải trả (Không kể lãi vay phải trả, thuế thu nhập doanh nghiệp phải nộp)",
    "aliases_for_where_ind_name": [
      "Tăng, giảm các khoản phải trả (Không kể lãi vay phải trả, thuế thu nhập doanh nghiệp phải nộp)"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_phai_tra_khong_ke_lai_vay_phai_tra_thue_thu_nhap_doanh_nghiep_phai_nop"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản phải trả (không kể Lãi vay phải trả, thuế thu nhập phải nộp)",
    "aliases_for_where_ind_name": [
      "Tăng giảm các khoản phải trả (không kể Lãi vay phải trả, thuế thu nhập phải nộp)"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_phai_tra_khong_ke_lai_vay_phai_tra_thue_thu_nhap_phai_nop"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản tiền gửi, tiền vay các tổ chức tín dụng",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) các khoản tiền gửi, tiền vay các TCTD"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_khoan_tien_gui_tien_vay_cac_tctd"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản tiền, vàng gửi và cho vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "(Tăng)/Giảm các khoản tiền, vàng gửi và cho vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_tien_vang_gui_va_cho_vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản về kinh doanh chứng khoán",
    "aliases_for_where_ind_name": [
      "(Tăng)/Giảm các khoản về kinh doanh chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_kinh_doanh_chung_khoan"
    ]
  },
  {
    "norm_name": "Tăng/giảm các khoản đầu tư giữ đến ngày đáo hạn",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) các khoản đầu tư giữ đến ngày đáo hạn"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Tăng/giảm các tài sản khác",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) các tài sản khác"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_cac_tai_san_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm dự phòng bồi thường",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) dự phòng bồi thường"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_du_phong_boi_thuong"
    ]
  },
  {
    "norm_name": "Tăng/giảm dự phòng phí, dự phòng toán học",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) dự phòng phí, dự phòng toán học"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_du_phong_phi_du_phong_toan_hoc"
    ]
  },
  {
    "norm_name": "Tăng/giảm hàng tồn kho",
    "aliases_for_where_ind_name": [
      "Tăng giảm hàng tồn kho",
      "Tăng, giảm hàng tồn kho",
      "Tăng/Giảm hàng tồn kho"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_hang_ton_kho"
    ]
  },
  {
    "norm_name": "Tăng/giảm khác về công nợ hoạt động",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) khác về công nợ hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_khac_ve_cong_no_hoat_dong"
    ]
  },
  {
    "norm_name": "Tăng/giảm khác về tài sản hoạt động",
    "aliases_for_where_ind_name": [
      "(Tăng)/Giảm khác về tài sản hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_khac_ve_tai_san_hoat_dong"
    ]
  },
  {
    "norm_name": "Tăng/giảm lợi nhuận do chênh lệch tỷ giá",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) lợi nhuận do chênh lệch tỉ giá"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_loi_nhuan_do_chenh_lech_ti_gia"
    ]
  },
  {
    "norm_name": "Tăng/giảm nguồn dự phòng để bù bắp tổn thất các khoản",
    "aliases_for_where_ind_name": [
      "(Tăng)/Giảm nguồn dự phòng để bù bắp tổn thất các khoản"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_nguon_du_phong_de_bu_dap_ton_that_cac_khoan"
    ]
  },
  {
    "norm_name": "Tăng/giảm payables",
    "aliases_for_where_ind_name": [
      "_Increase/Decrease in payables"
    ],
    "old_ind_codes_reference_only": [
      "tg_ptr"
    ]
  },
  {
    "norm_name": "Tăng/giảm phát hành giấy tờ có giá",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) phát hành giấy tờ có giá"
    ],
    "old_ind_codes_reference_only": [
      "phat_hanh_giay_to_co_gia"
    ]
  },
  {
    "norm_name": "Tăng/giảm phải thu bán các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "(-) Tăng, (+) giảm phải thu bán các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_phai_thu_ban_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Tăng/giảm phải thu tiền lãi các tài sản tài chính",
    "aliases_for_where_ind_name": [
      "(-) Tăng, (+) giảm phải thu tiền lãi các tài sản tài chính"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_phai_thu_tien_lai_cac_tai_san_tai_chinh"
    ]
  },
  {
    "norm_name": "Tăng/giảm phải trả cho người bán",
    "aliases_for_where_ind_name": [
      "(+) Tăng, (-) giảm phải trả cho người bán"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_nguoi_ban"
    ]
  },
  {
    "norm_name": "Tăng/giảm phải trả Tổ chức phát hành chứng khoán",
    "aliases_for_where_ind_name": [
      "(+) Tăng, (-) giảm phải trả Tổ chức phát hành chứng khoán"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_phai_tra_to_chuc_phat_hanh_chung_khoan"
    ]
  },
  {
    "norm_name": "Tăng/giảm phải trả, phải nộp khác",
    "aliases_for_where_ind_name": [
      "(+) Tăng, (-) giảm phải trả, phải nộp khác"
    ],
    "old_ind_codes_reference_only": [
      "phai_tra_phai_nop_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm receivables",
    "aliases_for_where_ind_name": [
      "_Increase/Decrease in receivables"
    ],
    "old_ind_codes_reference_only": [
      "tg_pt"
    ]
  },
  {
    "norm_name": "Tăng/giảm Thuế thu nhập doanh nghiệp công ty chứng khoán đã nộp",
    "aliases_for_where_ind_name": [
      "(+) Tăng, (-) giảm Thuế TNDN CTCK đã nộp"
    ],
    "old_ind_codes_reference_only": [
      "thue_tndn_da_nop"
    ]
  },
  {
    "norm_name": "Tăng/giảm thuế và các khoản phải nộp Nhà nước",
    "aliases_for_where_ind_name": [
      "(+) Tăng, (-) giảm thuế và các khoản phải nộp Nhà nước"
    ],
    "old_ind_codes_reference_only": [
      "thue_va_cac_khoan_phai_nop_nha_nuoc"
    ]
  },
  {
    "norm_name": "Tăng/giảm tiền gửi của khách hàng",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) tiền gửi của khách hàng"
    ],
    "old_ind_codes_reference_only": [
      "tien_gui_cua_khach_hang"
    ]
  },
  {
    "norm_name": "Tăng/giảm tiền thuần trong kỳ",
    "aliases_for_where_ind_name": [
      "Tăng/giảm tiền thuần trong kỳ"
    ],
    "old_ind_codes_reference_only": [
      "luu_chuyen_tien_thuan_trong_ky"
    ]
  },
  {
    "norm_name": "Tăng/giảm tài sản ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Tăng giảm tài sản ngắn hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_tai_san_ngan_han_khac"
    ]
  },
  {
    "norm_name": "Tăng/giảm tài sản tài chính ghi nhận thông qua lãi lỗ",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) tài sản tài chính ghi nhận thông qua lãi lỗ"
    ],
    "old_ind_codes_reference_only": [
      "tang_giam_tai_san_tai_chinh_ghi_nhan_thong_qua_lai_lo"
    ]
  },
  {
    "norm_name": "Tăng/giảm tài sản tài chính sẵn sàng để bán",
    "aliases_for_where_ind_name": [
      "Tăng (giảm) tài sản tài chính sẵn sàng để bán"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_san_sang_de_ban"
    ]
  },
  {
    "norm_name": "Tăng/giảm vốn tài trợ, ủy thác đầu tư, cho vay mà tổ chức tín dụng chịu rủi ro",
    "aliases_for_where_ind_name": [
      "Tăng/(Giảm) vốn tài trợ, ủy thác đầu tư, cho vay mà TCTD chịu rủi ro"
    ],
    "old_ind_codes_reference_only": [
      "von_tai_tro_uy_thac_dau_tu_cua_cp_va_cac_to_chuc_td_khac"
    ]
  },
  {
    "norm_name": "Tạm ứng",
    "aliases_for_where_ind_name": [
      "Tạm ứng"
    ],
    "old_ind_codes_reference_only": [
      "tam_ung"
    ]
  },
  {
    "norm_name": "Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm",
    "aliases_for_where_ind_name": [
      "Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference_only": [
      "tong_chi_truc_tiep_hoat_dong_kinh_doanh_bao_hiem"
    ]
  },
  {
    "norm_name": "Tổng cộng nguồn vốn",
    "aliases_for_where_ind_name": [
      "TỔNG CỘNG NGUỒN VỐN",
      "Tổng cộng nguồn vốn",
      "TỔNG CỘNG NGUỒN VỐN (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tong_nv"
    ]
  },
  {
    "norm_name": "Tổng cộng nợ phải trả và vốn chủ sở hữu",
    "aliases_for_where_ind_name": [
      "TỔNG CỘNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU"
    ],
    "old_ind_codes_reference_only": [
      "no_phai_tra"
    ]
  },
  {
    "norm_name": "Tổng cộng tài sản",
    "aliases_for_where_ind_name": [
      "TỔNG CỘNG TÀI SẢN",
      "Tổng cộng tài sản",
      "TỔNG CỘNG TÀI SẢN (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "tong_ts"
    ]
  },
  {
    "norm_name": "Tổng doanh thu hoạt động kinh doanh",
    "aliases_for_where_ind_name": [
      "Tổng doanh thu hoạt động kinh doanh"
    ],
    "old_ind_codes_reference_only": [
      "tong_doanh_thu_hoat_dong_kinh_doanh"
    ]
  },
  {
    "norm_name": "Tổng hàng tồn kho",
    "aliases_for_where_ind_name": [
      "Tổng hàng tồn kho"
    ],
    "old_ind_codes_reference_only": [
      "hang_ton_kho"
    ]
  },
  {
    "norm_name": "Tổng lợi nhuận kế toán",
    "aliases_for_where_ind_name": [
      "Tổng lợi nhuận kế toán"
    ],
    "old_ind_codes_reference_only": [
      "tong_loi_nhuan_ke_toan"
    ]
  },
  {
    "norm_name": "Tổng lợi nhuận kế toán trước thuế",
    "aliases_for_where_ind_name": [
      "TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Tổng lợi nhuận kế toán trước thuế +",
    "aliases_for_where_ind_name": [
      "Tổng lợi nhuận kế toán trước thuế (11)+(14)"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Tổng lợi nhuận trước thuế",
    "aliases_for_where_ind_name": [
      "Tổng lợi nhuận trước thuế"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Tổng lợi nhuận trước thuế thu nhập doanh nghiệp",
    "aliases_for_where_ind_name": [
      "Tổng lợi nhuận trước thuế thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference_only": [
      "lntt"
    ]
  },
  {
    "norm_name": "Tổng nợ phải trả và vốn chủ sở hữu",
    "aliases_for_where_ind_name": [
      "TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU"
    ],
    "old_ind_codes_reference_only": [
      "no_phai_tra"
    ]
  },
  {
    "norm_name": "Tổng thu nhập hoạt động",
    "aliases_for_where_ind_name": [
      "Total operating revenue",
      "Tổng thu nhập hoạt động"
    ],
    "old_ind_codes_reference_only": [
      "tong_tn_hd"
    ]
  },
  {
    "norm_name": "Tổng thu nhập toàn diện",
    "aliases_for_where_ind_name": [
      "Tổng thu nhập toàn diện"
    ],
    "old_ind_codes_reference_only": [
      "tong_thu_nhap_toan_dien"
    ]
  },
  {
    "norm_name": "Tổng tài sản dài hạn khác",
    "aliases_for_where_ind_name": [
      "Tổng tài sản dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "ts_dh_khac"
    ]
  },
  {
    "norm_name": "Vay các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Vay các TCTD khác"
    ],
    "old_ind_codes_reference_only": [
      "vay_cac_tctd_khac"
    ]
  },
  {
    "norm_name": "Vay dài hạn",
    "aliases_for_where_ind_name": [
      "Vay dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "vay_dai_han"
    ]
  },
  {
    "norm_name": "Vay ngắn hạn",
    "aliases_for_where_ind_name": [
      "Vay ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "vay_ngan_han"
    ]
  },
  {
    "norm_name": "Vay và nợ dài hạn",
    "aliases_for_where_ind_name": [
      "Vay và nợ dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_dai_han"
    ]
  },
  {
    "norm_name": "Vay và nợ dài hạn đến hạn phải trả",
    "aliases_for_where_ind_name": [
      "Vay và nợ dài hạn đến hạn phải trả"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_dai_han"
    ]
  },
  {
    "norm_name": "Vay và nợ ngắn hạn",
    "aliases_for_where_ind_name": [
      "Vay và nợ ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_ngan_han"
    ]
  },
  {
    "norm_name": "Vay và nợ thuê tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Vay và nợ thuê tài chính dài hạn",
      "Vay và nợ thuê tài chính dài hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_thue_tai_chinh_dai_han"
    ]
  },
  {
    "norm_name": "Vay và nợ thuê tài chính ngắn hạn",
    "aliases_for_where_ind_name": [
      "Vay và nợ thuê tài chính ngắn hạn",
      "Vay và nợ thuê tài chính ngắn hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_thue_tai_chinh_ngan_han"
    ]
  },
  {
    "norm_name": "Vay và nợ thuê tài sản tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Vay và nợ thuê tài sản tài chính dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_thue_tai_chinh_dai_han"
    ]
  },
  {
    "norm_name": "Vay và nợ thuê tài sản tài chính ngắn hạn",
    "aliases_for_where_ind_name": [
      "Vay và nợ thuê tài sản tài chính ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "vay_va_no_thue_tai_chinh_ngan_han"
    ]
  },
  {
    "norm_name": "Vật tư văn phòng, công cụ, dụng cụ",
    "aliases_for_where_ind_name": [
      "Vật tư văn phòng, công cụ, dụng cụ"
    ],
    "old_ind_codes_reference_only": [
      "vat_tu_van_phong_cong_cu_dung_cu"
    ]
  },
  {
    "norm_name": "Vốn chủ sở hữu",
    "aliases_for_where_ind_name": [
      "VỐN CHỦ SỞ HỮU",
      "Vốn chủ sở hữu",
      "VỐN CHỦ SỞ HỮU (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "vcsh"
    ]
  },
  {
    "norm_name": "Vốn của tổ chức tín dụng",
    "aliases_for_where_ind_name": [
      "Capital",
      "Vốn của tổ chức tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "von_cua_to_chuc_tin_dung"
    ]
  },
  {
    "norm_name": "Vốn của Tổ chức tín dụng",
    "aliases_for_where_ind_name": [
      "Vốn của Tổ chức tín dụng"
    ],
    "old_ind_codes_reference_only": [
      "von_cua_to_chuc_tin_dung"
    ]
  },
  {
    "norm_name": "Vốn góp của chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Vốn góp của chủ sở hữu",
      "Vốn góp của chủ sở hữu (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "von_gop_csh"
    ]
  },
  {
    "norm_name": "Vốn góp của các cổ đông thiểu số vào các công ty con",
    "aliases_for_where_ind_name": [
      "Vốn góp của các cổ đông thiểu số vào các công ty con"
    ],
    "old_ind_codes_reference_only": [
      "von_gop_cua_cac_co_dong_thieu_so_vao_cac_cong_ty_con"
    ]
  },
  {
    "norm_name": "Vốn khác",
    "aliases_for_where_ind_name": [
      "Vốn khác"
    ],
    "old_ind_codes_reference_only": [
      "von_khac"
    ]
  },
  {
    "norm_name": "Vốn khác của chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Vốn khác của chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "von_khac_cua_chu_so_huu"
    ]
  },
  {
    "norm_name": "Vốn kinh doanh tại các đơn vị trực thuộc",
    "aliases_for_where_ind_name": [
      "Vốn kinh doanh tại các đơn vị trực thuộc"
    ],
    "old_ind_codes_reference_only": [
      "von_kinh_doanh_tai_cac_don_vi_truc_thuoc"
    ]
  },
  {
    "norm_name": "Vốn ngân sách nhà nước và quỹ khác",
    "aliases_for_where_ind_name": [
      "Budget sources and other funds"
    ],
    "old_ind_codes_reference_only": [
      "von_ngan_sach_nha_nuoc_va_quy_khac"
    ]
  },
  {
    "norm_name": "Vốn Ngân sách nhà nước và quỹ khác",
    "aliases_for_where_ind_name": [
      "Vốn Ngân sách nhà nước và quỹ khác"
    ],
    "old_ind_codes_reference_only": [
      "von_ngan_sach_nha_nuoc_va_quy_khac"
    ]
  },
  {
    "norm_name": "Vốn tài trợ, ủy thác đầu tư của Chính phủ và các tổ chức tín dụng khác",
    "aliases_for_where_ind_name": [
      "Funds received from Gov, international and other institutions",
      "Vốn tài trợ, uỷ thác đầu tư của CP và các tổ chức TD khác"
    ],
    "old_ind_codes_reference_only": [
      "von_tai_tro_uy_thac_dau_tu_cua_cp_va_cac_to_chuc_td_khac"
    ]
  },
  {
    "norm_name": "Vốn tài trợ, ủy thác đầu tư mà ngân hàng chịu rủi ro",
    "aliases_for_where_ind_name": [
      "Vốn tài trợ, uỷ thác đầu tư mà ngân hàng chịu rủi ro"
    ],
    "old_ind_codes_reference_only": [
      "von_tai_tro_uy_thac_dau_tu_ma_ngan_hang_chiu_rui_ro"
    ]
  },
  {
    "norm_name": "Vốn và các quỹ",
    "aliases_for_where_ind_name": [
      "Vốn và các quỹ",
      "Vốn và các quỹ (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "von_va_quy"
    ]
  },
  {
    "norm_name": "Vốn điều lệ",
    "aliases_for_where_ind_name": [
      "Vốn điều lệ"
    ],
    "old_ind_codes_reference_only": [
      "von_dieu_le"
    ]
  },
  {
    "norm_name": "Vốn đầu tư của chủ sở hữu",
    "aliases_for_where_ind_name": [
      "Vốn đầu tư của chủ sở hữu"
    ],
    "old_ind_codes_reference_only": [
      "von_gop_csh"
    ]
  },
  {
    "norm_name": "Vốn đầu tư xây dựng cơ bản",
    "aliases_for_where_ind_name": [
      "Vốn đầu tư XDCB"
    ],
    "old_ind_codes_reference_only": [
      "von_dau_tu_xdcb"
    ]
  },
  {
    "norm_name": "Xóa sổ tài sản cố định (thuần)",
    "aliases_for_where_ind_name": [
      "Xóa sổ tài sản cố định (thuần)"
    ],
    "old_ind_codes_reference_only": [
      "xoa_so_tai_san_co_dinh_thuan"
    ]
  },
  {
    "norm_name": "Điều chỉnh cho các khoản",
    "aliases_for_where_ind_name": [
      "Điều chỉnh cho các khoản",
      "Điều chỉnh cho các khoản:"
    ],
    "old_ind_codes_reference_only": [
      "dieu_chinh_cho_cac_khoan"
    ]
  },
  {
    "norm_name": "Điều chỉnh qua các khoản",
    "aliases_for_where_ind_name": [
      "Điều chỉnh qua các khoản"
    ],
    "old_ind_codes_reference_only": [
      "dieu_chinh_qua_cac_khoan"
    ]
  },
  {
    "norm_name": "Đầu tư chứng khoán dài hạn",
    "aliases_for_where_ind_name": [
      "Đầu tư chứng khoán dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_chung_khoan_dai_han"
    ]
  },
  {
    "norm_name": "Đầu tư chứng khoán ngắn hạn",
    "aliases_for_where_ind_name": [
      "Đầu tư chứng khoán ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_chung_khoan_ngan_han"
    ]
  },
  {
    "norm_name": "Đầu tư dài hạn",
    "aliases_for_where_ind_name": [
      "Đầu tư dài hạn (đồng)"
    ],
    "old_ind_codes_reference_only": [
      "dt_tc_dh"
    ]
  },
  {
    "norm_name": "Đầu tư dài hạn khác",
    "aliases_for_where_ind_name": [
      "Đầu tư dài hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_dai_han_khac"
    ]
  },
  {
    "norm_name": "Đầu tư góp vốn vào công ty liên doanh liên kết",
    "aliases_for_where_ind_name": [
      "Đầu tư góp vốn vào công ty liên doanh liên kết"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_gop_von_vao_cong_ty_lien_doanh_lien_ket"
    ]
  },
  {
    "norm_name": "Đầu tư khác vào công cụ vốn",
    "aliases_for_where_ind_name": [
      "Đầu tư khác vào công cụ vốn"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_khac_vao_cong_cu_von"
    ]
  },
  {
    "norm_name": "Đầu tư ngắn hạn khác",
    "aliases_for_where_ind_name": [
      "Đầu tư ngắn hạn khác"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_ngan_han_khac"
    ]
  },
  {
    "norm_name": "Đầu tư nắm giữ đến ngày đáo hạn",
    "aliases_for_where_ind_name": [
      "Đầu tư nắm giữ đến ngày đáo hạn"
    ],
    "old_ind_codes_reference_only": [
      "chung_khoan_dau_tu_giu_den_ngay_dao_han"
    ]
  },
  {
    "norm_name": "Đầu tư tài chính dài hạn",
    "aliases_for_where_ind_name": [
      "Đầu tư tài chính dài hạn"
    ],
    "old_ind_codes_reference_only": [
      "dt_tc_dh"
    ]
  },
  {
    "norm_name": "Đầu tư tài chính ngắn hạn",
    "aliases_for_where_ind_name": [
      "Đầu tư tài chính ngắn hạn"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_tai_chinh_ngan_han"
    ]
  },
  {
    "norm_name": "Đầu tư vào các doanh nghiệp khác",
    "aliases_for_where_ind_name": [
      "Đầu tư vào các doanh nghiệp khác"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cac_doanh_nghiep_khac"
    ]
  },
  {
    "norm_name": "Đầu tư vào công ty con",
    "aliases_for_where_ind_name": [
      "Đầu tư vào công ty con"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cong_ty_con"
    ]
  },
  {
    "norm_name": "Đầu tư vào công ty liên doanh",
    "aliases_for_where_ind_name": [
      "Investment in joint ventures",
      "Đầu tư vào công ty liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cong_ty_lien_doanh"
    ]
  },
  {
    "norm_name": "Đầu tư vào công ty liên doanh, liên kết",
    "aliases_for_where_ind_name": [
      "Đầu tư vào công ty liên doanh, liên kết"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cong_ty_lien_doanh_lien_ket"
    ]
  },
  {
    "norm_name": "Đầu tư vào công ty liên kết",
    "aliases_for_where_ind_name": [
      "Investments in associate companies",
      "Đầu tư vào công ty liên kết"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cong_ty_lien_ket"
    ]
  },
  {
    "norm_name": "Đầu tư vào công ty liên kết, liên doanh",
    "aliases_for_where_ind_name": [
      "Đầu tư vào công ty liên kết, liên doanh"
    ],
    "old_ind_codes_reference_only": [
      "dau_tu_vao_cong_ty_lien_doanh_lien_ket"
    ]
  },
  {
    "norm_name": "Ảnh hưởng của thay đổi tỷ giá hối đoái",
    "aliases_for_where_ind_name": [
      "Ảnh hưởng của chênh lệch tỷ giá",
      "Ảnh hưởng của thay đổi tỷ giá",
      "Ảnh hưởng của thay đổi tỷ giá hối đoái quy đổi ngoại tệ"
    ],
    "old_ind_codes_reference_only": [
      "ah_tygia"
    ]
  }
]
```
