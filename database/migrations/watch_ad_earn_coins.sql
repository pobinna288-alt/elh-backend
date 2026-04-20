-- =============================================
-- Watch Ad & Earn Coins System - PostgreSQL Schema
-- =============================================
-- This migration creates the tables required for the
-- Watch Ad & Earn Coins feature.
--
-- Tables:
--   - ad_views: Tracks user viewing progress per ad
--   - coin_transactions: Records all coin rewards
--   - coin_boost_events: Temporary reward multiplier events
-- =============================================

-- =============================================
-- 1. AD_VIEWS TABLE
-- Tracks user viewing progress for each ad
-- =============================================

CREATE TABLE IF NOT EXISTS ad_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "adId" UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Watch progress
    "watchPercent" INTEGER DEFAULT 0 CHECK ("watchPercent" >= 0 AND "watchPercent" <= 100),
    "watchTimeSeconds" INTEGER DEFAULT 0 CHECK ("watchTimeSeconds" >= 0),
    
    -- Milestone tracking (prevents duplicate rewards)
    milestone_25 BOOLEAN DEFAULT false,
    milestone_50 BOOLEAN DEFAULT false,
    milestone_75 BOOLEAN DEFAULT false,
    milestone_100 BOOLEAN DEFAULT false,
    
    -- Reward tracking
    "totalCoinsEarned" INTEGER DEFAULT 0 CHECK ("totalCoinsEarned" >= 0),
    completed BOOLEAN DEFAULT false,
    
    -- Anti-cheat timestamps
    "lastProgressTime" TIMESTAMP WITH TIME ZONE,
    "sessionStartTime" TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one view record per user per ad
    CONSTRAINT unique_user_ad_view UNIQUE ("userId", "adId")
);

-- Indexes for ad_views
CREATE INDEX IF NOT EXISTS idx_ad_views_user_ad ON ad_views ("userId", "adId");
CREATE INDEX IF NOT EXISTS idx_ad_views_user ON ad_views ("userId");
CREATE INDEX IF NOT EXISTS idx_ad_views_ad ON ad_views ("adId");
CREATE INDEX IF NOT EXISTS idx_ad_views_completed ON ad_views (completed) WHERE completed = true;

-- Comment on table
COMMENT ON TABLE ad_views IS 'Tracks user viewing progress for each ad with milestone-based reward tracking';


-- =============================================
-- 2. COIN_TRANSACTIONS TABLE
-- Records every coin reward for audit trail
-- =============================================

-- Create enum for transaction types
DO $$ BEGIN
    CREATE TYPE coin_transaction_type AS ENUM (
        'ad_watch_reward',
        'streak_bonus',
        'boost_event_reward',
        'referral_bonus',
        'milestone_bonus'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "adId" UUID REFERENCES ads(id) ON DELETE SET NULL,
    
    -- Transaction details
    coins INTEGER NOT NULL,
    type coin_transaction_type DEFAULT 'ad_watch_reward',
    description TEXT,
    
    -- Milestone information
    milestone INTEGER CHECK (milestone IN (25, 50, 75, 100)),
    
    -- Boost event details
    multiplier DECIMAL(3, 2) DEFAULT 1.00,
    "boostEventId" UUID,
    
    -- Timestamp
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for coin_transactions
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions ("userId");
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_date ON coin_transactions ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_coin_transactions_ad ON coin_transactions ("adId");
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions (type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_boost ON coin_transactions ("boostEventId") WHERE "boostEventId" IS NOT NULL;

-- Comment on table
COMMENT ON TABLE coin_transactions IS 'Audit trail for all coin rewards granted to users';


-- =============================================
-- 3. COIN_BOOST_EVENTS TABLE
-- Temporary reward multiplier events
-- =============================================

CREATE TABLE IF NOT EXISTS coin_boost_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "eventType" VARCHAR(50) DEFAULT 'coin_boost',
    
    -- Multiplier (e.g., 2.00 = 2x coins)
    multiplier DECIMAL(3, 2) DEFAULT 2.00 CHECK (multiplier >= 1.00 AND multiplier <= 10.00),
    
    -- Event timing
    "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Event status
    "isActive" BOOLEAN DEFAULT true,
    
    -- Eligibility (null = all tiers eligible)
    "eligibleTiers" TEXT[], -- Array of tier names
    
    -- Coin limits
    "maxTotalCoins" INTEGER,
    "coinsDistributed" INTEGER DEFAULT 0,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure end time is after start time
    CONSTRAINT valid_event_timing CHECK ("endTime" > "startTime")
);

-- Indexes for coin_boost_events
CREATE INDEX IF NOT EXISTS idx_boost_events_active ON coin_boost_events ("isActive", "startTime", "endTime");
CREATE INDEX IF NOT EXISTS idx_boost_events_timing ON coin_boost_events ("startTime", "endTime");

-- Comment on table
COMMENT ON TABLE coin_boost_events IS 'Temporary coin reward multiplier events';


-- =============================================
-- 4. UPDATE USERS TABLE
-- Add fields for watch streak tracking if not exists
-- =============================================

DO $$ BEGIN
    -- Add streakDays column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'streakDays') THEN
        ALTER TABLE users ADD COLUMN "streakDays" INTEGER DEFAULT 0;
    END IF;
    
    -- Add lastStreakDate column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'lastStreakDate') THEN
        ALTER TABLE users ADD COLUMN "lastStreakDate" TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add coin_balance column if not exists (alias for coins)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'coin_balance') THEN
        -- Use existing coins column or add new one
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'users' AND column_name = 'coins') THEN
            ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Index for user streak queries
CREATE INDEX IF NOT EXISTS idx_users_streak ON users ("streakDays" DESC);


-- =============================================
-- 5. HELPER FUNCTIONS
-- =============================================

-- Function to check if user has reached daily coin limit
CREATE OR REPLACE FUNCTION check_daily_coin_limit(
    p_user_id UUID,
    p_daily_limit INTEGER DEFAULT 500
) RETURNS INTEGER AS $$
DECLARE
    v_earned_today INTEGER;
BEGIN
    SELECT COALESCE(SUM(coins), 0) INTO v_earned_today
    FROM coin_transactions
    WHERE "userId" = p_user_id
      AND "createdAt" >= CURRENT_DATE;
    
    RETURN p_daily_limit - v_earned_today;
END;
$$ LANGUAGE plpgsql;

-- Function to get active boost multiplier
CREATE OR REPLACE FUNCTION get_active_boost_multiplier(
    p_tier VARCHAR DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    v_multiplier DECIMAL(3, 2);
BEGIN
    SELECT multiplier INTO v_multiplier
    FROM coin_boost_events
    WHERE "isActive" = true
      AND "startTime" <= CURRENT_TIMESTAMP
      AND "endTime" >= CURRENT_TIMESTAMP
      AND ("maxTotalCoins" IS NULL OR "coinsDistributed" < "maxTotalCoins")
      AND (p_tier IS NULL OR "eligibleTiers" IS NULL OR p_tier = ANY("eligibleTiers"))
    ORDER BY multiplier DESC
    LIMIT 1;
    
    RETURN COALESCE(v_multiplier, 1.00);
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- 6. TRIGGER FOR UPDATED_AT
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ad_views
DROP TRIGGER IF EXISTS update_ad_views_updated_at ON ad_views;
CREATE TRIGGER update_ad_views_updated_at
    BEFORE UPDATE ON ad_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for coin_boost_events
DROP TRIGGER IF EXISTS update_coin_boost_events_updated_at ON coin_boost_events;
CREATE TRIGGER update_coin_boost_events_updated_at
    BEFORE UPDATE ON coin_boost_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- 7. GRANTS (adjust role names as needed)
-- =============================================

-- Example grants (uncomment and modify for your environment):
-- GRANT SELECT, INSERT, UPDATE ON ad_views TO app_user;
-- GRANT SELECT, INSERT ON coin_transactions TO app_user;
-- GRANT SELECT ON coin_boost_events TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON coin_boost_events TO app_admin;


-- =============================================
-- Migration complete
-- =============================================
