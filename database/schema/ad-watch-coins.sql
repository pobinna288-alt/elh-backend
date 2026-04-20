-- =============================================
-- Watch Ad & Earn Coins - Database Schema
-- =============================================
-- This schema implements the Watch Ad & Earn Coins feature
-- for the El Hannora platform.
--
-- Key Features:
-- 1. Progressive coin rewards at milestones (25%, 50%, 75%, 100%)
-- 2. Tier-based max rewards (Normal: 10, Premium: 40, Pro: 100, Hot: 200)
-- 3. Anti-cheat validation
-- 4. Daily coin limits
-- 5. Watch streak tracking
-- 6. Coin boost events
-- =============================================

-- =============================================
-- AD_VIEWS TABLE
-- One record per user per ad
-- Tracks watch progress and milestone completions
-- =============================================
CREATE TABLE IF NOT EXISTS ad_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "adId" UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Progress tracking
    "watchPercent" INTEGER DEFAULT 0 CHECK ("watchPercent" >= 0 AND "watchPercent" <= 100),
    "watchTimeSeconds" INTEGER DEFAULT 0,
    
    -- Milestone flags (prevent duplicate rewards)
    milestone_25 BOOLEAN DEFAULT false,
    milestone_50 BOOLEAN DEFAULT false,
    milestone_75 BOOLEAN DEFAULT false,
    milestone_100 BOOLEAN DEFAULT false,
    
    -- Reward tracking
    "totalCoinsEarned" INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    
    -- Anti-cheat timestamps
    "lastProgressTime" TIMESTAMP WITH TIME ZONE,
    "sessionStartTime" TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_ad UNIQUE ("userId", "adId")
);

-- =============================================
-- COIN_TRANSACTIONS TABLE
-- Audit trail for all coin rewards
-- =============================================
CREATE TYPE coin_transaction_type AS ENUM (
    'ad_watch_reward',
    'streak_bonus',
    'boost_event_reward',
    'referral_bonus',
    'milestone_bonus'
);

CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "adId" UUID REFERENCES ads(id) ON DELETE SET NULL,
    
    coins INTEGER NOT NULL,
    type coin_transaction_type DEFAULT 'ad_watch_reward',
    description TEXT,
    milestone INTEGER CHECK (milestone IN (25, 50, 75, 100)),
    multiplier DECIMAL(3, 2) DEFAULT 1.00,
    "boostEventId" UUID,
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- COIN_BOOST_EVENTS TABLE
-- Temporary coin multiplier events
-- =============================================
CREATE TABLE IF NOT EXISTS coin_boost_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "eventType" VARCHAR(50) DEFAULT 'coin_boost',
    multiplier DECIMAL(3, 2) DEFAULT 2.00,
    "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "eligibleTiers" TEXT[],
    "maxTotalCoins" INTEGER,
    "coinsDistributed" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_timing CHECK ("endTime" > "startTime")
);

-- =============================================
-- TIER CONFIGURATION REFERENCE
-- These values are enforced in application code
-- =============================================
-- Tier      | Max Video | Max Coins
-- ----------|-----------|----------
-- NORMAL    | 2 min     | 10 coins
-- PREMIUM   | 3 min     | 40 coins
-- PRO       | 5 min     | 100 coins
-- HOT       | 10 min    | 200 coins

-- =============================================
-- MILESTONE REWARD DISTRIBUTION
-- Progressive unlock as video plays
-- =============================================
-- Milestone | % of Max Coins | Example (Normal = 10)
-- ----------|----------------|----------------------
-- 25%       | 20%            | 2 coins
-- 50%       | 50%            | 5 coins (cumulative)
-- 75%       | 70%            | 7 coins (cumulative)
-- 100%      | 100%           | 10 coins (cumulative)
