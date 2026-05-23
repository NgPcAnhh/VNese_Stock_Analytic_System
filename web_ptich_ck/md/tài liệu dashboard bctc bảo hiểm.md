# ĐẶC TẢ BA & VIBECODING: DASHBOARD DOANH NGHIỆP BẢO HIỂM

**Phiên bản:** 1.0  
**Vai trò biên soạn:** Business Analyst cho dashboard tài chính bảo hiểm  
**Mục tiêu:** Tạo tài liệu Markdown đủ chi tiết để AI/vibecoding xây dựng giao diện dashboard, chart, tooltip và truy vấn dữ liệu báo cáo tài chính đúng `ind_name`.

---

## 0. Nguyên tắc thiết kế bắt buộc

Dashboard bảo hiểm không được thiết kế giống dashboard doanh nghiệp sản xuất, ngân hàng hoặc công ty tài chính tiêu dùng. Bản chất sức khỏe của doanh nghiệp bảo hiểm nằm ở 4 câu hỏi:

1. **Công ty có tăng trưởng phí nhưng vẫn giữ được chất lượng khai thác không?**  
   Nếu phí tăng nhưng loss ratio/combined ratio xấu đi, tăng trưởng có thể là underpricing.
2. **Lợi nhuận đến từ underwriting hay từ đầu tư?**  
   Một DNBH có thể lãi nhờ đầu tư dù nghiệp vụ bảo hiểm lỗ. Dashboard phải tách 2 động cơ lợi nhuận.
3. **Dự phòng kỹ thuật có đủ lớn và tăng có hợp lý không?**  
   Dự phòng tăng không mặc định là xấu; có thể do tăng hợp đồng, tăng trách nhiệm bảo hiểm hoặc thay đổi giả định định phí.
4. **Công ty có đủ vốn và thanh khoản khi xảy ra sự kiện bồi thường lớn không?**  
   Đây là phần khác biệt lớn nhất so với dashboard tài chính thông thường.

**Quy tắc layout toàn dashboard**

- Mỗi tab phải có thứ tự: **KPI cảnh báo nhanh → chart insight lớn → chart giải thích → bảng số liệu đối soát/export**.
- Chart lớn ở đầu tab phải trả lời được 1 câu hỏi điều hành. Chart nhỏ phía sau chỉ dùng để giải thích nguyên nhân.
- Mọi tab bắt buộc có **bảng số liệu** ở cuối tab. Không được chỉ có chart.
- Không được tự bịa metric từ BCTC nếu thiếu `ind_name`. Metric không có trong mapping phải đánh dấu `EXTENSION_REQUIRED`.
- Khi sinh SQL, AI phải dùng `raw_name` trong `WHERE ind_name IN (...)`, không dùng `norm_name` nếu cột thực tế là `ind_name`.
- `old_ind_code` chỉ dùng tham chiếu/đối soát, không dùng làm khóa duy nhất vì một mã có thể xuất hiện ở nhiều ngữ cảnh.

---

## 1. Phân loại nghiệp vụ bảo hiểm và filter toàn cục

### 1.1 Global filters

| Filter | Bắt buộc | Ý nghĩa BA | Ghi chú vibecoding |
|---|---:|---|---|
| `company_id` / `ticker` | Có | Chọn doanh nghiệp bảo hiểm | Dùng ở mọi query |
| `period_type` | Có | Quý/Năm/TTM | Ratio nên hỗ trợ quý và TTM |
| `period` | Có | Kỳ báo cáo | Dùng để tính QoQ/YoY |
| `lob_type` | Có | `NON_LIFE`, `LIFE`, `REINSURANCE`, `MIXED` | Điều khiển chart nào hiển thị |
| `capital_framework` | Có | `LOCAL_VN`, `SOLVENCY_II`, `ICS` | Chỉ áp dụng nếu có bảng solvency extension |
| `unit` | Có | VND, tỷ VND, triệu VND | Tooltip phải hiển thị đơn vị rõ |
| `view_mode` | Có | Actual, YoY Growth, Common-size | Điều khiển chart và bảng |

### 1.2 Logic theo loại hình bảo hiểm

| LOB | Chỉ tiêu trọng tâm | Chỉ tiêu cần ẩn/đổi nghĩa | Extension thường cần |
|---|---|---|---|
| `NON_LIFE` | NEP, Loss Ratio, Expense Ratio, Combined Ratio, Reinsurance Dependency | Không dùng VNB/APE nếu không có | Claims triangle, LOB mix, reinsurance recoverables, catastrophe exposure |
| `LIFE` | Dự phòng toán học, phí khai thác mới, persistency, surrender, investment spread | Không dùng Combined Ratio/Loss Ratio như phi nhân thọ | APE, VNB, persistency, surrender, liability duration |
| `REINSURANCE` | Nhận tái, nhượng tái, retrocession, combined ratio theo treaty | Product retail metrics | Treaty exposure, cedant concentration |
| `MIXED` | Tách tab theo segment | Không cộng ratio trực tiếp giữa Life và Non-life nếu mẫu số khác | Segment reporting |

**Rule render quan trọng:** Nếu `lob_type = LIFE`, các chart `Combined Ratio`, `Loss Ratio`, `Expense Ratio`, `Underwriting Waterfall theo claims/expenses` phải chuyển sang trạng thái `N/A for LIFE` hoặc thay bằng chart `Reserve Growth`, `Persistency`, `Investment Spread` nếu có extension data.

---

## 2. Data contract cho vibecoding

### 2.1 Bảng BCTC chuẩn

Giả định bảng dữ liệu gốc:

```sql
fact_financial_statement(
  company_id,
  ticker,
  period,
  fiscal_year,
  fiscal_quarter,
  report_type,      -- BS, IS, CF hoặc unknown
  source,
  ind_name,         -- tên chỉ tiêu thô trong BCTC
  value,
  unit,
  currency
)
```

### 2.2 Bảng mapping chỉ tiêu

```sql
dim_indicator_mapping(
  raw_name,          -- tên thực tế dùng trong WHERE ind_name
  old_ind_code,      -- mã cũ, chỉ dùng đối soát
  norm_name,         -- tên chuẩn nghiệp vụ
  metric_key,        -- khóa dashboard do BA định nghĩa
  industry_scope,    -- INSURANCE, BANK, FINCO, SECURITIES, GENERAL
  metric_group       -- premium, claims, reserve, investment, capital, liquidity
)
```

### 2.3 Bảng extension bắt buộc cho bảo hiểm

Các dữ liệu sau **không nên ép lấy từ BCTC `ind_name`** nếu file mapping không có chỉ tiêu chi tiết:

```sql
insurance_solvency_fact(
  company_id, period, capital_framework,
  available_capital, required_capital,
  solvency_ratio, capital_headroom,
  regulatory_min_ratio, management_buffer_ratio
)

insurance_lob_fact(
  company_id, period, lob_type, product_group,
  gross_written_premium, net_earned_premium,
  claims_incurred, commission_expense,
  operating_expense, underwriting_result,
  policy_count, sum_insured
)

insurance_investment_allocation_fact(
  company_id, period, asset_class,
  carrying_value, fair_value, duration_years,
  credit_rating_bucket, yield_to_maturity, unrealized_gain_loss
)

insurance_reinsurance_fact(
  company_id, period, reinsurer_name, reinsurer_rating,
  ceded_premium, recoverable_balance,
  overdue_recoverable, recoveries_received,
  concentration_pct
)

insurance_liquidity_stress_fact(
  company_id, period, scenario_name, day_no,
  liquid_assets_available, cumulative_claim_outflow,
  reinsurance_recovery_inflow, net_liquidity_position
)
```

---

## 3. Metric Registry cốt lõi: mapping `ind_name` cho BCTC

### 3.1 Nhóm quy mô, vốn và tài sản đầu tư

| metric_key | Ý nghĩa BA | Mapping `norm_name` | `WHERE ind_name IN (...)` | Ghi chú |
|---|---|---|---|---|
| `total_assets` | Tổng tài sản | `Tổng cộng tài sản` | `TỔNG CỘNG TÀI SẢN`, `TỔNG CỘNG TÀI SẢN (đồng)`, `Tổng cộng tài sản` | Quy mô bảng cân đối; là mẫu số cho tỷ trọng tài sản đầu tư, tỷ lệ tài sản lỏng và leverage. |
| `equity` | Vốn chủ sở hữu | `Vốn chủ sở hữu` | `VỐN CHỦ SỞ HỮU`, `VỐN CHỦ SỞ HỮU (đồng)`, `Vốn chủ sở hữu` | Bộ đệm chịu lỗ; dùng cho ROE, solvency proxy, NWP/Capital. |
| `liabilities` | Nợ phải trả | `Nợ phải trả` | `NỢ PHẢI TRẢ`, `NỢ PHẢI TRẢ (đồng)`, `Nợ phải trả` | Tổng nghĩa vụ kế toán, bao gồm dự phòng nghiệp vụ và các khoản phải trả khác. |
| `cash_equivalents` | Tiền và tương đương tiền | `Tiền và các khoản tương đương tiền` | `Tiền và các khoản tương đương tiền`, `Tiền và tương đương tiền`, `Tiền và tương đương tiền (đồng)` | Lớp thanh khoản tức thời; không đủ để đại diện toàn bộ liquid assets nếu thiếu tiền gửi/TP ngắn hạn. |
| `short_term_investments` | Đầu tư tài chính ngắn hạn | `Đầu tư tài chính ngắn hạn`, `Giá trị thuần đầu tư ngắn hạn` | `Giá trị thuần đầu tư ngắn hạn (đồng)`, `Đầu tư tài chính ngắn hạn` | Có thể dùng như liquid asset proxy nếu không có bảng phân loại tài sản đầu tư chi tiết. |
| `long_term_investments` | Đầu tư tài chính dài hạn | `Đầu tư tài chính dài hạn`, `Đầu tư dài hạn`, `Giá trị ròng tài sản đầu tư` | `Giá trị ròng tài sản đầu tư`, `Đầu tư dài hạn (đồng)`, `Đầu tư tài chính dài hạn` | Phần tài sản sinh lời dài hạn; cần tách HTM/AFS/Equity/Deposits bằng extension nếu muốn phân bổ rủi ro. |
| `investment_securities` | Chứng khoán đầu tư | `Chứng khoán đầu tư`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Chứng khoán đầu tư sẵn sàng để bán` | `Available-for Sales Securities`, `Chứng khoán đầu tư`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Chứng khoán đầu tư sẵn sàng để bán`, `Held-to-Maturity Securities`, `Investment Securities` | Nhóm tài sản đầu tư chịu rủi ro lãi suất/tín dụng; cần thuyết minh để tách TPCP/TPDN/cổ phiếu. |
| `technical_provisions` | Dự phòng nghiệp vụ / kỹ thuật | `Dự phòng nghiệp vụ`, `Dự phòng phí`, `Dự phòng toán học`, `Dự phòng bồi thường`, `Dự phòng dao động lớn`, `Dự phòng bảo đảm cân đối` | `Dự phòng bảo đảm cân đối`, `Dự phòng bồi thường`, `Dự phòng dao động lớn`, `Dự phòng nghiệp vụ`, `Dự phòng phí`, `Dự phòng toán học` | Nghĩa vụ cốt lõi với người được bảo hiểm; tăng có thể là tín hiệu tăng trưởng hợp đồng, không mặc định là xấu. |

### 3.2 Nhóm phí bảo hiểm, bồi thường và underwriting

| metric_key | Ý nghĩa BA | Mapping `norm_name` | `WHERE ind_name IN (...)` | Ghi chú |
|---|---|---|---|---|
| `gross_written_premium` | Phí bảo hiểm gốc | `Thu phí bảo hiểm gốc` | `Thu phí bảo hiểm gốc` | Doanh số phí bảo hiểm trực tiếp; là chỉ báo tăng trưởng khai thác. |
| `inward_reinsurance_premium` | Phí nhận tái bảo hiểm | `Thu phí nhận tái bảo hiểm` | `Thu phí nhận tái bảo hiểm` | Phí từ nghiệp vụ nhận tái; cần tách khỏi bảo hiểm gốc khi phân tích rủi ro. |
| `ceded_reinsurance_premium` | Phí nhượng tái bảo hiểm | `Phí nhượng tái bảo hiểm` | `Phí nhượng tái bảo hiểm` | Chi phí chuyển rủi ro sang nhà tái; tăng có thể giảm rủi ro giữ lại nhưng làm giảm NEP. |
| `premium_reductions_refunds` | Giảm/hoàn phí bảo hiểm | `Giảm phí bảo hiểm`, `Hoàn phí bảo hiểm` | `Giảm phí bảo hiểm`, `Hoàn phí bảo hiểm` | Điều chỉnh giảm doanh thu phí; tăng nhanh có thể phản ánh hủy hợp đồng hoặc chính sách giảm giá. |
| `net_insurance_revenue` | Doanh thu thuần hoạt động kinh doanh bảo hiểm | `Doanh thu thuần hoạt động kinh doanh bảo hiểm` | `Doanh thu thuần hoạt động kinh doanh bảo hiểm` | Mẫu số chính cho loss ratio, expense ratio, combined ratio của phi nhân thọ. |
| `net_claims_retained` | Bồi thường thuộc phần trách nhiệm giữ lại | `Bồi thường thuộc phần trách nhiệm giữ lại` | `Bồi thường thuộc phần trách nhiệm giữ lại` | Chi phí rủi ro bảo hiểm sau tái bảo hiểm; là numerator chính của loss ratio. |
| `gross_claims_paid` | Chi/trả bồi thường bảo hiểm | `Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm`, `Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm`, `Trả tiền bồi thường bảo hiểm` | `Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm`, `Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm`, `Trả tiền bồi thường bảo hiểm` | Dòng/chi bồi thường gộp; không dùng trực tiếp cho loss ratio nếu chưa trừ tái bảo hiểm. |
| `reinsurance_recoveries` | Thu bồi thường nhượng tái bảo hiểm | `Thu bồi thường nhượng tái bảo hiểm` | `Thu bồi thường nhượng tái bảo hiểm` | Khoản thu/được bù từ nhà tái; quan trọng cho net retained loss và rủi ro đối tác tái. |
| `change_claim_reserve` | Tăng/giảm dự phòng bồi thường | `Tăng/giảm dự phòng bồi thường` | `Tăng (giảm) dự phòng bồi thường` | Điều chỉnh claims incurred; giúp phân biệt claims paid với claims incurred. |
| `change_premium_math_reserve` | Tăng/giảm dự phòng phí, dự phòng toán học | `Tăng/giảm dự phòng phí, dự phòng toán học` | `Tăng (giảm) dự phòng phí, dự phòng toán học` | Điều chỉnh phí được hưởng/earned premium; đặc biệt quan trọng với bảo hiểm nhân thọ. |
| `commission_expense` | Chi hoa hồng | `Chi hoa hồng` | `Chi hoa hồng` | Chi phí phân phối; là cấu phần chính của acquisition cost và expense ratio. |
| `commission_income_ceded` | Thu hoa hồng nhượng tái bảo hiểm | `Thu hoa hồng nhượng tái bảo hiểm` | `Thu hoa hồng nhượng tái bảo hiểm` | Khoản hoàn/thu từ nhà tái giúp bù chi phí khai thác. |
| `insurance_other_income` | Thu khác hoạt động kinh doanh bảo hiểm | `Thu khác hoạt động kinh doanh bảo hiểm`, `Thu khác (Giám định, đại lý...)`, `Thu hàng đã xử lý bồi thường 100%` | `Thu hàng đã xử lý bồi thường 100%`, `Thu khác (Giám định, đại lý...)`, `Thu khác hoạt động kinh doanh bảo hiểm` | Nguồn thu phụ trợ; không nên trộn vào NEP khi tính underwriting ratio nếu không có rule rõ. |
| `insurance_other_expense` | Chi khác hoạt động kinh doanh bảo hiểm | `Chi khác hoạt động kinh doanh bảo hiểm`, `Chi khác hoạt động kinh doanh bảo hiểm gốc` | `Chi khác hoạt động kinh doanh bảo hiểm`, `Chi khác hoạt động kinh doanh bảo hiểm gốc` | Chi phí vận hành trực tiếp khác của nghiệp vụ bảo hiểm. |
| `direct_insurance_expense` | Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm | `Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm` | `Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm` | Dùng làm numerator expense nếu dữ liệu đã tổng hợp; tránh double-count nếu đã cộng hoa hồng + chi khác. |
| `insurance_gross_profit` | Lợi nhuận gộp hoạt động kinh doanh bảo hiểm | `Lợi nhuận gộp hoạt động kinh doanh bảo hiểm` | `Lợi nhuận gộp hoạt động kinh doanh bảo hiểm` | Biên lợi nhuận trước các chi phí ngoài gộp; dùng đối soát với NEP - Claims - Direct Expenses. |
| `insurance_net_profit` | Lợi nhuận thuần hoạt động kinh doanh bảo hiểm | `Lợi nhuận thuần hoạt động kinh doanh bảo hiểm` | `Lợi nhuận thuần hoạt động kinh doanh bảo hiểm` | Kết quả underwriting/kinh doanh bảo hiểm sau chi phí liên quan; có thể âm trong giai đoạn cạnh tranh giá. |

### 3.3 Nhóm đầu tư, lợi nhuận và dòng tiền

| metric_key | Ý nghĩa BA | Mapping `norm_name` | `WHERE ind_name IN (...)` | Ghi chú |
|---|---|---|---|---|
| `investment_income` | Thu nhập/Doanh thu hoạt động tài chính và đầu tư | `Doanh thu hoạt động tài chính`, `Thu nhập lãi`, `Lãi tiền gửi và cổ tức`, `Thu lãi và cổ tức`, `Lãi/lỗ từ hoạt động đầu tư`, `Lợi nhuận hoạt động tài chính` | `Doanh thu hoạt động tài chính`, `Doanh thu tài chính`, `Lãi tiền gửi và cổ tức`, `Lãi, lỗ từ hoạt động đầu tư`, `Lãi/Lỗ từ hoạt động đầu tư`, `Lãi/lỗ từ hoạt động đầu tư`, `Lợi nhuận hoạt động tài chính`, `Thu lãi và cổ tức`, `Thu nhập lãi`, `Thu nhập tài chính` | Động cơ lợi nhuận thứ hai của bảo hiểm; cần tách realized/unrealized nếu có extension. |
| `investment_expense` | Chi phí hoạt động tài chính/đầu tư | `Chi hoạt động tài chính`, `Chi phí tài chính`, `Chi phí đầu tư khác`, `Dự phòng giảm giá chứng khoán đầu tư`, `Dự phòng giảm giá đầu tư dài hạn` | `Chi hoạt động tài chính`, `Chi phí tài chính`, `Chi phí đầu tư khác`, `Dự phòng giảm giá chứng khoán đầu tư`, `Dự phòng giảm giá đầu tư dài hạn`, `Less: Provision for diminuation in value of long term investments`, `Less: Provision for diminution in value of investment securities` | Chi phí vốn, dự phòng giảm giá đầu tư và lỗ tài chính; ảnh hưởng trực tiếp đến investment result. |
| `pbt` | Lợi nhuận trước thuế | `Lợi nhuận trước thuế`, `Lợi nhuận/lỗ thuần trước thuế`, `Lãi/lỗ ròng trước thuế` | `LN trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận trước thuế`, `Lợi nhuận/Lỗ thuần trước thuế` | Lợi nhuận sau underwriting + investment + other. |
| `pat` | Lợi nhuận sau thuế | `Lợi nhuận sau thuế thu nhập doanh nghiệp`, `Lợi nhuận kế toán sau thuế thu nhập doanh nghiệp` | `LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN`, `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp` | Dùng cho ROE và tăng trưởng lợi nhuận. |
| `cfo` | Lưu chuyển tiền thuần từ HĐKD | `Lưu chuyển tiền thuần từ hoạt động kinh doanh` | `Lưu chuyển tiền thuần từ HĐKD`, `Lưu chuyển tiền thuần từ hoạt động kinh doanh` | Khả năng tạo tiền từ hoạt động bảo hiểm/đầu tư vận hành. |
| `cfi` | Lưu chuyển tiền thuần từ HĐ đầu tư | `Lưu chuyển tiền thuần từ hoạt động đầu tư` | `Lưu chuyển tiền thuần từ HĐ đầu tư`, `Lưu chuyển tiền thuần từ hoạt động đầu tư` | Dòng tiền mua/bán tài sản đầu tư. |
| `cff` | Lưu chuyển tiền thuần từ HĐ tài chính | `Lưu chuyển tiền thuần từ hoạt động tài chính` | `Lưu chuyển tiền thuần từ HĐ tài chính`, `Lưu chuyển tiền thuần từ hoạt động tài chính` | Dòng tiền vốn/cổ tức/nợ tài chính. |

---

## 4. Công thức KPI chuẩn

### 4.1 Premium & underwriting metrics

| KPI | Công thức | Áp dụng | Diễn giải BA | Lower/Better rule |
|---|---|---|---|---|
| `gross_written_premium_growth` | `(GWP_t / GWP_t-4) - 1` | Life, Non-life | Tăng trưởng doanh số phí gốc | Higher is better nếu quality không xấu đi |
| `net_earned_premium` | Ưu tiên `Doanh thu thuần hoạt động kinh doanh bảo hiểm`; nếu thiếu, tính từ premium components | Chủ yếu Non-life | Mẫu số underwriting ratio | Higher is better |
| `loss_ratio` | `net_claims_retained / net_earned_premium` | Non-life | Mức phí bị ăn bởi bồi thường | Lower is better |
| `expense_ratio` | `(commission_expense + insurance_other_expense hoặc direct_insurance_expense) / net_earned_premium` | Non-life | Chi phí khai thác/vận hành trên phí thuần | Lower is better |
| `combined_ratio` | `loss_ratio + expense_ratio` | Non-life | <100% nghĩa là có lãi underwriting trước đầu tư | Lower is better |
| `underwriting_margin` | `insurance_net_profit / net_earned_premium` | Non-life, Mixed | Biên lợi nhuận nghiệp vụ bảo hiểm | Higher is better |
| `reinsurance_cession_ratio` | `ceded_reinsurance_premium / gross_written_premium` | Non-life, Reinsurance | Mức chuyển rủi ro ra ngoài | Không cố định tốt/xấu |
| `reinsurance_recovery_ratio` | `reinsurance_recoveries / gross_claims_paid` | Non-life, Cat-risk | Mức bồi thường được nhà tái gánh | Higher tốt nếu recoverable có chất lượng |

### 4.2 Capital, investment & liquidity metrics

| KPI | Công thức | Mapping chính | Diễn giải BA |
|---|---|---|---|
| `solvency_ratio` | `available_capital / required_capital` | `EXTENSION_REQUIRED` | Khả năng đáp ứng vốn pháp lý |
| `capital_headroom` | `available_capital - required_capital` | `EXTENSION_REQUIRED` | Dư địa vốn tuyệt đối |
| `equity_to_assets` | `equity / total_assets` | BCTC | Bộ đệm kế toán trên tổng tài sản |
| `technical_provision_to_assets` | `technical_provisions / total_assets` | BCTC | Mức nghĩa vụ bảo hiểm trong cơ cấu nguồn vốn |
| `invested_assets_to_assets` | `(short_term_investments + long_term_investments + investment_securities) / total_assets` | BCTC proxy | Tỷ trọng tài sản sinh lời |
| `investment_yield` | `investment_income / avg_invested_assets` | BCTC proxy + avg balance | Hiệu suất tài sản đầu tư |
| `liquid_assets_ratio` | `(cash + liquid short-term investments) / total_assets` | BCTC proxy hoặc extension | Khả năng thanh khoản nhanh |
| `survival_horizon_days` | Ngày đầu tiên `net_liquidity_position < 0` | `EXTENSION_REQUIRED` | Số ngày sống sót trong stress scenario |

---

## 5. Cấu trúc dashboard 5 tab

## TAB 1 — EXECUTIVE OVERVIEW & FINANCIAL POSITION

**Mục tiêu BA:** C-level nhìn trong 30 giây để biết doanh nghiệp bảo hiểm đang tăng trưởng lành mạnh hay đang mua tăng trưởng bằng underpricing, có đủ vốn/đệm tài sản để chịu rủi ro hay không.

### Thứ tự hiển thị trong tab

1. KPI row: Tổng tài sản, VCSH, Dự phòng nghiệp vụ, Doanh thu thuần bảo hiểm, Combined Ratio/Reserve Growth tùy LOB.
2. **Chart insight lớn:** Insurance Health Matrix.
3. Chart giải thích 1: Balance Sheet Composition.
4. Chart giải thích 2: Invested Assets vs Technical Provisions trend.
5. Bảng số liệu đối soát toàn tab.


### Chart 1.1 — Insurance Health Matrix (chart lớn đầu tab)

**Insight cần trả lời**  
Trả lời: tăng trưởng phí có đi kèm chất lượng underwriting và bộ đệm vốn đủ an toàn không? Chart này là điểm nhấn của tab, ưu tiên kích thước lớn 2/3 chiều ngang.

**Cách hiển thị**  
Bubble/scatter 2 trục. Trục X = tăng trưởng doanh thu thuần bảo hiểm hoặc GWP YoY. Trục Y = Combined Ratio nếu Non-life; nếu Life thì dùng Reserve Growth hoặc Technical Provision Growth. Kích thước bubble = Tổng tài sản. Màu bubble = trạng thái vốn/solvency: xanh an toàn, cam cần theo dõi, đỏ rủi ro. Với 1 doanh nghiệp đơn lẻ, hiển thị trailing 8 quý như đường quỹ đạo.

**Mapping dữ liệu để lên chart**
- `gross_written_premium` — Phí bảo hiểm gốc: `WHERE ind_name IN ('Thu phí bảo hiểm gốc')`
- `net_insurance_revenue` — Doanh thu thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Doanh thu thuần hoạt động kinh doanh bảo hiểm')`
- `technical_provisions` — Dự phòng nghiệp vụ / kỹ thuật: `WHERE ind_name IN ('Dự phòng bảo đảm cân đối', 'Dự phòng bồi thường', 'Dự phòng dao động lớn', 'Dự phòng nghiệp vụ', 'Dự phòng phí', 'Dự phòng toán học')`
- `total_assets` — Tổng tài sản: `WHERE ind_name IN ('TỔNG CỘNG TÀI SẢN', 'TỔNG CỘNG TÀI SẢN (đồng)', 'Tổng cộng tài sản')`
- `equity` — Vốn chủ sở hữu: `WHERE ind_name IN ('VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU (đồng)', 'Vốn chủ sở hữu')`
- `solvency_ratio`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
`premium_growth_yoy = premium_t / premium_t-4 - 1`. `combined_ratio = loss_ratio + expense_ratio`. Nếu `lob_type = LIFE`, không tính combined ratio; thay Y bằng `technical_provisions_growth_yoy` hoặc metric extension `persistency/surrender`.

**Tooltip bắt buộc**  
Tooltip gồm: Kỳ, GWP/Net insurance revenue, YoY %, Combined Ratio hoặc Reserve Growth, Tổng tài sản, VCSH, Solvency Ratio nếu có. Dòng diễn giải tự động: `Phí tăng nhưng CR tăng > ngưỡng => rủi ro underpricing`; `Dự phòng tăng cùng phí => tăng trưởng hợp đồng, chưa kết luận xấu`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, premium_value, premium_yoy_pct, quality_metric_name, quality_metric_value, total_assets, equity, solvency_ratio, status_label.
**Logic điều kiện / cảnh báo**  
Nếu `combined_ratio > 100%` và `premium_yoy > 15%` thì cảnh báo: `Tăng trưởng phí có thể không lành mạnh vì nghiệp vụ bảo hiểm đang lỗ`. Nếu thiếu extension solvency thì dùng `equity_to_assets` làm proxy và ghi rõ `Proxy` trong tooltip.

### Chart 1.2 — Cơ cấu bảng cân đối bảo hiểm

**Insight cần trả lời**  
Trả lời: tài sản của DNBH được tài trợ bởi dự phòng nghiệp vụ, nợ khác hay vốn chủ? Đây là chart giải thích cho mức độ đòn bẩy nghĩa vụ bảo hiểm.

**Cách hiển thị**  
Stacked bar 100% hoặc side-by-side stacked bar. Bên trái là tài sản: Cash, Investments, Other Assets. Bên phải là nguồn vốn: Technical Provisions, Other Liabilities, Equity. Nếu không có đầy đủ cấu phần tài sản, dùng waterfall từ Total Assets trừ Invested Assets proxy.

**Mapping dữ liệu để lên chart**
- `total_assets` — Tổng tài sản: `WHERE ind_name IN ('TỔNG CỘNG TÀI SẢN', 'TỔNG CỘNG TÀI SẢN (đồng)', 'Tổng cộng tài sản')`
- `cash_equivalents` — Tiền và tương đương tiền: `WHERE ind_name IN ('Tiền và các khoản tương đương tiền', 'Tiền và tương đương tiền', 'Tiền và tương đương tiền (đồng)')`
- `short_term_investments` — Đầu tư tài chính ngắn hạn: `WHERE ind_name IN ('Giá trị thuần đầu tư ngắn hạn (đồng)', 'Đầu tư tài chính ngắn hạn')`
- `long_term_investments` — Đầu tư tài chính dài hạn: `WHERE ind_name IN ('Giá trị ròng tài sản đầu tư', 'Đầu tư dài hạn (đồng)', 'Đầu tư tài chính dài hạn')`
- `investment_securities` — Chứng khoán đầu tư: `WHERE ind_name IN ('Available-for Sales Securities', 'Chứng khoán đầu tư', 'Chứng khoán đầu tư giữ đến ngày đáo hạn', 'Chứng khoán đầu tư sẵn sàng để bán', 'Held-to-Maturity Securities', 'Investment Securities')`
- `technical_provisions` — Dự phòng nghiệp vụ / kỹ thuật: `WHERE ind_name IN ('Dự phòng bảo đảm cân đối', 'Dự phòng bồi thường', 'Dự phòng dao động lớn', 'Dự phòng nghiệp vụ', 'Dự phòng phí', 'Dự phòng toán học')`
- `liabilities` — Nợ phải trả: `WHERE ind_name IN ('NỢ PHẢI TRẢ', 'NỢ PHẢI TRẢ (đồng)', 'Nợ phải trả')`
- `equity` — Vốn chủ sở hữu: `WHERE ind_name IN ('VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU (đồng)', 'Vốn chủ sở hữu')`

**Công thức / logic tính**  
`invested_assets_proxy = short_term_investments + long_term_investments + investment_securities`. `other_assets = total_assets - cash - invested_assets_proxy`. `other_liabilities = liabilities - technical_provisions` nếu liabilities bao gồm technical provisions; nếu không rõ, không trừ tự động và gắn nhãn dữ liệu cần kiểm tra.

**Tooltip bắt buộc**  
Tooltip từng stack: Giá trị, % tổng tài sản hoặc % nguồn vốn, QoQ/YoY. Với dự phòng: giải thích `nghĩa vụ bảo hiểm; tăng không mặc định là xấu`. Với equity: `bộ đệm chịu lỗ`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, component_group, component_name, value, pct_of_total_assets_or_sources, qoq_pct, yoy_pct, data_quality_flag.
**Logic điều kiện / cảnh báo**  
Cảnh báo nếu `technical_provision_to_assets` tăng mạnh nhưng `premium_growth` giảm: có thể do claims reserve/assumption thay đổi, cần kiểm tra thuyết minh.

### Chart 1.3 — Invested Assets vs Technical Provisions Trend

**Insight cần trả lời**  
Trả lời: tài sản sinh lời có đủ để hỗ trợ nghĩa vụ bảo hiểm không? Khoảng cách giữa tài sản đầu tư và dự phòng kỹ thuật là tín hiệu ALM cấp cao.

**Cách hiển thị**  
Area/line combo 8–12 quý. Line 1 = Invested Assets Proxy. Line 2 = Technical Provisions. Vùng chênh lệch = Investment Coverage Gap. Đây là chart giải thích phía sau chart matrix.

**Mapping dữ liệu để lên chart**
- `short_term_investments` — Đầu tư tài chính ngắn hạn: `WHERE ind_name IN ('Giá trị thuần đầu tư ngắn hạn (đồng)', 'Đầu tư tài chính ngắn hạn')`
- `long_term_investments` — Đầu tư tài chính dài hạn: `WHERE ind_name IN ('Giá trị ròng tài sản đầu tư', 'Đầu tư dài hạn (đồng)', 'Đầu tư tài chính dài hạn')`
- `investment_securities` — Chứng khoán đầu tư: `WHERE ind_name IN ('Available-for Sales Securities', 'Chứng khoán đầu tư', 'Chứng khoán đầu tư giữ đến ngày đáo hạn', 'Chứng khoán đầu tư sẵn sàng để bán', 'Held-to-Maturity Securities', 'Investment Securities')`
- `technical_provisions` — Dự phòng nghiệp vụ / kỹ thuật: `WHERE ind_name IN ('Dự phòng bảo đảm cân đối', 'Dự phòng bồi thường', 'Dự phòng dao động lớn', 'Dự phòng nghiệp vụ', 'Dự phòng phí', 'Dự phòng toán học')`

**Công thức / logic tính**  
`invested_assets_proxy = short_term_investments + long_term_investments + investment_securities`. `coverage_gap = invested_assets_proxy - technical_provisions`. `coverage_ratio = invested_assets_proxy / technical_provisions`.

**Tooltip bắt buộc**  
Tooltip: Kỳ, Invested Assets, Technical Provisions, Gap, Coverage Ratio, diễn giải: `Gap âm nghĩa là tài sản đầu tư proxy thấp hơn nghĩa vụ kỹ thuật; cần xem thêm cash/other invested assets trước khi kết luận`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, invested_assets_proxy, technical_provisions, coverage_gap, coverage_ratio, yoy_invested_assets, yoy_technical_provisions.
**Logic điều kiện / cảnh báo**  
Không dùng chart này như kết luận solvency; đây chỉ là proxy ALM nếu thiếu bảng duration và solvency.

### Bảng số liệu bắt buộc Tab 1 — Financial Position Table

| Cột | Mô tả |
|---|---|
| `period` | Kỳ báo cáo |
| `total_assets` | Tổng tài sản |
| `equity` | Vốn chủ sở hữu |
| `technical_provisions` | Tổng dự phòng nghiệp vụ/kỹ thuật |
| `invested_assets_proxy` | Tài sản đầu tư proxy |
| `cash_equivalents` | Tiền và tương đương tiền |
| `premium_metric` | GWP hoặc doanh thu thuần bảo hiểm |
| `premium_yoy_pct` | Tăng trưởng phí YoY |
| `combined_ratio_or_reserve_growth` | Chất lượng khai thác theo LOB |
| `data_quality_flag` | `OK`, `PROXY`, `EXTENSION_REQUIRED`, `MISSING_IND_NAME` |

---

## TAB 2 — CAPITAL & SOLVENCY

**Mục tiêu BA:** đánh giá doanh nghiệp có đủ vốn theo khung quản lý đã chọn hay không, và buffer vốn còn bao nhiêu trước khi chạm ngưỡng cảnh báo.

### Thứ tự hiển thị trong tab

1. KPI row: Solvency Ratio, Capital Headroom, Equity/Assets, NWP/Capital hoặc Premium/Equity.
2. **Chart insight lớn:** Solvency Gauge + Headroom Bridge.
3. Chart giải thích 1: Capital requirement decomposition.
4. Chart giải thích 2: Premium leverage vs equity buffer.
5. Bảng số liệu vốn và đối soát BCTC.


### Chart 2.1 — Solvency Gauge & Capital Headroom Bridge (chart lớn đầu tab)

**Insight cần trả lời**  
Trả lời: công ty đang an toàn vốn, cần theo dõi hay có nguy cơ vi phạm? Đây là chart quyết định trạng thái rủi ro toàn dashboard.

**Cách hiển thị**  
Nửa trái: gauge nửa vòng hiển thị `solvency_ratio`. Nửa phải: waterfall bridge từ Available Capital đến Required Capital và Headroom. Mốc màu: đỏ <100%, cam 100–150%, xanh >=150% hoặc theo cấu hình regulatory threshold.

**Mapping dữ liệu để lên chart**
- `equity` — Vốn chủ sở hữu: `WHERE ind_name IN ('VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU (đồng)', 'Vốn chủ sở hữu')`
- `available_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `required_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `solvency_ratio`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `capital_headroom`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
`solvency_ratio = available_capital / required_capital`. `capital_headroom = available_capital - required_capital`. Nếu thiếu extension, hiển thị proxy `equity_to_assets = equity / total_assets` và ghi rõ không thay thế solvency pháp lý.

**Tooltip bắt buộc**  
Tooltip: Framework, Available Capital label theo framework, Required Capital label theo framework, Solvency Ratio, Headroom, Threshold, trạng thái. Với `LOCAL_VN`, label là `Biên KNTT thực tế / Biên KNTT tối thiểu`; với `SII`, label là `Eligible Own Funds / SCR`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, capital_framework, available_capital, required_capital, solvency_ratio, capital_headroom, threshold_min, threshold_watch, status_label.
**Logic điều kiện / cảnh báo**  
Không được tính solvency từ BCTC nếu thiếu bảng `insurance_solvency_fact`. Chỉ được dùng proxy và phải hiển thị badge `Proxy, not regulatory solvency`.

### Chart 2.2 — Premium Leverage vs Equity Buffer

**Insight cần trả lời**  
Trả lời: công ty đang viết phí quá nhanh so với vốn chủ sở hữu hay không? Với bảo hiểm, tăng trưởng phí vượt năng lực vốn có thể dẫn tới thiếu vốn khi claims tăng.

**Cách hiển thị**  
Line + bar combo. Bar = GWP hoặc Net Insurance Revenue. Line = Premium/Equity. Có vùng ngưỡng cảnh báo do người dùng cấu hình theo LOB.

**Mapping dữ liệu để lên chart**
- `gross_written_premium` — Phí bảo hiểm gốc: `WHERE ind_name IN ('Thu phí bảo hiểm gốc')`
- `net_insurance_revenue` — Doanh thu thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Doanh thu thuần hoạt động kinh doanh bảo hiểm')`
- `equity` — Vốn chủ sở hữu: `WHERE ind_name IN ('VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU (đồng)', 'Vốn chủ sở hữu')`

**Công thức / logic tính**  
`premium_leverage = gross_written_premium_ttm / avg_equity`. Nếu không có TTM, dùng annualized quarterly premium nhưng tooltip phải ghi `annualized`.

**Tooltip bắt buộc**  
Tooltip: Kỳ, Premium TTM, Avg Equity, Premium/Equity, YoY premium, diễn giải: `Leverage tăng nhanh hơn equity => cần kiểm tra capital plan và reinsurance`. 

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, premium_ttm, avg_equity, premium_leverage, premium_yoy_pct, equity_yoy_pct, status_label.
**Logic điều kiện / cảnh báo**  
Nếu `premium_leverage` tăng >25% YoY trong khi solvency ratio giảm, tạo alert: `Tăng trưởng khai thác đang tiêu thụ vốn`.

### Chart 2.3 — Capital Requirement Decomposition

**Insight cần trả lời**  
Trả lời: rủi ro nào đang tiêu thụ vốn nhiều nhất: underwriting, market, credit, operational hay catastrophe?

**Cách hiển thị**  
Stacked bar hoặc treemap theo risk module. Chỉ hiển thị khi có bảng solvency extension. Đây là chart giải thích sau gauge.

**Mapping dữ liệu để lên chart**
- `underwriting_risk_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `market_risk_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `credit_risk_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `operational_risk_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `catastrophe_risk_capital`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
`required_capital = sum(risk_module_capital) - diversification_benefit + adjustment`. Nếu framework có công thức khác, follow extension source.

**Tooltip bắt buộc**  
Tooltip: Risk module, capital amount, % of required capital, QoQ change, driver text. Ví dụ: `Market risk tăng do tỷ trọng TPDN/cổ phiếu tăng`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, risk_module, capital_amount, pct_required_capital, qoq_change, yoy_change, driver_note.
**Logic điều kiện / cảnh báo**  
Nếu không có extension, không render chart; thay bằng empty state: `Cần dữ liệu solvency/risk module`.

### Bảng số liệu bắt buộc Tab 2 — Capital & Solvency Table

| Cột | Mô tả |
|---|---|
| `period` | Kỳ báo cáo |
| `capital_framework` | LOCAL_VN/SII/ICS |
| `available_capital` | Vốn khả dụng theo framework |
| `required_capital` | Vốn yêu cầu theo framework |
| `solvency_ratio` | Tỷ lệ an toàn vốn |
| `capital_headroom` | Dư địa vốn |
| `equity` | Vốn chủ sở hữu từ BCTC |
| `equity_to_assets` | VCSH/Tổng tài sản |
| `premium_leverage` | Premium/Equity |
| `status_label` | Safe/Watch/Breach/Proxy |

---

## TAB 3 — UNDERWRITING PERFORMANCE

**Mục tiêu BA:** bóc tách chất lượng kinh doanh bảo hiểm: phí thu được có đủ bù bồi thường và chi phí khai thác không? Với phi nhân thọ, đây là tab quan trọng nhất.

### Thứ tự hiển thị trong tab

1. KPI row: NEP, Loss Ratio, Expense Ratio, Combined Ratio, Underwriting Result.
2. **Chart insight lớn:** Combined Ratio Decomposition Trend.
3. Chart giải thích 1: Premium-to-Claims Divergence.
4. Chart giải thích 2: Underwriting Result Waterfall.
5. Bảng P&L underwriting.


### Chart 3.1 — Combined Ratio Decomposition Trend (chart lớn đầu tab)

**Insight cần trả lời**  
Trả lời: nghiệp vụ bảo hiểm đang lãi hay lỗ trước đầu tư, và lỗ/lãi đến từ bồi thường hay chi phí? Đây là chart lớn nhất của tab đối với `NON_LIFE`.

**Cách hiển thị**  
Stacked column theo quý: Loss Ratio + Expense Ratio. Overlay line = Combined Ratio. Vẽ đường ngang 100%. Nếu `combined_ratio < 100%`, phần dưới ngưỡng là vùng xanh; nếu >100%, vùng vượt ngưỡng là đỏ/cam.

**Mapping dữ liệu để lên chart**
- `net_insurance_revenue` — Doanh thu thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Doanh thu thuần hoạt động kinh doanh bảo hiểm')`
- `net_claims_retained` — Bồi thường thuộc phần trách nhiệm giữ lại: `WHERE ind_name IN ('Bồi thường thuộc phần trách nhiệm giữ lại')`
- `gross_claims_paid` — Chi/trả bồi thường bảo hiểm: `WHERE ind_name IN ('Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm', 'Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm', 'Trả tiền bồi thường bảo hiểm')`
- `reinsurance_recoveries` — Thu bồi thường nhượng tái bảo hiểm: `WHERE ind_name IN ('Thu bồi thường nhượng tái bảo hiểm')`
- `change_claim_reserve` — Tăng/giảm dự phòng bồi thường: `WHERE ind_name IN ('Tăng (giảm) dự phòng bồi thường')`
- `commission_expense` — Chi hoa hồng: `WHERE ind_name IN ('Chi hoa hồng')`
- `insurance_other_expense` — Chi khác hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Chi khác hoạt động kinh doanh bảo hiểm', 'Chi khác hoạt động kinh doanh bảo hiểm gốc')`
- `direct_insurance_expense` — Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm')`

**Công thức / logic tính**  
`loss_ratio = net_claims_retained / net_insurance_revenue`. Nếu không có `net_claims_retained`, dùng `gross_claims_paid - reinsurance_recoveries + change_claim_reserve` như proxy. `expense_ratio = direct_insurance_expense / net_insurance_revenue`; nếu không có direct expense thì dùng `commission_expense + insurance_other_expense - commission_income_ceded`.

**Tooltip bắt buộc**  
Tooltip: Kỳ, NEP, Net Claims, Loss Ratio, Expense Ratio, Combined Ratio, trạng thái `Underwriting profit/loss`. Giải thích: `CR >100% nghĩa là nghiệp vụ bảo hiểm lỗ trước lợi nhuận đầu tư`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, nep, net_claims, loss_ratio, acquisition_expense, other_expense, expense_ratio, combined_ratio, underwriting_status, data_quality_flag.
**Logic điều kiện / cảnh báo**  
Chỉ render cho `lob_type IN ('NON_LIFE','REINSURANCE','MIXED')`. Nếu `LIFE`, ẩn chart và hiển thị replacement: `Reserve Growth & Surrender/Persistency` nếu có extension.

### Chart 3.2 — Premium-to-Claims Divergence

**Insight cần trả lời**  
Trả lời: phí tăng có bị bồi thường chạy nhanh hơn không? Đây là chart cảnh báo underpricing và deterioration trong chất lượng rủi ro.

**Cách hiển thị**  
Dual line chart indexed về 100 tại kỳ đầu. Line 1 = NEP/GWP index. Line 2 = Net Claims index. Có shading đỏ khi claims index vượt premium index liên tục >=2 kỳ.

**Mapping dữ liệu để lên chart**
- `gross_written_premium` — Phí bảo hiểm gốc: `WHERE ind_name IN ('Thu phí bảo hiểm gốc')`
- `net_insurance_revenue` — Doanh thu thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Doanh thu thuần hoạt động kinh doanh bảo hiểm')`
- `net_claims_retained` — Bồi thường thuộc phần trách nhiệm giữ lại: `WHERE ind_name IN ('Bồi thường thuộc phần trách nhiệm giữ lại')`
- `gross_claims_paid` — Chi/trả bồi thường bảo hiểm: `WHERE ind_name IN ('Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm', 'Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm', 'Trả tiền bồi thường bảo hiểm')`
- `reinsurance_recoveries` — Thu bồi thường nhượng tái bảo hiểm: `WHERE ind_name IN ('Thu bồi thường nhượng tái bảo hiểm')`

**Công thức / logic tính**  
`premium_index = premium_t / premium_base * 100`. `claims_index = claims_t / claims_base * 100`. Ưu tiên NEP; nếu thiếu NEP dùng GWP và ghi rõ trong tooltip.

**Tooltip bắt buộc**  
Tooltip: Kỳ, Premium Index, Claims Index, Spread, Premium YoY, Claims YoY, diễn giải: `Claims tăng nhanh hơn phí => áp lực loss ratio kỳ tới`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, premium_value, claims_value, premium_index, claims_index, index_spread, premium_yoy_pct, claims_yoy_pct.
**Logic điều kiện / cảnh báo**  
Nếu `claims_yoy - premium_yoy > 10pp`, hiển thị badge `Claims acceleration`.

### Chart 3.3 — Underwriting Result Waterfall

**Insight cần trả lời**  
Trả lời: từ doanh thu phí thuần đi qua các lớp bồi thường, hoa hồng, chi khác thì còn lại bao nhiêu lợi nhuận nghiệp vụ?

**Cách hiển thị**  
Waterfall: NEP → (-) Net Claims → (-) Commission Expense → (+) Reinsurance Commission Income → (-) Other Insurance Expense → Underwriting Result. Đây là chart giải thích chi tiết cho CR.

**Mapping dữ liệu để lên chart**
- `net_insurance_revenue` — Doanh thu thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Doanh thu thuần hoạt động kinh doanh bảo hiểm')`
- `net_claims_retained` — Bồi thường thuộc phần trách nhiệm giữ lại: `WHERE ind_name IN ('Bồi thường thuộc phần trách nhiệm giữ lại')`
- `gross_claims_paid` — Chi/trả bồi thường bảo hiểm: `WHERE ind_name IN ('Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm', 'Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm', 'Trả tiền bồi thường bảo hiểm')`
- `reinsurance_recoveries` — Thu bồi thường nhượng tái bảo hiểm: `WHERE ind_name IN ('Thu bồi thường nhượng tái bảo hiểm')`
- `commission_expense` — Chi hoa hồng: `WHERE ind_name IN ('Chi hoa hồng')`
- `commission_income_ceded` — Thu hoa hồng nhượng tái bảo hiểm: `WHERE ind_name IN ('Thu hoa hồng nhượng tái bảo hiểm')`
- `insurance_other_expense` — Chi khác hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Chi khác hoạt động kinh doanh bảo hiểm', 'Chi khác hoạt động kinh doanh bảo hiểm gốc')`
- `insurance_net_profit` — Lợi nhuận thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Lợi nhuận thuần hoạt động kinh doanh bảo hiểm')`

**Công thức / logic tính**  
Ưu tiên dùng `insurance_net_profit` để đối soát kết quả cuối. Nếu waterfall tự tính lệch quá tolerance so với dòng BCTC, hiển thị reconciliation row `Other/Mapping difference`.

**Tooltip bắt buộc**  
Tooltip từng bước: Giá trị, % NEP, đóng góp vào underwriting margin, dấu +/- chuẩn hóa. Với chi phí, tooltip hiển thị dấu âm trong waterfall dù value gốc có thể dương.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, component_order, component_name, raw_value, signed_value, pct_of_nep, cumulative_value, mapping_source.
**Logic điều kiện / cảnh báo**  
Cần normalize dấu: các dòng chi phí lấy absolute value và đưa vào waterfall âm nếu dữ liệu gốc lưu dương.

### Bảng số liệu bắt buộc Tab 3 — Underwriting P&L Table

| Cột | Mô tả |
|---|---|
| `period` | Kỳ báo cáo |
| `gross_written_premium` | Thu phí bảo hiểm gốc |
| `inward_reinsurance_premium` | Thu phí nhận tái |
| `ceded_reinsurance_premium` | Phí nhượng tái |
| `net_insurance_revenue` | Doanh thu thuần bảo hiểm/NEP |
| `net_claims_retained` | Bồi thường giữ lại |
| `loss_ratio` | Net claims / NEP |
| `commission_expense` | Chi hoa hồng |
| `commission_income_ceded` | Thu hoa hồng nhượng tái |
| `expense_ratio` | Chi phí khai thác / NEP |
| `combined_ratio` | Loss ratio + expense ratio |
| `insurance_net_profit` | Lợi nhuận thuần HĐKD bảo hiểm |
| `data_quality_flag` | OK/PROXY/MISSING |

---

## TAB 4 — INVESTMENT, ALM & PROFIT BRIDGE

**Mục tiêu BA:** giải thích lợi nhuận của DNBH đến từ underwriting hay investment; đồng thời theo dõi rủi ro tài sản đầu tư và tương quan với nghĩa vụ bảo hiểm.

### Thứ tự hiển thị trong tab

1. KPI row: Investment Income, Investment Yield, Underwriting Result, PBT, ROE.
2. **Chart insight lớn:** Profit Engine Split.
3. Chart giải thích 1: Asset Allocation & Yield/Risk.
4. Chart giải thích 2: ALM Duration Gap nếu có extension.
5. Bảng lợi nhuận và đầu tư.


### Chart 4.1 — Profit Engine Split: Underwriting vs Investment (chart lớn đầu tab)

**Insight cần trả lời**  
Trả lời: lợi nhuận trước thuế đến từ hoạt động bảo hiểm hay từ danh mục đầu tư? Nếu underwriting âm nhưng PBT dương, công ty đang phụ thuộc vào đầu tư để bù lỗ nghiệp vụ.

**Cách hiển thị**  
Stacked bar theo quý: Underwriting Result, Investment Result, Other Result. Overlay line = PBT. Màu riêng cho underwriting âm/dương. Chart đặt đầu tab, kích thước lớn.

**Mapping dữ liệu để lên chart**
- `insurance_net_profit` — Lợi nhuận thuần hoạt động kinh doanh bảo hiểm: `WHERE ind_name IN ('Lợi nhuận thuần hoạt động kinh doanh bảo hiểm')`
- `investment_income` — Thu nhập/Doanh thu hoạt động tài chính và đầu tư: `WHERE ind_name IN ('Doanh thu hoạt động tài chính', 'Doanh thu tài chính', 'Lãi tiền gửi và cổ tức', 'Lãi, lỗ từ hoạt động đầu tư', 'Lãi/Lỗ từ hoạt động đầu tư', 'Lãi/lỗ từ hoạt động đầu tư', 'Lợi nhuận hoạt động tài chính', 'Thu lãi và cổ tức', 'Thu nhập lãi', 'Thu nhập tài chính')`
- `investment_expense` — Chi phí hoạt động tài chính/đầu tư: `WHERE ind_name IN ('Chi hoạt động tài chính', 'Chi phí tài chính', 'Chi phí đầu tư khác', 'Dự phòng giảm giá chứng khoán đầu tư', 'Dự phòng giảm giá đầu tư dài hạn', 'Less: Provision for diminuation in value of long term investments', 'Less: Provision for diminution in value of investment securities')`
- `pbt` — Lợi nhuận trước thuế: `WHERE ind_name IN ('LN trước thuế', 'Lãi/Lỗ ròng trước thuế', 'Lợi nhuận trước thuế', 'Lợi nhuận/Lỗ thuần trước thuế')`
- `pat` — Lợi nhuận sau thuế: `WHERE ind_name IN ('LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN', 'Lợi nhuận sau thuế thu nhập DN', 'Lợi nhuận sau thuế thu nhập doanh nghiệp')`

**Công thức / logic tính**  
`investment_result = investment_income - investment_expense` nếu không có dòng lợi nhuận đầu tư trực tiếp. `other_result = pbt - underwriting_result - investment_result` để reconciliation. Nếu dữ liệu đầu tư là doanh thu tài chính đã bao gồm lãi/lỗ thuần thì không cộng thêm lợi nhuận tài chính để tránh double-count.

**Tooltip bắt buộc**  
Tooltip: Kỳ, Underwriting Result, Investment Result, Other/Reconciliation, PBT, PAT, contribution %. Diễn giải tự động: `PBT dương chủ yếu nhờ đầu tư` nếu Investment Result/PBT > 70%.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, underwriting_result, investment_income, investment_expense, investment_result, other_result, pbt, pat, investment_contribution_pct, underwriting_contribution_pct.
**Logic điều kiện / cảnh báo**  
Nếu underwriting_result < 0 và investment_result > abs(underwriting_result), alert: `Lợi nhuận phụ thuộc vào đầu tư để bù lỗ nghiệp vụ`.

### Chart 4.2 — Asset Allocation & Risk Bucket

**Insight cần trả lời**  
Trả lời: tài sản đầu tư tập trung vào tiền gửi, TPCP, TPDN, cổ phiếu hay bất động sản? Rủi ro thị trường/tín dụng đến từ đâu?

**Cách hiển thị**  
Horizontal stacked bar hoặc treemap theo asset class. Nếu có extension, tách asset_class: Cash/Deposits, Government bonds, Corporate bonds, Equity, Real estate, Unit-linked assets, Others. Nếu không có extension, chỉ hiển thị proxy từ BCTC: Cash, Short-term Investments, Long-term Investments, Investment Securities.

**Mapping dữ liệu để lên chart**
- `cash_equivalents` — Tiền và tương đương tiền: `WHERE ind_name IN ('Tiền và các khoản tương đương tiền', 'Tiền và tương đương tiền', 'Tiền và tương đương tiền (đồng)')`
- `short_term_investments` — Đầu tư tài chính ngắn hạn: `WHERE ind_name IN ('Giá trị thuần đầu tư ngắn hạn (đồng)', 'Đầu tư tài chính ngắn hạn')`
- `long_term_investments` — Đầu tư tài chính dài hạn: `WHERE ind_name IN ('Giá trị ròng tài sản đầu tư', 'Đầu tư dài hạn (đồng)', 'Đầu tư tài chính dài hạn')`
- `investment_securities` — Chứng khoán đầu tư: `WHERE ind_name IN ('Available-for Sales Securities', 'Chứng khoán đầu tư', 'Chứng khoán đầu tư giữ đến ngày đáo hạn', 'Chứng khoán đầu tư sẵn sàng để bán', 'Held-to-Maturity Securities', 'Investment Securities')`
- `asset_class_allocation`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `credit_rating_bucket`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
BCTC proxy: `cash + short_term_investments + long_term_investments + investment_securities`. Extension preferred: dùng `insurance_investment_allocation_fact` để có asset_class/rating/duration.

**Tooltip bắt buộc**  
Tooltip: Asset class, Carrying value, % invested assets, yield, duration, rating bucket, unrealized gain/loss. Nếu dữ liệu là proxy, tooltip ghi `BCTC proxy, chưa tách TPCP/TPDN/cổ phiếu`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, asset_class, carrying_value, pct_invested_assets, yield_to_maturity, duration_years, credit_rating_bucket, unrealized_gain_loss, source_type.
**Logic điều kiện / cảnh báo**  
Nếu tỷ trọng Sub-IG/Unrated > ngưỡng cấu hình, cảnh báo credit risk. Không cảnh báo nếu thiếu rating extension.

### Chart 4.3 — ALM Duration Gap

**Insight cần trả lời**  
Trả lời: kỳ hạn tài sản đầu tư có phù hợp với kỳ hạn nghĩa vụ bảo hiểm không? Đây là rủi ro sống còn của Life và annuity business.

**Cách hiển thị**  
Line/bar combo. Bar = technical provisions by maturity bucket. Line = invested assets by duration bucket. Hoặc hiển thị single KPI `duration_gap = asset_duration - liability_duration` nếu chỉ có tổng.

**Mapping dữ liệu để lên chart**
- `technical_provisions` — Dự phòng nghiệp vụ / kỹ thuật: `WHERE ind_name IN ('Dự phòng bảo đảm cân đối', 'Dự phòng bồi thường', 'Dự phòng dao động lớn', 'Dự phòng nghiệp vụ', 'Dự phòng phí', 'Dự phòng toán học')`
- `asset_duration_years`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `liability_duration_years`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `maturity_bucket_assets`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `maturity_bucket_liabilities`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
`duration_gap = weighted_avg_asset_duration - weighted_avg_liability_duration`. Với Life, gap âm lớn nghĩa là tài sản đáo hạn sớm hơn nghĩa vụ; có rủi ro tái đầu tư. Gap dương lớn có rủi ro lãi suất/mark-to-market.

**Tooltip bắt buộc**  
Tooltip: Bucket, assets, liabilities, gap, duration, diễn giải nghiệp vụ theo Life/Non-life. Với Non-life, focus nhiều hơn vào liquidity bucket ngắn hạn.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, maturity_bucket, asset_value, liability_value, gap_value, asset_duration, liability_duration, duration_gap.
**Logic điều kiện / cảnh báo**  
Chart này `EXTENSION_REQUIRED`; nếu chỉ có BCTC không có maturity/duration, hiển thị empty state thay vì suy diễn.

### Bảng số liệu bắt buộc Tab 4 — Profit & Investment Table

| Cột | Mô tả |
|---|---|
| `period` | Kỳ báo cáo |
| `insurance_net_profit` | Lợi nhuận thuần hoạt động bảo hiểm |
| `investment_income` | Thu nhập đầu tư/tài chính |
| `investment_expense` | Chi phí tài chính/đầu tư |
| `investment_result` | Lợi nhuận đầu tư tính toán |
| `other_result` | Phần reconciliation còn lại |
| `pbt` | Lợi nhuận trước thuế |
| `pat` | Lợi nhuận sau thuế |
| `avg_invested_assets` | Tài sản đầu tư bình quân |
| `investment_yield` | Lợi suất đầu tư |
| `asset_allocation_source` | BCTC_PROXY/EXTENSION |

---

## TAB 5 — REINSURANCE, LIQUIDITY & STRESS

**Mục tiêu BA:** đánh giá doanh nghiệp có sống sót qua kịch bản bồi thường lớn hay không, và có đang phụ thuộc quá mức vào nhà tái bảo hiểm không.

### Thứ tự hiển thị trong tab

1. KPI row: Liquid Assets, Survival Horizon, Reinsurance Cession Ratio, Recoverable Overdue Ratio.
2. **Chart insight lớn:** Catastrophe Liquidity Breach Simulation.
3. Chart giải thích 1: Reinsurance Dependency & Recoverability.
4. Chart giải thích 2: Operating cash flow vs claims paid.
5. Bảng stress/liquidity/reinsurance.


### Chart 5.1 — Catastrophe Liquidity Breach Simulation (chart lớn đầu tab)

**Insight cần trả lời**  
Trả lời: nếu xảy ra sự kiện bồi thường lớn, công ty cạn thanh khoản vào ngày nào? Đây là chart điều hành quan trọng nhất của tab stress.

**Cách hiển thị**  
Area + line chart theo ngày 1–90. Vùng ngang/area = Liquid Assets Available. Line = Cumulative Claim Outflows sau khi trừ recovery timing. Điểm giao nhau là `Breach Day`. Nếu không breach trong 90 ngày, hiển thị badge `Survives 90 days`.

**Mapping dữ liệu để lên chart**
- `cash_equivalents` — Tiền và tương đương tiền: `WHERE ind_name IN ('Tiền và các khoản tương đương tiền', 'Tiền và tương đương tiền', 'Tiền và tương đương tiền (đồng)')`
- `short_term_investments` — Đầu tư tài chính ngắn hạn: `WHERE ind_name IN ('Giá trị thuần đầu tư ngắn hạn (đồng)', 'Đầu tư tài chính ngắn hạn')`
- `liquid_assets_available`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `cumulative_claim_outflow`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `reinsurance_recovery_inflow`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `net_liquidity_position`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
`net_liquidity_position_day = liquid_assets_available + cumulative_reinsurance_recovery_inflow - cumulative_claim_outflow`. `breach_day = min(day_no where net_liquidity_position < 0)`. Không được mô phỏng từ BCTC nếu thiếu stress assumptions.

**Tooltip bắt buộc**  
Tooltip: Scenario, Day, Liquid Assets, Cumulative Outflow, Reinsurance Inflow, Net Position, Breach status. Diễn giải: `Breach Day là ngày thanh khoản ròng chuyển âm trong kịch bản đã chọn`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: scenario_name, day_no, liquid_assets_available, cumulative_claim_outflow, reinsurance_recovery_inflow, net_liquidity_position, breach_flag.
**Logic điều kiện / cảnh báo**  
Chart `EXTENSION_REQUIRED`; BCTC chỉ cung cấp proxy thanh khoản, không cung cấp timing của claims và reinsurance recovery.

### Chart 5.2 — Reinsurance Dependency & Recoverability

**Insight cần trả lời**  
Trả lời: công ty chuyển bao nhiêu rủi ro cho tái bảo hiểm, và khoản phải thu từ nhà tái có thu hồi được không? Phụ thuộc tái bảo hiểm cao không xấu nếu reinsurer chất lượng tốt và recoverable không quá hạn.

**Cách hiển thị**  
Combo chart. Bar = Ceded Premium hoặc Reinsurance Recoveries. Line = Cession Ratio/Recovery Ratio. Nếu có extension, thêm heatmap theo reinsurer rating và overdue bucket.

**Mapping dữ liệu để lên chart**
- `ceded_reinsurance_premium` — Phí nhượng tái bảo hiểm: `WHERE ind_name IN ('Phí nhượng tái bảo hiểm')`
- `gross_written_premium` — Phí bảo hiểm gốc: `WHERE ind_name IN ('Thu phí bảo hiểm gốc')`
- `reinsurance_recoveries` — Thu bồi thường nhượng tái bảo hiểm: `WHERE ind_name IN ('Thu bồi thường nhượng tái bảo hiểm')`
- `gross_claims_paid` — Chi/trả bồi thường bảo hiểm: `WHERE ind_name IN ('Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm', 'Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm', 'Trả tiền bồi thường bảo hiểm')`
- `commission_income_ceded` — Thu hoa hồng nhượng tái bảo hiểm: `WHERE ind_name IN ('Thu hoa hồng nhượng tái bảo hiểm')`
- `recoverable_balance`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `overdue_recoverable`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.
- `reinsurer_rating`: `EXTENSION_REQUIRED` — không truy vấn từ bảng BCTC `ind_name`; cần bảng nghiệp vụ/thuyết minh riêng.

**Công thức / logic tính**  
`cession_ratio = ceded_reinsurance_premium / gross_written_premium`. `recovery_ratio = reinsurance_recoveries / gross_claims_paid`. `overdue_recoverable_ratio = overdue_recoverable / recoverable_balance` từ extension.

**Tooltip bắt buộc**  
Tooltip: Kỳ, Ceded Premium, Cession Ratio, Recoveries, Recovery Ratio, Recoverable Balance, Overdue Ratio, Top Reinsurer/Rating nếu có. Diễn giải: `Cession cao + overdue cao => rủi ro đối tác tái`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, ceded_premium, gross_written_premium, cession_ratio, recoveries, gross_claims_paid, recovery_ratio, recoverable_balance, overdue_recoverable_ratio, reinsurer_concentration_pct.
**Logic điều kiện / cảnh báo**  
Nếu `cession_ratio > 50%` và `overdue_recoverable_ratio > 10%`, tạo alert: `Phụ thuộc tái bảo hiểm cao và chất lượng thu hồi yếu`.

### Chart 5.3 — Operating Cash Flow vs Claims Paid

**Insight cần trả lời**  
Trả lời: dòng tiền hoạt động có đủ bù dòng tiền bồi thường không, hay công ty phải bán tài sản đầu tư/huy động vốn?

**Cách hiển thị**  
Bar chart theo quý: CFO, claims paid, net cash after claims. Overlay line = cash balance. Đây là chart giải thích từ dữ liệu BCTC/LCTT.

**Mapping dữ liệu để lên chart**
- `cfo` — Lưu chuyển tiền thuần từ HĐKD: `WHERE ind_name IN ('Lưu chuyển tiền thuần từ HĐKD', 'Lưu chuyển tiền thuần từ hoạt động kinh doanh')`
- `cash_equivalents` — Tiền và tương đương tiền: `WHERE ind_name IN ('Tiền và các khoản tương đương tiền', 'Tiền và tương đương tiền', 'Tiền và tương đương tiền (đồng)')`
- `gross_claims_paid` — Chi/trả bồi thường bảo hiểm: `WHERE ind_name IN ('Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm', 'Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm', 'Trả tiền bồi thường bảo hiểm')`

**Công thức / logic tính**  
`net_cash_after_claims_proxy = cfo - gross_claims_paid` nếu claims paid là dòng chi; cần chuẩn hóa dấu. `cash_runway_proxy = cash_equivalents / avg_monthly_claims_paid` nếu có dữ liệu tháng hoặc annualized quarter.

**Tooltip bắt buộc**  
Tooltip: Kỳ, CFO, Claims Paid, Net Cash After Claims, Cash Balance, QoQ/YoY. Diễn giải: `CFO âm trong khi claims paid tăng => áp lực thanh khoản vận hành`.

**Bảng số liệu đi kèm**  
Cột tối thiểu: period, cfo, claims_paid, net_cash_after_claims_proxy, cash_equivalents, claims_paid_yoy_pct, cfo_yoy_pct, data_quality_flag.
**Logic điều kiện / cảnh báo**  
Dòng `gross_claims_paid` có thể đến từ IS hoặc CF. Ưu tiên dòng LCTT `Trả tiền bồi thường bảo hiểm` nếu có.

### Bảng số liệu bắt buộc Tab 5 — Liquidity & Reinsurance Table

| Cột | Mô tả |
|---|---|
| `period` | Kỳ báo cáo |
| `scenario_name` | Base/Storm/Flood/Earthquake/Pandemic... |
| `liquid_assets_available` | Tài sản lỏng dùng trong stress |
| `cumulative_claim_outflow_30d` | Dòng chi bồi thường lũy kế 30 ngày |
| `reinsurance_recovery_inflow_30d` | Dòng thu hồi tái bảo hiểm 30 ngày |
| `survival_horizon_days` | Ngày sống sót |
| `cession_ratio` | Phí nhượng tái / phí gốc |
| `recovery_ratio` | Thu bồi thường nhượng tái / bồi thường gộp |
| `recoverable_balance` | Phải thu nhà tái |
| `overdue_recoverable_ratio` | Tỷ lệ quá hạn |
| `data_source` | BCTC_PROXY/EXTENSION |

---

## 6. Tooltip system chi tiết

### 6.1 Tooltip KPI card

Mẫu tooltip:

```text
{{metric_label}}
Giá trị: {{formatted_value}} {{unit}}
So với cùng kỳ: {{yoy_pct}} {{good_bad_badge}}
So với quý trước: {{qoq_pct}} {{good_bad_badge}}
Ngưỡng BA: {{threshold_text}}
Diễn giải: {{business_interpretation}}
Nguồn dữ liệu: {{source_type}} | Mapping: {{metric_key}}
```

### 6.2 Tooltip chart

Bắt buộc có 5 lớp thông tin:

1. **Kỳ / Segment / Scenario**: period, LOB, scenario.
2. **Giá trị chính**: value và unit.
3. **So sánh**: QoQ, YoY, contribution %.
4. **Ý nghĩa BA**: một câu diễn giải tự động.
5. **Data lineage**: `BCTC`, `BCTC_PROXY`, `EXTENSION_REQUIRED`, mapping metric_key.

### 6.3 Quy tắc màu

| Nhóm chỉ tiêu | Khi tăng | Khi giảm | Rule |
|---|---|---|---|
| Premium, NEP, PAT, PBT, Equity, Solvency, Headroom | Xanh nếu chất lượng không xấu | Đỏ nếu giảm | Higher is better |
| Loss Ratio, Expense Ratio, Combined Ratio | Đỏ | Xanh | Lower is better |
| Claims Paid, Claims Incurred | Đỏ nếu tăng nhanh hơn premium | Xanh nếu giảm/ổn định | Contextual |
| Technical Provisions | Trung tính | Trung tính | Không mặc định tốt/xấu |
| Ceded Reinsurance Premium | Trung tính | Trung tính | Phụ thuộc khẩu vị rủi ro |
| Overdue Recoverable, Breach Day sớm hơn | Đỏ | Xanh | Lower is better / later breach is better |

---

## 7. SQL template cho vibecoding

### 7.1 Query lấy metric từ `ind_name`

```sql
WITH metric_map AS (
  SELECT 'gross_written_premium' AS metric_key, ind_name
  FROM (VALUES
    ('Thu phí bảo hiểm gốc')
  ) AS v(ind_name)
  UNION ALL
  SELECT 'ceded_reinsurance_premium', ind_name
  FROM (VALUES
    ('Phí nhượng tái bảo hiểm')
  ) AS v(ind_name)
  UNION ALL
  SELECT 'technical_provisions', ind_name
  FROM (VALUES
    ('Dự phòng nghiệp vụ'),
    ('Dự phòng phí'),
    ('Dự phòng toán học'),
    ('Dự phòng bồi thường'),
    ('Dự phòng dao động lớn'),
    ('Dự phòng bảo đảm cân đối')
  ) AS v(ind_name)
)
SELECT
  f.company_id,
  f.period,
  m.metric_key,
  SUM(f.value) AS metric_value
FROM fact_financial_statement f
JOIN metric_map m
  ON f.ind_name = m.ind_name
WHERE f.company_id = :company_id
  AND f.period BETWEEN :period_start AND :period_end
GROUP BY f.company_id, f.period, m.metric_key;
```

### 7.2 Query cho chart Combined Ratio

```sql
WITH base AS (
  SELECT
    period,
    SUM(CASE WHEN ind_name IN {registry['net_insurance_revenue']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS nep,
    SUM(CASE WHEN ind_name IN {registry['net_claims_retained']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS net_claims_direct,
    SUM(CASE WHEN ind_name IN {registry['gross_claims_paid']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS gross_claims_paid,
    SUM(CASE WHEN ind_name IN {registry['reinsurance_recoveries']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS reinsurance_recoveries,
    SUM(CASE WHEN ind_name IN {registry['commission_expense']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS commission_expense,
    SUM(CASE WHEN ind_name IN {registry['commission_income_ceded']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS commission_income_ceded,
    SUM(CASE WHEN ind_name IN {registry['insurance_other_expense']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS other_insurance_expense,
    SUM(CASE WHEN ind_name IN {registry['direct_insurance_expense']['sql_where_ind_name_in']} THEN value ELSE 0 END) AS direct_insurance_expense
  FROM fact_financial_statement
  WHERE company_id = :company_id
    AND period BETWEEN :period_start AND :period_end
  GROUP BY period
), calc AS (
  SELECT
    period,
    nep,
    CASE
      WHEN net_claims_direct <> 0 THEN ABS(net_claims_direct)
      ELSE GREATEST(ABS(gross_claims_paid) - ABS(reinsurance_recoveries), 0)
    END AS net_claims,
    CASE
      WHEN direct_insurance_expense <> 0 THEN ABS(direct_insurance_expense)
      ELSE GREATEST(ABS(commission_expense) + ABS(other_insurance_expense) - ABS(commission_income_ceded), 0)
    END AS underwriting_expense
  FROM base
)
SELECT
  period,
  nep,
  net_claims,
  underwriting_expense,
  net_claims / NULLIF(nep, 0) AS loss_ratio,
  underwriting_expense / NULLIF(nep, 0) AS expense_ratio,
  (net_claims + underwriting_expense) / NULLIF(nep, 0) AS combined_ratio
FROM calc;
```

### 7.3 Query bảng số liệu bắt buộc mỗi tab

Mọi tab nên có query trả ra dạng long + pivot-friendly:

```sql
SELECT
  company_id,
  period,
  metric_key,
  metric_label,
  metric_value,
  unit,
  source_type,
  data_quality_flag
FROM dashboard_insurance_metric_view
WHERE company_id = :company_id
  AND period BETWEEN :period_start AND :period_end
  AND dashboard_tab = :tab_key
ORDER BY period, display_order;
```

---

## 8. Data quality và reconciliation rules

### 8.1 Không double-count

Các dòng có tính chất tổng hợp như `Doanh thu thuần hoạt động kinh doanh bảo hiểm`, `Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm`, `Lợi nhuận thuần hoạt động kinh doanh bảo hiểm` không được cộng chung với các dòng thành phần trong cùng một metric, trừ khi đang làm reconciliation.

Ví dụ sai:

```text
underwriting_revenue = Doanh thu thuần hoạt động kinh doanh bảo hiểm + Thu phí bảo hiểm gốc
```

Ví dụ đúng:

```text
underwriting_revenue = ưu tiên Doanh thu thuần hoạt động kinh doanh bảo hiểm;
nếu thiếu mới tính từ Thu phí bảo hiểm gốc + Thu phí nhận tái - Phí nhượng tái - Giảm/hoàn phí +/- dự phòng.
```

### 8.2 Chuẩn hóa dấu

- Dòng chi phí/bồi thường thường lưu dương trong BCTC, nhưng khi đưa vào waterfall phải hiển thị âm.
- Ratio luôn dùng `ABS()` cho numerator chi phí nếu dữ liệu gốc không có quy ước dấu ổn định.
- Tooltip phải hiển thị `raw_value` và `normalized_value` trong chế độ debug.

### 8.3 Tolerance reconciliation

| Reconciliation | Rule |
|---|---|
| `Total Assets = Liabilities + Equity` | Sai lệch <= 1% tổng tài sản hoặc <= tolerance cấu hình |
| `Underwriting Result` | Nếu tự tính khác dòng BCTC > 3%, thêm dòng `Other/Reconciliation` |
| `PBT Bridge` | `PBT = Underwriting Result + Investment Result + Other` |
| `Cash movement` | `cash_end = cash_begin + CFO + CFI + CFF + FX_effect` nếu có đủ data |

---

## 9. Empty state và cảnh báo

| Tình huống | Cách hiển thị |
|---|---|
| Thiếu metric trong mapping | Empty state: `Không tìm thấy ind_name trong BCTC. Cần bổ sung mapping hoặc extension.` |
| Chỉ tiêu cần extension | Badge `EXTENSION_REQUIRED`, không render chart giả |
| LOB = LIFE nhưng chart Non-life | Thay bằng `N/A for LIFE` hoặc chart life-specific nếu có extension |
| Data chỉ là proxy | Badge `BCTC_PROXY`; tooltip giải thích giới hạn |
| Ratio denominator = 0 | Hiển thị `N/A`, không chia 0 |
| Dữ liệu âm bất thường | Hiển thị warning và đưa vào bảng `data_quality_flag` |

---

## 10. Prompt mẫu cho AI/vibecoding

```text
Bạn là senior frontend engineer và data analyst. Hãy xây dựng dashboard doanh nghiệp bảo hiểm theo tài liệu BA này.

Bắt buộc:
1. Mỗi tab có KPI row, chart insight lớn ở đầu, chart giải thích phía sau và bảng số liệu cuối tab.
2. Khi query BCTC, dùng `WHERE ind_name IN (...)` theo `raw_name_aliases_for_where_ind_name` trong Metric Registry.
3. Không dùng `norm_name` để query nếu cột dữ liệu là `ind_name`.
4. Không tự bịa Solvency, ALM duration, asset class allocation, reinsurance recoverables hoặc stress test từ BCTC; các phần đó phải dùng extension table hoặc empty state.
5. Combined Ratio chỉ áp dụng cho `NON_LIFE`/`REINSURANCE`; nếu `LIFE`, hiển thị N/A hoặc thay bằng Reserve Growth/Persistency nếu có extension.
6. Tooltip phải có giá trị, so sánh YoY/QoQ, ý nghĩa BA, ngưỡng và data lineage.
7. Bảng số liệu của từng tab phải export được CSV.
```

---

## 11. Acceptance Criteria

### 11.1 Functional acceptance

- Người dùng chọn doanh nghiệp, kỳ, LOB, capital framework và dashboard cập nhật toàn bộ chart.
- Mỗi tab có ít nhất 1 chart insight lớn và 1 bảng số liệu.
- Tất cả metric truy vấn từ BCTC đều có mapping `WHERE ind_name IN (...)`.
- Metric cần extension không được render bằng dữ liệu giả từ BCTC.
- Có cảnh báo nếu combined ratio >100%, solvency ratio < threshold, claims tăng nhanh hơn premium, hoặc stress breach xảy ra.

### 11.2 BA acceptance

- Chart đầu tab phải trả lời được câu hỏi điều hành, không chỉ mô tả số liệu.
- Tooltip phải giải thích được vì sao chỉ tiêu tăng/giảm là tốt/xấu hoặc trung tính.
- Bảng số liệu phải giúp đối soát được chart.
- Có thể phân biệt rõ lợi nhuận underwriting và investment.
- Có thể phân biệt rõ `NON_LIFE` và `LIFE` logic.

---

## 12. Appendix A — Insurance-specific raw mapping từ file chỉ tiêu

Bảng dưới đây là các chỉ tiêu liên quan trực tiếp tới bảo hiểm tìm được trong mapping. Khi viết SQL, dùng cột `raw_name` trong `WHERE ind_name IN (...)`.

| norm_name | old_ind_code | raw_name aliases |
|---|---|---|
| `Bồi thường thuộc phần trách nhiệm giữ lại` | `boi_thuong_thuoc_phan_trach_nhiem_giu_lai` | `Bồi thường thuộc phần trách nhiệm giữ lại` |
| `Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm` | `chi_boi_thuong_bao_hiem_goc_tra_tien_bao_hiem` | `Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm` |
| `Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm` | `chi_boi_thuong_nhan_tai_bao_hiem_tra_tien_bao_hiem` | `Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm` |
| `Chi bồi thường từ dự phòng dao động lớn` | `chi_boi_thuong_tu_du_phong_dao_dong_lon` | `Chi bồi thường từ dự phòng dao động lớn` |
| `Chi hoa hồng` | `chi_hoa_hong` | `Chi hoa hồng` |
| `Chi khác hoạt động kinh doanh bảo hiểm` | `chi_khac_hoat_dong_kinh_doanh_bao_hiem` | `Chi khác hoạt động kinh doanh bảo hiểm` |
| `Chi khác hoạt động kinh doanh bảo hiểm gốc` | `chi_khac_hoat_dong_kinh_doanh_bao_hiem_goc` | `Chi khác hoạt động kinh doanh bảo hiểm gốc` |
| `Doanh thu thuần hoạt động kinh doanh bảo hiểm` | `doanh_thu_thuan` | `Doanh thu thuần hoạt động kinh doanh bảo hiểm` |
| `Dự phòng bảo đảm cân đối` | `du_phong_bao_dam_can_doi` | `Dự phòng bảo đảm cân đối` |
| `Dự phòng bồi thường` | `du_phong_boi_thuong` | `Dự phòng bồi thường` |
| `Dự phòng bồi thường thiệt hại cho nhà đầu tư` | `du_phong_boi_thuong_thiet_hai_cho_nha_dau_tu` | `Dự phòng bồi thường thiệt hại cho nhà đầu tư` |
| `Dự phòng dao động lớn` | `du_phong_dao_dong_lon` | `Dự phòng dao động lớn` |
| `Dự phòng nghiệp vụ` | `du_phong_nghiep_vu` | `Dự phòng nghiệp vụ` |
| `Dự phòng phí` | `du_phong_phi` | `Dự phòng phí` |
| `Dự phòng toán học` | `du_phong_toan_hoc` | `Dự phòng toán học` |
| `Giảm phí bảo hiểm` | `giam_phi_bao_hiem` | `Giảm phí bảo hiểm` |
| `Hoàn phí bảo hiểm` | `hoan_phi_bao_hiem` | `Hoàn phí bảo hiểm` |
| `Lợi nhuận gộp hoạt động kinh doanh bảo hiểm` | `ln_gop` | `Lợi nhuận gộp hoạt động kinh doanh bảo hiểm` |
| `Lợi nhuận thuần hoạt động kinh doanh bảo hiểm` | `loi_nhuan_thuan_hoat_dong_kinh_doanh_bao_hiem` | `Lợi nhuận thuần hoạt động kinh doanh bảo hiểm` |
| `Phí nhượng tái bảo hiểm` | `phi_nhuong_tai_bao_hiem` | `Phí nhượng tái bảo hiểm` |
| `Số trích dự phòng dao động lớn trong năm` | `so_trich_du_phong_dao_dong_lon_trong_nam` | `Số trích dự phòng dao động lớn trong năm` |
| `Thu bồi thường nhượng tái bảo hiểm` | `thu_boi_thuong_nhuong_tai_bao_hiem` | `Thu bồi thường nhượng tái bảo hiểm` |
| `Thu hoa hồng nhượng tái bảo hiểm` | `thu_hoa_hong_nhuong_tai_bao_hiem` | `Thu hoa hồng nhượng tái bảo hiểm` |
| `Thu hàng đã xử lý bồi thường 100%` | `thu_hang_da_xu_ly_boi_thuong_100` | `Thu hàng đã xử lý bồi thường 100%` |
| `Thu khác hoạt động kinh doanh bảo hiểm` | `thu_khac_hoat_dong_kinh_doanh_bao_hiem` | `Thu khác hoạt động kinh doanh bảo hiểm` |
| `Thu phí bảo hiểm gốc` | `thu_phi_bao_hiem_goc` | `Thu phí bảo hiểm gốc` |
| `Thu phí nhận tái bảo hiểm` | `thu_phi_nhan_tai_bao_hiem` | `Thu phí nhận tái bảo hiểm` |
| `Tiền từ thu phí và hoa hồng` | `tien_tu_thu_phi_va_hoa_hong` | `Tiền từ thu phí và hoa hồng` |
| `Trả tiền bồi thường bảo hiểm` | `tra_tien_boi_thuong_bao_hiem` | `Trả tiền bồi thường bảo hiểm` |
| `Trả tiền hoa hồng và các khoản nợ khác của kinh doanh bảo hiểm` | `tra_tien_hoa_hong_va_cac_khoan_no_khac_cua_kinh_doanh_bao_hiem` | `Trả tiền hoa hồng và các khoản nợ khác của kinh doanh bảo hiểm` |
| `Tăng/giảm dự phòng bồi thường` | `tang_giam_du_phong_boi_thuong` | `Tăng (giảm) dự phòng bồi thường` |
| `Tăng/giảm dự phòng phí, dự phòng toán học` | `tang_giam_du_phong_phi_du_phong_toan_hoc` | `Tăng (giảm) dự phòng phí, dự phòng toán học` |
| `Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm` | `tong_chi_truc_tiep_hoat_dong_kinh_doanh_bao_hiem` | `Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm` |

---

## 13. Appendix B — JSON Metric Registry cho code

```json
{
  "total_assets": {
    "label_vi": "Tổng tài sản",
    "source": "BCTC",
    "norm_names": [
      "Tổng cộng tài sản"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "TỔNG CỘNG TÀI SẢN",
      "TỔNG CỘNG TÀI SẢN (đồng)",
      "Tổng cộng tài sản"
    ],
    "old_ind_codes_reference": [
      "tong_ts"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Quy mô bảng cân đối; là mẫu số cho tỷ trọng tài sản đầu tư, tỷ lệ tài sản lỏng và leverage."
  },
  "equity": {
    "label_vi": "Vốn chủ sở hữu",
    "source": "BCTC",
    "norm_names": [
      "Vốn chủ sở hữu"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "VỐN CHỦ SỞ HỮU",
      "VỐN CHỦ SỞ HỮU (đồng)",
      "Vốn chủ sở hữu"
    ],
    "old_ind_codes_reference": [
      "vcsh"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Bộ đệm chịu lỗ; dùng cho ROE, solvency proxy, NWP/Capital."
  },
  "liabilities": {
    "label_vi": "Nợ phải trả",
    "source": "BCTC",
    "norm_names": [
      "Nợ phải trả"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "NỢ PHẢI TRẢ",
      "NỢ PHẢI TRẢ (đồng)",
      "Nợ phải trả"
    ],
    "old_ind_codes_reference": [
      "no_phai_tra"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Tổng nghĩa vụ kế toán, bao gồm dự phòng nghiệp vụ và các khoản phải trả khác."
  },
  "cash_equivalents": {
    "label_vi": "Tiền và tương đương tiền",
    "source": "BCTC",
    "norm_names": [
      "Tiền và các khoản tương đương tiền"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Tiền và các khoản tương đương tiền",
      "Tiền và tương đương tiền",
      "Tiền và tương đương tiền (đồng)"
    ],
    "old_ind_codes_reference": [
      "tien_va_tuong_duong_tien"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Lớp thanh khoản tức thời; không đủ để đại diện toàn bộ liquid assets nếu thiếu tiền gửi/TP ngắn hạn."
  },
  "short_term_investments": {
    "label_vi": "Đầu tư tài chính ngắn hạn",
    "source": "BCTC",
    "norm_names": [
      "Đầu tư tài chính ngắn hạn",
      "Giá trị thuần đầu tư ngắn hạn"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Giá trị thuần đầu tư ngắn hạn (đồng)",
      "Đầu tư tài chính ngắn hạn"
    ],
    "old_ind_codes_reference": [
      "dau_tu_tai_chinh_ngan_han",
      "gia_tri_thuan_dau_tu_ngan_han"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Có thể dùng như liquid asset proxy nếu không có bảng phân loại tài sản đầu tư chi tiết."
  },
  "long_term_investments": {
    "label_vi": "Đầu tư tài chính dài hạn",
    "source": "BCTC",
    "norm_names": [
      "Đầu tư tài chính dài hạn",
      "Đầu tư dài hạn",
      "Giá trị ròng tài sản đầu tư"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Giá trị ròng tài sản đầu tư",
      "Đầu tư dài hạn (đồng)",
      "Đầu tư tài chính dài hạn"
    ],
    "old_ind_codes_reference": [
      "dt_tc_dh",
      "gia_tri_rong_tai_san_dau_tu"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Phần tài sản sinh lời dài hạn; cần tách HTM/AFS/Equity/Deposits bằng extension nếu muốn phân bổ rủi ro."
  },
  "investment_securities": {
    "label_vi": "Chứng khoán đầu tư",
    "source": "BCTC",
    "norm_names": [
      "Chứng khoán đầu tư",
      "Chứng khoán đầu tư giữ đến ngày đáo hạn",
      "Chứng khoán đầu tư sẵn sàng để bán"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Available-for Sales Securities",
      "Chứng khoán đầu tư",
      "Chứng khoán đầu tư giữ đến ngày đáo hạn",
      "Chứng khoán đầu tư sẵn sàng để bán",
      "Held-to-Maturity Securities",
      "Investment Securities"
    ],
    "old_ind_codes_reference": [
      "chung_khoan_dau_tu",
      "chung_khoan_dau_tu_giu_den_ngay_dao_han",
      "chung_khoan_dau_tu_san_sang_de_ban"
    ],
    "formula": "SUM(value) tại kỳ chọn",
    "business_note": "Nhóm tài sản đầu tư chịu rủi ro lãi suất/tín dụng; cần thuyết minh để tách TPCP/TPDN/cổ phiếu."
  },
  "technical_provisions": {
    "label_vi": "Dự phòng nghiệp vụ / kỹ thuật",
    "source": "BCTC",
    "norm_names": [
      "Dự phòng nghiệp vụ",
      "Dự phòng phí",
      "Dự phòng toán học",
      "Dự phòng bồi thường",
      "Dự phòng dao động lớn",
      "Dự phòng bảo đảm cân đối"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Dự phòng bảo đảm cân đối",
      "Dự phòng bồi thường",
      "Dự phòng dao động lớn",
      "Dự phòng nghiệp vụ",
      "Dự phòng phí",
      "Dự phòng toán học"
    ],
    "old_ind_codes_reference": [
      "du_phong_bao_dam_can_doi",
      "du_phong_boi_thuong",
      "du_phong_dao_dong_lon",
      "du_phong_nghiep_vu",
      "du_phong_phi",
      "du_phong_toan_hoc"
    ],
    "formula": "SUM(value) của các dự phòng bảo hiểm tại kỳ chọn",
    "business_note": "Nghĩa vụ cốt lõi với người được bảo hiểm; tăng có thể là tín hiệu tăng trưởng hợp đồng, không mặc định là xấu."
  },
  "gross_written_premium": {
    "label_vi": "Phí bảo hiểm gốc",
    "source": "BCTC",
    "norm_names": [
      "Thu phí bảo hiểm gốc"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Thu phí bảo hiểm gốc"
    ],
    "old_ind_codes_reference": [
      "thu_phi_bao_hiem_goc"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Doanh số phí bảo hiểm trực tiếp; là chỉ báo tăng trưởng khai thác."
  },
  "inward_reinsurance_premium": {
    "label_vi": "Phí nhận tái bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Thu phí nhận tái bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Thu phí nhận tái bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "thu_phi_nhan_tai_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Phí từ nghiệp vụ nhận tái; cần tách khỏi bảo hiểm gốc khi phân tích rủi ro."
  },
  "ceded_reinsurance_premium": {
    "label_vi": "Phí nhượng tái bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Phí nhượng tái bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Phí nhượng tái bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "phi_nhuong_tai_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Chi phí chuyển rủi ro sang nhà tái; tăng có thể giảm rủi ro giữ lại nhưng làm giảm NEP."
  },
  "premium_reductions_refunds": {
    "label_vi": "Giảm/hoàn phí bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Giảm phí bảo hiểm",
      "Hoàn phí bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Giảm phí bảo hiểm",
      "Hoàn phí bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "giam_phi_bao_hiem",
      "hoan_phi_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Điều chỉnh giảm doanh thu phí; tăng nhanh có thể phản ánh hủy hợp đồng hoặc chính sách giảm giá."
  },
  "net_insurance_revenue": {
    "label_vi": "Doanh thu thuần hoạt động kinh doanh bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Doanh thu thuần hoạt động kinh doanh bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Doanh thu thuần hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "doanh_thu_thuan"
    ],
    "formula": "Ưu tiên lấy trực tiếp; nếu không có thì tính GWP + inward premium - ceded premium - reductions/refunds +/- thay đổi dự phòng phí/toán học nếu data có đủ",
    "business_note": "Mẫu số chính cho loss ratio, expense ratio, combined ratio của phi nhân thọ."
  },
  "net_claims_retained": {
    "label_vi": "Bồi thường thuộc phần trách nhiệm giữ lại",
    "source": "BCTC",
    "norm_names": [
      "Bồi thường thuộc phần trách nhiệm giữ lại"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Bồi thường thuộc phần trách nhiệm giữ lại"
    ],
    "old_ind_codes_reference": [
      "boi_thuong_thuoc_phan_trach_nhiem_giu_lai"
    ],
    "formula": "Ưu tiên lấy trực tiếp; nếu không có thì claims gross + inward claims - reinsurance recoveries +/- change in claim reserve",
    "business_note": "Chi phí rủi ro bảo hiểm sau tái bảo hiểm; là numerator chính của loss ratio."
  },
  "gross_claims_paid": {
    "label_vi": "Chi/trả bồi thường bảo hiểm",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm",
      "Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm",
      "Trả tiền bồi thường bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Chi bồi thường Bảo hiểm gốc, trả tiền bảo hiểm",
      "Chi bồi thường nhận tái bảo hiểm, trả tiền bảo hiểm",
      "Trả tiền bồi thường bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "chi_boi_thuong_bao_hiem_goc_tra_tien_bao_hiem",
      "chi_boi_thuong_nhan_tai_bao_hiem_tra_tien_bao_hiem",
      "tra_tien_boi_thuong_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Dòng/chi bồi thường gộp; không dùng trực tiếp cho loss ratio nếu chưa trừ tái bảo hiểm."
  },
  "reinsurance_recoveries": {
    "label_vi": "Thu bồi thường nhượng tái bảo hiểm",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Thu bồi thường nhượng tái bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Thu bồi thường nhượng tái bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "thu_boi_thuong_nhuong_tai_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Khoản thu/được bù từ nhà tái; quan trọng cho net retained loss và rủi ro đối tác tái."
  },
  "change_claim_reserve": {
    "label_vi": "Tăng/giảm dự phòng bồi thường",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Tăng/giảm dự phòng bồi thường"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Tăng (giảm) dự phòng bồi thường"
    ],
    "old_ind_codes_reference": [
      "tang_giam_du_phong_boi_thuong"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Điều chỉnh claims incurred; giúp phân biệt claims paid với claims incurred."
  },
  "change_premium_math_reserve": {
    "label_vi": "Tăng/giảm dự phòng phí, dự phòng toán học",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Tăng/giảm dự phòng phí, dự phòng toán học"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Tăng (giảm) dự phòng phí, dự phòng toán học"
    ],
    "old_ind_codes_reference": [
      "tang_giam_du_phong_phi_du_phong_toan_hoc"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Điều chỉnh phí được hưởng/earned premium; đặc biệt quan trọng với bảo hiểm nhân thọ."
  },
  "commission_expense": {
    "label_vi": "Chi hoa hồng",
    "source": "BCTC",
    "norm_names": [
      "Chi hoa hồng"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Chi hoa hồng"
    ],
    "old_ind_codes_reference": [
      "chi_hoa_hong"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Chi phí phân phối; là cấu phần chính của acquisition cost và expense ratio."
  },
  "commission_income_ceded": {
    "label_vi": "Thu hoa hồng nhượng tái bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Thu hoa hồng nhượng tái bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Thu hoa hồng nhượng tái bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "thu_hoa_hong_nhuong_tai_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Khoản hoàn/thu từ nhà tái giúp bù chi phí khai thác."
  },
  "insurance_other_income": {
    "label_vi": "Thu khác hoạt động kinh doanh bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Thu khác hoạt động kinh doanh bảo hiểm",
      "Thu khác (Giám định, đại lý...)",
      "Thu hàng đã xử lý bồi thường 100%"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Thu hàng đã xử lý bồi thường 100%",
      "Thu khác (Giám định, đại lý...)",
      "Thu khác hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "thu_hang_da_xu_ly_boi_thuong_100",
      "thu_khac_giam_dinh_dai_ly",
      "thu_khac_hoat_dong_kinh_doanh_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Nguồn thu phụ trợ; không nên trộn vào NEP khi tính underwriting ratio nếu không có rule rõ."
  },
  "insurance_other_expense": {
    "label_vi": "Chi khác hoạt động kinh doanh bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Chi khác hoạt động kinh doanh bảo hiểm",
      "Chi khác hoạt động kinh doanh bảo hiểm gốc"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Chi khác hoạt động kinh doanh bảo hiểm",
      "Chi khác hoạt động kinh doanh bảo hiểm gốc"
    ],
    "old_ind_codes_reference": [
      "chi_khac_hoat_dong_kinh_doanh_bao_hiem",
      "chi_khac_hoat_dong_kinh_doanh_bao_hiem_goc"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Chi phí vận hành trực tiếp khác của nghiệp vụ bảo hiểm."
  },
  "direct_insurance_expense": {
    "label_vi": "Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Tổng chi trực tiếp hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "tong_chi_truc_tiep_hoat_dong_kinh_doanh_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Dùng làm numerator expense nếu dữ liệu đã tổng hợp; tránh double-count nếu đã cộng hoa hồng + chi khác."
  },
  "insurance_gross_profit": {
    "label_vi": "Lợi nhuận gộp hoạt động kinh doanh bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Lợi nhuận gộp hoạt động kinh doanh bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Lợi nhuận gộp hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "ln_gop"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Biên lợi nhuận trước các chi phí ngoài gộp; dùng đối soát với NEP - Claims - Direct Expenses."
  },
  "insurance_net_profit": {
    "label_vi": "Lợi nhuận thuần hoạt động kinh doanh bảo hiểm",
    "source": "BCTC",
    "norm_names": [
      "Lợi nhuận thuần hoạt động kinh doanh bảo hiểm"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Lợi nhuận thuần hoạt động kinh doanh bảo hiểm"
    ],
    "old_ind_codes_reference": [
      "loi_nhuan_thuan_hoat_dong_kinh_doanh_bao_hiem"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Kết quả underwriting/kinh doanh bảo hiểm sau chi phí liên quan; có thể âm trong giai đoạn cạnh tranh giá."
  },
  "investment_income": {
    "label_vi": "Thu nhập/Doanh thu hoạt động tài chính và đầu tư",
    "source": "BCTC",
    "norm_names": [
      "Doanh thu hoạt động tài chính",
      "Thu nhập lãi",
      "Lãi tiền gửi và cổ tức",
      "Thu lãi và cổ tức",
      "Lãi/lỗ từ hoạt động đầu tư",
      "Lợi nhuận hoạt động tài chính"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Doanh thu hoạt động tài chính",
      "Doanh thu tài chính",
      "Lãi tiền gửi và cổ tức",
      "Lãi, lỗ từ hoạt động đầu tư",
      "Lãi/Lỗ từ hoạt động đầu tư",
      "Lãi/lỗ từ hoạt động đầu tư",
      "Lợi nhuận hoạt động tài chính",
      "Thu lãi và cổ tức",
      "Thu nhập lãi",
      "Thu nhập tài chính"
    ],
    "old_ind_codes_reference": [
      "dt_tc",
      "lai_lo_tu_hoat_dong_dau_tu",
      "lai_tien_gui_va_co_tuc",
      "loi_nhuan_hoat_dong_tai_chinh",
      "thu_lai_va_co_tuc",
      "thu_nhap_lai"
    ],
    "formula": "Tùy cấu trúc dữ liệu: dùng metric tổng hợp nếu có, nếu cộng nhiều dòng phải tránh double-count giữa doanh thu và lợi nhuận tài chính",
    "business_note": "Động cơ lợi nhuận thứ hai của bảo hiểm; cần tách realized/unrealized nếu có extension."
  },
  "investment_expense": {
    "label_vi": "Chi phí hoạt động tài chính/đầu tư",
    "source": "BCTC",
    "norm_names": [
      "Chi hoạt động tài chính",
      "Chi phí tài chính",
      "Chi phí đầu tư khác",
      "Dự phòng giảm giá chứng khoán đầu tư",
      "Dự phòng giảm giá đầu tư dài hạn"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Chi hoạt động tài chính",
      "Chi phí tài chính",
      "Chi phí đầu tư khác",
      "Dự phòng giảm giá chứng khoán đầu tư",
      "Dự phòng giảm giá đầu tư dài hạn",
      "Less: Provision for diminuation in value of long term investments",
      "Less: Provision for diminution in value of investment securities"
    ],
    "old_ind_codes_reference": [
      "chi_hoat_dong_tai_chinh",
      "chi_phi_dau_tu_khac",
      "chi_phi_tai_chinh",
      "du_phong_giam_gia_chung_khoan_dau_tu",
      "du_phong_giam_gia_dau_tu_dai_han"
    ],
    "formula": "SUM(value) kỳ hiện tại, nhưng phải kiểm tra dấu chi phí",
    "business_note": "Chi phí vốn, dự phòng giảm giá đầu tư và lỗ tài chính; ảnh hưởng trực tiếp đến investment result."
  },
  "pbt": {
    "label_vi": "Lợi nhuận trước thuế",
    "source": "BCTC",
    "norm_names": [
      "Lợi nhuận trước thuế",
      "Lợi nhuận/lỗ thuần trước thuế",
      "Lãi/lỗ ròng trước thuế"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "LN trước thuế",
      "Lãi/Lỗ ròng trước thuế",
      "Lợi nhuận trước thuế",
      "Lợi nhuận/Lỗ thuần trước thuế"
    ],
    "old_ind_codes_reference": [
      "lntt"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Lợi nhuận sau underwriting + investment + other."
  },
  "pat": {
    "label_vi": "Lợi nhuận sau thuế",
    "source": "BCTC",
    "norm_names": [
      "Lợi nhuận sau thuế thu nhập doanh nghiệp",
      "Lợi nhuận kế toán sau thuế thu nhập doanh nghiệp"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN",
      "Lợi nhuận sau thuế thu nhập DN",
      "Lợi nhuận sau thuế thu nhập doanh nghiệp"
    ],
    "old_ind_codes_reference": [
      "loi_nhuan_ke_toan_sau_thue_tndn",
      "loi_nhuan_sau_thue_thu_nhap_dn"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Dùng cho ROE và tăng trưởng lợi nhuận."
  },
  "cfo": {
    "label_vi": "Lưu chuyển tiền thuần từ HĐKD",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐKD",
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh"
    ],
    "old_ind_codes_reference": [
      "luu_chuyen_tien_thuan_tu_hdkd"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Khả năng tạo tiền từ hoạt động bảo hiểm/đầu tư vận hành."
  },
  "cfi": {
    "label_vi": "Lưu chuyển tiền thuần từ HĐ đầu tư",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động đầu tư"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐ đầu tư",
      "Lưu chuyển tiền thuần từ hoạt động đầu tư"
    ],
    "old_ind_codes_reference": [
      "lctt_thuan_hd_dt"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Dòng tiền mua/bán tài sản đầu tư."
  },
  "cff": {
    "label_vi": "Lưu chuyển tiền thuần từ HĐ tài chính",
    "source": "BCTC/LCTT",
    "norm_names": [
      "Lưu chuyển tiền thuần từ hoạt động tài chính"
    ],
    "raw_name_aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐ tài chính",
      "Lưu chuyển tiền thuần từ hoạt động tài chính"
    ],
    "old_ind_codes_reference": [
      "luu_chuyen_tien_thuan_tu_hd_tai_chinh"
    ],
    "formula": "SUM(value) kỳ hiện tại",
    "business_note": "Dòng tiền vốn/cổ tức/nợ tài chính."
  }
}
```

---

## 14. Appendix C — Danh sách extension metric không có trong mapping BCTC

| Metric | Vì sao cần extension | Bảng đề xuất |
|---|---|---|
| `solvency_ratio` | Không phải dòng BCTC thông thường, phụ thuộc khung vốn | `insurance_solvency_fact` |
| `available_capital`, `required_capital` | Định nghĩa thay đổi theo LOCAL_VN/SII/ICS | `insurance_solvency_fact` |
| `asset_class_allocation` | BCTC không tách đủ TPCP/TPDN/Cổ phiếu/Tiền gửi/Unit-linked | `insurance_investment_allocation_fact` |
| `credit_rating_bucket` | Không nằm trong BCTC chính | `insurance_investment_allocation_fact` |
| `asset_duration`, `liability_duration` | Cần dữ liệu ALM/actuarial | `insurance_investment_allocation_fact`, `insurance_liability_duration_fact` |
| `recoverable_balance`, `overdue_recoverable` | BCTC mapping chỉ có dòng thu bồi thường nhượng tái, không đủ số dư phải thu/quá hạn | `insurance_reinsurance_fact` |
| `breach_day`, `survival_horizon_days` | Là kết quả stress scenario, không có trong BCTC | `insurance_liquidity_stress_fact` |
| `persistency`, `surrender_ratio`, `APE`, `VNB` | Đặc thù nhân thọ, thường từ quản trị/actuarial | `insurance_life_kpi_fact` |
| `claims_triangle`, `IBNR`, `ultimate_loss_ratio` | Cần dữ liệu bồi thường theo accident year/development year | `insurance_claims_triangle_fact` |

---

## 15. Checklist triển khai UI

- [ ] Có global alert banner nếu solvency breach, combined ratio >100%, stress breach, hoặc claims tăng nhanh hơn premium.
- [ ] Có switch `Actual / YoY / Common-size` cho bảng.
- [ ] Có badge `BCTC`, `BCTC_PROXY`, `EXTENSION`, `MISSING` trên từng chart.
- [ ] Có export CSV cho bảng từng tab.
- [ ] Có toggle `debug mapping` để xem `metric_key`, `norm_name`, `raw_name aliases`.
- [ ] Có rule ẩn chart theo `lob_type`.
- [ ] Có mô tả tooltip nghiệp vụ cho từng KPI.
- [ ] Có reconciliation row khi chart bridge không khớp dòng tổng.
