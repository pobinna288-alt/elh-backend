-- Password Reset Columns for Users Table
-- Add these columns to the existing users table

-- Reset token (hashed with SHA-256, one-time use)
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(64) NULL;

-- Reset token expiry timestamp (15 minutes from creation)
ALTER TABLE users 
ADD COLUMN reset_token_expiry TIMESTAMP NULL;

-- Add index for faster token lookups
CREATE INDEX idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN users.reset_token IS 'SHA-256 hashed password reset token (one-time use, expires in 15 minutes)';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiry timestamp for reset token (15 minutes from creation)';

-- Example usage:
-- 1. User requests reset → Generate token → Hash with SHA-256 → Store hash + expiry
-- 2. User clicks link → Receive plain token → Hash it → Compare with stored hash
-- 3. If match and not expired → Allow password reset → Clear token fields
-- 4. Token is single-use → Cleared after successful reset
