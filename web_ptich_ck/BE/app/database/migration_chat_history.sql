-- ============================================================
-- Migration: Chat Session History for AI Chatbot
-- ============================================================
-- Tạo bảng để lưu trữ danh sách phiên chat và tin nhắn của người dùng
-- ============================================================

CREATE TABLE IF NOT EXISTS system.chat_sessions (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     BIGINT        REFERENCES system.users(id) ON DELETE CASCADE,
    title       VARCHAR(255)  NOT NULL DEFAULT 'Cuộc hội thoại mới',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON system.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON system.chat_sessions(updated_at DESC);

CREATE TABLE IF NOT EXISTS system.chat_messages (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID          NOT NULL REFERENCES system.chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20)   NOT NULL,
    content     TEXT          NOT NULL,
    meta        JSONB,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON system.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON system.chat_messages(created_at ASC);
