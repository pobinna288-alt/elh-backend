-- Rewarded Video Fraud Detection Database Schema
-- Run this migration to set up financial-grade fraud tracking

-- Reward tracking table (financial ledger)
CREATE TABLE IF NOT EXISTS ad_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'cleared', 'suspicious', 'reversed')),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  clearable_at TIMESTAMP,
  cleared_at TIMESTAMP,
  reversal_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_amount CHECK (amount > 0)
);

CREATE INDEX idx_ad_rewards_user_id ON ad_rewards(user_id);
CREATE INDEX idx_ad_rewards_state ON ad_rewards(state);
CREATE INDEX idx_ad_rewards_earned_at ON ad_rewards(earned_at DESC);
CREATE INDEX idx_ad_rewards_clearable_at ON ad_rewards(clearable_at) WHERE state = 'pending';

-- Video session tracking
CREATE TABLE IF NOT EXISTS video_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  reward_amount DECIMAL(10, 2) NOT NULL,
  last_checkpoint SMALLINT DEFAULT 0 CHECK (last_checkpoint >= 0 AND last_checkpoint <= 100),
  last_checkpoint_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_video_sessions_user_id ON video_sessions(user_id);
CREATE INDEX idx_video_sessions_status ON video_sessions(status);
CREATE INDEX idx_video_sessions_created_at ON video_sessions(created_at DESC);

-- Recovery tracking (for sessions interrupted by network/app background)
CREATE TABLE IF NOT EXISTS reward_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  checkpoint SMALLINT NOT NULL CHECK (checkpoint >= 0 AND checkpoint <= 100),
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reward_recoveries_user_id ON reward_recoveries(user_id);
CREATE INDEX idx_reward_recoveries_created_at ON reward_recoveries(created_at DESC);

-- Fraud events for auditing and analysis
CREATE TABLE IF NOT EXISTS fraud_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_events_user_id ON fraud_events(user_id);
CREATE INDEX idx_fraud_events_severity ON fraud_events(severity);
CREATE INDEX idx_fraud_events_created_at ON fraud_events(created_at DESC);

-- User flags for manual review
CREATE TABLE IF NOT EXISTS user_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  reason TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

CREATE INDEX idx_user_flags_user_id ON user_flags(user_id);
CREATE INDEX idx_user_flags_resolved_at ON user_flags(resolved_at);
CREATE INDEX idx_user_flags_created_at ON user_flags(created_at DESC);
CREATE INDEX idx_user_flags_severity ON user_flags(severity);

-- Device blacklist
CREATE TABLE IF NOT EXISTS device_blocks (
  fingerprint TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_device_blocks_created_at ON device_blocks(created_at DESC);
CREATE INDEX idx_device_blocks_expires_at ON device_blocks(expires_at);

-- IP blacklist
CREATE TABLE IF NOT EXISTS ip_blocks (
  ip_address INET PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_ip_blocks_created_at ON ip_blocks(created_at DESC);
CREATE INDEX idx_ip_blocks_expires_at ON ip_blocks(expires_at);

-- Daily financial reconciliation
CREATE TABLE IF NOT EXISTS daily_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  expected_coins DECIMAL(12, 2) NOT NULL,
  actual_coins DECIMAL(12, 2) NOT NULL,
  discrepancy DECIMAL(12, 2),
  discrepancy_percent DECIMAL(5, 2),
  status TEXT NOT NULL CHECK (status IN ('OK', 'ALERT', 'INVESTIGATED')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_reconciliation_date ON daily_reconciliation(date DESC);
CREATE INDEX idx_daily_reconciliation_status ON daily_reconciliation(status);

-- Add columns to users table for fraud tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_coins DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawable_coins DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

CREATE INDEX idx_users_banned ON users(banned);
CREATE INDEX idx_users_pending_coins ON users(pending_coins);

-- Add columns to track user sessions and device fingerprints
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address INET;

CREATE INDEX idx_user_sessions_device_fingerprint ON user_sessions(device_fingerprint);
CREATE INDEX idx_user_sessions_ip_address ON user_sessions(ip_address);

-- Withdrawal request tracking
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'refunded')),
  payment_method TEXT,
  payment_details JSONB,
  fraud_check_result TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_withdrawal_amount CHECK (amount > 0)
);

CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Grant indices for fast query performance
CREATE INDEX idx_ad_rewards_user_state_earned ON ad_rewards(user_id, state, earned_at DESC);
CREATE INDEX idx_video_sessions_user_created ON video_sessions(user_id, created_at DESC);
CREATE INDEX idx_fraud_events_user_created ON fraud_events(user_id, created_at DESC);

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW fraud_dashboard AS
SELECT
  u.id,
  u.email,
  COUNT(DISTINCT vs.session_id) as ads_watched_total,
  COUNT(DISTINCT CASE WHEN vs.created_at > NOW() - INTERVAL '24 hours' THEN vs.session_id END) as ads_watched_24h,
  COUNT(DISTINCT CASE WHEN ar.state = 'cleared' THEN ar.id END) as rewards_cleared,
  COUNT(DISTINCT CASE WHEN ar.state = 'pending' THEN ar.id END) as rewards_pending,
  COALESCE(SUM(CASE WHEN ar.state IN ('cleared', 'pending') THEN ar.amount END), 0) as total_earned,
  COUNT(DISTINCT CASE WHEN fe.severity = 'HIGH' THEN fe.id END) as high_severity_events,
  COUNT(DISTINCT CASE WHEN uf.resolved_at IS NULL THEN uf.id END) as active_flags,
  u.banned,
  MAX(fe.created_at) as last_suspicious_activity
FROM users u
LEFT JOIN video_sessions vs ON u.id = vs.user_id
LEFT JOIN ad_rewards ar ON u.id = ar.user_id
LEFT JOIN fraud_events fe ON u.id = fe.user_id
LEFT JOIN user_flags uf ON u.id = uf.user_id
GROUP BY u.id, u.email, u.banned;

-- Audit triggers for compliance
CREATE OR REPLACE FUNCTION log_reward_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.state != OLD.state THEN
    INSERT INTO fraud_events (user_id, event_type, severity, description, metadata)
    VALUES (
      NEW.user_id,
      'reward-state-change',
      'LOW',
      'Reward state changed',
      jsonlib_build(
        'old_state', OLD.state,
        'new_state', NEW.state,
        'session_id', NEW.session_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_reward_change
AFTER UPDATE ON ad_rewards
FOR EACH ROW
EXECUTE FUNCTION log_reward_change();
