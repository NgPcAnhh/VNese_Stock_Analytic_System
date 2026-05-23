# ĐẶC TẢ BUSINESS ANALYST & VIBECODING: DASHBOARD TÀI CHÍNH NGÂN HÀNG VIỆT NAM

**Phiên bản:** v3.0 — fix & mở rộng từ bản BankInsight DeepDive  
**Role tài liệu:** Business Analyst specification cho AI/vibecoding  
**Phạm vi:** Ngân hàng thương mại Việt Nam, sử dụng dữ liệu BCTC công bố, thuyết minh BCTC, và các bảng extension khi BCTC không có chỉ tiêu đủ chi tiết.  
**Mục tiêu:** Giúp AI xây dashboard đúng nghiệp vụ, đúng chart, đúng tooltip, đúng thứ tự insight, và quan trọng nhất là query đúng `ind_name` bằng mapping alias.

---

## 0. Những điểm đã fix so với bản cũ

1. **Không chỉ mô tả chart, mà đặc tả rõ chart trả lời câu hỏi kinh doanh nào.** Mỗi chart phải có `Insight cần trả lời`, `Formula`, `Tooltip`, `Mapping dữ liệu`, `Rule cảnh báo`.
2. **Chart lớn ở đầu tab phải nói insight chính.** Chart giải thích/đối soát xếp sau. Không để pie/donut nhỏ đứng đầu nếu nó không trả lời insight cấp điều hành.
3. **Mọi tab bắt buộc có bảng số liệu.** Bảng là lớp kiểm toán và export, giúp người dùng không chỉ nhìn chart.
4. **Tách rõ dữ liệu lấy được từ `ind_name` và dữ liệu cần extension.** Các chỉ tiêu như CASA, nợ nhóm 1-5, CAR, SMLR, maturity gap, loan mix không được tự suy diễn nếu không có bảng thuyết minh/extension.
5. **Mapping query dùng `raw_name` alias, không dùng `norm_name` trực tiếp để query nếu bảng gốc lưu `ind_name`.** `norm_name` là tên chuẩn nghiệp vụ; `raw_name` là điều kiện `WHERE ind_name IN (...)`.
6. **Không dùng `old_ind_code` làm khóa duy nhất.** Có trường hợp một `old_ind_code` map sang nhiều diễn giải/ngữ cảnh khác nhau. `old_ind_code` chỉ để đối soát.

---

## 1. Nguyên tắc BA cho dashboard ngân hàng

Dashboard ngân hàng không phải dashboard kế toán thuần. Người dùng cần trả lời 5 câu hỏi theo thứ tự:

1. **Ngân hàng đang lớn lên hay co lại?** Nhìn tổng tài sản, cho vay, tiền gửi, vốn chủ.
2. **Tăng trưởng có được tài trợ bền vững không?** Nhìn CASA, tiền gửi khách hàng, giấy tờ có giá, liên ngân hàng, LDR.
3. **Tăng trưởng tín dụng có làm rủi ro xấu đi không?** Nhìn nợ nhóm 2, NPL, LLR, credit cost.
4. **Lợi nhuận đến từ vận hành lõi hay từ yếu tố không bền vững?** Nhìn NII, NIM, fee, trading, CIR, dự phòng.
5. **Có rủi ro vốn/thanh khoản/ALM nào đe doạ không?** Nhìn CAR, SMLR, liquid assets, maturity gap.

**Luồng phân tích chuẩn trên UI:**

```text
Global Alerts
→ Executive Snapshot
→ Balance Sheet & Funding
→ Asset Quality
→ Profitability / DuPont
→ Income & Cost Quality
→ Liquidity & ALM
→ Data Tables / Export
```

---

## 2. Data contract cho vibecoding

### 2.1. Bảng dữ liệu BCTC chuẩn

Giả định bảng fact chính có cấu trúc tối thiểu:

```sql
financial_statement_fact(
  ticker              TEXT,
  company_name         TEXT,
  report_period        DATE,
  fiscal_year          INT,
  fiscal_quarter       INT,
  report_type          TEXT,       -- BALANCE_SHEET / INCOME_STATEMENT / CASH_FLOW / NOTES
  ind_name             TEXT,       -- tên chỉ tiêu gốc từ nhiều nguồn
  value                NUMERIC,
  unit                 TEXT,
  source               TEXT,
  statement_scope      TEXT        -- consolidated / separate nếu có
)
```

### 2.2. Quy tắc query bắt buộc

**Đúng:** dùng alias từ registry.

```sql
SELECT report_period, SUM(value) AS total_assets
FROM financial_statement_fact
WHERE ticker = :ticker
  AND ind_name IN (<aliases_for_where_ind_name của metric total_assets>)
GROUP BY report_period;
```

**Sai:** query trực tiếp bằng một tên duy nhất.

```sql
-- Sai vì bỏ sót alias như viết hoa, tiếng Anh, có hậu tố đơn vị
WHERE ind_name = 'Tổng cộng tài sản'
```

### 2.3. Các bảng extension bắt buộc nếu muốn dashboard sâu

```sql
bank_credit_quality_ext(
  ticker, report_period,
  debt_group_1, debt_group_2, debt_group_3, debt_group_4, debt_group_5,
  write_off_amount, collateral_real_estate, collateral_deposit, collateral_other
)

bank_deposit_loan_mix_ext(
  ticker, report_period,
  casa_balance, term_deposit_balance,
  retail_deposit_balance, corporate_deposit_balance,
  loan_retail, loan_sme, loan_corporate, loan_real_estate, loan_other
)

bank_regulatory_ratio_ext(
  ticker, report_period,
  car_ratio, tier1_ratio, rwa, ldr_regulatory, smlr_ratio, liquid_asset_ratio
)

bank_alm_gap_ext(
  ticker, report_period,
  bucket,                        -- ON_DEMAND, LT_1M, M1_3, M3_12, Y1_5, GT_5Y
  asset_maturity_amount,
  liability_maturity_amount
)
```

**BA rule:** Nếu metric thuộc `EXTENSION_*` mà bảng extension không có dữ liệu, UI phải hiển thị `N/A` và tooltip nêu rõ “cần thuyết minh/extension”, không được tự bịa từ BCTC.

---

## 3. Global filters & interactions

| Filter | Bắt buộc | Mô tả BA | Tác động |
|---|---:|---|---|
| `ticker` | Có | Ngân hàng cần phân tích | Reload toàn bộ KPI/chart/table |
| `report_period` | Có | Kỳ snapshot hiện tại | KPI lấy tại kỳ này; trend lùi 8-12 quý |
| `statement_scope` | Nên có | Hợp nhất / riêng lẻ | Tránh trộn số liệu |
| `unit` | Có | Tỷ VND / Triệu VND | Chỉ scale số tuyệt đối, không scale tỷ lệ |
| `comparison_mode` | Có | QoQ / YoY / TTM | Quy định badge tăng/giảm |
| `peer_group` | Nên có | SOCB, private bank, retail bank | Bật percentile/benchmark |

---

## 4. Visual hierarchy bắt buộc

Trong mỗi tab:

1. **Hàng 1: KPI cards + alert nhỏ.** 4-6 KPI quan trọng nhất.
2. **Hàng 2: Chart insight chính kích thước lớn.** Chiếm 60-70% chiều ngang hoặc toàn hàng.
3. **Hàng 3: Chart giải thích nguyên nhân.** Mix chart, waterfall, decomposition.
4. **Hàng cuối: Bảng số liệu.** Luôn có cột kỳ, giá trị, QoQ, YoY, tỷ trọng, ghi chú dữ liệu.

---

## 5. Quy tắc tooltip chuẩn

Tooltip mọi KPI/chart phải theo template:

```text
<Tên chỉ tiêu>
Giá trị: <formatted_value> <unit>
Thay đổi: <QoQ/YoY badge có màu theo direction>
Công thức: <formula ngắn>
Ý nghĩa: <giải thích nghiệp vụ 1-2 câu>
Ngưỡng: <nếu có>
Nguồn dữ liệu: BCTC / Thuyết minh / Extension
Mapping: <metric_key>
```

**Direction rule:**

| Nhóm | Tăng là | Giảm là | Ví dụ |
|---|---|---|---|
| Higher is better | Tốt | Xấu | NII, ROE, CAR, LLR, CASA |
| Lower is better | Xấu | Tốt | NPL, nợ nhóm 2, CIR, credit cost, SMLR nếu vượt ngưỡng |
| Contextual | Phụ thuộc ngữ cảnh | Phụ thuộc ngữ cảnh | Tổng tài sản, cho vay, tiền gửi, giấy tờ có giá |

---

# TAB 0 — EXECUTIVE SNAPSHOT / RADAR SỨC KHỎE NGÂN HÀNG

**Mục tiêu:** Cho lãnh đạo thấy ngay ngân hàng đang mạnh/yếu ở đâu: tăng trưởng, sinh lời, rủi ro tín dụng, vốn, thanh khoản.

**KPI cards đầu tab:** `total_assets`, `gross_customer_loans`, `customer_deposits`, `net_interest_income`, `npl_ratio`, `roe`, `car_ratio`, `ldr_regulatory`.


### 0.1. Health Score Heatmap — ngân hàng đang khoẻ/yếu ở trụ cột nào?

**Insight cần trả lời:** Tóm tắt sức khỏe theo 5 trụ cột: Growth, Funding, Asset Quality, Profitability, Capital/Liquidity. Đây là chart lớn đầu tiên để nổi bật insight.

**Vị trí & kích thước:** Chart lớn toàn hàng, đặt ngay dưới KPI cards. Mỗi trụ cột là một card màu + điểm 0-100 + badge QoQ/YoY.

**Loại chart:** Heatmap / scorecards dạng 5 cột.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `total_assets` | Tổng tài sản | `BCTC_IND_NAME` | `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`, `TỔNG CỘNG TÀI SẢN` | Quy mô bảng cân đối, nền tảng tính tăng trưởng và đòn bẩy. |
| `customer_deposits` | Tiền gửi khách hàng | `BCTC_IND_NAME` | `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng` | Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá. |
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |
| `npl_ratio` | NPL Ratio | `DERIVED_FROM_EXTENSION` | `DERIVED_FROM_EXTENSION`; npl_amount / gross_customer_loans | npl_amount / gross_customer_loans |
| `llr_ratio` | Coverage Ratio / LLR | `DERIVED_FROM_BCTC_AND_EXTENSION` | `DERIVED_FROM_BCTC_AND_EXTENSION`; ABS(loan_loss_allowance_customer) / npl_amount | ABS(loan_loss_allowance_customer) / npl_amount |
| `roe` | ROE | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; net_profit / AVG(equity) | net_profit / AVG(equity) |
| `car_ratio` | CAR | `EXTENSION_REGULATORY` | `EXTENSION_REGULATORY`; Chỉ tiêu an toàn vốn theo báo cáo Basel/NHNN; không suy diễn từ VCSH/TTS. | Chỉ tiêu an toàn vốn theo báo cáo Basel/NHNN; không suy diễn từ VCSH/TTS. |
| `ldr_regulatory` | LDR regulatory | `EXTENSION_REGULATORY` | `EXTENSION_REGULATORY`; Tỷ lệ cấp tín dụng so với nguồn vốn huy động theo định nghĩa NHNN. | Tỷ lệ cấp tín dụng so với nguồn vốn huy động theo định nghĩa NHNN. |

**Công thức / xử lý dữ liệu:**

```text
Growth score = percentile(growth_total_assets, growth_loans, growth_deposits)
Funding score = weighted(CASA ratio, deposit growth stability, low wholesale funding dependency)
Asset quality score = inverse(NPL ratio, group2 ratio, credit cost) + LLR buffer
Profitability score = ROE, ROA, NIM, CIR inverse
Capital/Liquidity score = CAR, LDR, SMLR inverse, liquid asset ratio
Final health score = weighted average; không hiển thị nếu thiếu quá 40% metric.
```

**Tooltip bắt buộc:**

```text
Trụ cột: Asset Quality
Điểm: 72/100
Đóng góp: NPL 1.8% tốt hơn ngưỡng 3%, LLR 118% tạo bộ đệm đủ, nhưng nợ nhóm 2 tăng 35% YoY.
Nguồn: BCTC + thuyết minh nợ nhóm + regulatory extension.
```

**Bảng số liệu đi kèm:** `period | pillar | metric | value | score | weight | QoQ | YoY | data_source | note`

**Rule BA / cảnh báo:** Nếu thiếu extension CAR/NPL group, card vẫn hiển thị nhưng đánh dấu partial score.



### 0.2. Risk-return quadrant — lợi nhuận có xứng với rủi ro?

**Insight cần trả lời:** Đặt ROE/NIM cạnh NPL/Credit Cost để phân biệt ngân hàng tăng lợi nhuận bền vững hay đang nhận thêm rủi ro tín dụng.

**Vị trí & kích thước:** Chart lớn nửa hàng, xếp sau health score.

**Loại chart:** Scatter/quadrant: X = NPL hoặc credit cost, Y = ROE; bubble size = total_assets; màu = CAR status.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `roe` | ROE | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; net_profit / AVG(equity) | net_profit / AVG(equity) |
| `npl_ratio` | NPL Ratio | `DERIVED_FROM_EXTENSION` | `DERIVED_FROM_EXTENSION`; npl_amount / gross_customer_loans | npl_amount / gross_customer_loans |
| `credit_cost` | Credit Cost annualized | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; ABS(credit_provision_expense) / AVG(gross_customer_loans) × annualization_factor | ABS(credit_provision_expense) / AVG(gross_customer_loans) × annualization_factor |
| `total_assets` | Tổng tài sản | `BCTC_IND_NAME` | `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`, `TỔNG CỘNG TÀI SẢN` | Quy mô bảng cân đối, nền tảng tính tăng trưởng và đòn bẩy. |
| `car_ratio` | CAR | `EXTENSION_REGULATORY` | `EXTENSION_REGULATORY`; Chỉ tiêu an toàn vốn theo báo cáo Basel/NHNN; không suy diễn từ VCSH/TTS. | Chỉ tiêu an toàn vốn theo báo cáo Basel/NHNN; không suy diễn từ VCSH/TTS. |

**Công thức / xử lý dữ liệu:**

```text
X = npl_ratio hoặc credit_cost
Y = roe
Bubble = total_assets
Color = CAR status: safe / watch / breach
Quadrants:
- High ROE, Low Risk: tốt nhất
- High ROE, High Risk: lợi nhuận đổi bằng rủi ro
- Low ROE, Low Risk: phòng thủ nhưng kém hiệu quả
- Low ROE, High Risk: cảnh báo đỏ
```

**Tooltip bắt buộc:**

```text
Ngân hàng: {ticker}
ROE: 17.2% | NPL: 1.6% | Credit Cost: 1.1%
Diễn giải: ROE cao trong khi NPL thấp → chất lượng sinh lời tốt.
Mapping: roe, npl_ratio, credit_cost.
```

**Bảng số liệu đi kèm:** `period | ticker | roe | npl_ratio | credit_cost | total_assets | car_ratio | quadrant`

**Rule BA / cảnh báo:** Nếu không có peer group thì chỉ vẽ điểm của ngân hàng qua thời gian.



### 0.3. Profit bridge mini — từ thu nhập lõi đến lợi nhuận sau dự phòng

**Insight cần trả lời:** Cho thấy lợi nhuận bị ăn mòn bởi chi phí hoạt động và dự phòng ra sao.

**Vị trí & kích thước:** Waterfall trung bình, đặt cùng hàng với risk-return.

**Loại chart:** Waterfall: NII + Non-interest income - Opex - Provision - Tax = Net Profit.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `net_interest_income` | Thu nhập lãi thuần - NII | `BCTC_IND_NAME` | `Net Interest Income`, `Thu nhập lãi thuần` | Động cơ lợi nhuận chính của ngân hàng. |
| `net_fee_income` | Lãi thuần dịch vụ | `BCTC_IND_NAME` | `Lãi thuần từ hoạt động dịch vụ`, `Net Fee and Commission Income` | Thu dịch vụ ròng; cần bóc thuyết minh nếu muốn bancassurance/thẻ/thanh toán. |
| `fx_gold_gain` | Lãi/lỗ thuần ngoại hối và vàng | `BCTC_IND_NAME` | `Net gain (loss) from foreign currency and gold dealings`, `Kinh doanh ngoại hối và vàng` | Nguồn thu biến động theo thị trường ngoại hối/vàng. |
| `trading_securities_gain` | Lãi/lỗ chứng khoán kinh doanh | `BCTC_IND_NAME` | `Net gain (loss) from trading of trading securities`, `Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh` | Trading income, chất lượng lợi nhuận thấp hơn NII/fee nếu biến động lớn. |
| `investment_securities_gain` | Lãi/lỗ chứng khoán đầu tư | `BCTC_IND_NAME` | `Net gain (loss) from disposal of investment securities`, `Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư` | Lãi/lỗ hiện thực hóa từ danh mục đầu tư. |
| `operating_expense` | Chi phí hoạt động - Opex | `BCTC_IND_NAME` | `Chi phí hoạt động` | Chi phí vận hành ngân hàng; mẫu số tính efficiency. |
| `credit_provision_expense` | Chi phí dự phòng RRTD | `BCTC_IND_NAME` | `Chi phí dự phòng rủi ro tín dụng` | Chi phí rủi ro trích vào P&L; tăng là xấu trừ khi chủ động tăng bộ đệm. |
| `tax_expense` | Chi phí thuế TNDN | `BCTC_IND_NAME` | `Tax For the Year`, `CHI PHÍ THUẾ TNDN`, `Chi phí thuế TNDN`, `Chi phí thuế TNDN hiện hành`, ... (6 aliases) | Chi phí thuế để tính tax burden. |
| `net_profit` | Lợi nhuận sau thuế | `BCTC_IND_NAME` | `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp`, `LNST của cổ đông công ty mẹ`, `Lợi nhuận sau thuế của cổ đông công ty mẹ`, ... (5 aliases) | Lợi nhuận cuối cùng cho cổ đông; mẫu số ROE/ROA. |

**Công thức / xử lý dữ liệu:**

```text
Non_interest_income = net_fee_income + fx_gold_gain + trading_securities_gain + investment_securities_gain + other_net_income
Pre_provision_profit = NII + Non_interest_income - Opex
PBT = Pre_provision_profit - Credit provision
Net profit = PBT - Tax
```

**Tooltip bắt buộc:**

```text
Bước: Chi phí dự phòng RRTD
Giá trị: -2,350 tỷ
Tác động: làm giảm 38% lợi nhuận trước dự phòng
Ý nghĩa: gánh nặng rủi ro tín dụng trong kỳ.
```

**Bảng số liệu đi kèm:** `period | component | value | sign | pct_of_toi | QoQ | YoY | mapping_key`

**Rule BA / cảnh báo:** Các khoản expense cần chuẩn hóa dấu âm/dương trước khi vẽ waterfall.


**Bảng số liệu bắt buộc Tab 0:** `Executive KPI table` gồm period, total_assets, loans, deposits, equity, NII, PBT, net_profit, ROE, ROA, NIM, CIR, NPL, LLR, CAR, LDR, QoQ, YoY, data_quality_flag.

---

# TAB 1 — BẢNG CÂN ĐỐI & NGUỒN VỐN

**Mục tiêu:** Đánh giá ngân hàng tăng trưởng bằng tài sản sinh lời nào và được tài trợ bởi nguồn vốn nào. Với ngân hàng, tăng trưởng tài sản chỉ tốt nếu đi cùng nguồn vốn ổn định và bộ đệm vốn đủ.

**KPI cards đầu tab:** `total_assets`, `gross_customer_loans`, `customer_deposits`, `equity`, `earning_assets`, `issued_papers`.


### 1.1. Earning Asset Mix — tài sản có đang sinh lời hay bị kẹt ở tài sản kém sinh lời?

**Insight cần trả lời:** Chart insight chính của tab: nhìn tỷ trọng cho vay, liên ngân hàng, chứng khoán đầu tư, chứng khoán kinh doanh so với tổng tài sản.

**Vị trí & kích thước:** Chart lớn toàn hàng. Dùng stacked area theo 8-12 quý + line earning_assets/total_assets.

**Loại chart:** Stacked area + line ratio.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `total_assets` | Tổng tài sản | `BCTC_IND_NAME` | `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`, `TỔNG CỘNG TÀI SẢN` | Quy mô bảng cân đối, nền tảng tính tăng trưởng và đòn bẩy. |
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |
| `interbank_assets` | Tiền gửi/cho vay TCTD khác | `BCTC_IND_NAME` | `Placements with and loans to other credit institutions`, `Tiền gửi tại các TCTD khác và cho vay các TCTD khác`, `Tiền gửi và cho vay các TCTD khác`, `Tiền gửi các tổ chức tín dụng khác` | Tài sản liên ngân hàng, vừa sinh lời vừa hỗ trợ thanh khoản. |
| `trading_securities` | Chứng khoán kinh doanh | `BCTC_IND_NAME` | `_Chứng khoán kinh doanh`, `Chứng khoán kinh doanh`, `Trading Securities`, `Trading Securities, net` | Tài sản tài chính mục đích trading, biến động mạnh hơn danh mục đầu tư. |
| `investment_securities` | Chứng khoán đầu tư | `BCTC_IND_NAME` | `Chứng khoán đầu tư`, `Investment Securities`, `Chứng khoán đầu tư giữ đến ngày đáo hạn`, `Held-to-Maturity Securities`, ... (6 aliases) | Danh mục trái phiếu/chứng khoán sinh lời, quan trọng trong earning assets. |
| `earning_assets` | Earning Assets | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; gross_customer_loans + interbank_assets + trading_securities + investment_securities | gross_customer_loans + interbank_assets + trading_securities + investment_securities |

**Công thức / xử lý dữ liệu:**

```text
earning_assets = gross_customer_loans + interbank_assets + trading_securities + investment_securities
earning_asset_ratio = earning_assets / total_assets
asset_mix_pct_i = component_i / total_assets
```

**Tooltip bắt buộc:**

```text
Kỳ: Q4/2025
Tài sản sinh lời/TTS: 87.4%
Cho vay KH: 62.1% TTS
Chứng khoán đầu tư: 18.5% TTS
Ý nghĩa: tỷ trọng tài sản sinh lời cao nhưng cần đối chiếu NPL/ALM để tránh tăng trưởng rủi ro.
```

**Bảng số liệu đi kèm:** `period | total_assets | gross_customer_loans | interbank_assets | trading_securities | investment_securities | earning_assets | earning_asset_ratio`

**Rule BA / cảnh báo:** Nếu `gross_customer_loans` không có, fallback sang `net_customer_loans` nhưng phải hiện cảnh báo “đang dùng dư nợ ròng”.



### 1.2. Funding Stack — tăng trưởng được tài trợ bởi tiền gửi hay nguồn vốn bán buôn?

**Insight cần trả lời:** Giải thích chất lượng nguồn vốn: tiền gửi khách hàng bền hơn liên ngân hàng/giấy tờ có giá.

**Vị trí & kích thước:** Chart lớn 2/3 hàng; đặt sau asset mix.

**Loại chart:** Stacked bar theo quý; line customer_deposits/total_funding.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `total_funding` | Tổng cộng nguồn vốn | `BCTC_IND_NAME` | `Tổng cộng nguồn vốn`, `TỔNG CỘNG NGUỒN VỐN (đồng)`, `TỔNG CỘNG NGUỒN VỐN`, `TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU`, ... (5 aliases) | Đối soát với tổng tài sản, dùng kiểm tra cân bằng kế toán. |
| `customer_deposits` | Tiền gửi khách hàng | `BCTC_IND_NAME` | `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng` | Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá. |
| `interbank_liabilities` | Tiền gửi và vay TCTD khác | `BCTC_IND_NAME` | `Deposits and borrowings from other credit institutions`, `Tiền gửi và vay các Tổ chức tín dụng khác` | Nguồn vốn bán buôn, nhạy cảm với điều kiện thị trường. |
| `issued_papers` | Giấy tờ có giá phát hành | `BCTC_IND_NAME` | `Convertible bonds/CDs and other valuable papers issued`, `Phát hành giấy tờ có giá` | Nguồn vốn qua trái phiếu/chứng chỉ tiền gửi; kỳ hạn và chi phí vốn cần theo dõi. |
| `gov_sbv_borrowing` | Nợ Chính phủ và NHNN | `BCTC_IND_NAME` | `Các khoản nợ chính phủ và NHNN Việt Nam`, `Due to Gov and borrowings from SBV` | Nguồn vốn/ nghĩa vụ với Chính phủ và NHNN. |
| `entrusted_funds` | Vốn tài trợ, ủy thác đầu tư | `BCTC_IND_NAME` | `Funds received from Gov, international and other institutions`, `Vốn tài trợ, uỷ thác đầu tư của CP và các tổ chức TD khác`, `Vốn tài trợ, uỷ thác đầu tư mà ngân hàng chịu rủi ro` | Nguồn vốn ủy thác/tài trợ đặc thù. |
| `equity` | Vốn chủ sở hữu | `BCTC_IND_NAME` | `Vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU (đồng)`, `VỐN CHỦ SỞ HỮU`, `NGUỒN VỐN CHỦ SỞ HỮU`, ... (5 aliases) | Bộ đệm vốn hấp thụ lỗ; mẫu số ROE và đòn bẩy. |

**Công thức / xử lý dữ liệu:**

```text
funding_components = customer_deposits + interbank_liabilities + issued_papers + gov_sbv_borrowing + entrusted_funds + equity + other_liabilities
customer_deposit_ratio = customer_deposits / total_funding
wholesale_funding_ratio = (interbank_liabilities + issued_papers) / total_funding
```

**Tooltip bắt buộc:**

```text
Nguồn vốn: Tiền gửi KH
Giá trị: 980,000 tỷ
Tỷ trọng: 71.2% tổng nguồn vốn
YoY: +12.4% → tốt nếu tăng cùng CASA hoặc kỳ hạn ổn định.
```

**Bảng số liệu đi kèm:** `period | customer_deposits | interbank_liabilities | issued_papers | gov_sbv_borrowing | entrusted_funds | equity | total_funding | pct_total`

**Rule BA / cảnh báo:** Tỷ trọng liên ngân hàng + giấy tờ có giá tăng nhanh hơn tiền gửi khách hàng là cảnh báo funding quality.



### 1.3. CASA & Deposit Quality — tiền gửi rẻ có đủ nâng đỡ NIM không?

**Insight cần trả lời:** CASA là động lực chi phí vốn thấp; tuy nhiên thường chỉ có trong thuyết minh/extension.

**Vị trí & kích thước:** Chart giải thích nửa hàng.

**Loại chart:** Donut hiện kỳ + line CASA ratio 8 quý.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `customer_deposits` | Tiền gửi khách hàng | `BCTC_IND_NAME` | `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng` | Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá. |
| `casa_balance` | CASA balance | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Số dư tiền gửi không kỳ hạn từ thuyết minh tiền gửi khách hàng. Không lấy từ ind_name nếu không có dòng riêng. | Số dư tiền gửi không kỳ hạn từ thuyết minh tiền gửi khách hàng. Không lấy từ ind_name nếu không có dòng riêng. |
| `term_deposit_balance` | Tiền gửi có kỳ hạn | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Số dư tiền gửi có kỳ hạn từ thuyết minh. | Số dư tiền gửi có kỳ hạn từ thuyết minh. |
| `cost_of_funds` | Cost of Funds | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; ABS(interest_expense) / AVG(interest_bearing_liabilities) | ABS(interest_expense) / AVG(interest_bearing_liabilities) |

**Công thức / xử lý dữ liệu:**

```text
casa_ratio = casa_balance / customer_deposits
term_deposit_ratio = term_deposit_balance / customer_deposits
cost_of_funds = ABS(interest_expense) / AVG(interest_bearing_liabilities)
```

**Tooltip bắt buộc:**

```text
CASA Ratio: 21.5%
YoY: -2.1 điểm % → xấu vì làm tăng chi phí vốn.
Diễn giải: CASA giảm thường gây áp lực lên NIM trong 1-2 quý sau.
```

**Bảng số liệu đi kèm:** `period | customer_deposits | casa_balance | term_deposit_balance | casa_ratio | cost_of_funds | data_source`

**Rule BA / cảnh báo:** Không có extension CASA thì chart phải N/A, không lấy “Tiền gửi khách hàng” làm CASA.



### 1.4. Loan Portfolio Mix — tăng trưởng tín dụng đến từ phân khúc nào?

**Insight cần trả lời:** Bóc tách concentration risk: retail, SME, corporate, real estate. Đây là thuyết minh/extension bắt buộc.

**Vị trí & kích thước:** Horizontal bar/treemap nửa hàng.

**Loại chart:** Horizontal stacked bar cho kỳ hiện tại; trend tỷ trọng BĐS nếu có.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |
| `loan_retail` | Dư nợ bán lẻ | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Phân tách dư nợ theo khách hàng/sản phẩm. | Phân tách dư nợ theo khách hàng/sản phẩm. |
| `loan_sme` | Dư nợ SME | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Phân tách dư nợ SME. | Phân tách dư nợ SME. |
| `loan_corporate` | Dư nợ doanh nghiệp lớn | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Phân tách dư nợ corporate. | Phân tách dư nợ corporate. |
| `loan_real_estate` | Dư nợ bất động sản | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Phân tách tín dụng bất động sản để cảnh báo tập trung. | Phân tách tín dụng bất động sản để cảnh báo tập trung. |

**Công thức / xử lý dữ liệu:**

```text
loan_mix_pct_i = loan_segment_i / gross_customer_loans
real_estate_concentration = loan_real_estate / gross_customer_loans
```

**Tooltip bắt buộc:**

```text
Phân khúc: Bất động sản
Dư nợ: 145,000 tỷ
Tỷ trọng: 18.6%
Ngưỡng watchlist: >20% hoặc tăng >5 điểm % YoY.
```

**Bảng số liệu đi kèm:** `period | loan_retail | loan_sme | loan_corporate | loan_real_estate | loan_other | total_loans | pct_total | QoQ | YoY`

**Rule BA / cảnh báo:** Nếu không có phân khúc, vẫn hiển thị tổng cho vay và thông báo “Cần thuyết minh loan mix”.


**Bảng số liệu bắt buộc Tab 1:** `Balance sheet detail table` gồm period, từng dòng tài sản/nguồn vốn, value, pct_total_assets hoặc pct_total_funding, QoQ, YoY, mapping_key, source_type.

---

# TAB 2 — CHẤT LƯỢNG TÀI SẢN / RỦI RO TÍN DỤNG

**Mục tiêu:** Không chỉ xem nợ xấu hiện tại, mà phát hiện sớm rủi ro qua nợ nhóm 2, mức bao phủ dự phòng và chi phí tín dụng.

**KPI cards đầu tab:** `npl_ratio`, `debt_group_2`, `llr_ratio`, `credit_cost`, `loan_loss_allowance_customer`, `credit_provision_expense`.


### 2.1. NPL - Group 2 - LLR Control Tower

**Insight cần trả lời:** Chart insight chính: rủi ro tín dụng đang xấu đi hay ngân hàng đã có đủ bộ đệm dự phòng?

**Vị trí & kích thước:** Chart lớn toàn hàng, đặt ngay sau KPI cards.

**Loại chart:** Combo chart: bar NPL amount + line NPL ratio + line LLR + line group2 ratio.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |
| `loan_loss_allowance_customer` | Dự phòng rủi ro cho vay khách hàng | `BCTC_IND_NAME` | `Dự phòng rủi ro cho vay khách hàng`, `Less: Provision for losses on loans and advances to customers`, `Dự phòng rủi  ro cho vay khách hàng` | Quỹ dự phòng trừ vào dư nợ khách hàng; dùng tính LLR nếu có nợ xấu. |
| `debt_group_2` | Nợ nhóm 2 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Chỉ báo sớm chất lượng tài sản. | Chỉ báo sớm chất lượng tài sản. |
| `debt_group_3` | Nợ nhóm 3 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Một phần nợ xấu. | Một phần nợ xấu. |
| `debt_group_4` | Nợ nhóm 4 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Một phần nợ xấu. | Một phần nợ xấu. |
| `debt_group_5` | Nợ nhóm 5 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Một phần nợ xấu nghiêm trọng nhất. | Một phần nợ xấu nghiêm trọng nhất. |
| `npl_amount` | Nợ xấu nhóm 3-5 | `DERIVED_FROM_EXTENSION` | `DERIVED_FROM_EXTENSION`; debt_group_3 + debt_group_4 + debt_group_5 | debt_group_3 + debt_group_4 + debt_group_5 |
| `npl_ratio` | NPL Ratio | `DERIVED_FROM_EXTENSION` | `DERIVED_FROM_EXTENSION`; npl_amount / gross_customer_loans | npl_amount / gross_customer_loans |
| `llr_ratio` | Coverage Ratio / LLR | `DERIVED_FROM_BCTC_AND_EXTENSION` | `DERIVED_FROM_BCTC_AND_EXTENSION`; ABS(loan_loss_allowance_customer) / npl_amount | ABS(loan_loss_allowance_customer) / npl_amount |

**Công thức / xử lý dữ liệu:**

```text
npl_amount = debt_group_3 + debt_group_4 + debt_group_5
npl_ratio = npl_amount / gross_customer_loans
group2_ratio = debt_group_2 / gross_customer_loans
llr_ratio = ABS(loan_loss_allowance_customer) / npl_amount
```

**Tooltip bắt buộc:**

```text
Kỳ: Q4/2025
NPL: 1.85% (+0.25 điểm % YoY) → xấu
Nợ nhóm 2: 2.6% (+0.8 điểm % YoY) → cảnh báo sớm
LLR: 108% (-18 điểm % YoY) → bộ đệm suy yếu
Diễn giải: NPL chưa vượt 3% nhưng pipeline rủi ro đang tăng.
```

**Bảng số liệu đi kèm:** `period | gross_loans | debt_group_2 | debt_group_3 | debt_group_4 | debt_group_5 | npl_amount | npl_ratio | group2_ratio | allowance | llr_ratio`

**Rule BA / cảnh báo:** NPL > 3% là critical; Group 2 tăng >30% YoY là warning; LLR < 100% là watch, <50% critical.



### 2.2. Debt Migration Stack — nợ đang dịch chuyển xấu hay cải thiện?

**Insight cần trả lời:** Giải thích nguyên nhân NPL bằng cơ cấu nhóm nợ qua thời gian.

**Vị trí & kích thước:** Chart giải thích lớn 2/3 hàng.

**Loại chart:** 100% stacked bar theo nhóm nợ 1-5.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `debt_group_1` | Nợ nhóm 1 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Cần bảng phân loại nợ theo nhóm. | Cần bảng phân loại nợ theo nhóm. |
| `debt_group_2` | Nợ nhóm 2 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Chỉ báo sớm chất lượng tài sản. | Chỉ báo sớm chất lượng tài sản. |
| `debt_group_3` | Nợ nhóm 3 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Một phần nợ xấu. | Một phần nợ xấu. |
| `debt_group_4` | Nợ nhóm 4 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Một phần nợ xấu. | Một phần nợ xấu. |
| `debt_group_5` | Nợ nhóm 5 | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Một phần nợ xấu nghiêm trọng nhất. | Một phần nợ xấu nghiêm trọng nhất. |
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |

**Công thức / xử lý dữ liệu:**

```text
debt_group_pct_i = debt_group_i / gross_customer_loans
migration_signal = change(group2_pct) + change(group3_5_pct)
```

**Tooltip bắt buộc:**

```text
Nhóm nợ: Nhóm 2
Tỷ trọng: 2.6%
YoY: +0.8 điểm %
Ý nghĩa: tín hiệu nợ xấu tương lai; cần theo dõi trước khi chuyển sang nhóm 3-5.
```

**Bảng số liệu đi kèm:** `period | debt_group | amount | pct_total_loans | QoQ | YoY | warning_flag`

**Rule BA / cảnh báo:** Dữ liệu nhóm nợ luôn là EXTENSION_THUYET_MINH; không lấy từ BCTC tổng hợp.



### 2.3. Provision Waterfall — ngân hàng đang chủ động trích lập hay dùng dự phòng để xử lý nợ?

**Insight cần trả lời:** Đối soát quỹ dự phòng: đầu kỳ, trích lập, hoàn nhập, sử dụng/xóa nợ, cuối kỳ.

**Vị trí & kích thước:** Waterfall nửa hàng.

**Loại chart:** Waterfall + bảng roll-forward.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `loan_loss_allowance_customer` | Dự phòng rủi ro cho vay khách hàng | `BCTC_IND_NAME` | `Dự phòng rủi ro cho vay khách hàng`, `Less: Provision for losses on loans and advances to customers`, `Dự phòng rủi  ro cho vay khách hàng` | Quỹ dự phòng trừ vào dư nợ khách hàng; dùng tính LLR nếu có nợ xấu. |
| `credit_provision_expense` | Chi phí dự phòng RRTD | `BCTC_IND_NAME` | `Chi phí dự phòng rủi ro tín dụng` | Chi phí rủi ro trích vào P&L; tăng là xấu trừ khi chủ động tăng bộ đệm. |

**Công thức / xử lý dữ liệu:**

```text
allowance_end = allowance_begin + provision_expense - reversal - write_off - fx_or_other_adjustments
Nếu không có roll-forward extension: dùng allowance cuối kỳ và provision expense, phần write-off là N/A.
```

**Tooltip bắt buộc:**

```text
Khoản mục: Trích lập mới
Giá trị: +3,200 tỷ
Tác động: tăng bộ đệm dự phòng nhưng làm giảm lợi nhuận kỳ này.
Nguồn: P&L Chi phí dự phòng RRTD.
```

**Bảng số liệu đi kèm:** `period | allowance_begin | provision_expense | reversal | write_off | other_adjustment | allowance_end | reconciliation_diff`

**Rule BA / cảnh báo:** Chênh lệch đối soát lớn phải hiện data_quality_flag.



### 2.4. Collateral Mix — nợ có được bảo đảm bằng tài sản đủ thanh khoản không?

**Insight cần trả lời:** Không chỉ xem có TSBĐ, mà xem loại TSBĐ. BĐS cao có thể giảm loss given default nhưng thanh khoản kém khi thị trường xấu.

**Vị trí & kích thước:** Donut/stacked bar nửa hàng.

**Loại chart:** Donut kỳ hiện tại + trend tỷ trọng BĐS.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `collateral_real_estate` | TSBĐ bất động sản | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Cơ cấu tài sản bảo đảm. | Cơ cấu tài sản bảo đảm. |
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |

**Công thức / xử lý dữ liệu:**

```text
collateral_pct_i = collateral_i / total_collateral
real_estate_collateral_ratio = collateral_real_estate / total_collateral
```

**Tooltip bắt buộc:**

```text
TSBĐ: Bất động sản
Tỷ trọng: 74%
Ý nghĩa: bảo đảm cao nhưng rủi ro thanh khoản và định giá khi thị trường BĐS giảm.
```

**Bảng số liệu đi kèm:** `period | collateral_type | collateral_value | pct_total | related_loan_balance | note`

**Rule BA / cảnh báo:** Bắt buộc đánh dấu source là thuyết minh; không suy diễn từ dư nợ BĐS.


**Bảng số liệu bắt buộc Tab 2:** `Asset quality detail table` gồm period, gross_loans, debt_group_1..5, NPL amount, NPL ratio, group2 ratio, allowance, LLR, provision expense, credit cost, write_off, collateral breakdown, warning_flag.

---

# TAB 3 — HIỆU QUẢ KINH DOANH & DUPONT

**Mục tiêu:** Bóc tách lợi nhuận ngân hàng: biên lãi, hiệu quả chi phí, chi phí rủi ro, thuế và đòn bẩy.

**KPI cards đầu tab:** `net_interest_income`, `nim`, `cir`, `credit_cost`, `profit_before_tax`, `roe`.


### 3.1. Bank DuPont Tree — ROE đến từ đâu?

**Insight cần trả lời:** Chart insight chính của tab: phân rã ROE thành các động lực để biết ngân hàng sinh lời nhờ biên lãi, kiểm soát chi phí, ít dự phòng, hay đòn bẩy cao.

**Vị trí & kích thước:** Chart lớn toàn hàng, dạng cây/node. Node nào kéo ROE xấu đi phải có màu cảnh báo.

**Loại chart:** Tree decomposition / Sankey nhẹ.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `roe` | ROE | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; net_profit / AVG(equity) | net_profit / AVG(equity) |
| `net_profit` | Lợi nhuận sau thuế | `BCTC_IND_NAME` | `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp`, `LNST của cổ đông công ty mẹ`, `Lợi nhuận sau thuế của cổ đông công ty mẹ`, ... (5 aliases) | Lợi nhuận cuối cùng cho cổ đông; mẫu số ROE/ROA. |
| `equity` | Vốn chủ sở hữu | `BCTC_IND_NAME` | `Vốn chủ sở hữu`, `VỐN CHỦ SỞ HỮU (đồng)`, `VỐN CHỦ SỞ HỮU`, `NGUỒN VỐN CHỦ SỞ HỮU`, ... (5 aliases) | Bộ đệm vốn hấp thụ lỗ; mẫu số ROE và đòn bẩy. |
| `total_assets` | Tổng tài sản | `BCTC_IND_NAME` | `Tổng cộng tài sản`, `TỔNG CỘNG TÀI SẢN (đồng)`, `TỔNG CỘNG TÀI SẢN` | Quy mô bảng cân đối, nền tảng tính tăng trưởng và đòn bẩy. |
| `total_operating_income` | Tổng thu nhập hoạt động - TOI | `BCTC_IND_NAME` | `Tổng thu nhập hoạt động`, `Total operating revenue` | Mẫu số CIR và thước đo quy mô doanh thu hoạt động. |
| `operating_expense` | Chi phí hoạt động - Opex | `BCTC_IND_NAME` | `Chi phí hoạt động` | Chi phí vận hành ngân hàng; mẫu số tính efficiency. |
| `credit_provision_expense` | Chi phí dự phòng RRTD | `BCTC_IND_NAME` | `Chi phí dự phòng rủi ro tín dụng` | Chi phí rủi ro trích vào P&L; tăng là xấu trừ khi chủ động tăng bộ đệm. |
| `interest_income` | Thu nhập lãi và tương tự | `BCTC_IND_NAME` | `Interest and Similar Income`, `Thu nhập lãi và các khoản tương tự`, `Thu nhập lãi` | Doanh thu lãi gộp từ cho vay/chứng khoán/liên ngân hàng. |
| `net_interest_income` | Thu nhập lãi thuần - NII | `BCTC_IND_NAME` | `Net Interest Income`, `Thu nhập lãi thuần` | Động cơ lợi nhuận chính của ngân hàng. |
| `average_earning_assets` | Tài sản sinh lời bình quân | `DERIVED_OR_EXTENSION` | `DERIVED_OR_EXTENSION`; Có thể tính trung bình từ earning assets đầu/cuối kỳ nếu có dữ liệu quý. | Có thể tính trung bình từ earning assets đầu/cuối kỳ nếu có dữ liệu quý. |

**Công thức / xử lý dữ liệu:**

```text
ROE = Net Profit / Avg Equity
ROE = Tax Burden × Risk Cost Burden × Efficiency × Revenue Yield × Leverage
Tax Burden = Net Profit / PBT
Risk Cost Burden = PBT / Pre-Provision Profit
Efficiency = Pre-Provision Profit / TOI = 1 - CIR
Revenue Yield = TOI / Avg Assets
Leverage = Avg Assets / Avg Equity
NIM = NII / Avg Earning Assets (hiển thị node phụ)
```

**Tooltip bắt buộc:**

```text
Node: Risk Cost Burden
Giá trị: 0.62x
Ý nghĩa: 38% lợi nhuận trước dự phòng bị ăn mòn bởi chi phí dự phòng.
So với YoY: -0.12x → xấu.
```

**Bảng số liệu đi kèm:** `period | component | value | formula | QoQ | YoY | contribution_to_roe | data_source`

**Rule BA / cảnh báo:** Không hiển thị DuPont nếu thiếu equity hoặc net_profit; các node extension được N/A rõ ràng.



### 3.2. NII & NIM Trend — tăng trưởng lãi thuần có đi kèm giữ biên?

**Insight cần trả lời:** Giải thích động lực lợi nhuận lõi. NII tăng nhưng NIM giảm nghĩa là ngân hàng đang đổi biên lấy quy mô hoặc chịu áp lực chi phí vốn.

**Vị trí & kích thước:** Chart lớn 2/3 hàng.

**Loại chart:** Bar NII + line NIM + optional line cost_of_funds.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `net_interest_income` | Thu nhập lãi thuần - NII | `BCTC_IND_NAME` | `Net Interest Income`, `Thu nhập lãi thuần` | Động cơ lợi nhuận chính của ngân hàng. |
| `nim` | NIM | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; net_interest_income / average_earning_assets | net_interest_income / average_earning_assets |
| `interest_income` | Thu nhập lãi và tương tự | `BCTC_IND_NAME` | `Interest and Similar Income`, `Thu nhập lãi và các khoản tương tự`, `Thu nhập lãi` | Doanh thu lãi gộp từ cho vay/chứng khoán/liên ngân hàng. |
| `interest_expense` | Chi phí lãi và tương tự | `BCTC_IND_NAME` | `Chi phí lãi và các khoản tương tự`, `Interest and Similar Expenses`, `Chi phí lãi và các chi phí tương tự` | Chi phí vốn; tăng nhanh hơn thu nhập lãi sẽ làm co NIM. |
| `average_earning_assets` | Tài sản sinh lời bình quân | `DERIVED_OR_EXTENSION` | `DERIVED_OR_EXTENSION`; Có thể tính trung bình từ earning assets đầu/cuối kỳ nếu có dữ liệu quý. | Có thể tính trung bình từ earning assets đầu/cuối kỳ nếu có dữ liệu quý. |
| `cost_of_funds` | Cost of Funds | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; ABS(interest_expense) / AVG(interest_bearing_liabilities) | ABS(interest_expense) / AVG(interest_bearing_liabilities) |

**Công thức / xử lý dữ liệu:**

```text
NII = interest_income - interest_expense hoặc dùng net_interest_income trực tiếp
NIM = net_interest_income / average_earning_assets
Cost of funds = ABS(interest_expense) / AVG(interest_bearing_liabilities)
```

**Tooltip bắt buộc:**

```text
Q4/2025
NII: 12,500 tỷ (+9.4% YoY)
NIM: 3.25% (-35 bps YoY)
Diễn giải: thu nhập lãi tăng nhờ quy mô, nhưng biên bị co do chi phí vốn tăng.
```

**Bảng số liệu đi kèm:** `period | interest_income | interest_expense | net_interest_income | average_earning_assets | nim | cost_of_funds | QoQ | YoY`

**Rule BA / cảnh báo:** Khi NII tăng và NIM giảm >20 bps YoY, hiện badge “Scale-over-margin”.



### 3.3. Pre-provision Profit vs Provision — lợi nhuận bị rủi ro ăn mòn bao nhiêu?

**Insight cần trả lời:** Bóc tách phần lợi nhuận vận hành bị chi phí dự phòng lấy đi.

**Vị trí & kích thước:** Waterfall/stacked bar nửa hàng.

**Loại chart:** Bar: Pre-provision profit, provision expense, PBT; line provision/PPOP.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `pre_provision_profit` | Lợi nhuận trước dự phòng | `BCTC_IND_NAME` | `LN từ HĐKD trước CF dự phòng`, `Operating Profit before Provision`, `Lợi nhuận từ HDKD trước chi phí dự phòng rủi ro tín dụng` | Khả năng tạo lợi nhuận trước khi bị rủi ro tín dụng ăn mòn. |
| `credit_provision_expense` | Chi phí dự phòng RRTD | `BCTC_IND_NAME` | `Chi phí dự phòng rủi ro tín dụng` | Chi phí rủi ro trích vào P&L; tăng là xấu trừ khi chủ động tăng bộ đệm. |
| `profit_before_tax` | Lợi nhuận trước thuế - PBT | `BCTC_IND_NAME` | `LN trước thuế`, `Lợi nhuận trước thuế`, `Lãi/Lỗ ròng trước thuế`, `Lợi nhuận/Lỗ thuần trước thuế` | Kết quả lợi nhuận trước thuế, sau dự phòng. |
| `credit_cost` | Credit Cost annualized | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; ABS(credit_provision_expense) / AVG(gross_customer_loans) × annualization_factor | ABS(credit_provision_expense) / AVG(gross_customer_loans) × annualization_factor |

**Công thức / xử lý dữ liệu:**

```text
provision_burden = ABS(credit_provision_expense) / pre_provision_profit
PBT = pre_provision_profit - ABS(credit_provision_expense) + other_adjustments
```

**Tooltip bắt buộc:**

```text
Chi phí dự phòng/PPOP: 42%
Ý nghĩa: cứ 100 đồng lợi nhuận trước dự phòng thì 42 đồng dùng để hấp thụ rủi ro tín dụng.
```

**Bảng số liệu đi kèm:** `period | pre_provision_profit | credit_provision_expense | provision_burden | profit_before_tax | credit_cost | QoQ | YoY`

**Rule BA / cảnh báo:** Provision burden >50% là warning; >80% là critical trừ trường hợp trích lập chủ động lớn.



### 3.4. Efficiency Waterfall — CIR thay đổi vì doanh thu hay chi phí?

**Insight cần trả lời:** CIR tăng có thể do chi phí tăng, hoặc do TOI giảm. Waterfall giúp phân tách nguyên nhân.

**Vị trí & kích thước:** Chart giải thích nửa hàng.

**Loại chart:** Waterfall từ CIR kỳ trước đến CIR kỳ hiện tại.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `cir` | CIR | `DERIVED_FROM_BCTC` | `DERIVED_FROM_BCTC`; ABS(operating_expense) / total_operating_income | ABS(operating_expense) / total_operating_income |
| `total_operating_income` | Tổng thu nhập hoạt động - TOI | `BCTC_IND_NAME` | `Tổng thu nhập hoạt động`, `Total operating revenue` | Mẫu số CIR và thước đo quy mô doanh thu hoạt động. |
| `operating_expense` | Chi phí hoạt động - Opex | `BCTC_IND_NAME` | `Chi phí hoạt động` | Chi phí vận hành ngân hàng; mẫu số tính efficiency. |
| `net_interest_income` | Thu nhập lãi thuần - NII | `BCTC_IND_NAME` | `Net Interest Income`, `Thu nhập lãi thuần` | Động cơ lợi nhuận chính của ngân hàng. |
| `net_fee_income` | Lãi thuần dịch vụ | `BCTC_IND_NAME` | `Lãi thuần từ hoạt động dịch vụ`, `Net Fee and Commission Income` | Thu dịch vụ ròng; cần bóc thuyết minh nếu muốn bancassurance/thẻ/thanh toán. |

**Công thức / xử lý dữ liệu:**

```text
CIR = ABS(operating_expense) / total_operating_income
ΔCIR = effect_from_opex_change + effect_from_toi_change + mix_effect
Có thể dùng decomposition xấp xỉ nếu không có từng hạng mục opex.
```

**Tooltip bắt buộc:**

```text
Yếu tố: TOI giảm
Tác động: +2.4 điểm % vào CIR
Ý nghĩa: CIR xấu đi chủ yếu do doanh thu giảm, không chỉ do chi phí tăng.
```

**Bảng số liệu đi kèm:** `period | cir | operating_expense | total_operating_income | delta_cir | opex_effect | revenue_effect | mix_effect`

**Rule BA / cảnh báo:** CIR là lower-is-better: tăng thì màu đỏ, giảm màu xanh.


**Bảng số liệu bắt buộc Tab 3:** `Profitability table` gồm period, NII, NIM, TOI, Opex, CIR, PPOP, provision expense, provision_burden, PBT, tax, net_profit, avg_assets, avg_equity, ROA, ROE, DuPont components.

---

# TAB 4 — THU NHẬP & CHI PHÍ / CHẤT LƯỢNG LỢI NHUẬN

**Mục tiêu:** Đánh giá lợi nhuận đến từ thu nhập lõi bền vững hay các khoản biến động như trading/khác; kiểm soát cơ cấu chi phí.

**KPI cards đầu tab:** `total_operating_income`, `net_interest_income`, `net_fee_income`, `operating_expense`, `profit_before_tax`, `net_profit`.


### 4.1. TOI Mix — chất lượng doanh thu hoạt động

**Insight cần trả lời:** Chart insight chính: doanh thu ngân hàng phụ thuộc bao nhiêu vào NII, fee, trading, ngoại hối, khoản khác.

**Vị trí & kích thước:** Chart lớn toàn hàng. Vẽ stacked bar theo quý; line non-interest income ratio.

**Loại chart:** Stacked bar + line ratio.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `total_operating_income` | Tổng thu nhập hoạt động - TOI | `BCTC_IND_NAME` | `Tổng thu nhập hoạt động`, `Total operating revenue` | Mẫu số CIR và thước đo quy mô doanh thu hoạt động. |
| `net_interest_income` | Thu nhập lãi thuần - NII | `BCTC_IND_NAME` | `Net Interest Income`, `Thu nhập lãi thuần` | Động cơ lợi nhuận chính của ngân hàng. |
| `net_fee_income` | Lãi thuần dịch vụ | `BCTC_IND_NAME` | `Lãi thuần từ hoạt động dịch vụ`, `Net Fee and Commission Income` | Thu dịch vụ ròng; cần bóc thuyết minh nếu muốn bancassurance/thẻ/thanh toán. |
| `fx_gold_gain` | Lãi/lỗ thuần ngoại hối và vàng | `BCTC_IND_NAME` | `Net gain (loss) from foreign currency and gold dealings`, `Kinh doanh ngoại hối và vàng` | Nguồn thu biến động theo thị trường ngoại hối/vàng. |
| `trading_securities_gain` | Lãi/lỗ chứng khoán kinh doanh | `BCTC_IND_NAME` | `Net gain (loss) from trading of trading securities`, `Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh` | Trading income, chất lượng lợi nhuận thấp hơn NII/fee nếu biến động lớn. |
| `investment_securities_gain` | Lãi/lỗ chứng khoán đầu tư | `BCTC_IND_NAME` | `Net gain (loss) from disposal of investment securities`, `Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư` | Lãi/lỗ hiện thực hóa từ danh mục đầu tư. |
| `other_net_income` | Thu nhập/chi phí khác thuần | `BCTC_IND_NAME` | `Net Other income/(expenses)`, `Net Other income/expenses`, `Thu nhập/Chi phí khác` | Các khoản ngoài hoạt động chính; cần cảnh báo nếu tỷ trọng lớn bất thường. |

**Công thức / xử lý dữ liệu:**

```text
non_interest_income = net_fee_income + fx_gold_gain + trading_securities_gain + investment_securities_gain + other_net_income
non_interest_income_ratio = non_interest_income / total_operating_income
toi_component_pct_i = component_i / total_operating_income
```

**Tooltip bắt buộc:**

```text
Thành phần: Lãi thuần dịch vụ
Giá trị: 2,100 tỷ
Tỷ trọng TOI: 12.5%
Ý nghĩa: nguồn thu ngoài lãi có tính lặp lại hơn trading nếu đến từ thanh toán/thẻ.
```

**Bảng số liệu đi kèm:** `period | nii | net_fee_income | fx_gold_gain | trading_gain | investment_gain | other_net_income | toi | pct_toi | QoQ | YoY`

**Rule BA / cảnh báo:** Khoản “other” hoặc trading chiếm tỷ trọng tăng đột biến phải có alert chất lượng lợi nhuận.



### 4.2. Fee Income Drilldown — fee đến từ bancassurance, thẻ hay thanh toán?

**Insight cần trả lời:** Giải thích chất lượng thu phí. Thu phí từ thanh toán/thẻ thường bền hơn phí upfront bancassurance.

**Vị trí & kích thước:** Chart giải thích nửa hàng.

**Loại chart:** Stacked bar hoặc treemap; nếu thiếu thuyết minh thì N/A.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `net_fee_income` | Lãi thuần dịch vụ | `BCTC_IND_NAME` | `Lãi thuần từ hoạt động dịch vụ`, `Net Fee and Commission Income` | Thu dịch vụ ròng; cần bóc thuyết minh nếu muốn bancassurance/thẻ/thanh toán. |
| `fee_income` | Thu nhập dịch vụ | `BCTC_IND_NAME` | `Fees and Comission Income`, `Thu nhập từ hoạt động dịch vụ` | Nguồn thu ngoài lãi; thường bền hơn trading nếu đến từ thanh toán/thẻ. |
| `fee_expense` | Chi phí dịch vụ | `BCTC_IND_NAME` | `Chi phí hoạt động dịch vụ`, `Fees and Comission Expenses` | Chi phí trực tiếp để tạo thu dịch vụ. |

**Công thức / xử lý dữ liệu:**

```text
net_fee_income = fee_income - fee_expense
fee_breakdown_pct_i = fee_component_i / fee_income
Các component chi tiết cần extension: bancassurance, card, payment, settlement, guarantee, brokerage/custody nếu có.
```

**Tooltip bắt buộc:**

```text
Mảng phí: Thanh toán
Giá trị: 850 tỷ
Tỷ trọng phí gộp: 28%
Ý nghĩa: phí lặp lại, chất lượng tốt hơn phí upfront một lần.
```

**Bảng số liệu đi kèm:** `period | fee_component | fee_income | fee_expense | net_fee | pct_fee_income | QoQ | YoY | source`

**Rule BA / cảnh báo:** Không có fee breakdown thì chỉ vẽ net fee income tổng và nhắc cần thuyết minh.



### 4.3. Opex Mix — chi phí vận hành tăng ở đâu?

**Insight cần trả lời:** Tách chi phí nhân sự, khấu hao/IT, chi phí quản lý khác nếu có extension; nếu không chỉ hiển thị Opex tổng.

**Vị trí & kích thước:** Chart giải thích nửa hàng.

**Loại chart:** Donut kỳ hiện tại + stacked bar trend.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `operating_expense` | Chi phí hoạt động - Opex | `BCTC_IND_NAME` | `Chi phí hoạt động` | Chi phí vận hành ngân hàng; mẫu số tính efficiency. |

**Công thức / xử lý dữ liệu:**

```text
opex_total = ABS(operating_expense)
opex_breakdown_pct_i = opex_component_i / opex_total
Opex components cần extension: staff_cost, depreciation_it, admin_expense, branch_cost, marketing.
```

**Tooltip bắt buộc:**

```text
Chi phí: Nhân sự
Tỷ trọng: 48% Opex
Ý nghĩa: nếu tăng nhanh hơn TOI, CIR sẽ xấu đi.
```

**Bảng số liệu đi kèm:** `period | opex_component | amount | pct_opex | QoQ | YoY | data_source`

**Rule BA / cảnh báo:** Không suy diễn chi phí nhân sự từ `Chi phí hoạt động` nếu không có thuyết minh.



### 4.4. NII vs Net Profit Divergence — doanh thu lõi tăng nhưng lợi nhuận có đi cùng không?

**Insight cần trả lời:** Phát hiện trường hợp NII tăng nhưng lợi nhuận giảm do dự phòng hoặc Opex.

**Vị trí & kích thước:** Chart lớn toàn hàng sau các chart cơ cấu.

**Loại chart:** Two-line indexed chart: NII index, net_profit index, provision index.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `net_interest_income` | Thu nhập lãi thuần - NII | `BCTC_IND_NAME` | `Net Interest Income`, `Thu nhập lãi thuần` | Động cơ lợi nhuận chính của ngân hàng. |
| `net_profit` | Lợi nhuận sau thuế | `BCTC_IND_NAME` | `Lợi nhuận sau thuế thu nhập DN`, `Lợi nhuận sau thuế thu nhập doanh nghiệp`, `LNST của cổ đông công ty mẹ`, `Lợi nhuận sau thuế của cổ đông công ty mẹ`, ... (5 aliases) | Lợi nhuận cuối cùng cho cổ đông; mẫu số ROE/ROA. |
| `credit_provision_expense` | Chi phí dự phòng RRTD | `BCTC_IND_NAME` | `Chi phí dự phòng rủi ro tín dụng` | Chi phí rủi ro trích vào P&L; tăng là xấu trừ khi chủ động tăng bộ đệm. |
| `operating_expense` | Chi phí hoạt động - Opex | `BCTC_IND_NAME` | `Chi phí hoạt động` | Chi phí vận hành ngân hàng; mẫu số tính efficiency. |

**Công thức / xử lý dữ liệu:**

```text
index_metric_t = metric_t / metric_base_period * 100
divergence = growth(net_interest_income) - growth(net_profit)
Nếu divergence > threshold và provision tăng → nguyên nhân chính là credit risk.
```

**Tooltip bắt buộc:**

```text
NII Index: 128
Net Profit Index: 94
Diễn giải: thu nhập lãi lõi tăng 28% so với kỳ gốc nhưng lợi nhuận giảm 6%; cần xem dự phòng và Opex.
```

**Bảng số liệu đi kèm:** `period | nii | nii_index | net_profit | net_profit_index | provision_expense | opex | divergence | root_cause_label`

**Rule BA / cảnh báo:** Divergence >20 điểm index là warning.


**Bảng số liệu bắt buộc Tab 4:** `Income expense detail table` gồm period, TOI components, component_pct, fee breakdown nếu có, Opex components nếu có, P&L line items, QoQ, YoY, margin, data_source.

---

# TAB 5 — THANH KHOẢN & ALM GAP

**Mục tiêu:** Đánh giá ngân hàng có rủi ro mất cân đối kỳ hạn/tái cấp vốn không. Đây là tab dành cho Treasury/ALM và risk officer.

**KPI cards đầu tab:** `ldr_regulatory`, `smlr_ratio`, `liquid_assets`, `casa_balance`, `customer_deposits`, `interbank_liabilities`.


### 5.1. Cumulative ALM Gap — ngân hàng thiếu thanh khoản ở bucket nào?

**Insight cần trả lời:** Chart insight chính: thấy ngay khe hở thanh khoản ngắn hạn và rủi ro rollover.

**Vị trí & kích thước:** Chart lớn toàn hàng, cố định đầu tab sau KPI cards.

**Loại chart:** Bar net gap theo bucket + line cumulative gap.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `alm_bucket_assets` | Tài sản đáo hạn theo bucket | `EXTENSION_ALM` | `EXTENSION_ALM`; Ma trận đáo hạn tài sản theo rổ kỳ hạn. | Ma trận đáo hạn tài sản theo rổ kỳ hạn. |
| `alm_bucket_liabilities` | Nợ đáo hạn theo bucket | `EXTENSION_ALM` | `EXTENSION_ALM`; Ma trận đáo hạn nợ phải trả theo rổ kỳ hạn. | Ma trận đáo hạn nợ phải trả theo rổ kỳ hạn. |
| `liquid_assets` | Tài sản thanh khoản cao | `EXTENSION_ALM` | `EXTENSION_ALM`; Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury. | Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury. |

**Công thức / xử lý dữ liệu:**

```text
net_gap_bucket = asset_maturity_amount - liability_maturity_amount
cumulative_gap_bucket_n = SUM(net_gap_bucket from earliest bucket to bucket_n)
cumulative_gap_ratio = cumulative_gap / total_assets hoặc / customer_deposits
```

**Tooltip bắt buộc:**

```text
Bucket: <1 tháng
Tài sản đáo hạn: 120,000 tỷ
Nợ đáo hạn: 210,000 tỷ
Net gap: -90,000 tỷ
Cumulative gap: -90,000 tỷ
Ý nghĩa: áp lực tái cấp vốn ngắn hạn lớn nếu thị trường đóng băng.
```

**Bảng số liệu đi kèm:** `period | bucket | asset_maturity_amount | liability_maturity_amount | net_gap | cumulative_gap | cumulative_gap_ratio | warning_flag`

**Rule BA / cảnh báo:** Cumulative gap âm lớn ở bucket <1M hoặc 1-3M phải tô đỏ và hiện global alert.



### 5.2. Regulatory Liquidity Ratios — LDR, SMLR, liquid assets

**Insight cần trả lời:** Kết hợp chỉ tiêu quản trị NHNN và nội bộ để theo dõi sức khỏe thanh khoản.

**Vị trí & kích thước:** Chart 2/3 hàng.

**Loại chart:** Gauge cards + trend lines.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `gross_customer_loans` | Cho vay khách hàng gộp | `BCTC_IND_NAME` | `_Cho vay khách hàng`, `Loans and advances to customers`, `Cho vay khách hàng` | Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost. |
| `customer_deposits` | Tiền gửi khách hàng | `BCTC_IND_NAME` | `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng` | Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá. |
| `ldr_regulatory` | LDR regulatory | `EXTENSION_REGULATORY` | `EXTENSION_REGULATORY`; Tỷ lệ cấp tín dụng so với nguồn vốn huy động theo định nghĩa NHNN. | Tỷ lệ cấp tín dụng so với nguồn vốn huy động theo định nghĩa NHNN. |
| `smlr_ratio` | SMLR | `EXTENSION_REGULATORY` | `EXTENSION_REGULATORY`; Tỷ lệ vốn ngắn hạn cho vay trung dài hạn. | Tỷ lệ vốn ngắn hạn cho vay trung dài hạn. |
| `liquid_assets` | Tài sản thanh khoản cao | `EXTENSION_ALM` | `EXTENSION_ALM`; Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury. | Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury. |

**Công thức / xử lý dữ liệu:**

```text
simple_ldr = gross_customer_loans / customer_deposits
ldr_regulatory = lấy từ extension nếu ngân hàng công bố/nhập từ NHNN definition
smlr_ratio = short_term_funding_used_for_medium_long_term_loans / short_term_funding
liquid_asset_ratio = liquid_assets / total_assets
```

**Tooltip bắt buộc:**

```text
Chỉ tiêu: LDR
Giá trị: 84.5%
Ý nghĩa: đo mức độ sử dụng nguồn huy động để cấp tín dụng. Càng cao càng căng thanh khoản, nhưng cần so với định nghĩa NHNN.
```

**Bảng số liệu đi kèm:** `period | simple_ldr | ldr_regulatory | smlr_ratio | liquid_assets | liquid_asset_ratio | customer_deposits | gross_loans`

**Rule BA / cảnh báo:** Không gán simple_ldr là regulatory LDR nếu chưa có extension.



### 5.3. Funding Runoff Sensitivity — nếu tiền gửi rút ra thì thanh khoản còn bao lâu?

**Insight cần trả lời:** Mô phỏng đơn giản để thấy mức chịu đựng của tài sản thanh khoản trước các kịch bản rút tiền.

**Vị trí & kích thước:** Chart giải thích nửa hàng.

**Loại chart:** Line/area scenario chart.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `liquid_assets` | Tài sản thanh khoản cao | `EXTENSION_ALM` | `EXTENSION_ALM`; Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury. | Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury. |
| `customer_deposits` | Tiền gửi khách hàng | `BCTC_IND_NAME` | `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng` | Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá. |
| `casa_balance` | CASA balance | `EXTENSION_THUYET_MINH` | `EXTENSION_THUYET_MINH`; Số dư tiền gửi không kỳ hạn từ thuyết minh tiền gửi khách hàng. Không lấy từ ind_name nếu không có dòng riêng. | Số dư tiền gửi không kỳ hạn từ thuyết minh tiền gửi khách hàng. Không lấy từ ind_name nếu không có dòng riêng. |
| `interbank_liabilities` | Tiền gửi và vay TCTD khác | `BCTC_IND_NAME` | `Deposits and borrowings from other credit institutions`, `Tiền gửi và vay các Tổ chức tín dụng khác` | Nguồn vốn bán buôn, nhạy cảm với điều kiện thị trường. |

**Công thức / xử lý dữ liệu:**

```text
scenario_outflow = customer_deposits * runoff_rate_deposit + interbank_liabilities * runoff_rate_interbank
liquidity_surplus = liquid_assets - scenario_outflow
survival_ratio = liquid_assets / scenario_outflow
Scenarios: Base, Stress, Severe.
```

**Tooltip bắt buộc:**

```text
Kịch bản: Stress
Outflow giả định: 8% tiền gửi KH + 25% liên ngân hàng
Thặng dư thanh khoản: +18,000 tỷ
Ý nghĩa: vẫn đủ tài sản lỏng cho kịch bản stress.
```

**Bảng số liệu đi kèm:** `scenario | runoff_rate_deposit | runoff_rate_interbank | estimated_outflow | liquid_assets | liquidity_surplus | survival_ratio`

**Rule BA / cảnh báo:** Đây là mô phỏng nội bộ; phải ghi rõ không phải chỉ tiêu công bố chính thức.



### 5.4. Wholesale Funding Dependency — phụ thuộc vào liên ngân hàng và giấy tờ có giá?

**Insight cần trả lời:** Tăng trưởng tín dụng dùng quá nhiều wholesale funding sẽ nhạy cảm với lãi suất và rollover risk.

**Vị trí & kích thước:** Chart nửa hàng.

**Loại chart:** Stacked area + ratio line.

**Mapping dữ liệu:**
| Metric key | Tên nghiệp vụ | Source | Mapping / công thức | Ghi chú BA |
|---|---|---|---|---|
| `customer_deposits` | Tiền gửi khách hàng | `BCTC_IND_NAME` | `Deposits from customers`, `Tiền gửi của khách hàng`, `Tiền gửi khách hàng` | Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá. |
| `interbank_liabilities` | Tiền gửi và vay TCTD khác | `BCTC_IND_NAME` | `Deposits and borrowings from other credit institutions`, `Tiền gửi và vay các Tổ chức tín dụng khác` | Nguồn vốn bán buôn, nhạy cảm với điều kiện thị trường. |
| `issued_papers` | Giấy tờ có giá phát hành | `BCTC_IND_NAME` | `Convertible bonds/CDs and other valuable papers issued`, `Phát hành giấy tờ có giá` | Nguồn vốn qua trái phiếu/chứng chỉ tiền gửi; kỳ hạn và chi phí vốn cần theo dõi. |
| `total_funding` | Tổng cộng nguồn vốn | `BCTC_IND_NAME` | `Tổng cộng nguồn vốn`, `TỔNG CỘNG NGUỒN VỐN (đồng)`, `TỔNG CỘNG NGUỒN VỐN`, `TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU`, ... (5 aliases) | Đối soát với tổng tài sản, dùng kiểm tra cân bằng kế toán. |

**Công thức / xử lý dữ liệu:**

```text
wholesale_funding = interbank_liabilities + issued_papers
wholesale_funding_ratio = wholesale_funding / total_funding
customer_deposit_ratio = customer_deposits / total_funding
```

**Tooltip bắt buộc:**

```text
Wholesale funding ratio: 18.4%
YoY: +4.2 điểm %
Ý nghĩa: mức phụ thuộc nguồn vốn bán buôn tăng, cần xem ALM gap và cost of funds.
```

**Bảng số liệu đi kèm:** `period | customer_deposits | interbank_liabilities | issued_papers | wholesale_funding | total_funding | wholesale_funding_ratio`

**Rule BA / cảnh báo:** Wholesale funding ratio tăng cùng NIM giảm là tín hiệu chi phí vốn tăng.


**Bảng số liệu bắt buộc Tab 5:** `ALM liquidity table` gồm period, bucket, asset_maturity_amount, liability_maturity_amount, net_gap, cumulative_gap, simple_ldr, regulatory_ldr, smlr, liquid_assets, wholesale_funding_ratio, warning_flag.

---

## 6. Global alerts

| Alert | Điều kiện | Mức | Thông điệp |
|---|---|---|---|
| NPL breach | `npl_ratio > 3%` | Critical | Nợ xấu vượt ngưỡng quản trị 3% |
| LLR weak | `llr_ratio < 50%` | Critical | Bộ đệm dự phòng rất mỏng so với nợ xấu |
| LLR watch | `llr_ratio < 100%` | Warning | Dự phòng chưa bao phủ 100% nợ xấu |
| Group 2 spike | `group2_ratio YoY > +30%` hoặc `+1 điểm %` | Warning | Nợ cần chú ý tăng nhanh |
| Credit cost shock | `credit_cost > peer_p75` hoặc tăng >50% YoY | Warning | Chi phí tín dụng tăng bất thường |
| CAR breach | `car_ratio < regulatory_min` | Critical | CAR dưới ngưỡng an toàn vốn |
| Liquidity gap | `cumulative_gap_ratio < -10% total_assets` ở bucket ngắn hạn | Critical | Khe hở thanh khoản ngắn hạn âm lớn |
| Profit quality | `net_profit YoY < 0` và `NII YoY > 0` | Warning | Lợi nhuận giảm dù thu nhập lãi tăng |

---

## 7. SQL patterns cho vibecoding

### 7.1. Hàm query metric theo alias

```sql
-- Pseudo SQL. Ứng dụng nên render alias list từ Metric Registry.
WITH metric_raw AS (
  SELECT
    report_period,
    SUM(value) AS metric_value
  FROM financial_statement_fact
  WHERE ticker = :ticker
    AND statement_scope = :statement_scope
    AND ind_name IN (:aliases_for_metric_key)
  GROUP BY report_period
)
SELECT *
FROM metric_raw
ORDER BY report_period;
```

### 7.2. Tính QoQ / YoY

```sql
WITH s AS (... metric by period ...)
SELECT
  report_period,
  metric_value,
  metric_value / NULLIF(LAG(metric_value, 1) OVER (ORDER BY report_period), 0) - 1 AS qoq,
  metric_value / NULLIF(LAG(metric_value, 4) OVER (ORDER BY report_period), 0) - 1 AS yoy
FROM s;
```

### 7.3. Tính NPL từ extension

```sql
SELECT
  q.report_period,
  (q.debt_group_3 + q.debt_group_4 + q.debt_group_5) AS npl_amount,
  (q.debt_group_3 + q.debt_group_4 + q.debt_group_5) / NULLIF(l.gross_customer_loans, 0) AS npl_ratio
FROM bank_credit_quality_ext q
JOIN loans_metric l
  ON q.ticker = l.ticker AND q.report_period = l.report_period;
```

---

## 8. Acceptance criteria cho AI/vibecoding

1. Mỗi tab có ít nhất một chart insight lớn ở đầu và một bảng số liệu ở cuối.
2. Mỗi chart phải có tooltip theo template chuẩn.
3. Mỗi metric lấy từ BCTC phải query bằng `aliases_for_where_ind_name`, không query bằng một tên duy nhất.
4. Metric `EXTENSION_*` không được tự suy diễn từ `ind_name`.
5. Các chỉ tiêu lower-is-better phải đảo logic màu: tăng là xấu, giảm là tốt.
6. Mọi tỷ lệ phải có `NULLIF(denominator, 0)` khi tính.
7. Expense/provision phải chuẩn hóa dấu trước khi tính waterfall.
8. Nếu dữ liệu thiếu, UI phải hiển thị `N/A`, `data_quality_flag`, và tooltip giải thích thiếu source nào.
9. Không trộn BCTC hợp nhất và riêng lẻ trong cùng chart nếu không có filter rõ ràng.
10. Bảng số liệu phải export được và chứa `mapping_key`, `source_type`, `data_source`.

---

## 9. Metric Registry JSON cho ngân hàng

> `norm_name` là tên chuẩn nghiệp vụ. `aliases_for_where_ind_name` là danh sách phải dùng trong `WHERE ind_name IN (...)`.

```json
[
  {
    "metric_key": "total_assets",
    "business_label": "Tổng tài sản",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tổng cộng tài sản"
    ],
    "aliases_for_where_ind_name": [
      "Tổng cộng tài sản",
      "TỔNG CỘNG TÀI SẢN (đồng)",
      "TỔNG CỘNG TÀI SẢN"
    ],
    "old_ind_code_reference": [
      "tong_ts"
    ],
    "formula": "SUM(value) WHERE ind_name IN (total_assets.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Quy mô bảng cân đối, nền tảng tính tăng trưởng và đòn bẩy.",
    "notes": ""
  },
  {
    "metric_key": "total_funding",
    "business_label": "Tổng cộng nguồn vốn",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tổng cộng nguồn vốn",
      "Tổng nợ phải trả và vốn chủ sở hữu",
      "Tổng cộng nợ phải trả và vốn chủ sở hữu"
    ],
    "aliases_for_where_ind_name": [
      "Tổng cộng nguồn vốn",
      "TỔNG CỘNG NGUỒN VỐN (đồng)",
      "TỔNG CỘNG NGUỒN VỐN",
      "TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU",
      "TỔNG CỘNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU"
    ],
    "old_ind_code_reference": [
      "tong_nv",
      "no_phai_tra"
    ],
    "formula": "SUM(value) WHERE ind_name IN (total_funding.aliases)",
    "direction": "neutral",
    "business_meaning": "Đối soát với tổng tài sản, dùng kiểm tra cân bằng kế toán.",
    "notes": ""
  },
  {
    "metric_key": "customer_deposits",
    "business_label": "Tiền gửi khách hàng",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tiền gửi của khách hàng",
      "Tiền gửi khách hàng"
    ],
    "aliases_for_where_ind_name": [
      "Deposits from customers",
      "Tiền gửi của khách hàng",
      "Tiền gửi khách hàng"
    ],
    "old_ind_code_reference": [
      "tien_gui_cua_khach_hang"
    ],
    "formula": "SUM(value) WHERE ind_name IN (customer_deposits.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Nguồn vốn lõi của ngân hàng; tăng bền vững tốt hơn tăng bằng liên ngân hàng/giấy tờ có giá.",
    "notes": ""
  },
  {
    "metric_key": "gross_customer_loans",
    "business_label": "Cho vay khách hàng gộp",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Cho vay khách hàng"
    ],
    "aliases_for_where_ind_name": [
      "_Cho vay khách hàng",
      "Loans and advances to customers",
      "Cho vay khách hàng"
    ],
    "old_ind_code_reference": [
      "cho_vay_khach_hang"
    ],
    "formula": "SUM(value) WHERE ind_name IN (gross_customer_loans.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Tài sản sinh lời lõi; mẫu số của NPL, LDR, credit cost.",
    "notes": ""
  },
  {
    "metric_key": "net_customer_loans",
    "business_label": "Cho vay khách hàng ròng",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Cho vay khách hàng ròng"
    ],
    "aliases_for_where_ind_name": [
      "Loans and advances to customers, net"
    ],
    "old_ind_code_reference": [
      "cho_vay_khach_hang_rong"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_customer_loans.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Cho vay sau dự phòng, phản ánh giá trị còn lại trên Bảng cân đối.",
    "notes": ""
  },
  {
    "metric_key": "loan_loss_allowance_customer",
    "business_label": "Dự phòng rủi ro cho vay khách hàng",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Dự phòng rủi ro cho vay khách hàng"
    ],
    "aliases_for_where_ind_name": [
      "Dự phòng rủi ro cho vay khách hàng",
      "Less: Provision for losses on loans and advances to customers",
      "Dự phòng rủi  ro cho vay khách hàng"
    ],
    "old_ind_code_reference": [
      "du_phong_rui_ro_cho_vay_khach_hang"
    ],
    "formula": "SUM(value) WHERE ind_name IN (loan_loss_allowance_customer.aliases)",
    "direction": "higher_for_risk_buffer",
    "business_meaning": "Quỹ dự phòng trừ vào dư nợ khách hàng; dùng tính LLR nếu có nợ xấu.",
    "notes": ""
  },
  {
    "metric_key": "equity",
    "business_label": "Vốn chủ sở hữu",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Vốn chủ sở hữu",
      "Nguồn vốn chủ sở hữu"
    ],
    "aliases_for_where_ind_name": [
      "Vốn chủ sở hữu",
      "VỐN CHỦ SỞ HỮU (đồng)",
      "VỐN CHỦ SỞ HỮU",
      "NGUỒN VỐN CHỦ SỞ HỮU",
      "Nguồn vốn chủ sở hữu"
    ],
    "old_ind_code_reference": [
      "vcsh"
    ],
    "formula": "SUM(value) WHERE ind_name IN (equity.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Bộ đệm vốn hấp thụ lỗ; mẫu số ROE và đòn bẩy.",
    "notes": ""
  },
  {
    "metric_key": "cash_and_sbv",
    "business_label": "Tiền mặt và tiền gửi NHNN",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tiền mặt tại quỹ (gồm cả ngân phiếu)",
      "Tiền gửi tại Ngân hàng Nhà nước Việt Nam",
      "Tiền gửi tại ngân hàng nhà nước Việt Nam",
      "Tiền gửi tại Ngân hàng Nhà nước"
    ],
    "aliases_for_where_ind_name": [
      "Tiền mặt tại quỹ (gồm cả ngân phiếu)",
      "Balances with the SBV",
      "Tiền gửi tại ngân hàng nhà nước Việt Nam",
      "Tiền gửi tại NHNN"
    ],
    "old_ind_code_reference": [
      "tien_mat_tai_quy",
      "tien_gui_tai_ngan_hang_nha_nuoc_viet_nam"
    ],
    "formula": "SUM(value) WHERE ind_name IN (cash_and_sbv.aliases)",
    "direction": "neutral",
    "business_meaning": "Tài sản thanh khoản cơ bản, không phải tài sản sinh lời chính.",
    "notes": ""
  },
  {
    "metric_key": "interbank_assets",
    "business_label": "Tiền gửi/cho vay TCTD khác",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tiền gửi tại các tổ chức tín dụng khác và cho vay các tổ chức tín dụng khác",
      "Tiền gửi và cho vay các tổ chức tín dụng khác",
      "Tiền gửi các tổ chức tín dụng khác"
    ],
    "aliases_for_where_ind_name": [
      "Placements with and loans to other credit institutions",
      "Tiền gửi tại các TCTD khác và cho vay các TCTD khác",
      "Tiền gửi và cho vay các TCTD khác",
      "Tiền gửi các tổ chức tín dụng khác"
    ],
    "old_ind_code_reference": [
      "tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac",
      "tien_gui_cac_to_chuc_tin_dung_khac"
    ],
    "formula": "SUM(value) WHERE ind_name IN (interbank_assets.aliases)",
    "direction": "neutral",
    "business_meaning": "Tài sản liên ngân hàng, vừa sinh lời vừa hỗ trợ thanh khoản.",
    "notes": ""
  },
  {
    "metric_key": "trading_securities",
    "business_label": "Chứng khoán kinh doanh",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chứng khoán kinh doanh",
      "Chứng khoán kinh doanh ròng"
    ],
    "aliases_for_where_ind_name": [
      "_Chứng khoán kinh doanh",
      "Chứng khoán kinh doanh",
      "Trading Securities",
      "Trading Securities, net"
    ],
    "old_ind_code_reference": [
      "chung_khoan_kinh_doanh",
      "chung_khoan_kinh_doanh_rong"
    ],
    "formula": "SUM(value) WHERE ind_name IN (trading_securities.aliases)",
    "direction": "neutral",
    "business_meaning": "Tài sản tài chính mục đích trading, biến động mạnh hơn danh mục đầu tư.",
    "notes": ""
  },
  {
    "metric_key": "investment_securities",
    "business_label": "Chứng khoán đầu tư",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chứng khoán đầu tư",
      "Chứng khoán đầu tư giữ đến ngày đáo hạn",
      "Chứng khoán đầu tư sẵn sàng để bán"
    ],
    "aliases_for_where_ind_name": [
      "Chứng khoán đầu tư",
      "Investment Securities",
      "Chứng khoán đầu tư giữ đến ngày đáo hạn",
      "Held-to-Maturity Securities",
      "Available-for Sales Securities",
      "Chứng khoán đầu tư sẵn sàng để bán"
    ],
    "old_ind_code_reference": [
      "chung_khoan_dau_tu",
      "chung_khoan_dau_tu_giu_den_ngay_dao_han",
      "chung_khoan_dau_tu_san_sang_de_ban"
    ],
    "formula": "SUM(value) WHERE ind_name IN (investment_securities.aliases)",
    "direction": "neutral",
    "business_meaning": "Danh mục trái phiếu/chứng khoán sinh lời, quan trọng trong earning assets.",
    "notes": ""
  },
  {
    "metric_key": "interbank_liabilities",
    "business_label": "Tiền gửi và vay TCTD khác",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tiền gửi và vay các tổ chức tín dụng khác",
      "Tiền gửi và vay các Tổ chức tín dụng khác"
    ],
    "aliases_for_where_ind_name": [
      "Deposits and borrowings from other credit institutions",
      "Tiền gửi và vay các Tổ chức tín dụng khác"
    ],
    "old_ind_code_reference": [
      "tien_gui_va_vay_cac_to_chuc_tin_dung_khac"
    ],
    "formula": "SUM(value) WHERE ind_name IN (interbank_liabilities.aliases)",
    "direction": "lower_for_stability",
    "business_meaning": "Nguồn vốn bán buôn, nhạy cảm với điều kiện thị trường.",
    "notes": ""
  },
  {
    "metric_key": "gov_sbv_borrowing",
    "business_label": "Nợ Chính phủ và NHNN",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Các khoản nợ Chính phủ và Ngân hàng Nhà nước Việt Nam"
    ],
    "aliases_for_where_ind_name": [
      "Các khoản nợ chính phủ và NHNN Việt Nam",
      "Due to Gov and borrowings from SBV"
    ],
    "old_ind_code_reference": [
      "cac_khoan_no_chinh_phu_va_nhnn_viet_nam"
    ],
    "formula": "SUM(value) WHERE ind_name IN (gov_sbv_borrowing.aliases)",
    "direction": "neutral",
    "business_meaning": "Nguồn vốn/ nghĩa vụ với Chính phủ và NHNN.",
    "notes": ""
  },
  {
    "metric_key": "issued_papers",
    "business_label": "Giấy tờ có giá phát hành",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Giấy tờ có giá phát hành",
      "Phát hành giấy tờ có giá"
    ],
    "aliases_for_where_ind_name": [
      "Convertible bonds/CDs and other valuable papers issued",
      "Phát hành giấy tờ có giá"
    ],
    "old_ind_code_reference": [
      "giay_to_co_gia_phat_hanh",
      "phat_hanh_giay_to_co_gia"
    ],
    "formula": "SUM(value) WHERE ind_name IN (issued_papers.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Nguồn vốn qua trái phiếu/chứng chỉ tiền gửi; kỳ hạn và chi phí vốn cần theo dõi.",
    "notes": ""
  },
  {
    "metric_key": "entrusted_funds",
    "business_label": "Vốn tài trợ, ủy thác đầu tư",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Vốn tài trợ, ủy thác đầu tư của Chính phủ và các tổ chức tín dụng khác",
      "Vốn tài trợ, ủy thác đầu tư mà ngân hàng chịu rủi ro"
    ],
    "aliases_for_where_ind_name": [
      "Funds received from Gov, international and other institutions",
      "Vốn tài trợ, uỷ thác đầu tư của CP và các tổ chức TD khác",
      "Vốn tài trợ, uỷ thác đầu tư mà ngân hàng chịu rủi ro"
    ],
    "old_ind_code_reference": [
      "von_tai_tro_uy_thac_dau_tu_cua_cp_va_cac_to_chuc_td_khac",
      "von_tai_tro_uy_thac_dau_tu_ma_ngan_hang_chiu_rui_ro"
    ],
    "formula": "SUM(value) WHERE ind_name IN (entrusted_funds.aliases)",
    "direction": "neutral",
    "business_meaning": "Nguồn vốn ủy thác/tài trợ đặc thù.",
    "notes": ""
  },
  {
    "metric_key": "interest_income",
    "business_label": "Thu nhập lãi và tương tự",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Thu nhập lãi và các khoản tương tự",
      "Thu nhập lãi"
    ],
    "aliases_for_where_ind_name": [
      "Interest and Similar Income",
      "Thu nhập lãi và các khoản tương tự",
      "Thu nhập lãi"
    ],
    "old_ind_code_reference": [
      "thu_nhap_lai_va_cac_khoan_tuong_tu",
      "thu_nhap_lai"
    ],
    "formula": "SUM(value) WHERE ind_name IN (interest_income.aliases)",
    "direction": "higher",
    "business_meaning": "Doanh thu lãi gộp từ cho vay/chứng khoán/liên ngân hàng.",
    "notes": ""
  },
  {
    "metric_key": "interest_expense",
    "business_label": "Chi phí lãi và tương tự",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chi phí lãi và các khoản tương tự",
      "Chi phí lãi và các chi phí tương tự"
    ],
    "aliases_for_where_ind_name": [
      "Chi phí lãi và các khoản tương tự",
      "Interest and Similar Expenses",
      "Chi phí lãi và các chi phí tương tự"
    ],
    "old_ind_code_reference": [
      "chi_phi_lai_va_cac_khoan_tuong_tu"
    ],
    "formula": "SUM(value) WHERE ind_name IN (interest_expense.aliases)",
    "direction": "lower",
    "business_meaning": "Chi phí vốn; tăng nhanh hơn thu nhập lãi sẽ làm co NIM.",
    "notes": ""
  },
  {
    "metric_key": "net_interest_income",
    "business_label": "Thu nhập lãi thuần - NII",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Thu nhập lãi thuần"
    ],
    "aliases_for_where_ind_name": [
      "Net Interest Income",
      "Thu nhập lãi thuần"
    ],
    "old_ind_code_reference": [
      "tn_lai_thuan"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_interest_income.aliases)",
    "direction": "higher",
    "business_meaning": "Động cơ lợi nhuận chính của ngân hàng.",
    "notes": ""
  },
  {
    "metric_key": "fee_income",
    "business_label": "Thu nhập dịch vụ",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Thu nhập từ hoạt động dịch vụ"
    ],
    "aliases_for_where_ind_name": [
      "Fees and Comission Income",
      "Thu nhập từ hoạt động dịch vụ"
    ],
    "old_ind_code_reference": [
      "tn_dv"
    ],
    "formula": "SUM(value) WHERE ind_name IN (fee_income.aliases)",
    "direction": "higher",
    "business_meaning": "Nguồn thu ngoài lãi; thường bền hơn trading nếu đến từ thanh toán/thẻ.",
    "notes": ""
  },
  {
    "metric_key": "fee_expense",
    "business_label": "Chi phí dịch vụ",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chi phí hoạt động dịch vụ"
    ],
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động dịch vụ",
      "Fees and Comission Expenses"
    ],
    "old_ind_code_reference": [
      "cp_dv"
    ],
    "formula": "SUM(value) WHERE ind_name IN (fee_expense.aliases)",
    "direction": "lower",
    "business_meaning": "Chi phí trực tiếp để tạo thu dịch vụ.",
    "notes": ""
  },
  {
    "metric_key": "net_fee_income",
    "business_label": "Lãi thuần dịch vụ",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lãi thuần từ hoạt động dịch vụ"
    ],
    "aliases_for_where_ind_name": [
      "Lãi thuần từ hoạt động dịch vụ",
      "Net Fee and Commission Income"
    ],
    "old_ind_code_reference": [
      "ln_thuan_dv"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_fee_income.aliases)",
    "direction": "higher",
    "business_meaning": "Thu dịch vụ ròng; cần bóc thuyết minh nếu muốn bancassurance/thẻ/thanh toán.",
    "notes": ""
  },
  {
    "metric_key": "fx_gold_gain",
    "business_label": "Lãi/lỗ thuần ngoại hối và vàng",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lãi/lỗ thuần từ kinh doanh ngoại hối và vàng",
      "Kinh doanh ngoại hối và vàng"
    ],
    "aliases_for_where_ind_name": [
      "Net gain (loss) from foreign currency and gold dealings",
      "Kinh doanh ngoại hối và vàng"
    ],
    "old_ind_code_reference": [
      "lai_lo_thuan_tu_kinh_doanh_ngoai_hoi_va_vang",
      "kinh_doanh_ngoai_hoi_va_vang"
    ],
    "formula": "SUM(value) WHERE ind_name IN (fx_gold_gain.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Nguồn thu biến động theo thị trường ngoại hối/vàng.",
    "notes": ""
  },
  {
    "metric_key": "trading_securities_gain",
    "business_label": "Lãi/lỗ chứng khoán kinh doanh",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lãi/lỗ thuần từ kinh doanh chứng khoán",
      "Lãi/lỗ thuần từ mua bán chứng khoán kinh doanh"
    ],
    "aliases_for_where_ind_name": [
      "Net gain (loss) from trading of trading securities",
      "Lãi/Lỗ thuần từ mua bán chứng khoán kinh doanh"
    ],
    "old_ind_code_reference": [
      "lai_lo_thuan_tu_kinh_doanh_chung_khoan",
      "lai_lo_thuan_tu_mua_ban_chung_khoan_kinh_doanh"
    ],
    "formula": "SUM(value) WHERE ind_name IN (trading_securities_gain.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Trading income, chất lượng lợi nhuận thấp hơn NII/fee nếu biến động lớn.",
    "notes": ""
  },
  {
    "metric_key": "investment_securities_gain",
    "business_label": "Lãi/lỗ chứng khoán đầu tư",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lãi/lỗ thuần từ thanh lý chứng khoán đầu tư",
      "Lãi/lỗ thuần từ mua bán chứng khoán đầu tư"
    ],
    "aliases_for_where_ind_name": [
      "Net gain (loss) from disposal of investment securities",
      "Lãi/Lỗ thuần từ mua bán chứng khoán đầu tư"
    ],
    "old_ind_code_reference": [
      "lai_lo_thuan_tu_thanh_ly_chung_khoan_dau_tu",
      "lai_lo_thuan_tu_mua_ban_chung_khoan_dau_tu"
    ],
    "formula": "SUM(value) WHERE ind_name IN (investment_securities_gain.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Lãi/lỗ hiện thực hóa từ danh mục đầu tư.",
    "notes": ""
  },
  {
    "metric_key": "other_net_income",
    "business_label": "Thu nhập/chi phí khác thuần",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Thu nhập/chi phí khác thuần",
      "Thu nhập/chi phí khác"
    ],
    "aliases_for_where_ind_name": [
      "Net Other income/(expenses)",
      "Net Other income/expenses",
      "Thu nhập/Chi phí khác"
    ],
    "old_ind_code_reference": [
      "tn_cp_khac_thuan",
      "tn_cp_khac"
    ],
    "formula": "SUM(value) WHERE ind_name IN (other_net_income.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Các khoản ngoài hoạt động chính; cần cảnh báo nếu tỷ trọng lớn bất thường.",
    "notes": ""
  },
  {
    "metric_key": "total_operating_income",
    "business_label": "Tổng thu nhập hoạt động - TOI",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Tổng thu nhập hoạt động"
    ],
    "aliases_for_where_ind_name": [
      "Tổng thu nhập hoạt động",
      "Total operating revenue"
    ],
    "old_ind_code_reference": [
      "tong_tn_hd"
    ],
    "formula": "NII + Net Fee Income + FX/Gold + Trading Securities + Investment Securities + Other Net Income; hoặc SUM trực tiếp nếu có ind_name Tổng thu nhập hoạt động",
    "direction": "higher",
    "business_meaning": "Mẫu số CIR và thước đo quy mô doanh thu hoạt động.",
    "notes": ""
  },
  {
    "metric_key": "operating_expense",
    "business_label": "Chi phí hoạt động - Opex",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chi phí hoạt động"
    ],
    "aliases_for_where_ind_name": [
      "Chi phí hoạt động"
    ],
    "old_ind_code_reference": [
      "chi_phi_hoat_dong"
    ],
    "formula": "SUM(value) WHERE ind_name IN (operating_expense.aliases)",
    "direction": "lower",
    "business_meaning": "Chi phí vận hành ngân hàng; mẫu số tính efficiency.",
    "notes": ""
  },
  {
    "metric_key": "pre_provision_profit",
    "business_label": "Lợi nhuận trước dự phòng",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lợi nhuận từ hoạt động kinh doanh trước chi phí dự phòng",
      "Lợi nhuận từ hoạt động kinh doanh trước chi phí dự phòng rủi ro tín dụng"
    ],
    "aliases_for_where_ind_name": [
      "LN từ HĐKD trước CF dự phòng",
      "Operating Profit before Provision",
      "Lợi nhuận từ HDKD trước chi phí dự phòng rủi ro tín dụng"
    ],
    "old_ind_code_reference": [
      "ln_tu_hdkd_truoc_cf_du_phong"
    ],
    "formula": "TOI - Opex; hoặc SUM trực tiếp nếu có ind_name",
    "direction": "higher",
    "business_meaning": "Khả năng tạo lợi nhuận trước khi bị rủi ro tín dụng ăn mòn.",
    "notes": ""
  },
  {
    "metric_key": "credit_provision_expense",
    "business_label": "Chi phí dự phòng RRTD",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chi phí dự phòng rủi ro tín dụng"
    ],
    "aliases_for_where_ind_name": [
      "Chi phí dự phòng rủi ro tín dụng"
    ],
    "old_ind_code_reference": [
      "chi_phi_du_phong_rui_ro_tin_dung"
    ],
    "formula": "SUM(value) WHERE ind_name IN (credit_provision_expense.aliases)",
    "direction": "lower",
    "business_meaning": "Chi phí rủi ro trích vào P&L; tăng là xấu trừ khi chủ động tăng bộ đệm.",
    "notes": ""
  },
  {
    "metric_key": "profit_before_tax",
    "business_label": "Lợi nhuận trước thuế - PBT",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lợi nhuận trước thuế",
      "Lãi/lỗ ròng trước thuế",
      "Lợi nhuận/lỗ thuần trước thuế"
    ],
    "aliases_for_where_ind_name": [
      "LN trước thuế",
      "Lợi nhuận trước thuế",
      "Lãi/Lỗ ròng trước thuế",
      "Lợi nhuận/Lỗ thuần trước thuế"
    ],
    "old_ind_code_reference": [
      "lntt"
    ],
    "formula": "SUM(value) WHERE ind_name IN (profit_before_tax.aliases)",
    "direction": "higher",
    "business_meaning": "Kết quả lợi nhuận trước thuế, sau dự phòng.",
    "notes": ""
  },
  {
    "metric_key": "tax_expense",
    "business_label": "Chi phí thuế TNDN",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Chi phí thuế thu nhập doanh nghiệp",
      "Chi phí thuế thu nhập doanh nghiệp hiện hành",
      "Chi phí thuế thu nhập doanh nghiệp hoãn lại",
      "Thuế thu nhập doanh nghiệp"
    ],
    "aliases_for_where_ind_name": [
      "Tax For the Year",
      "CHI PHÍ THUẾ TNDN",
      "Chi phí thuế TNDN",
      "Chi phí thuế TNDN hiện hành",
      "Chi phí thuế TNDN hoãn lại",
      "Thuế TNDN"
    ],
    "old_ind_code_reference": [
      "thue_tndn",
      "thue_tndn_hh",
      "thue_tndn_hl"
    ],
    "formula": "SUM(value) WHERE ind_name IN (tax_expense.aliases)",
    "direction": "lower_contextual",
    "business_meaning": "Chi phí thuế để tính tax burden.",
    "notes": ""
  },
  {
    "metric_key": "net_profit",
    "business_label": "Lợi nhuận sau thuế",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lợi nhuận sau thuế thu nhập doanh nghiệp",
      "Lợi nhuận sau thuế",
      "Lợi nhuận sau thuế của cổ đông công ty mẹ",
      "Lợi nhuận sau thuế của Cổ đông công ty mẹ"
    ],
    "aliases_for_where_ind_name": [
      "Lợi nhuận sau thuế thu nhập DN",
      "Lợi nhuận sau thuế thu nhập doanh nghiệp",
      "LNST của cổ đông công ty mẹ",
      "Lợi nhuận sau thuế của cổ đông công ty mẹ",
      "Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)"
    ],
    "old_ind_code_reference": [
      "loi_nhuan_sau_thue_thu_nhap_dn",
      "lnst_cua_co_dong_cong_ty_me",
      "loi_nhuan_sau_thue_cua_co_dong_cong_ty_me"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_profit.aliases)",
    "direction": "higher",
    "business_meaning": "Lợi nhuận cuối cùng cho cổ đông; mẫu số ROE/ROA.",
    "notes": ""
  },
  {
    "metric_key": "net_cfo",
    "business_label": "Lưu chuyển tiền thuần HĐKD",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
      "Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh"
    ],
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐKD",
      "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
      "Lưu chuyển tiền tệ ròng từ các hoạt động SXKD"
    ],
    "old_ind_code_reference": [
      "luu_chuyen_tien_thuan_tu_hdkd",
      "luu_chuyen_tien_te_rong_tu_cac_hoat_dong_sxkd"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_cfo.aliases)",
    "direction": "higher_contextual",
    "business_meaning": "Dòng tiền hoạt động, nhưng với ngân hàng cần đọc cùng biến động cho vay/huy động.",
    "notes": ""
  },
  {
    "metric_key": "net_cfi",
    "business_label": "Lưu chuyển tiền thuần HĐĐT",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lưu chuyển tiền thuần từ hoạt động đầu tư"
    ],
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐ đầu tư",
      "Lưu chuyển tiền thuần từ hoạt động đầu tư"
    ],
    "old_ind_code_reference": [
      "lctt_thuan_hd_dt"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_cfi.aliases)",
    "direction": "neutral",
    "business_meaning": "Dòng tiền đầu tư.",
    "notes": ""
  },
  {
    "metric_key": "net_cff",
    "business_label": "Lưu chuyển tiền thuần HĐTC",
    "source_type": "BCTC_IND_NAME",
    "norm_name_used": [
      "Lưu chuyển tiền thuần từ hoạt động tài chính"
    ],
    "aliases_for_where_ind_name": [
      "Lưu chuyển tiền thuần từ HĐ tài chính",
      "Lưu chuyển tiền thuần từ hoạt động tài chính"
    ],
    "old_ind_code_reference": [
      "luu_chuyen_tien_thuan_tu_hd_tai_chinh"
    ],
    "formula": "SUM(value) WHERE ind_name IN (net_cff.aliases)",
    "direction": "neutral",
    "business_meaning": "Dòng tiền tài chính.",
    "notes": ""
  },
  {
    "metric_key": "casa_balance",
    "business_label": "CASA balance",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Số dư tiền gửi không kỳ hạn từ thuyết minh tiền gửi khách hàng. Không lấy từ ind_name nếu không có dòng riêng.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "term_deposit_balance",
    "business_label": "Tiền gửi có kỳ hạn",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Số dư tiền gửi có kỳ hạn từ thuyết minh.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "retail_deposit_balance",
    "business_label": "Tiền gửi bán lẻ",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Tiền gửi cá nhân/hộ gia đình nếu thuyết minh có phân tách.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "loan_retail",
    "business_label": "Dư nợ bán lẻ",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Phân tách dư nợ theo khách hàng/sản phẩm.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "loan_sme",
    "business_label": "Dư nợ SME",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Phân tách dư nợ SME.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "loan_corporate",
    "business_label": "Dư nợ doanh nghiệp lớn",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Phân tách dư nợ corporate.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "loan_real_estate",
    "business_label": "Dư nợ bất động sản",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Phân tách tín dụng bất động sản để cảnh báo tập trung.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "debt_group_1",
    "business_label": "Nợ nhóm 1",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Cần bảng phân loại nợ theo nhóm.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "debt_group_2",
    "business_label": "Nợ nhóm 2",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Chỉ báo sớm chất lượng tài sản.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "debt_group_3",
    "business_label": "Nợ nhóm 3",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Một phần nợ xấu.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "debt_group_4",
    "business_label": "Nợ nhóm 4",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Một phần nợ xấu.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "debt_group_5",
    "business_label": "Nợ nhóm 5",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Một phần nợ xấu nghiêm trọng nhất.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "collateral_real_estate",
    "business_label": "TSBĐ bất động sản",
    "source_type": "EXTENSION_THUYET_MINH",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Cơ cấu tài sản bảo đảm.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "car_ratio",
    "business_label": "CAR",
    "source_type": "EXTENSION_REGULATORY",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Chỉ tiêu an toàn vốn theo báo cáo Basel/NHNN; không suy diễn từ VCSH/TTS.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "rwa",
    "business_label": "Risk Weighted Assets",
    "source_type": "EXTENSION_REGULATORY",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Tài sản có rủi ro dùng tính CAR.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "ldr_regulatory",
    "business_label": "LDR regulatory",
    "source_type": "EXTENSION_REGULATORY",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Tỷ lệ cấp tín dụng so với nguồn vốn huy động theo định nghĩa NHNN.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "smlr_ratio",
    "business_label": "SMLR",
    "source_type": "EXTENSION_REGULATORY",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Tỷ lệ vốn ngắn hạn cho vay trung dài hạn.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "liquid_assets",
    "business_label": "Tài sản thanh khoản cao",
    "source_type": "EXTENSION_ALM",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Tiền mặt/NHNN/TPCP đủ chuẩn thanh khoản theo treasury.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "alm_bucket_assets",
    "business_label": "Tài sản đáo hạn theo bucket",
    "source_type": "EXTENSION_ALM",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Ma trận đáo hạn tài sản theo rổ kỳ hạn.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "alm_bucket_liabilities",
    "business_label": "Nợ đáo hạn theo bucket",
    "source_type": "EXTENSION_ALM",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Ma trận đáo hạn nợ phải trả theo rổ kỳ hạn.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "average_earning_assets",
    "business_label": "Tài sản sinh lời bình quân",
    "source_type": "DERIVED_OR_EXTENSION",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "Có thể tính trung bình từ earning assets đầu/cuối kỳ nếu có dữ liệu quý.",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "npl_amount",
    "business_label": "Nợ xấu nhóm 3-5",
    "source_type": "DERIVED_FROM_EXTENSION",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "debt_group_3 + debt_group_4 + debt_group_5",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "npl_ratio",
    "business_label": "NPL Ratio",
    "source_type": "DERIVED_FROM_EXTENSION",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "npl_amount / gross_customer_loans",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "llr_ratio",
    "business_label": "Coverage Ratio / LLR",
    "source_type": "DERIVED_FROM_BCTC_AND_EXTENSION",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "ABS(loan_loss_allowance_customer) / npl_amount",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "credit_cost",
    "business_label": "Credit Cost annualized",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "ABS(credit_provision_expense) / AVG(gross_customer_loans) × annualization_factor",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "nim",
    "business_label": "NIM",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "net_interest_income / average_earning_assets",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "cir",
    "business_label": "CIR",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "ABS(operating_expense) / total_operating_income",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "roe",
    "business_label": "ROE",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "net_profit / AVG(equity)",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "roa",
    "business_label": "ROA",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "net_profit / AVG(total_assets)",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "asset_yield",
    "business_label": "Asset Yield",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "interest_income / average_earning_assets",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "cost_of_funds",
    "business_label": "Cost of Funds",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "ABS(interest_expense) / AVG(interest_bearing_liabilities)",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  },
  {
    "metric_key": "earning_assets",
    "business_label": "Earning Assets",
    "source_type": "DERIVED_FROM_BCTC",
    "norm_name_used": [],
    "aliases_for_where_ind_name": [],
    "old_ind_code_reference": [],
    "formula": "",
    "direction": "",
    "business_meaning": "gross_customer_loans + interbank_assets + trading_securities + investment_securities",
    "notes": "Không được tự tạo điều kiện WHERE ind_name nếu source_type không phải BCTC_IND_NAME."
  }
]
```

---

## 10. Prompt mẫu để đưa cho AI vibecoding

```text
Bạn là AI lập trình dashboard tài chính ngân hàng. Hãy dùng tài liệu BA này làm nguồn sự thật.
Không được tự bịa mapping chỉ tiêu. Với metric BCTC, query bằng aliases_for_where_ind_name.
Với metric EXTENSION_REQUIRED/EXTENSION_THUYET_MINH/EXTENSION_REGULATORY/EXTENSION_ALM, nếu không có bảng extension thì render N/A và tooltip giải thích.
Dashboard phải có thứ tự: Executive Snapshot, Balance Sheet & Funding, Asset Quality, Profitability/DuPont, Income & Expense, Liquidity & ALM.
Mỗi tab bắt buộc có KPI cards, chart insight lớn, chart giải thích, và bảng số liệu.
Áp dụng lower-is-better cho NPL, group2, CIR, credit cost, SMLR/cumulative liquidity gap xấu.
```

---

## 11. Ghi chú BA cuối cùng

- Ngân hàng có thể tăng tổng tài sản và cho vay rất nhanh nhưng chất lượng dashboard phải buộc người dùng nhìn tiếp sang **nguồn vốn**, **nợ nhóm 2**, **NPL**, **LLR**, **credit cost** và **ALM gap**.
- `NII tăng` không luôn tốt nếu `NIM giảm`, `credit cost tăng` hoặc `profit giảm`.
- `LLR cao` tốt về phòng thủ nhưng cũng có thể phản ánh quá khứ rủi ro cao; luôn đọc cùng NPL và write-off.
- `CAR` không được tính thô bằng `equity/assets`; phải lấy từ regulatory extension nếu muốn đúng nghiệp vụ.
- `LDR regulatory` khác với `gross_customer_loans/customer_deposits`; chỉ tiêu tự tính chỉ là proxy và phải ghi rõ.
