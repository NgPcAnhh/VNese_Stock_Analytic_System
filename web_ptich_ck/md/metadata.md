# Metadata Schema hethong_phantich_chungkhoan

Phiên bản: v1.0  
Ngày cập nhật: 2026-04-18  
Phạm vi: Mô tả cấu trúc bảng và metadata tiếng Việt cho schema `hethong_phantich_chungkhoan`.

## 1) Quy ước đọc tài liệu

- Cột **Tên cột**: tên vật lý trong database.
- Cột **Kiểu dữ liệu**: kiểu lưu trữ theo PostgreSQL.
- Cột **Mô tả tiếng Việt**: ý nghĩa nghiệp vụ và cách dùng cho chatbot SQL-first.

## 2) Bảng history_price

Mục đích: Lưu dữ liệu giá lịch sử theo mã cổ phiếu và ngày giao dịch.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| ticker | varchar(10) | Mã cổ phiếu (ví dụ: FPT, VNM). |
| trading_date | text | Ngày giao dịch (chuỗi ngày). |
| open | numeric(15,2) | Giá mở cửa. |
| high | numeric(15,2) | Giá cao nhất trong phiên. |
| low | numeric(15,2) | Giá thấp nhất trong phiên. |
| close | numeric(15,2) | Giá đóng cửa. |
| volume | bigint | Khối lượng giao dịch. |
| import_time | timestamp | Thời điểm bản ghi được nạp vào hệ thống. |

## 3) Bảng market_index

Mục đích: Lưu dữ liệu giá lịch sử cho các chỉ số thị trường.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| ticker | varchar(10) | Mã chỉ số (ví dụ: VNINDEX). |
| trading_date | text | Ngày giao dịch. |
| open | numeric(15,2) | Điểm mở cửa. |
| high | numeric(15,2) | Điểm cao nhất. |
| low | numeric(15,2) | Điểm thấp nhất. |
| close | numeric(15,2) | Điểm đóng cửa. |
| volume | bigint | Khối lượng (nếu có). |
| import_time | timestamp | Thời điểm nạp dữ liệu. |

## 4) Bảng owner

Mục đích: Lưu thông tin cơ cấu sở hữu/chức danh liên quan đến mã cổ phiếu.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| ticker | varchar(10) | Mã cổ phiếu. |
| name | varchar(255) | Tên cổ đông/cá nhân/tổ chức liên quan. |
| position | varchar(255) | Chức danh (nếu có). |
| percent | text | Tỷ lệ sở hữu (thường ở dạng chuỗi phần trăm). |
| type | varchar(50) | Loại đối tượng sở hữu. |
| import_time | timestamp | Thời điểm nạp dữ liệu. |

## 5) Bảng company_overview

Mục đích: Lưu hồ sơ doanh nghiệp và phân ngành phục vụ lọc theo ngành.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| ticker | varchar(10) | Mã cổ phiếu. |
| overview | text | Mô tả tổng quan doanh nghiệp. |
| icb_name1 | text | Nhóm ngành cấp 1 (ICB). |
| icb_name2 | text | Nhóm ngành cấp 2 (ICB). |
| icb_name3 | text | Nhóm ngành cấp 3 (ICB). |
| import_time | timestamp | Thời điểm nạp dữ liệu. |
| exchange | text | Sàn giao dịch (HOSE/HNX/UPCOM...). |
| type_info | text | Loại hình doanh nghiệp/chứng khoán. |
| organ_short_name | text | Tên viết tắt doanh nghiệp. |
| organ_name | text | Tên đầy đủ doanh nghiệp. |
| product_group | text | Nhóm sản phẩm/ngành hàng chính. |

## 6) Bảng bctc

Mục đích: Lưu dữ liệu chỉ tiêu báo cáo tài chính chuẩn hóa theo mã, năm, quý và mã chỉ tiêu.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| ticker | varchar(10) | Mã cổ phiếu. |
| quarter | varchar(10) | Quý báo cáo (Q1, Q2, Q3, Q4 hoặc dạng tương đương). |
| year | integer | Năm báo cáo. |
| ind_name | text | Tên chỉ tiêu gốc (có thể nhiều biến thể). |
| ind_code | text | Mã chỉ tiêu chuẩn hóa để truy vấn thống nhất. |
| value | numeric(25,4) | Giá trị chỉ tiêu tài chính. |
| import_time | timestamp | Thời điểm nạp dữ liệu. |
| report_name | varchar(255) | Tên loại báo cáo (CĐKT/KQKD/LCTT...). |
| report_code | varchar(100) | Mã loại báo cáo chuẩn hóa. |

### Ghi chú riêng cho bctc

- `ind_code` là khóa nghiệp vụ quan trọng để truy vấn ổn định; không nên query theo `ind_name` vì có thể trùng/khác chính tả.
- `quarter` và `year` là trục thời gian chính để so sánh theo kỳ.
- `report_name` và `report_code` giúp tách ngữ cảnh báo cáo tài chính theo loại báo cáo.
- Khóa chính hiện tại: `(ticker, year, quarter, ind_code)`.

## 7) Bảng realtime_quotes

Mục đích: Lưu dữ liệu quote realtime/tick phục vụ bảng giá và phân tích ngắn hạn.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| symbol | varchar(20) | Mã chứng khoán realtime. |
| ts | timestamp | Mốc thời gian bản tin realtime. |
| last_price | numeric(18,4) | Giá khớp gần nhất. |
| avg_price | numeric(18,4) | Giá trung bình. |
| last_volume | bigint | Khối lượng khớp gần nhất. |
| total_volume | bigint | Tổng khối lượng khớp lũy kế. |
| total_value | numeric(20,2) | Tổng giá trị khớp lũy kế. |
| foreign_buy_qty | bigint | Khối lượng khối ngoại mua. |
| foreign_sell_qty | bigint | Khối lượng khối ngoại bán. |
| foreign_buy_val | numeric(20,2) | Giá trị khối ngoại mua. |
| foreign_sell_val | numeric(20,2) | Giá trị khối ngoại bán. |
| bid1_price | numeric(18,4) | Giá mua mức 1. |
| bid1_qty | bigint | Khối lượng mua mức 1. |
| bid2_price | numeric(18,4) | Giá mua mức 2. |
| bid2_qty | bigint | Khối lượng mua mức 2. |
| bid3_price | numeric(18,4) | Giá mua mức 3. |
| bid3_qty | bigint | Khối lượng mua mức 3. |
| ask1_price | numeric(18,4) | Giá bán mức 1. |
| ask1_qty | bigint | Khối lượng bán mức 1. |
| ask2_price | numeric(18,4) | Giá bán mức 2. |
| ask2_qty | bigint | Khối lượng bán mức 2. |
| ask3_price | numeric(18,4) | Giá bán mức 3. |
| ask3_qty | bigint | Khối lượng bán mức 3. |
| ref_price | numeric(18,4) | Giá tham chiếu. |
| ceil_price | numeric(18,4) | Giá trần. |
| floor_price | numeric(18,4) | Giá sàn. |
| change_percent | numeric(10,4) | % thay đổi so với tham chiếu. |
| change_value | numeric(18,4) | Giá trị thay đổi. |
| high_price | numeric(18,4) | Giá cao nhất trong phiên realtime. |
| low_price | numeric(18,4) | Giá thấp nhất trong phiên realtime. |

## 8) Bảng macro_economy

Mục đích: Dữ liệu vĩ mô theo từng loại tài sản và thời gian.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| date | date | Ngày dữ liệu vĩ mô. |
| open | real | Giá trị mở đầu kỳ/ngày. |
| high | real | Giá trị cao nhất. |
| low | real | Giá trị thấp nhất. |
| close | real | Giá trị đóng kỳ/ngày. |
| volume | bigint | Khối lượng (nếu áp dụng). |
| asset_type | varchar(20) | Loại tài sản/chỉ số vĩ mô. |

## 9) Bảng financial_ratio

Mục đích: Lưu các tỷ số tài chính chuẩn hóa theo quý/năm cho từng mã.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| id | bigserial | ID tự tăng nội bộ. |
| ind_code | text | Mã chỉ tiêu nguồn (nếu có). |
| ticker | varchar(20) | Mã cổ phiếu. |
| year | integer | Năm tài chính. |
| quarter | integer | Quý tài chính. |
| fixed_asset_to_equity | double precision | Tài sản cố định/Vốn chủ sở hữu. |
| equity_to_charter_capital | double precision | Vốn chủ/Vốn điều lệ. |
| ebit_margin | double precision | Biên EBIT. |
| gross_margin | double precision | Biên lợi nhuận gộp. |
| net_margin | double precision | Biên lợi nhuận ròng. |
| ebit_value | double precision | Giá trị EBIT. |
| financial_leverage | double precision | Đòn bẩy tài chính. |
| period_type | varchar(10) | Loại kỳ dữ liệu (quý/năm). |
| extracted_at | text | Thời điểm trích xuất từ nguồn. |
| long_short_term_debt_on_equity | double precision | Nợ ngắn+dài hạn/Vốn chủ sở hữu. |
| debt_to_equity | double precision | Nợ/Vốn chủ sở hữu. |
| asset_turnover | double precision | Vòng quay tài sản. |
| fixed_asset_turnover | double precision | Vòng quay tài sản cố định. |
| receivable_days | double precision | Số ngày phải thu bình quân. |
| inventory_days | double precision | Số ngày tồn kho bình quân. |
| payable_days | double precision | Số ngày phải trả bình quân. |
| cash_conversion_cycle | double precision | Chu kỳ chuyển đổi tiền mặt. |
| inventory_turnover | double precision | Vòng quay hàng tồn kho. |
| roe | double precision | Tỷ suất lợi nhuận trên vốn chủ sở hữu (ROE). |
| roic | double precision | Tỷ suất lợi nhuận trên vốn đầu tư (ROIC). |
| roa | double precision | Tỷ suất lợi nhuận trên tài sản (ROA). |
| ebitda_value | double precision | Giá trị EBITDA. |
| current_ratio | double precision | Hệ số thanh toán hiện hành. |
| cash_ratio | double precision | Hệ số thanh toán bằng tiền. |
| quick_ratio | double precision | Hệ số thanh toán nhanh. |
| interest_coverage_ratio | double precision | Khả năng thanh toán lãi vay. |
| market_cap | double precision | Vốn hóa thị trường. |
| outstanding_shares | double precision | Số cổ phiếu lưu hành. |
| pe | double precision | Chỉ số P/E. |
| pb | double precision | Chỉ số P/B. |
| ps | double precision | Chỉ số P/S. |
| p_cashflow | double precision | Chỉ số Price/Cashflow. |
| eps | double precision | EPS. |
| bvps | double precision | BVPS. |
| ev_ebitda | double precision | EV/EBITDA. |
| dividend_yield | double precision | Tỷ suất cổ tức. |

## 10) Bảng electric_board

Mục đích: Dữ liệu chốt bảng điện theo ngày, dùng cho trang price-board và phân tích giao dịch.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| id | serial | ID nội bộ. |
| ticker | varchar(20) | Mã cổ phiếu. |
| exchange | varchar(10) | Sàn giao dịch. |
| trading_date | date | Ngày giao dịch. |
| ref_price | numeric(18,2) | Giá tham chiếu. |
| match_price | numeric(18,2) | Giá khớp. |
| accumulated_volume | bigint | Khối lượng khớp lũy kế. |
| highest_price | numeric(18,2) | Giá cao nhất ngày. |
| lowest_price | numeric(18,2) | Giá thấp nhất ngày. |
| foreign_buy_volume | bigint | Khối lượng mua ròng ngoại (mua). |
| foreign_sell_volume | bigint | Khối lượng bán ngoại. |
| bid_1_price | numeric(18,2) | Giá mua 1. |
| bid_1_volume | bigint | KL mua 1. |
| bid_2_price | numeric(18,2) | Giá mua 2. |
| bid_2_volume | bigint | KL mua 2. |
| bid_3_price | numeric(18,2) | Giá mua 3. |
| bid_3_volume | bigint | KL mua 3. |
| ask_1_price | numeric(18,2) | Giá bán 1. |
| ask_1_volume | bigint | KL bán 1. |
| ask_2_price | numeric(18,2) | Giá bán 2. |
| ask_2_volume | bigint | KL bán 2. |
| ask_3_price | numeric(18,2) | Giá bán 3. |
| ask_3_volume | bigint | KL bán 3. |
| created_at | timestamp | Thời điểm tạo bản ghi. |

## 11) Bảng event

Mục đích: Lưu sự kiện doanh nghiệp/thị trường từ các nguồn tổng hợp.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| event_title | text | Tiêu đề sự kiện. |
| public_date | text | Ngày công bố sự kiện. |
| source_url | text | Đường dẫn nguồn sự kiện. |
| event_list_name | text | Tên nhóm danh sách sự kiện. |
| event_list_code | text | Mã nhóm sự kiện. |
| id | text | ID sự kiện từ nguồn. |

## 12) Bảng news

Mục đích: Lưu tin tức thị trường phục vụ truy vấn/tóm tắt tin.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| id | integer | ID tin tức. |
| source | text | Nguồn tin/báo. |
| title | text | Tiêu đề tin. |
| link | text | URL bài viết (duy nhất). |
| published | timestamp | Thời gian xuất bản bài viết. |
| summary | text | Tóm tắt nội dung. |
| inserted_at | timestamp | Thời điểm bản ghi được ghi vào DB. |

## 13) Bảng vn_macro_yearly

Mục đích: Lưu tập chỉ số vĩ mô Việt Nam theo năm.

| Tên cột | Kiểu dữ liệu | Mô tả tiếng Việt |
|---|---|---|
| year | integer | Năm dữ liệu. |
| tang_truong_gdp | double precision | Tăng trưởng GDP. |
| lam_phat | double precision | Lạm phát. |
| tang_truong_cong_nghiep_xay_dung | double precision | Tăng trưởng công nghiệp-xây dựng. |
| tang_truong_nganh_che_bien_che_tao | double precision | Tăng trưởng ngành chế biến chế tạo. |
| tang_truong_tieu_dung_ho_gia_inh | double precision | Tăng trưởng tiêu dùng hộ gia đình. |
| ty_gia_usd_vnd | double precision | Tỷ giá USD/VND. |
| lai_suat_tien_gui | double precision | Lãi suất tiền gửi. |
| lai_suat_cho_vay | double precision | Lãi suất cho vay. |
| tang_truong_xuat_khau | double precision | Tăng trưởng xuất khẩu. |
| tang_truong_nhap_khau | double precision | Tăng trưởng nhập khẩu. |
| can_can_thuong_mai | double precision | Cán cân thương mại. |
| fdi_thuc_hien | double precision | FDI thực hiện. |
| du_tru_ngoai_hoi | double precision | Dự trữ ngoại hối. |
| tang_truong_cung_tien_m2 | double precision | Tăng trưởng cung tiền M2. |
| no_xau_ngan_hang | double precision | Tỷ lệ/giá trị nợ xấu ngân hàng. |

## 14) Gợi ý sử dụng metadata cho chatbot SQL-first

- Ưu tiên truy vấn các cột đã chuẩn hóa (`ticker`, `year`, `quarter`, `ind_code`, `published`).
- Với dữ liệu thời gian ở dạng text (`trading_date`, `public_date`), cần chuẩn hóa trước khi dùng cho filter khoảng ngày.
- Với bảng `bctc`, xem mapping về ý nghĩa của tên bảng norm_name ở dưới phần mapping. Sau đó gọiưu tiên `ind_code` thay vì `ind_name` để tránh lệch do biến thể tên chỉ tiêu. 
- Ưu tiên tìm được số bên trong các bảng dữ liệu, nếu không có thì thực hiện tính bằng các chỉ tiêu hiện có từ các bảng nhé. 

