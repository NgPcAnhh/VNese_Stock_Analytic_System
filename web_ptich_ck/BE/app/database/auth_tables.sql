-- ============================================================
-- Auth Tables — Schema: system
-- Đăng nhập, đăng ký, phân quyền, reset mật khẩu
-- ============================================================
CREATE SCHEMA IF NOT EXISTS system;
-- ────────────────────────────────────────────────────────────
-- 1. roles — Danh sách vai trò trong hệ thống
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO system.roles (name, description)
VALUES ('user', 'Người dùng thông thường'),
    ('admin', 'Quản trị viên hệ thống'),
    ('moderator', 'Kiểm duyệt nội dung') ON CONFLICT (name) DO NOTHING;
-- ────────────────────────────────────────────────────────────
-- 2. users — Thông tin tài khoản người dùng
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    role_id INTEGER NOT NULL DEFAULT 1 REFERENCES system.roles(id),
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
    google_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret VARCHAR(64),
    is_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: thêm cột 2FA cho bảng users đã tồn tại
ALTER TABLE system.users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE system.users ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_email ON system.users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON system.users (google_id)
WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON system.users (role_id);
-- ────────────────────────────────────────────────────────────
-- 3. refresh_tokens — Quản lý refresh token
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES system.users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON system.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON system.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON system.refresh_tokens (expires_at);
-- ────────────────────────────────────────────────────────────
-- 4. password_reset_tokens — Token đặt lại mật khẩu
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES system.users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON system.password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON system.password_reset_tokens (token);