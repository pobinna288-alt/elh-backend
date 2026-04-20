-- =====================================================================
-- MARKETPLACE FRAUD DETECTION SYSTEM - DATABASE SCHEMA
-- =====================================================================
-- Backend-only fraud detection for classified ads platform
-- Designed for production scale with audit compliance
-- =====================================================================

-- =====================================================================
-- 1. EVENT TRACKING TABLES
-- =====================================================================

-- User behavior events (account-level)
CREATE TABLE IF NOT EXISTS fraud_user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'account_created', 'email_verified', 'phone_verified', 'profile_updated', 'login', 'ip_change', 'country_change'
  event_data JSONB NOT NULL DEFAULT '{}', -- Flexible storage for event-specific data
  ip_address INET,
  country_code VARCHAR(2),
  device_fingerprint_hash VARCHAR(64), -- SHA-256 hash of device fingerprint
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'account_created', 'email_verified', 'phone_verified', 'profile_updated',
    'login', 'logout', 'ip_change', 'country_change', 'device_change'
  ))
);

CREATE INDEX idx_fraud_user_events_user_id ON fraud_user_events(user_id);
CREATE INDEX idx_fraud_user_events_type ON fraud_user_events(event_type);
CREATE INDEX idx_fraud_user_events_created_at ON fraud_user_events(created_at DESC);
CREATE INDEX idx_fraud_user_events_device_hash ON fraud_user_events(device_fingerprint_hash) WHERE device_fingerprint_hash IS NOT NULL;
CREATE INDEX idx_fraud_user_events_ip ON fraud_user_events(ip_address) WHERE ip_address IS NOT NULL;

-- Ad listing events
CREATE TABLE IF NOT EXISTS fraud_ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL, -- References ads table
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'ad_created', 'ad_edited', 'ad_deleted', 'price_changed', 'images_uploaded', 'description_changed'
  event_data JSONB NOT NULL DEFAULT '{}',
  -- Ad-specific tracking
  category_id UUID,
  price_amount DECIMAL(12, 2),
  price_change_delta DECIMAL(12, 2), -- Change from previous price
  image_count SMALLINT,
  image_perceptual_hashes TEXT[], -- Array of perceptual hashes for duplicate detection
  description_hash VARCHAR(64), -- SHA-256 of normalized description
  description_length INT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_ad_event_type CHECK (event_type IN (
    'ad_created', 'ad_edited', 'ad_deleted', 'ad_reposted',
    'price_changed', 'images_uploaded', 'images_changed',
    'description_changed', 'category_changed', 'promoted'
  ))
);

CREATE INDEX idx_fraud_ad_events_ad_id ON fraud_ad_events(ad_id);
CREATE INDEX idx_fraud_ad_events_user_id ON fraud_ad_events(user_id);
CREATE INDEX idx_fraud_ad_events_type ON fraud_ad_events(event_type);
CREATE INDEX idx_fraud_ad_events_created_at ON fraud_ad_events(created_at DESC);
CREATE INDEX idx_fraud_ad_events_description_hash ON fraud_ad_events(description_hash) WHERE description_hash IS NOT NULL;

-- Messaging behavior events (metadata only - no message content)
CREATE TABLE IF NOT EXISTS fraud_messaging_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID, -- References conversations table
  ad_id UUID, -- Ad being discussed
  event_type VARCHAR(50) NOT NULL, -- 'message_sent', 'rapid_messages', 'off_platform_pattern', 'conversation_abandoned'
  message_count INT DEFAULT 1,
  time_since_last_message_seconds INT,
  pattern_flags TEXT[], -- Array of detected patterns: 'whatsapp_mention', 'phone_number', 'email', 'repeated_text'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_messaging_event_type CHECK (event_type IN (
    'message_sent', 'rapid_messages', 'off_platform_pattern',
    'conversation_started', 'conversation_abandoned', 'user_blocked'
  ))
);

CREATE INDEX idx_fraud_messaging_events_sender ON fraud_messaging_events(sender_id);
CREATE INDEX idx_fraud_messaging_events_recipient ON fraud_messaging_events(recipient_id);
CREATE INDEX idx_fraud_messaging_events_conversation ON fraud_messaging_events(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_fraud_messaging_events_created_at ON fraud_messaging_events(created_at DESC);

-- Community feedback events (reports, blocks)
CREATE TABLE IF NOT EXISTS fraud_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_ad_id UUID, -- Optional: specific ad being reported
  event_type VARCHAR(50) NOT NULL, -- 'user_reported', 'ad_reported', 'user_blocked', 'conversation_abandoned'
  report_reason VARCHAR(100), -- 'scam', 'fake_ad', 'harassment', 'spam', 'fraud', 'other'
  report_details TEXT,
  evidence_urls TEXT[], -- Screenshots, links, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_feedback_event_type CHECK (event_type IN (
    'user_reported', 'ad_reported', 'user_blocked', 'ad_flagged'
  )),
  CONSTRAINT valid_report_reason CHECK (report_reason IN (
    'scam', 'fake_ad', 'harassment', 'spam', 'fraud', 'fake_images',
    'fake_price', 'suspicious_behavior', 'impersonation', 'other'
  ))
);

CREATE INDEX idx_fraud_feedback_reporter ON fraud_feedback_events(reporter_id);
CREATE INDEX idx_fraud_feedback_reported_user ON fraud_feedback_events(reported_user_id);
CREATE INDEX idx_fraud_feedback_reported_ad ON fraud_feedback_events(reported_ad_id) WHERE reported_ad_id IS NOT NULL;
CREATE INDEX idx_fraud_feedback_reason ON fraud_feedback_events(report_reason);
CREATE INDEX idx_fraud_feedback_created_at ON fraud_feedback_events(created_at DESC);

-- =====================================================================
-- 2. FRAUD SCORING SYSTEM
-- =====================================================================

-- Real-time fraud scores per user
CREATE TABLE IF NOT EXISTS fraud_user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100), -- 0-100 scale
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  signal_breakdown JSONB NOT NULL DEFAULT '{}', -- Detailed breakdown of what contributed to score
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  previous_score SMALLINT,
  score_trend VARCHAR(20) DEFAULT 'stable', -- 'improving', 'stable', 'worsening'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_score_trend CHECK (score_trend IN ('improving', 'stable', 'worsening'))
);

CREATE UNIQUE INDEX idx_fraud_user_scores_user_id ON fraud_user_scores(user_id);
CREATE INDEX idx_fraud_user_scores_risk_level ON fraud_user_scores(risk_level);
CREATE INDEX idx_fraud_user_scores_score ON fraud_user_scores(score DESC);
CREATE INDEX idx_fraud_user_scores_updated_at ON fraud_user_scores(updated_at DESC);

-- Historical fraud score tracking (for trend analysis)
CREATE TABLE IF NOT EXISTS fraud_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level VARCHAR(20) NOT NULL,
  signal_breakdown JSONB NOT NULL DEFAULT '{}',
  trigger_event VARCHAR(100), -- What caused this score calculation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_score_history_user_id ON fraud_score_history(user_id);
CREATE INDEX idx_fraud_score_history_created_at ON fraud_score_history(created_at DESC);
CREATE INDEX idx_fraud_score_history_score ON fraud_score_history(score DESC);

-- Per-ad fraud scores
CREATE TABLE IF NOT EXISTS fraud_ad_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  signal_breakdown JSONB NOT NULL DEFAULT '{}',
  action_taken VARCHAR(50), -- 'none', 'reduced_visibility', 'hidden', 'flagged_for_review'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_ad_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_ad_action CHECK (action_taken IN ('none', 'reduced_visibility', 'hidden', 'flagged_for_review', 'removed'))
);

CREATE UNIQUE INDEX idx_fraud_ad_scores_ad_id ON fraud_ad_scores(ad_id);
CREATE INDEX idx_fraud_ad_scores_user_id ON fraud_ad_scores(user_id);
CREATE INDEX idx_fraud_ad_scores_risk_level ON fraud_ad_scores(risk_level);
CREATE INDEX idx_fraud_ad_scores_score ON fraud_ad_scores(score DESC);

-- =====================================================================
-- 3. ENFORCEMENT ACTIONS
-- =====================================================================

-- User restrictions and enforcement history
CREATE TABLE IF NOT EXISTS fraud_enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'warning', 'soft_restriction', 'temp_ban', 'permanent_ban'
  action_level SMALLINT NOT NULL CHECK (action_level IN (1, 2, 3)), -- Level 1, 2, or 3
  reason TEXT NOT NULL,
  fraud_score_at_action SMALLINT,
  evidence JSONB NOT NULL DEFAULT '{}', -- Links to events, reports, scores
  restrictions JSONB, -- Specific restrictions applied: {'can_post': false, 'can_message': true, 'ads_hidden': true}
  
  -- Duration tracking
  starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for permanent bans
  lifted_at TIMESTAMP, -- When restriction was removed (appeal, expiry)
  
  -- Admin accountability
  applied_by UUID REFERENCES users(id), -- Admin who applied action (NULL for automated)
  applied_by_system BOOLEAN DEFAULT true, -- true if automated, false if manual
  lifted_by UUID REFERENCES users(id), -- Admin who lifted action
  lift_reason TEXT, -- Reason for lifting (appeal approved, mistake, etc.)
  
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'lifted', 'superseded'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'warning', 'soft_restriction', 'feature_limit', 'temp_ban', 'permanent_ban'
  )),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'lifted', 'superseded'))
);

CREATE INDEX idx_fraud_enforcement_user_id ON fraud_enforcement_actions(user_id);
CREATE INDEX idx_fraud_enforcement_action_type ON fraud_enforcement_actions(action_type);
CREATE INDEX idx_fraud_enforcement_status ON fraud_enforcement_actions(status);
CREATE INDEX idx_fraud_enforcement_expires_at ON fraud_enforcement_actions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_fraud_enforcement_created_at ON fraud_enforcement_actions(created_at DESC);

-- =====================================================================
-- 4. ADMIN REVIEW QUEUE
-- =====================================================================

-- Queue for manual review
CREATE TABLE IF NOT EXISTS fraud_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  review_reason VARCHAR(100) NOT NULL, -- 'high_fraud_score', 'multiple_reports', 'automated_detection', 'repeat_offender'
  fraud_score SMALLINT,
  report_count INT DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '{}', -- All relevant data for review
  
  -- Review tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'completed', 'escalated'
  assigned_to UUID REFERENCES users(id), -- Admin assigned to review
  assigned_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  review_decision VARCHAR(50), -- 'no_action', 'warning', 'restriction', 'temp_ban', 'permanent_ban', 'false_positive'
  review_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_review_status CHECK (status IN ('pending', 'in_review', 'completed', 'escalated')),
  CONSTRAINT valid_review_decision CHECK (review_decision IN (
    'no_action', 'warning', 'soft_restriction', 'temp_ban', 'permanent_ban', 'false_positive', 'needs_more_info'
  ))
);

CREATE INDEX idx_fraud_review_queue_user_id ON fraud_review_queue(user_id);
CREATE INDEX idx_fraud_review_queue_status ON fraud_review_queue(status);
CREATE INDEX idx_fraud_review_queue_priority ON fraud_review_queue(priority);
CREATE INDEX idx_fraud_review_queue_assigned_to ON fraud_review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_fraud_review_queue_created_at ON fraud_review_queue(created_at DESC);

-- =====================================================================
-- 5. APPEALS SYSTEM
-- =====================================================================

-- User appeals for enforcement actions
CREATE TABLE IF NOT EXISTS fraud_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id UUID NOT NULL REFERENCES fraud_enforcement_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appeal_text TEXT NOT NULL,
  evidence_urls TEXT[], -- User-provided evidence
  
  -- Appeal processing
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected'
  reviewed_by UUID REFERENCES users(id), -- Admin who reviewed appeal
  reviewed_at TIMESTAMP,
  review_decision TEXT, -- Admin's explanation
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_appeal_status CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'))
);

CREATE INDEX idx_fraud_appeals_enforcement_id ON fraud_appeals(enforcement_action_id);
CREATE INDEX idx_fraud_appeals_user_id ON fraud_appeals(user_id);
CREATE INDEX idx_fraud_appeals_status ON fraud_appeals(status);
CREATE INDEX idx_fraud_appeals_created_at ON fraud_appeals(created_at DESC);

-- =====================================================================
-- 6. AUDIT LOGS (IMMUTABLE)
-- =====================================================================

-- Comprehensive audit trail for all fraud-related decisions
CREATE TABLE IF NOT EXISTS fraud_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL, -- 'score_calculated', 'action_applied', 'action_lifted', 'appeal_reviewed', 'manual_override'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User affected
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who performed action (if manual)
  
  -- Context
  before_state JSONB, -- State before action
  after_state JSONB, -- State after action
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Additional context
  
  -- Audit trail (immutable)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- This table should NEVER have updates or deletes
  CONSTRAINT no_updates CHECK (true)
);

CREATE INDEX idx_fraud_audit_logs_user_id ON fraud_audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_fraud_audit_logs_admin_id ON fraud_audit_logs(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX idx_fraud_audit_logs_action_type ON fraud_audit_logs(action_type);
CREATE INDEX idx_fraud_audit_logs_created_at ON fraud_audit_logs(created_at DESC);

-- =====================================================================
-- 7. PATTERN DETECTION HELPERS
-- =====================================================================

-- Device fingerprint tracking (for multi-account detection)
CREATE TABLE IF NOT EXISTS fraud_device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash
  associated_user_ids UUID[] DEFAULT '{}', -- Array of user IDs seen on this device
  user_count INT DEFAULT 0,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  
  CONSTRAINT valid_device_hash CHECK (length(device_hash) = 64)
);

CREATE UNIQUE INDEX idx_fraud_device_fingerprints_hash ON fraud_device_fingerprints(device_hash);
CREATE INDEX idx_fraud_device_fingerprints_flagged ON fraud_device_fingerprints(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_fraud_device_fingerprints_user_count ON fraud_device_fingerprints(user_count DESC);

-- IP address reputation
CREATE TABLE IF NOT EXISTS fraud_ip_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  associated_user_ids UUID[] DEFAULT '{}',
  user_count INT DEFAULT 0,
  country_code VARCHAR(2),
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  is_datacenter BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_fraud_ip_reputation_ip ON fraud_ip_reputation(ip_address);
CREATE INDEX idx_fraud_ip_reputation_flagged ON fraud_ip_reputation(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_fraud_ip_reputation_vpn ON fraud_ip_reputation(is_vpn) WHERE is_vpn = true;

-- Content pattern tracking (for duplicate ad detection)
CREATE TABLE IF NOT EXISTS fraud_content_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(50) NOT NULL, -- 'description_text', 'image_perceptual_hash'
  pattern_hash VARCHAR(64) NOT NULL,
  ad_ids UUID[] DEFAULT '{}',
  user_ids UUID[] DEFAULT '{}',
  occurrence_count INT DEFAULT 1,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_flagged BOOLEAN DEFAULT false,
  
  CONSTRAINT valid_pattern_type CHECK (pattern_type IN ('description_text', 'image_perceptual_hash', 'title_text'))
);

CREATE INDEX idx_fraud_content_patterns_hash ON fraud_content_patterns(pattern_hash);
CREATE INDEX idx_fraud_content_patterns_type ON fraud_content_patterns(pattern_type);
CREATE INDEX idx_fraud_content_patterns_flagged ON fraud_content_patterns(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_fraud_content_patterns_count ON fraud_content_patterns(occurrence_count DESC);

-- =====================================================================
-- 8. CONFIGURATION & THRESHOLDS
-- =====================================================================

-- Dynamic fraud detection configuration (adjustable without code changes)
CREATE TABLE IF NOT EXISTS fraud_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configurations
INSERT INTO fraud_config (config_key, config_value, description) VALUES
('score_thresholds', '{"low": [0, 30], "medium": [31, 60], "high": [61, 80], "critical": [81, 100]}', 'Fraud score risk level thresholds'),
('signal_weights', '{"new_account": 15, "unverified_email": 10, "unverified_phone": 10, "rapid_posting": 20, "price_outlier": 15, "duplicate_content": 25, "high_reports": 30, "previous_warnings": 20}', 'Weight of each fraud signal (0-100)'),
('rate_limits', '{"max_ads_per_day": 30, "max_ads_per_hour": 5, "max_messages_per_hour": 50, "max_reports_considered": 10}', 'Rate limits for various actions'),
('ban_criteria', '{"temp_ban_score": 75, "perm_ban_min_score": 85, "perm_ban_min_reports": 3, "perm_ban_min_warnings": 2}', 'Criteria for different ban levels'),
('score_decay', '{"decay_rate_per_day": 2, "min_days_good_behavior": 30, "full_recovery_days": 90}', 'Score decay configuration for good behavior')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================================
-- 9. HELPER VIEWS
-- =====================================================================

-- View: Active restrictions per user
CREATE OR REPLACE VIEW fraud_active_restrictions AS
SELECT 
  user_id,
  action_type,
  action_level,
  restrictions,
  starts_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'permanent'
    WHEN expires_at > CURRENT_TIMESTAMP THEN 'active'
    ELSE 'expired'
  END as restriction_status
FROM fraud_enforcement_actions
WHERE status = 'active'
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- View: Users pending review (high priority)
CREATE OR REPLACE VIEW fraud_high_priority_reviews AS
SELECT 
  frq.id,
  frq.user_id,
  u.email,
  u.username,
  frq.priority,
  frq.fraud_score,
  frq.report_count,
  frq.review_reason,
  frq.created_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - frq.created_at)) / 3600 as hours_waiting
FROM fraud_review_queue frq
JOIN users u ON frq.user_id = u.id
WHERE frq.status = 'pending'
  AND frq.priority IN ('high', 'urgent')
ORDER BY 
  CASE frq.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
  END,
  frq.created_at ASC;

-- View: Repeat offenders
CREATE OR REPLACE VIEW fraud_repeat_offenders AS
SELECT 
  user_id,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN action_type = 'warning' THEN 1 END) as warning_count,
  COUNT(CASE WHEN action_type = 'temp_ban' THEN 1 END) as temp_ban_count,
  COUNT(CASE WHEN action_type = 'permanent_ban' THEN 1 END) as perm_ban_count,
  MAX(fraud_score_at_action) as highest_score,
  MAX(created_at) as last_action_date
FROM fraud_enforcement_actions
GROUP BY user_id
HAVING COUNT(*) >= 2
ORDER BY total_actions DESC, highest_score DESC;

-- =====================================================================
-- 10. PERFORMANCE OPTIMIZATIONS
-- =====================================================================

-- Partition fraud_user_events by month (for large scale)
-- Uncomment if dealing with millions of events per month
/*
CREATE TABLE fraud_user_events_y2026m01 PARTITION OF fraud_user_events
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
*/

-- Automatically archive old events (keep 90 days hot, move rest to archive)
-- This can be implemented as a scheduled job

COMMENT ON TABLE fraud_user_events IS 'Tracks all user behavior events for fraud detection';
COMMENT ON TABLE fraud_ad_events IS 'Tracks all ad listing events for fraud detection';
COMMENT ON TABLE fraud_messaging_events IS 'Tracks messaging patterns (metadata only, no content)';
COMMENT ON TABLE fraud_feedback_events IS 'Tracks community reports and feedback';
COMMENT ON TABLE fraud_user_scores IS 'Current fraud risk scores per user (0-100)';
COMMENT ON TABLE fraud_enforcement_actions IS 'All enforcement actions taken (warnings, bans, restrictions)';
COMMENT ON TABLE fraud_review_queue IS 'Queue for manual admin review of suspicious users';
COMMENT ON TABLE fraud_appeals IS 'User appeals against enforcement actions';
COMMENT ON TABLE fraud_audit_logs IS 'IMMUTABLE audit trail for compliance and appeals';

-- =====================================================================
-- DEPLOYMENT NOTES
-- =====================================================================
-- 1. Run this schema AFTER main user/ads tables exist
-- 2. Ensure PostgreSQL version >= 12 for JSONB and partitioning support
-- 3. Configure appropriate backup retention for fraud_audit_logs (compliance)
-- 4. Set up monitoring alerts for:
--    - fraud_review_queue depth
--    - High fraud score spikes
--    - Repeated permanent bans
-- 5. Review and adjust fraud_config values based on platform size
-- =====================================================================
