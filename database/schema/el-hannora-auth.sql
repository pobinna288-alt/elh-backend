-- El Hannora Authentication Schema
-- PostgreSQL schema for Create Account, Login, Forgot Password, Terms & Conditions

-- ============================================
-- USERS TABLE (Enhanced for El Hannora)
-- ============================================

-- Drop existing tables if needed (use with caution in production)
-- DROP TABLE IF EXISTS password_reset_tokens CASCADE;
-- DROP TABLE IF EXISTS workspaces CASCADE;
-- DROP TABLE IF EXISTS el_hannora_users CASCADE;

-- Users Table
CREATE TABLE el_hannora_users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication Fields
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile Information
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  
  -- Account Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned', 'suspended')),
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'premium', 'pro', 'enterprise', 'admin')),
  
  -- Terms & Conditions
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP,
  terms_version VARCHAR(20) DEFAULT '1.0',
  
  -- Email Verification
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires_at TIMESTAMP,
  
  -- Password Reset
  reset_token VARCHAR(64),
  reset_token_expires_at TIMESTAMP,
  
  -- Security
  failed_login_attempts INTEGER DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  
  -- Remember Me
  remember_token VARCHAR(255),
  remember_token_expires_at TIMESTAMP,
  
  -- Subscription
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WORKSPACES TABLE
-- ============================================

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES el_hannora_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add workspace_id to users after workspaces table exists
ALTER TABLE el_hannora_users 
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================
-- PASSWORD RESET TOKENS TABLE (Alternative to user column)
-- ============================================

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES el_hannora_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_unused_token UNIQUE (user_id, token_hash)
);

-- ============================================
-- LOGIN ATTEMPTS TABLE (For Rate Limiting)
-- ============================================

CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  success BOOLEAN NOT NULL,
  attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TERMS AND CONDITIONS VERSION TABLE
-- ============================================

CREATE TABLE terms_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default Terms and Conditions
INSERT INTO terms_conditions (version, content, effective_date) VALUES (
  '1.0',
  E'**Account Responsibility**\n- You are responsible for keeping your login credentials (email and password) confidential.\n- All activity under your account is your responsibility.\n- Accounts are personal; do not share your login.\n\n**Platform Use**\n- The platform does not require personal user age or location at signup.\n- You may provide audience targeting information (age range, location, gender, platform) to improve AI predictions.\n- Predictions are estimates and may not be 100% accurate. El Hannora is not liable for financial loss or campaign outcomes.\n- You agree to provide truthful information for accurate predictions.\n\n**Prohibited Content & Behavior**\n- No sexual content, harmful, illegal, or deceptive ads are allowed.\n- Any violation of rules may result in automatic suspension or ban of your account.\n\n**Liability**\n- Use of El Hannora is at your own risk.\n- The platform provides AI predictions to assist campaigns, but does not guarantee results.\n\n**Modifications**\n- El Hannora may update these Terms at any time.\n- Continued use of the platform constitutes acceptance of updated Terms.',
  CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_el_hannora_users_email ON el_hannora_users(email);
CREATE INDEX idx_el_hannora_users_status ON el_hannora_users(status);
CREATE INDEX idx_el_hannora_users_workspace ON el_hannora_users(workspace_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempt_at);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER el_hannora_users_updated_at
BEFORE UPDATE ON el_hannora_users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE el_hannora_users IS 'User accounts for El Hannora AI-powered ad prediction platform';
COMMENT ON COLUMN el_hannora_users.password_hash IS 'Bcrypt hashed password (never stored in plain text)';
COMMENT ON COLUMN el_hannora_users.terms_accepted IS 'Whether user accepted Terms and Conditions at signup';
COMMENT ON COLUMN el_hannora_users.status IS 'Account status: active, inactive, banned, suspended';
COMMENT ON COLUMN el_hannora_users.failed_login_attempts IS 'Counter for failed login attempts (for rate limiting)';
