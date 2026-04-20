-- PostgreSQL Refresh Tokens Table for EL HANNORA
-- Supports multiple device login tracking and token revocation

CREATE TABLE refresh_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token Storage (hashed with SHA-256)
  token VARCHAR(64) NOT NULL UNIQUE,

  -- Device Tracking
  device_info VARCHAR(500),
  ip_address VARCHAR(45),

  -- Token Lifecycle
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP,

  -- Indexes for performance
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- Composite index for active token lookup
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(user_id, is_revoked, expires_at);

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for multi-device login support';
COMMENT ON COLUMN refresh_tokens.token IS 'SHA-256 hashed refresh token (not the actual JWT)';
COMMENT ON COLUMN refresh_tokens.device_info IS 'User-Agent string from login request';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address from login request';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'True if token has been manually revoked (logout)';
COMMENT ON COLUMN refresh_tokens.last_used_at IS 'Last time this token was used to refresh access token';
