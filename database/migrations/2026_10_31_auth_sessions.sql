CREATE TABLE IF NOT EXISTS auth_sessions (
 id CHAR(36) PRIMARY KEY,
 user_id BIGINT NOT NULL,
 last_seen DATETIME NOT NULL,
 expires_at DATETIME NOT NULL,
 INDEX idx_auth_sessions_user (user_id),
 INDEX idx_auth_sessions_expiry (expires_at)
);
-- Programar limpieza periódica: DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP();
