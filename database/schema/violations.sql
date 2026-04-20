-- ============================================
-- EL HANNORA - Trust Score & Violations Schema
-- PostgreSQL Schema for Trust Management System
-- ============================================
--
-- This schema implements:
-- - Violations tracking for transparency
-- - Trust score change logging
-- - Penalty history for auditing
-- ============================================

-- ============================================
-- VIOLATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Violation details
    violation_type VARCHAR(50) NOT NULL
        CHECK (violation_type IN (
            'user_report',
            'spam_ad',
            'fake_ad',
            'sexual_content',
            'scam'
        )),
    
    -- Penalty applied
    penalty_points INTEGER NOT NULL,
    
    -- Context
    ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
    description TEXT,
    
    -- Reporter (for user reports)
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Moderation info
    detected_by VARCHAR(50) DEFAULT 'manual'
        CHECK (detected_by IN ('manual', 'ai_moderation', 'user_report', 'system')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'confirmed'
        CHECK (status IN ('pending', 'confirmed', 'appealed', 'reversed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- TRUST SCORE HISTORY TABLE
-- For complete audit trail of trust changes
-- ============================================

CREATE TABLE IF NOT EXISTS trust_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score change
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    
    -- Event that triggered change
    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN (
            'account_created',
            'email_verified',
            'account_age_bonus',
            'user_report_confirmed',
            'spam_ad_detected',
            'fake_ad_detected',
            'sexual_content_detected',
            'confirmed_scam',
            'manual_adjustment',
            'appeal_approved'
        )),
    
    -- Reference to violation (if applicable)
    violation_id UUID REFERENCES violations(id) ON DELETE SET NULL,
    
    -- Context
    description TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER TRUST EXTENSIONS
-- Add trust-related columns to users table
-- ============================================

-- Note: Run these ALTER statements if columns don't exist
DO $$
BEGIN
    -- Add trust_score column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'trust_score'
    ) THEN
        ALTER TABLE users ADD COLUMN trust_score INTEGER DEFAULT 30;
    END IF;
    
    -- Add email_verified column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add email_verification_reward_claimed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verification_reward_claimed'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verification_reward_claimed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add account age bonus tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_age_bonus_days'
    ) THEN
        ALTER TABLE users ADD COLUMN last_age_bonus_days INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Violations indexes
CREATE INDEX IF NOT EXISTS idx_violations_user_id ON violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_created ON violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_ad_id ON violations(ad_id);

-- Trust history indexes
CREATE INDEX IF NOT EXISTS idx_trust_history_user_id ON trust_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_history_event ON trust_score_history(event_type);
CREATE INDEX IF NOT EXISTS idx_trust_history_created ON trust_score_history(created_at DESC);

-- User trust indexes
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON users(trust_score DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get trust level from score
CREATE OR REPLACE FUNCTION get_trust_level(score INTEGER)
RETURNS VARCHAR(50) AS $$
BEGIN
    IF score <= 39 THEN
        RETURN 'New Seller';
    ELSIF score <= 69 THEN
        RETURN 'Verified Seller';
    ELSE
        RETURN 'Trusted Seller';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate account age bonus
CREATE OR REPLACE FUNCTION calculate_age_bonus(account_created_at TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
    account_age_days INTEGER;
BEGIN
    account_age_days := EXTRACT(DAY FROM (CURRENT_TIMESTAMP - account_created_at));
    
    IF account_age_days > 365 THEN
        RETURN 15;
    ELSIF account_age_days > 180 THEN
        RETURN 10;
    ELSIF account_age_days > 30 THEN
        RETURN 5;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update trust score safely
CREATE OR REPLACE FUNCTION update_user_trust_score(
    p_user_id UUID,
    p_change INTEGER,
    p_event_type VARCHAR(50),
    p_violation_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_current_score INTEGER;
    v_new_score INTEGER;
BEGIN
    -- Get current score
    SELECT trust_score INTO v_current_score
    FROM users
    WHERE id = p_user_id;
    
    IF v_current_score IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Calculate new score with bounds
    v_new_score := v_current_score + p_change;
    
    IF v_new_score < 0 THEN
        v_new_score := 0;
    END IF;
    
    IF v_new_score > 100 THEN
        v_new_score := 100;
    END IF;
    
    -- Update user's trust score
    UPDATE users
    SET trust_score = v_new_score
    WHERE id = p_user_id;
    
    -- Log the change
    INSERT INTO trust_score_history (
        user_id, previous_score, new_score, change_amount,
        event_type, violation_id, description
    ) VALUES (
        p_user_id, v_current_score, v_new_score, p_change,
        p_event_type, p_violation_id, p_description
    );
    
    RETURN v_new_score;
END;
$$ LANGUAGE plpgsql;

-- Function to record violation and apply penalty
CREATE OR REPLACE FUNCTION record_violation(
    p_user_id UUID,
    p_violation_type VARCHAR(50),
    p_ad_id UUID DEFAULT NULL,
    p_detected_by VARCHAR(50) DEFAULT 'system',
    p_reported_by UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_penalty INTEGER;
    v_violation_id UUID;
BEGIN
    -- Determine penalty based on violation type
    CASE p_violation_type
        WHEN 'user_report' THEN v_penalty := -10;
        WHEN 'spam_ad' THEN v_penalty := -15;
        WHEN 'fake_ad' THEN v_penalty := -20;
        WHEN 'sexual_content' THEN v_penalty := -20;
        WHEN 'scam' THEN v_penalty := -50;
        ELSE v_penalty := -10;
    END CASE;
    
    -- Create violation record
    INSERT INTO violations (
        user_id, violation_type, penalty_points, ad_id,
        detected_by, reported_by, description
    ) VALUES (
        p_user_id, p_violation_type, v_penalty, p_ad_id,
        p_detected_by, p_reported_by, p_description
    ) RETURNING id INTO v_violation_id;
    
    -- Apply penalty to trust score
    PERFORM update_user_trust_score(
        p_user_id, v_penalty,
        p_violation_type || '_detected',
        v_violation_id,
        p_description
    );
    
    -- If confirmed scam, suspend account
    IF p_violation_type = 'scam' THEN
        UPDATE users
        SET status = 'suspended', trust_score = 0
        WHERE id = p_user_id;
    END IF;
    
    RETURN v_violation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE violations IS 'Records all user violations for trust score penalties';
COMMENT ON TABLE trust_score_history IS 'Complete audit trail of all trust score changes';
COMMENT ON FUNCTION get_trust_level IS 'Returns trust level label based on score: New Seller (0-39), Verified Seller (40-69), Trusted Seller (70-100)';
COMMENT ON FUNCTION update_user_trust_score IS 'Safely updates trust score with bounds checking and audit logging';
COMMENT ON FUNCTION record_violation IS 'Records a violation and automatically applies the penalty';
