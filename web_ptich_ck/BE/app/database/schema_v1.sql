create sequence new_v1_id_seq
    as integer;

alter sequence new_v1_id_seq owner to admin;

-- Bảng: Lịch sử giá giao dịch của cổ phiếu (End of Day - EOD)
create table history_price
(
    ticker       varchar(10) not null,  -- Mã chứng khoán (VD: FPT, HPG)
    trading_date text        not null,  -- Ngày giao dịch (Định dạng text, nên cân nhắc dùng kiểu DATE để tối ưu index)
    open         numeric(15, 2),        -- Giá mở cửa
    high         numeric(15, 2),        -- Giá cao nhất trong phiên
    low          numeric(15, 2),        -- Giá thấp nhất trong phiên
    close        numeric(15, 2),        -- Giá đóng cửa (Giá khớp lệnh cuối phiên)
    volume       bigint,                -- Tổng khối lượng giao dịch (khớp lệnh) trong phiên
    import_time  timestamp default CURRENT_TIMESTAMP, -- Thời điểm bản ghi được chèn vào database
    primary key (ticker, trading_date)
);

alter table history_price owner to admin;

-- Bảng: Lịch sử điểm số của các chỉ số thị trường (VD: VNINDEX, HNXINDEX)
create table market_index
(
    ticker       varchar(10) not null,  -- Mã chỉ số (VD: VNINDEX, VN30)
    trading_date text        not null,  -- Ngày giao dịch
    open         numeric(15, 2),        -- Điểm số mở cửa
    high         numeric(15, 2),        -- Điểm số cao nhất
    low          numeric(15, 2),        -- Điểm số thấp nhất
    close        numeric(15, 2),        -- Điểm số đóng cửa
    volume       bigint,                -- Tổng khối lượng giao dịch trên toàn sàn/nhóm chỉ số
    import_time  timestamp default CURRENT_TIMESTAMP, -- Thời điểm chèn dữ liệu
    primary key (ticker, trading_date)
);

alter table market_index owner to admin;

-- Bảng: Cơ cấu cổ đông và ban lãnh đạo
create table owner
(
    ticker      varchar(10),            -- Mã chứng khoán
    name        varchar(255),           -- Tên cổ đông (Cá nhân hoặc tổ chức)
    position    varchar(255),           -- Chức vụ trong công ty (VD: Chủ tịch HĐQT, Thành viên BKS)
    percent     text,                   -- Tỷ lệ sở hữu cổ phần (%)
    type        varchar(50),            -- Loại cổ đông (VD: Cá nhân, Tổ chức, Nước ngoài)
    import_time timestamp default CURRENT_TIMESTAMP -- Thời điểm chèn dữ liệu
);

alter table owner owner to admin;

-- Bảng: Tổng quan hồ sơ doanh nghiệp
create table company_overview
(
    ticker           varchar(10) not null, -- Mã chứng khoán
    overview         text,                 -- Bài viết giới thiệu tổng quan về công ty (lịch sử, ngành nghề)
    icb_name1        text,                 -- Phân ngành chuẩn ICB cấp 1 (Ngành cấp cao nhất)
    icb_name2        text,                 -- Phân ngành chuẩn ICB cấp 2
    icb_name3        text,                 -- Phân ngành chuẩn ICB cấp 3 (Ngành chi tiết nhất)
    import_time      timestamp default CURRENT_TIMESTAMP, -- Thời điểm chèn dữ liệu
    exchange         text        not null, -- Sàn giao dịch niêm yết (HOSE, HNX, UPCOM)
    type_info        text,                 -- Loại hình doanh nghiệp (VD: Công ty Cổ phần)
    organ_short_name text,                 -- Tên viết tắt của công ty
    organ_name       text,                 -- Tên đầy đủ của công ty
    product_group    text,                 -- Các nhóm sản phẩm/dịch vụ cốt lõi
    primary key (ticker, exchange)
);

alter table company_overview owner to admin;

-- Bảng: Báo cáo tài chính (Dữ liệu bóc tách chi tiết từng chỉ tiêu)
create table bctc
(
    ticker      varchar(10) not null, -- Mã chứng khoán
    quarter     varchar(10) not null, -- Quý báo cáo (VD: Q1, Q2, Q3, Q4, YEAR)
    year        integer     not null, -- Năm tài chính
    ind_name    text,                 -- Tên chỉ tiêu báo cáo (VD: Tiền và các khoản tương đương tiền)
    ind_code    text        not null, -- Mã chỉ tiêu chuẩn hóa (Để query tính toán dễ dàng)
    value       numeric(25, 4),       -- Giá trị của chỉ tiêu (thường tính bằng VNĐ hoặc Tỷ VNĐ)
    import_time timestamp default CURRENT_TIMESTAMP, -- Thời điểm chèn dữ liệu
    report_name varchar(255),         -- Tên loại báo cáo (Bảng CĐKT, KQKD, Lưu chuyển tiền tệ)
    report_code varchar(100),         -- Mã loại báo cáo
    constraint pk_bctc
        primary key (ticker, year, quarter, ind_code)
);

alter table bctc owner to admin;

-- Bảng: Dữ liệu giao dịch theo thời gian thực (Tick data / Order book)
create table realtime_quotes
(
    symbol           varchar(20) not null, -- Mã chứng khoán
    ts               timestamp   not null, -- Dấu thời gian (Timestamp) chính xác của tick giá
    last_price       numeric(18, 4),       -- Giá khớp lệnh gần nhất
    avg_price        numeric(18, 4),       -- Giá trung bình trong phiên
    last_volume      bigint,               -- Khối lượng của lệnh khớp gần nhất
    total_volume     bigint,               -- Tổng khối lượng tích lũy trong phiên
    total_value      numeric(20, 2),       -- Tổng giá trị giao dịch tích lũy
    foreign_buy_qty  bigint,               -- Khối lượng Khối ngoại mua chủ động
    foreign_sell_qty bigint,               -- Khối lượng Khối ngoại bán chủ động
    foreign_buy_val  numeric(20, 2),       -- Giá trị Khối ngoại mua
    foreign_sell_val numeric(20, 2),       -- Giá trị Khối ngoại bán
    bid1_price       numeric(18, 4),       -- Sổ lệnh: Giá chờ Mua tốt nhất (Mức 1)
    bid1_qty         bigint,               -- Sổ lệnh: Khối lượng chờ Mua mức 1
    bid2_price       numeric(18, 4),       -- Sổ lệnh: Giá chờ Mua mức 2
    bid2_qty         bigint,               -- Sổ lệnh: Khối lượng chờ Mua mức 2
    bid3_price       numeric(18, 4),       -- Sổ lệnh: Giá chờ Mua mức 3
    bid3_qty         bigint,               -- Sổ lệnh: Khối lượng chờ Mua mức 3
    ask1_price       numeric(18, 4),       -- Sổ lệnh: Giá chờ Bán tốt nhất (Mức 1)
    ask1_qty         bigint,               -- Sổ lệnh: Khối lượng chờ Bán mức 1
    ask2_price       numeric(18, 4),       -- Sổ lệnh: Giá chờ Bán mức 2
    ask2_qty         bigint,               -- Sổ lệnh: Khối lượng chờ Bán mức 2
    ask3_price       numeric(18, 4),       -- Sổ lệnh: Giá chờ Bán mức 3
    ask3_qty         bigint,               -- Sổ lệnh: Khối lượng chờ Bán mức 3
    ref_price        numeric(18, 4),       -- Giá tham chiếu của phiên
    ceil_price       numeric(18, 4),       -- Giá trần (Mức giá tối đa cho phép)
    floor_price      numeric(18, 4),       -- Giá sàn (Mức giá tối thiểu cho phép)
    change_percent   numeric(10, 4),       -- % Thay đổi giá so với tham chiếu
    change_value     numeric(18, 4),       -- Mức thay đổi giá trị tuyệt đối so với tham chiếu
    high_price       numeric(18, 4),       -- Giá cao nhất đã chạm tới tính đến thời điểm ts
    low_price        numeric(18, 4),       -- Giá thấp nhất đã chạm tới tính đến thời điểm ts
    constraint pk_realtime_quotes
        primary key (symbol, ts)
);

alter table realtime_quotes owner to admin;

create index idx_realtime_quotes_symbol on realtime_quotes (symbol);
create index idx_realtime_quotes_ts on realtime_quotes (ts desc);
create index idx_realtime_quotes_symbol_ts on realtime_quotes (symbol asc, ts desc);

-- Bảng: Dữ liệu giá hàng hóa / Vĩ mô quốc tế (Vàng, Dầu, Tiền tệ)
create table macro_economy
(
    date       date        not null, -- Ngày ghi nhận
    open       real,                 -- Giá mở cửa
    high       real,                 -- Giá cao nhất
    low        real,                 -- Giá thấp nhất
    close      real,                 -- Giá đóng cửa
    volume     bigint,               -- Khối lượng giao dịch
    asset_type varchar(20) not null, -- Loại tài sản (VD: GOLD, CRUDE_OIL, USD_VND)
    primary key (asset_type, date)
);

alter table macro_economy owner to admin;

-- Bảng: Các chỉ số tài chính cơ bản (Đã được tính toán sẵn từ BCTC)
create table financial_ratio
(
    id                             bigserial,            -- ID tự tăng
    ind_code                       text,                 -- Tên/Mã ngành của doanh nghiệp
    ticker                         varchar(20) not null, -- Mã chứng khoán
    year                           integer     not null, -- Năm
    quarter                        integer     not null, -- Quý
    fixed_asset_to_equity          double precision,     -- Tỷ số Tài sản cố định / Vốn chủ sở hữu
    equity_to_charter_capital      double precision,     -- Tỷ số Vốn chủ sở hữu / Vốn điều lệ
    ebit_margin                    double precision,     -- Biên lợi nhuận hoạt động (EBIT Margin)
    gross_margin                   double precision,     -- Biên lợi nhuận gộp (Gross Margin)
    net_margin                     double precision,     -- Biên lợi nhuận ròng (Net Margin)
    ebit_value                     double precision,     -- Lợi nhuận trước thuế và lãi vay (EBIT)
    financial_leverage             double precision,     -- Đòn bẩy tài chính (Tổng tài sản / Vốn chủ sở hữu)
    period_type                    varchar(10),          -- Loại kỳ tính toán (VD: Q - Theo quý, Y - Theo năm)
    extracted_at                   text,                 -- Thời điểm xuất/tính toán dữ liệu
    long_short_term_debt_on_equity double precision,     -- Tỷ lệ Vay nợ (ngắn + dài hạn) / Vốn chủ sở hữu
    debt_to_equity                 double precision,     -- Hệ số nợ / Vốn chủ sở hữu (D/E)
    asset_turnover                 double precision,     -- Vòng quay tổng tài sản
    fixed_asset_turnover           double precision,     -- Vòng quay tài sản cố định
    receivable_days                double precision,     -- Số ngày khoản phải thu (Kỳ thu tiền bình quân)
    inventory_days                 double precision,     -- Số ngày tồn kho (Kỳ luân chuyển hàng tồn kho)
    payable_days                   double precision,     -- Số ngày khoản phải trả
    cash_conversion_cycle          double precision,     -- Chu kỳ chuyển đổi tiền mặt (CCC)
    inventory_turnover             double precision,     -- Hệ số vòng quay hàng tồn kho
    roe                            double precision,     -- Tỷ suất sinh lời trên vốn chủ sở hữu (Return on Equity)
    roic                           double precision,     -- Tỷ suất sinh lời trên vốn đầu tư (Return on Invested Capital)
    roa                            double precision,     -- Tỷ suất sinh lời trên tổng tài sản (Return on Assets)
    ebitda_value                   double precision,     -- Lợi nhuận trước thuế, lãi vay và khấu hao (EBITDA)
    current_ratio                  double precision,     -- Tỷ số thanh toán hiện hành (Tài sản ngắn hạn / Nợ ngắn hạn)
    cash_ratio                     double precision,     -- Tỷ số thanh toán tiền mặt (Tiền / Nợ ngắn hạn)
    quick_ratio                    double precision,     -- Tỷ số thanh toán nhanh ((TS ngắn hạn - Tồn kho) / Nợ ngắn hạn)
    interest_coverage_ratio        double precision,     -- Hệ số khả năng thanh toán lãi vay (EBIT / Chi phí lãi vay)
    market_cap                     double precision,     -- Vốn hóa thị trường (Giá * Số lượng cổ phiếu lưu hành)
    outstanding_shares             double precision,     -- Số lượng cổ phiếu đang lưu hành
    pe                             double precision,     -- Chỉ số P/E (Price to Earnings)
    pb                             double precision,     -- Chỉ số P/B (Price to Book Value)
    ps                             double precision,     -- Chỉ số P/S (Price to Sales)
    p_cashflow                     double precision,     -- Chỉ số P/CF (Price to Cash Flow)
    eps                            double precision,     -- Lợi nhuận trên mỗi cổ phiếu (Earnings Per Share)
    bvps                           double precision,     -- Giá trị sổ sách trên mỗi cổ phiếu (Book Value Per Share)
    ev_ebitda                      double precision,     -- Chỉ số EV/EBITDA (Enterprise Value / EBITDA)
    dividend_yield                 double precision,     -- Tỷ suất cổ tức (Cổ tức tiền mặt / Giá cổ phiếu)
    primary key (id, ticker, year, quarter)
);

alter table financial_ratio owner to admin;

-- Bảng: Trạng thái chốt ngày của bảng điện (Snapshot sổ lệnh EOD)
create table electric_board
(
    id                  serial,
    ticker              varchar(20) not null, -- Mã chứng khoán
    exchange            varchar(10) not null, -- Sàn giao dịch
    trading_date        date        not null, -- Ngày giao dịch
    ref_price           numeric(18, 2),       -- Giá tham chiếu
    match_price         numeric(18, 2),       -- Giá khớp lệnh
    accumulated_volume  bigint,               -- Khối lượng tích lũy
    highest_price       numeric(18, 2),       -- Giá cao nhất
    lowest_price        numeric(18, 2),       -- Giá thấp nhất
    foreign_buy_volume  bigint,               -- Khối ngoại mua
    foreign_sell_volume bigint,               -- Khối ngoại bán
    bid_1_price         numeric(18, 2),       -- Giá mua 1
    bid_1_volume        bigint,               -- Khối lượng mua 1
    bid_2_price         numeric(18, 2),       -- Giá mua 2
    bid_2_volume        bigint,               -- Khối lượng mua 2
    bid_3_price         numeric(18, 2),       -- Giá mua 3
    bid_3_volume        bigint,               -- Khối lượng mua 3
    ask_1_price         numeric(18, 2),       -- Giá bán 1
    ask_1_volume        bigint,               -- Khối lượng bán 1
    ask_2_price         numeric(18, 2),       -- Giá bán 2
    ask_2_volume        bigint,               -- Khối lượng bán 2
    ask_3_price         numeric(18, 2),       -- Giá bán 3
    ask_3_volume        bigint,               -- Khối lượng bán 3
    created_at          timestamp default CURRENT_TIMESTAMP,
    primary key (id, ticker, exchange, trading_date)
);

alter table electric_board owner to admin;
create unique index idx_electric_board_ticker_date on electric_board (ticker, trading_date);

-- Bảng: Sự kiện doanh nghiệp (Trả cổ tức, ĐHĐCĐ, Phát hành thêm...)
create table event
(
    event_title     text, -- Tiêu đề sự kiện
    public_date     text, -- Ngày công bố thông tin
    source_url      text, -- Đường link gốc (URL) của nguồn tin
    event_list_name text, -- Tên nhóm/loại sự kiện (VD: Trả cổ tức bằng tiền)
    event_list_code text, -- Mã phân loại sự kiện nội bộ
    id              text  -- ID sự kiện
);

alter table event owner to admin;

-- Bảng: Tin tức thị trường / doanh nghiệp
create table news
(
    id          integer   default nextval('hethong_phantich_chungkhoan.new_v1_id_seq'::regclass) not null
        constraint new_v1_pkey primary key, -- ID tự tăng dùng Sequence
    source      text,                       -- Nguồn bài báo (VD: CafeF, Vietstock)
    title       text,                       -- Tiêu đề bài viết
    link        text                        -- URL chi tiết bài báo (Được set UNIQUE để tránh crawl lặp)
        constraint new_v1_link_key unique,
    published   timestamp,                  -- Ngày giờ xuất bản tin tức
    summary     text,                       -- Nội dung tóm tắt
    inserted_at timestamp default now()     -- Thời điểm lưu vào DB
);

alter table news owner to admin;
alter sequence new_v1_id_seq owned by news.id;

-- Bảng: Dữ liệu vĩ mô Việt Nam theo năm
create table vn_macro_yearly
(
    year                               integer not null primary key, -- Năm theo dõi
    tang_truong_gdp                    double precision,             -- % Tăng trưởng GDP
    lam_phat                           double precision,             -- % Lạm phát (CPI)
    tang_truong_cong_nghiep_xay_dung   double precision,             -- % Tăng trưởng khu vực Công nghiệp - Xây dựng
    tang_truong_nganh_che_bien_che_tao double precision,             -- % Tăng trưởng ngành chế biến chế tạo
    tang_truong_tieu_dung_ho_gia_inh   double precision,             -- % Tăng trưởng tiêu dùng hộ gia đình (Retail Sales)
    ty_gia_usd_vnd                     double precision,             -- Tỷ giá trung tâm hoặc tỷ giá cuối năm USD/VND
    lai_suat_tien_gui                  double precision,             -- Lãi suất tiền gửi bình quân (%)
    lai_suat_cho_vay                   double precision,             -- Lãi suất cho vay bình quân (%)
    tang_truong_xuat_khau              double precision,             -- % Tăng trưởng kim ngạch xuất khẩu
    tang_truong_nhap_khau              double precision,             -- % Tăng trưởng kim ngạch nhập khẩu
    can_can_thuong_mai                 double precision,             -- Cán cân thương mại (Xuất khẩu - Nhập khẩu) (Tỷ USD)
    fdi_thuc_hien                      double precision,             -- Vốn FDI thực hiện / giải ngân (Tỷ USD)
    du_tru_ngoai_hoi                   double precision,             -- Dự trữ ngoại hối quốc gia (Tỷ USD)
    tang_truong_cung_tien_m2           double precision,             -- % Tăng trưởng cung tiền M2
    no_xau_ngan_hang                   double precision              -- Tỷ lệ nợ xấu toàn hệ thống ngân hàng (%)
);

alter table vn_macro_yearly owner to admin;