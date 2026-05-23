-- ============================================================
-- Schema: system — Theo dõi hành vi người dùng
-- ============================================================
-- Dữ liệu tin tức gốc nằm ở schema: hethong_phantich_chungkhoan
-- Schema này chỉ lưu hành động của user (click, search)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

-- ────────────────────────────────────────────────────────────
-- 1. article_clicks — Mỗi lần user click vào bài báo
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 click event (append-only, dễ phân tích)
-- Indexes tối ưu cho:
--   • Top bài được click nhiều nhất (article_id)
--   • Thống kê theo thời gian (clicked_at)
--   • Phân tích hành vi per session (session_id)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.article_clicks (
    id          BIGSERIAL   PRIMARY KEY,
    article_id  INTEGER     NOT NULL,                              -- FK → hethong_phantich_chungkhoan.news.id
    session_id  VARCHAR(64) NOT NULL DEFAULT 'anonymous',          -- Fingerprint / UUID từ FE
    ip_address  VARCHAR(45),                                       -- IPv4 hoặc IPv6
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho truy vấn top bài click nhiều nhất (GROUP BY article_id)
CREATE INDEX IF NOT EXISTS idx_article_clicks_article
    ON system.article_clicks (article_id);

-- Index cho thống kê theo thời gian (filtered by date range)
CREATE INDEX IF NOT EXISTS idx_article_clicks_time
    ON system.article_clicks (clicked_at DESC);

-- Composite index cho đếm unique sessions per article
CREATE INDEX IF NOT EXISTS idx_article_clicks_article_session
    ON system.article_clicks (article_id, session_id);

-- ────────────────────────────────────────────────────────────
-- 2. search_logs — Mỗi lần user tìm kiếm từ khóa
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 search event
-- Hot search = GROUP BY keyword → COUNT DESC
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.search_logs (
    id          BIGSERIAL   PRIMARY KEY,
    keyword     VARCHAR(255) NOT NULL,                             -- Từ khóa tìm kiếm (đã trim + lowercase)
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    searched_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho hot search (GROUP BY keyword)
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword
    ON system.search_logs (keyword);

-- Index cho thống kê theo thời gian
CREATE INDEX IF NOT EXISTS idx_search_logs_time
    ON system.search_logs (searched_at DESC);

-- Composite cho phân tích trend theo keyword + thời gian
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword_time
    ON system.search_logs (keyword, searched_at DESC);

-- ────────────────────────────────────────────────────────────
-- 3. stock_clicks — Mỗi lần user click vào mã cổ phiếu
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 click event (append-only)
-- Dùng để thống kê top mã được quan tâm nhất
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.stock_clicks (
    id          BIGSERIAL    PRIMARY KEY,
    ticker      VARCHAR(20)  NOT NULL,                             -- Mã cổ phiếu (VCB, FPT, ...)
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    clicked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho top mã click nhiều nhất
CREATE INDEX IF NOT EXISTS idx_stock_clicks_ticker
    ON system.stock_clicks (ticker);

-- Index cho thống kê theo thời gian
CREATE INDEX IF NOT EXISTS idx_stock_clicks_time
    ON system.stock_clicks (clicked_at DESC);

-- Composite cho đếm unique sessions per ticker
CREATE INDEX IF NOT EXISTS idx_stock_clicks_ticker_session
    ON system.stock_clicks (ticker, session_id);

-- ────────────────────────────────────────────────────────────
-- 4. stock_search_logs — Mỗi lần user tìm kiếm mã cổ phiếu
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 search event
-- Hot stock search = GROUP BY keyword → COUNT DESC
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.stock_search_logs (
    id          BIGSERIAL    PRIMARY KEY,
    keyword     VARCHAR(255) NOT NULL,                             -- Từ khóa tìm kiếm (mã CK hoặc tên)
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    searched_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho hot stock search
CREATE INDEX IF NOT EXISTS idx_stock_search_logs_keyword
    ON system.stock_search_logs (keyword);

-- Index cho thống kê theo thời gian
CREATE INDEX IF NOT EXISTS idx_stock_search_logs_time
    ON system.stock_search_logs (searched_at DESC);

-- Composite cho trend theo keyword + thời gian
CREATE INDEX IF NOT EXISTS idx_stock_search_logs_keyword_time
    ON system.stock_search_logs (keyword, searched_at DESC);

-- ────────────────────────────────────────────────────────────
-- 5. sidebar_clicks — Mỗi lần user click vào mục sidebar
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 click event (append-only)
-- Dùng để thống kê chức năng nào được dùng nhiều nhất
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.sidebar_clicks (
    id          BIGSERIAL    PRIMARY KEY,
    menu_name   VARCHAR(50)  NOT NULL,                             -- Tên menu: 'Tổng quan', 'Thị trường', ...
    menu_href   VARCHAR(100) NOT NULL,                             -- Path: '/', '/market', ...
    user_id     BIGINT       REFERENCES system.users(id) ON DELETE SET NULL,  -- NULL nếu chưa đăng nhập
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    clicked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sidebar_clicks_menu
    ON system.sidebar_clicks (menu_name);

CREATE INDEX IF NOT EXISTS idx_sidebar_clicks_time
    ON system.sidebar_clicks (clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_sidebar_clicks_user
    ON system.sidebar_clicks (user_id)
    WHERE user_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 6. login_logs — Bản ghi mỗi lần đăng nhập
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 login event (kể cả thất bại)
-- Dùng để thống kê số lần đăng nhập, thiết bị, phương thức
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.login_logs (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       REFERENCES system.users(id) ON DELETE SET NULL,  -- NULL nếu đăng nhập thất bại
    method      VARCHAR(20)  NOT NULL DEFAULT 'local',             -- 'local', 'google'
    success     BOOLEAN      NOT NULL DEFAULT TRUE,
    ip_address  VARCHAR(45),
    device_info TEXT,
    login_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user
    ON system.login_logs (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_login_logs_time
    ON system.login_logs (login_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_logs_method
    ON system.login_logs (method);

-- ────────────────────────────────────────────────────────────
-- 7. session_logs — Thời gian duy trì phiên trên web
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 phiên làm việc
-- FE gửi ping khi rời trang hoặc mỗi N giây (heartbeat)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.session_logs (
    id               BIGSERIAL    PRIMARY KEY,
    session_id       VARCHAR(64)  NOT NULL,
    user_id          BIGINT       REFERENCES system.users(id) ON DELETE SET NULL,  -- NULL = anonymous
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),          -- cập nhật mỗi heartbeat
    duration_seconds INTEGER      DEFAULT 0,                       -- tổng thời gian (giây), tính khi kết thúc
    ip_address       VARCHAR(45),
    user_agent       TEXT,
    ended            BOOLEAN      NOT NULL DEFAULT FALSE           -- TRUE khi session kết thúc
);

CREATE INDEX IF NOT EXISTS idx_session_logs_session
    ON system.session_logs (session_id);

CREATE INDEX IF NOT EXISTS idx_session_logs_user
    ON system.session_logs (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_logs_time
    ON system.session_logs (started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_logs_session_unique
    ON system.session_logs (session_id)
    WHERE ended = FALSE;

-- ────────────────────────────────────────────────────────────
-- Quyền (tuỳ setup, uncomment nếu cần)
-- ────────────────────────────────────────────────────────────
-- ALTER TABLE system.article_clicks      OWNER TO admin;
-- ALTER TABLE system.search_logs         OWNER TO admin;
-- ALTER TABLE system.stock_clicks        OWNER TO admin;
-- ALTER TABLE system.stock_search_logs   OWNER TO admin;
-- ALTER TABLE system.sidebar_clicks      OWNER TO admin;
-- ALTER TABLE system.login_logs          OWNER TO admin;

-- ────────────────────────────────────────────────────────────
-- 8. stock_price_alerts — Cảnh báo giá theo user/session
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.stock_price_alerts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES system.users(id) ON DELETE CASCADE,
    session_id      VARCHAR(64),
    ticker          VARCHAR(20) NOT NULL,
    condition_type  VARCHAR(20) NOT NULL,
    target_price    NUMERIC(15,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_at    TIMESTAMPTZ,
    CONSTRAINT alerts_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_stock_price_alerts_ticker_status
    ON system.stock_price_alerts (ticker, status);

CREATE INDEX IF NOT EXISTS idx_stock_price_alerts_user
    ON system.stock_price_alerts (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_price_alerts_session
    ON system.stock_price_alerts (session_id)
    WHERE session_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 9. user_favorite_stocks — Danh sách mã yêu thích
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.user_favorite_stocks (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES system.users(id) ON DELETE CASCADE,
    session_id  VARCHAR(64),
    ticker      VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fav_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL),
    CONSTRAINT uq_user_favorite UNIQUE NULLS NOT DISTINCT (user_id, ticker),
    CONSTRAINT uq_session_favorite UNIQUE NULLS NOT DISTINCT (session_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_stocks_user
    ON system.user_favorite_stocks (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_favorite_stocks_session
    ON system.user_favorite_stocks (session_id)
    WHERE session_id IS NOT NULL;
