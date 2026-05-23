-- ============================================================
-- Migration: thêm 3 bảng tracking mới vào schema system
-- page_views, analysis_views, error_logs
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 8. page_views — Theo dõi lượt xem trang
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.page_views (
    id          BIGSERIAL    PRIMARY KEY,
    page_path   VARCHAR(255) NOT NULL,                             -- Path: '/', '/market', '/analysis/VNM'
    page_title  VARCHAR(255),                                      -- Document title
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    user_id     BIGINT       REFERENCES system.users(id) ON DELETE SET NULL,
    ip_address  VARCHAR(45),
    referrer    TEXT,
    viewed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path
    ON system.page_views (page_path);

CREATE INDEX IF NOT EXISTS idx_page_views_time
    ON system.page_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_session
    ON system.page_views (session_id);

-- ────────────────────────────────────────────────────────────
-- 9. analysis_views — Theo dõi lượt phân tích kỹ thuật CK
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.analysis_views (
    id          BIGSERIAL    PRIMARY KEY,
    ticker      VARCHAR(20)  NOT NULL,                             -- Mã CK: VNM, FPT, VCB
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    user_id     BIGINT       REFERENCES system.users(id) ON DELETE SET NULL,
    ip_address  VARCHAR(45),
    viewed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_views_ticker
    ON system.analysis_views (ticker);

CREATE INDEX IF NOT EXISTS idx_analysis_views_time
    ON system.analysis_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_views_ticker_session
    ON system.analysis_views (ticker, session_id);

-- ────────────────────────────────────────────────────────────
-- 10. error_logs — Ghi nhận lỗi hệ thống
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.error_logs (
    id          BIGSERIAL    PRIMARY KEY,
    error_type  VARCHAR(50)  NOT NULL DEFAULT 'frontend',          -- 'frontend', 'backend', 'api'
    error_message TEXT       NOT NULL,
    stack_trace TEXT,
    page_url    TEXT,
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    user_id     BIGINT       REFERENCES system.users(id) ON DELETE SET NULL,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type
    ON system.error_logs (error_type);

CREATE INDEX IF NOT EXISTS idx_error_logs_time
    ON system.error_logs (created_at DESC);
