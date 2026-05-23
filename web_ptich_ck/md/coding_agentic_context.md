<!-- ==================== AI AGENT CODING RULES =========================== -->

1. Plan trước, code sau. Sai giữa chừng? Dừng lại lên plan lại. Không được cố đấm ăn xôi.
2. Việc khó giao cho Sub-Agent. Giữ Context chính sạch sẽ. Ném thêm compute vào thay vì tự xử hết.
3. Vòng lặp tự cải thiện. Mỗi bài học ghi vào file lessons. Session sau tự đọc lại, tự áp dụng. Lỗi giảm dần theo thời gian.
4. Chứng minh nó hoạt động. chưa chạy test, chưa check log thì chưa được gọi là xong.
5. Gặp bug tự sửa. Vào log tìm root cause, fix luôn. Không cần ai cầm tay chỉ việc.

<!-- tài khoản để testing -->

login_name: guest@example.com
password: 123456789

hoặc 

login_name: pcanh@admin.com
password: 123456

<!-- ======================= Cấu trúc cơ sở dữ liệu database: =========================== -->
- Schema: hethong_phantich_chungkhoan: 

    set search_path to hethong_phantich_chung_khoan
    create sequence new_v1_id_seq
        as integer;

    alter sequence new_v1_id_seq owner to admin;

    create table history_price
    (
        ticker       varchar(10) not null,
        trading_date text        not null,
        open         numeric(15, 2),
        high         numeric(15, 2),
        low          numeric(15, 2),
        close        numeric(15, 2),
        volume       bigint,
        import_time  timestamp default CURRENT_TIMESTAMP,
        primary key (ticker, trading_date)
    );

    alter table history_price
        owner to admin;

    create index idx_hp_trading_date_desc
        on history_price (trading_date desc);

    create index idx_hp_ticker_date_close
        on history_price (ticker asc, trading_date desc) include (close, volume);

    create table market_index
    (
        ticker       varchar(10) not null,
        trading_date text        not null,
        open         numeric(15, 2),
        high         numeric(15, 2),
        low          numeric(15, 2),
        close        numeric(15, 2),
        volume       bigint,
        import_time  timestamp default CURRENT_TIMESTAMP,
        primary key (ticker, trading_date)
    );

    alter table market_index
        owner to admin;

    create index idx_mi_ticker_date
        on market_index (ticker asc, trading_date desc) include (close);

    create table owner
    (
        ticker      varchar(10),
        name        varchar(255),
        position    varchar(255),
        percent     text,
        type        varchar(50),
        import_time timestamp default CURRENT_TIMESTAMP
    );

    alter table owner
        owner to admin;

    create table company_overview
    (
        ticker           varchar(10) not null,
        overview         text,
        icb_name1        text,
        icb_name2        text,
        icb_name3        text,
        import_time      timestamp default CURRENT_TIMESTAMP,
        exchange         text        not null,
        type_info        text,
        organ_short_name text,
        organ_name       text,
        product_group    text,
        primary key (ticker, exchange)
    );

    alter table company_overview
        owner to admin;

    create index idx_co_sector
        on company_overview (icb_name2)
        where (icb_name2 IS NOT NULL);

    create index idx_co_ticker_sector
        on company_overview (ticker) include (icb_name2, exchange, organ_short_name);

    create table bctc
    (
        ticker      varchar(10) not null,
        quarter     varchar(10) not null,
        year        integer     not null,
        ind_name    text,
        ind_code    text        not null,
        value       numeric(25, 4),
        import_time timestamp default CURRENT_TIMESTAMP,
        report_name varchar(255),
        report_code varchar(100),
        constraint pk_bctc
            primary key (ticker, year, quarter, ind_code)
    );

    alter table bctc
        owner to admin;

    create index idx_bctc_earnings
        on bctc (ticker asc, year desc, quarter desc)
        where ((ind_code = 'IS24'::text) AND (value IS NOT NULL));

    create table realtime_quotes
    (
        symbol           varchar(20) not null,
        ts               timestamp   not null,
        last_price       numeric(18, 4),
        avg_price        numeric(18, 4),
        last_volume      bigint,
        total_volume     bigint,
        total_value      numeric(20, 2),
        foreign_buy_qty  bigint,
        foreign_sell_qty bigint,
        foreign_buy_val  numeric(20, 2),
        foreign_sell_val numeric(20, 2),
        bid1_price       numeric(18, 4),
        bid1_qty         bigint,
        bid2_price       numeric(18, 4),
        bid2_qty         bigint,
        bid3_price       numeric(18, 4),
        bid3_qty         bigint,
        ask1_price       numeric(18, 4),
        ask1_qty         bigint,
        ask2_price       numeric(18, 4),
        ask2_qty         bigint,
        ask3_price       numeric(18, 4),
        ask3_qty         bigint,
        ref_price        numeric(18, 4),
        ceil_price       numeric(18, 4),
        floor_price      numeric(18, 4),
        change_percent   numeric(10, 4),
        change_value     numeric(18, 4),
        high_price       numeric(18, 4),
        low_price        numeric(18, 4),
        constraint pk_realtime_quotes
            primary key (symbol, ts)
    );

    alter table realtime_quotes
        owner to admin;

    create index idx_realtime_quotes_symbol
        on realtime_quotes (symbol);

    create index idx_realtime_quotes_ts
        on realtime_quotes (ts desc);

    create index idx_realtime_quotes_symbol_ts
        on realtime_quotes (symbol asc, ts desc);

    create table macro_economy
    (
        date       date        not null,
        open       real,
        high       real,
        low        real,
        close      real,
        volume     bigint,
        asset_type varchar(20) not null,
        primary key (asset_type, date)
    );

    alter table macro_economy
        owner to admin;

    create table financial_ratio
    (
        id                             bigserial,
        ind_code                       text,
        ticker                         varchar(20) not null,
        year                           integer     not null,
        quarter                        integer     not null,
        fixed_asset_to_equity          double precision,
        equity_to_charter_capital      double precision,
        ebit_margin                    double precision,
        gross_margin                   double precision,
        net_margin                     double precision,
        ebit_value                     double precision,
        financial_leverage             double precision,
        period_type                    varchar(10),
        extracted_at                   text,
        long_short_term_debt_on_equity double precision,
        debt_to_equity                 double precision,
        asset_turnover                 double precision,
        fixed_asset_turnover           double precision,
        receivable_days                double precision,
        inventory_days                 double precision,
        payable_days                   double precision,
        cash_conversion_cycle          double precision,
        inventory_turnover             double precision,
        roe                            double precision,
        roic                           double precision,
        roa                            double precision,
        ebitda_value                   double precision,
        current_ratio                  double precision,
        cash_ratio                     double precision,
        quick_ratio                    double precision,
        interest_coverage_ratio        double precision,
        market_cap                     double precision,
        outstanding_shares             double precision,
        pe                             double precision,
        pb                             double precision,
        ps                             double precision,
        p_cashflow                     double precision,
        eps                            double precision,
        bvps                           double precision,
        ev_ebitda                      double precision,
        dividend_yield                 double precision,
        primary key (id, ticker, year, quarter)
    );

    alter table financial_ratio
        owner to admin;

    create index idx_fr_ticker_period
        on financial_ratio (ticker asc, year desc, quarter desc) include (pe, pb, eps, roe, roa, market_cap, dividend_yield, debt_to_equity);

    create table electric_board
    (
        id                  serial,
        ticker              varchar(20) not null,
        exchange            varchar(10) not null,
        trading_date        date        not null,
        ref_price           numeric(18, 2),
        match_price         numeric(18, 2),
        accumulated_volume  bigint,
        highest_price       numeric(18, 2),
        lowest_price        numeric(18, 2),
        foreign_buy_volume  bigint,
        foreign_sell_volume bigint,
        bid_1_price         numeric(18, 2),
        bid_1_volume        bigint,
        bid_2_price         numeric(18, 2),
        bid_2_volume        bigint,
        bid_3_price         numeric(18, 2),
        bid_3_volume        bigint,
        ask_1_price         numeric(18, 2),
        ask_1_volume        bigint,
        ask_2_price         numeric(18, 2),
        ask_2_volume        bigint,
        ask_3_price         numeric(18, 2),
        ask_3_volume        bigint,
        created_at          timestamp default CURRENT_TIMESTAMP,
        primary key (id, ticker, exchange, trading_date)
    );

    alter table electric_board
        owner to admin;

    create unique index idx_electric_board_ticker_date
        on electric_board (ticker, trading_date);

    create index idx_eb_date_desc
        on electric_board (trading_date desc)
        where (match_price IS NOT NULL);

    create index idx_eb_ticker_date
        on electric_board (ticker asc, trading_date desc) include (match_price, ref_price, accumulated_volume, exchange, foreign_buy_volume, foreign_sell_volume);

    create index idx_eb_date_match
        on electric_board (trading_date)
        where ((match_price IS NOT NULL) AND (match_price > (0)::numeric));

    create table event
    (
        event_title     text,
        public_date     text,
        source_url      text,
        event_list_name text,
        event_list_code text,
        id              text
    );

    alter table event
        owner to admin;

    create table news
    (
        id          integer   default nextval('hethong_phantich_chungkhoan.new_v1_id_seq'::regclass) not null
            constraint new_v1_pkey
                primary key,
        source      text,
        title       text,
        link        text
            constraint new_v1_link_key
                unique,
        published   timestamp,
        summary     text,
        inserted_at timestamp default now()
    );

    alter table news
        owner to admin;

    alter sequence new_v1_id_seq owned by news.id;

    create index idx_news_published
        on news (published desc);

    create table vn_macro_yearly
    (
        year                               integer not null
            primary key,
        tang_truong_gdp                    double precision,
        lam_phat                           double precision,
        tang_truong_cong_nghiep_xay_dung   double precision,
        tang_truong_nganh_che_bien_che_tao double precision,
        tang_truong_tieu_dung_ho_gia_inh   double precision,
        ty_gia_usd_vnd                     double precision,
        lai_suat_tien_gui                  double precision,
        lai_suat_cho_vay                   double precision,
        tang_truong_xuat_khau              double precision,
        tang_truong_nhap_khau              double precision,
        can_can_thuong_mai                 double precision,
        fdi_thuc_hien                      double precision,
        du_tru_ngoai_hoi                   double precision,
        tang_truong_cung_tien_m2           double precision,
        no_xau_ngan_hang                   double precision
    );

    alter table vn_macro_yearly
        owner to admin;


- Schema: system
    set search_path to system;

    create table article_clicks
    (
        id         bigserial
            primary key,
        article_id integer                                                         not null,
        session_id varchar(64)              default 'anonymous'::character varying not null,
        ip_address varchar(45),
        clicked_at timestamp with time zone default now()                          not null
    );

    alter table article_clicks
        owner to admin;

    create index idx_article_clicks_article
        on article_clicks (article_id);

    create index idx_article_clicks_time
        on article_clicks (clicked_at desc);

    create index idx_article_clicks_article_session
        on article_clicks (article_id, session_id);

    create table search_logs
    (
        id          bigserial
            primary key,
        keyword     varchar(255)                                                    not null,
        session_id  varchar(64)              default 'anonymous'::character varying not null,
        ip_address  varchar(45),
        searched_at timestamp with time zone default now()                          not null
    );

    alter table search_logs
        owner to admin;

    create index idx_search_logs_keyword
        on search_logs (keyword);

    create index idx_search_logs_time
        on search_logs (searched_at desc);

    create index idx_search_logs_keyword_time
        on search_logs (keyword asc, searched_at desc);

    create table stock_clicks
    (
        id         bigserial
            primary key,
        ticker     varchar(20)                                                     not null,
        session_id varchar(64)              default 'anonymous'::character varying not null,
        ip_address varchar(45),
        clicked_at timestamp with time zone default now()                          not null
    );

    alter table stock_clicks
        owner to admin;

    create index idx_stock_clicks_ticker
        on stock_clicks (ticker);

    create index idx_stock_clicks_time
        on stock_clicks (clicked_at desc);

    create index idx_stock_clicks_ticker_session
        on stock_clicks (ticker, session_id);

    create table stock_search_logs
    (
        id          bigserial
            primary key,
        keyword     varchar(255)                                                    not null,
        session_id  varchar(64)              default 'anonymous'::character varying not null,
        ip_address  varchar(45),
        searched_at timestamp with time zone default now()                          not null
    );

    alter table stock_search_logs
        owner to admin;

    create index idx_stock_search_logs_keyword
        on stock_search_logs (keyword);

    create index idx_stock_search_logs_time
        on stock_search_logs (searched_at desc);

    create index idx_stock_search_logs_keyword_time
        on stock_search_logs (keyword asc, searched_at desc);

    create table roles
    (
        id          serial
            primary key,
        name        varchar(50)                            not null
            unique,
        description text,
        created_at  timestamp with time zone default now() not null
    );

    alter table roles
        owner to admin;

    create table users
    (
        id              bigserial
            primary key,
        email           varchar(255)                                                not null
            unique,
        hashed_password varchar(255),
        full_name       varchar(255),
        avatar_url      text,
        role_id         integer                  default 1                          not null
            references roles,
        auth_provider   varchar(20)              default 'local'::character varying not null,
        google_id       varchar(255)
            unique,
        is_active       boolean                  default true                       not null,
        is_verified     boolean                  default false                      not null,
        last_login_at   timestamp with time zone,
        created_at      timestamp with time zone default now()                      not null,
        updated_at      timestamp with time zone default now()                      not null,
        totp_secret     varchar(64),
        is_totp_enabled boolean                  default false                      not null
    );

    alter table users
        owner to admin;

    create index idx_users_email
        on users (email);

    create index idx_users_google_id
        on users (google_id)
        where (google_id IS NOT NULL);

    create index idx_users_role
        on users (role_id);

    create table refresh_tokens
    (
        id          bigserial
            primary key,
        user_id     bigint                                 not null
            references users
                on delete cascade,
        token       varchar(512)                           not null
            unique,
        device_info varchar(255),
        ip_address  varchar(45),
        expires_at  timestamp with time zone               not null,
        revoked     boolean                  default false not null,
        created_at  timestamp with time zone default now() not null
    );

    alter table refresh_tokens
        owner to admin;

    create index idx_refresh_tokens_user
        on refresh_tokens (user_id);

    create index idx_refresh_tokens_token
        on refresh_tokens (token);

    create index idx_refresh_tokens_expires
        on refresh_tokens (expires_at);

    create table password_reset_tokens
    (
        id         bigserial
            primary key,
        user_id    bigint                                 not null
            references users
                on delete cascade,
        token      varchar(255)                           not null
            unique,
        expires_at timestamp with time zone               not null,
        used       boolean                  default false not null,
        created_at timestamp with time zone default now() not null
    );

    alter table password_reset_tokens
        owner to admin;

    create index idx_pwd_reset_user
        on password_reset_tokens (user_id);

    create index idx_pwd_reset_token
        on password_reset_tokens (token);

    create table page_views
    (
        id         bigserial
            primary key,
        page_path  varchar(255)                                                    not null,
        page_title varchar(255),
        session_id varchar(64)              default 'anonymous'::character varying not null,
        user_id    bigint
                                                                                references users
                                                                                    on delete set null,
        ip_address varchar(45),
        referrer   text,
        viewed_at  timestamp with time zone default now()                          not null
    );

    alter table page_views
        owner to admin;

    create index idx_page_views_path
        on page_views (page_path);

    create index idx_page_views_time
        on page_views (viewed_at desc);

    create index idx_page_views_session
        on page_views (session_id);

    create table analysis_views
    (
        id         bigserial
            primary key,
        ticker     varchar(20)                                                     not null,
        session_id varchar(64)              default 'anonymous'::character varying not null,
        user_id    bigint
                                                                                references users
                                                                                    on delete set null,
        ip_address varchar(45),
        viewed_at  timestamp with time zone default now()                          not null
    );

    alter table analysis_views
        owner to admin;

    create index idx_analysis_views_ticker
        on analysis_views (ticker);

    create index idx_analysis_views_time
        on analysis_views (viewed_at desc);

    create index idx_analysis_views_ticker_session
        on analysis_views (ticker, session_id);

    create table error_logs
    (
        id            bigserial
            primary key,
        error_type    varchar(50)              default 'frontend'::character varying  not null,
        error_message text                                                            not null,
        stack_trace   text,
        page_url      text,
        session_id    varchar(64)              default 'anonymous'::character varying not null,
        user_id       bigint
                                                                                    references users
                                                                                        on delete set null,
        ip_address    varchar(45),
        user_agent    text,
        created_at    timestamp with time zone default now()                          not null
    );

    alter table error_logs
        owner to admin;

    create index idx_error_logs_type
        on error_logs (error_type);

    create index idx_error_logs_time
        on error_logs (created_at desc);

    create table login_logs
    (
        id          bigserial
            primary key,
        user_id     bigint
            references users,
        method      varchar(50)              default 'local'::character varying,
        success     boolean                  default true,
        ip_address  varchar(45),
        device_info varchar(255),
        login_at    timestamp with time zone default now()
    );

    alter table login_logs
        owner to admin;

    create index idx_login_logs_user
        on login_logs (user_id);

    create index idx_login_logs_time
        on login_logs (login_at desc);

    create table session_logs
    (
        session_id       varchar(64) not null
            primary key,
        user_id          bigint
            references users,
        started_at       timestamp with time zone default now(),
        last_seen_at     timestamp with time zone default now(),
        duration_seconds integer                  default 0,
        ip_address       varchar(45),
        user_agent       varchar(255),
        ended            boolean                  default false
    );

    alter table session_logs
        owner to admin;

    create index idx_session_logs_user
        on session_logs (user_id);

    create index idx_session_logs_time
        on session_logs (started_at desc);

    create table sidebar_clicks
    (
        id         bigserial
            primary key,
        user_id    bigint
            references users,
        menu_name  varchar(100),
        menu_href  varchar(255),
        clicked_at timestamp with time zone default now()
    );

    alter table sidebar_clicks
        owner to admin;

    create index idx_sidebar_clicks_time
        on sidebar_clicks (clicked_at desc);

    create table user_favorite_stocks
    (
        id         serial
            primary key,
        user_id    integer,
        session_id varchar(64),
        ticker     varchar(20) not null,
        created_at timestamp with time zone default CURRENT_TIMESTAMP,
        constraint uq_session_ticker
            unique nulls not distinct (session_id, ticker),
        constraint uq_user_ticker
            unique nulls not distinct (user_id, ticker)
    );

    alter table user_favorite_stocks
        owner to admin;

    create index idx_usr_fav_stocks_user
        on user_favorite_stocks (user_id);

    create index idx_usr_fav_stocks_session
        on user_favorite_stocks (session_id);

    create table stock_price_alerts
    (
        id             serial
            primary key,
        user_id        integer,
        session_id     varchar(64),
        ticker         varchar(20)    not null,
        condition_type varchar(20)    not null,
        target_price   numeric(10, 2) not null,
        status         varchar(20)              default 'ACTIVE'::character varying,
        created_at     timestamp with time zone default CURRENT_TIMESTAMP,
        triggered_at   timestamp with time zone
    );

    alter table stock_price_alerts
        owner to admin;

    create index idx_alerts_status
        on stock_price_alerts (status);








<!-- ========================= Mô tả luồng (mặt giao diện) =========================== -->
api chứa doc: http://127.0.0.1:8000/redoc


- Giao diện tổng quan: [localhost:3000](http://localhost:3000/)
    | - Toàn cảnh thị trường
    | - Dòng tiền thị trường 
    | - Định giá & Chỉ số
    | - Tin tức nổi bật

- Giao diện Thị trường: [localhost:](http://localhost:3000/market)
    | - Bản đồ thị trường
    | - Tổng quan thị trường 
    | - Phân tích ngành
    | - Bảng giá chi tiết theo Ngành

- Giao diện Chỉ số: http://localhost:3000/indices
    | - Chỉ số Thị trường
    | - Chỉ số Vĩ mô Việt Nam

- Giao diện bảng điện: http://localhost:3000/price-board

- Giao diện danh sách cổ phiếu & bộ lọc cổ phiếu: http://localhost:3000/stocks 
    | - Danh sách cổ phiếu
    | - Bộ lọc cổ phiếu

- Giao diện phân tích kỹ thuật: http://localhost:3000/analysis

- Giao diện Tin tức: http://localhost:3000/news

- Giao diện Cài đặt: http://localhost:3000/settings

- Giao diện ADMIN: http://localhost:3000/admin
    | - Dashboard Tổng quan
    | - Quản trị người dùng 
    | - Hành vi
    | - Dữ liệu
    | - Phiên
    | - Vai trò

- Giao diện Chi tiết cổ phiếu: http://localhost:3000/stock/{mã cổ phiếu}
    | - Tổng quan
    | - Tin tức
    | - Số liệu tài chính           --> dashboard cơ bản về báo lợi nhuận chi phí và doanh thu 
    | - Dashboard - TCDN            --> dashboard mang tính phân tích báo cáo tài chính 
    | - Dashboard - Định lượng      --> dashboard phân tích kỹ hơn về góc nhìn của dữ liệu về giá và BCTC
    | - So sánh
    | - Hồ sơ doanh nghiệp


<!-- ========================= Mô tả luồng (mặt cấu trúc thư mục) =========================== -->

- Tổng quan:
    | - Dự án chia thành 2 phần chính: `BE/` (Backend - FastAPI, database, business logic) và `FE/` (Frontend - Next.js/React, giao diện người dùng).
    | - Ngoài ra có `md/` để lưu tài liệu ngữ cảnh/workflow, và `schema/` để hỗ trợ export/backup schema dữ liệu.

- `BE/` (Backend):
    | - `app/main.py`: Điểm vào khởi chạy API backend.
    | - `app/api/`: Định nghĩa router endpoint theo version (ví dụ `v1/`).
    | - `app/core/`: Thành phần lõi như config, logging, cache, middleware.
    | - `app/database/`: Kết nối DB, query, script schema/index/materialized view.
    | - `app/modules/`: Chia nghiệp vụ theo domain (auth, market, stock, news, admin, ...).
    | - `app/websocket/`: Xử lý realtime qua websocket.
    | - `requirements.txt`, `pyproject.toml`: Quản lý dependency và cấu hình Python project.

- `FE/` (Frontend):
    | - `app/`: Cấu trúc route theo App Router của Next.js (trang market, stock, analysis, admin, ...).
    | - `components/`: Component UI và component theo từng domain.
    | - `hooks/`: Custom hooks cho fetch dữ liệu, websocket, tracking.
    | - `lib/`: Business utilities, context, mock data, transformer dữ liệu hiển thị.
    | - `public/`: Static assets.
    | - `types/`: Kiểu dữ liệu TypeScript dùng chung.
    | - `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`: Cấu hình build/lint/runtime của frontend.

```text
web_ptich_ck/
|-- BE/                                  # Backend (FastAPI + business logic + data layer)
|   |-- pyproject.toml                   # Cấu hình project Python hiện đại
|   |-- requirements.txt                 # Danh sách dependency Python
|   |-- app/
|   |   |-- main.py                      # Entry point chạy API
|   |   |-- api/
|   |   |   |-- v1/                      # Nhóm endpoint theo version
|   |   |-- core/                        # Config, logging, cache, middleware
|   |   |-- database/                    # Kết nối DB, schema SQL, query, migration script
|   |   |-- modules/                     # Chia module nghiệp vụ: auth, market, stock, news, ...
|   |   |-- websocket/                   # Realtime stream dữ liệu
|
|-- FE/                                  # Frontend (Next.js + React + TypeScript)
|   |-- package.json                     # Scripts/devDependencies frontend
|   |-- next.config.ts                   # Cấu hình Next.js
|   |-- tsconfig.json                    # Cấu hình TypeScript
|   |-- app/                             # App Router: pages/routes theo domain
|   |-- components/                      # UI components dùng chung + theo module
|   |-- hooks/                           # Custom hooks (fetch, websocket, tracking)
|   |-- lib/                             # Context, utils, transformer, mock data
|   |-- public/                          # Static assets
|   |-- types/                           # Khai báo kiểu dữ liệu dùng chung
```

