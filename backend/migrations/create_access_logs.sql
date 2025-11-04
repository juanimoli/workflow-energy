-- Migration: Create access_logs table for audit trail
-- Version: 1.4.0
-- Date: 2025-11-04

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(255),
    session_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance (with IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_username ON access_logs(username);
CREATE INDEX IF NOT EXISTS idx_access_logs_login_attempt_at ON access_logs(login_attempt_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_success ON access_logs(success);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);

-- Add comment to the table
COMMENT ON TABLE access_logs IS 'Audit trail for user login attempts (successful and failed)';
COMMENT ON COLUMN access_logs.success IS 'true if login was successful, false if failed';
COMMENT ON COLUMN access_logs.failure_reason IS 'Reason for login failure (e.g., invalid password, user not found)';
