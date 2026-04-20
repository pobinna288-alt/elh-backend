-- =============================================
-- Index Schema for Watch Ad & Earn Coins System
-- =============================================
-- This file defines optimized indexes for the ad watch
-- and coin reward system to ensure fast queries at scale.
-- =============================================

-- =============================================
-- AD_VIEWS TABLE INDEXES
-- =============================================

-- Primary lookup: user + ad combination (most frequent query)
CREATE INDEX IF NOT EXISTS idx_ad_views_user_ad 
ON ad_views ("userId", "adId");

-- User history queries
CREATE INDEX IF NOT EXISTS idx_ad_views_user 
ON ad_views ("userId");

-- Ad statistics queries
CREATE INDEX IF NOT EXISTS idx_ad_views_ad 
ON ad_views ("adId");

-- Filter completed views (for stats)
CREATE INDEX IF NOT EXISTS idx_ad_views_completed 
ON ad_views (completed) 
WHERE completed = true;

-- Recent activity queries
CREATE INDEX IF NOT EXISTS idx_ad_views_updated 
ON ad_views ("updatedAt" DESC);


-- =============================================
-- COIN_TRANSACTIONS TABLE INDEXES
-- =============================================

-- User transaction history
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user 
ON coin_transactions ("userId");

-- User daily earnings calculation (critical for daily limit check)
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_date 
ON coin_transactions ("userId", "createdAt");

-- Ad-related transactions
CREATE INDEX IF NOT EXISTS idx_coin_transactions_ad 
ON coin_transactions ("adId");

-- Filter by transaction type
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type 
ON coin_transactions (type);

-- Boost event transactions
CREATE INDEX IF NOT EXISTS idx_coin_transactions_boost 
ON coin_transactions ("boostEventId") 
WHERE "boostEventId" IS NOT NULL;

-- Time-based queries for analytics
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created 
ON coin_transactions ("createdAt" DESC);


-- =============================================
-- COIN_BOOST_EVENTS TABLE INDEXES
-- =============================================

-- Find active events (most common query)
CREATE INDEX IF NOT EXISTS idx_boost_events_active 
ON coin_boost_events ("isActive", "startTime", "endTime");

-- Time-based event lookup
CREATE INDEX IF NOT EXISTS idx_boost_events_timing 
ON coin_boost_events ("startTime", "endTime");


-- =============================================
-- USERS TABLE INDEXES (for coin/streak queries)
-- =============================================

-- Streak leaderboard
CREATE INDEX IF NOT EXISTS idx_users_streak 
ON users ("streakDays" DESC);

-- Coin balance ranking
CREATE INDEX IF NOT EXISTS idx_users_coins 
ON users (coins DESC);


-- =============================================
-- PERFORMANCE NOTES
-- =============================================

-- 1. The idx_ad_views_user_ad index is critical as it's used
--    for every progress update to ensure one view per user per ad.
--
-- 2. The idx_coin_transactions_user_date index is critical for
--    calculating daily coin limits efficiently.
--
-- 3. Consider partial indexes for frequently filtered queries
--    (e.g., WHERE completed = true).
--
-- 4. Monitor index usage with:
--    SELECT * FROM pg_stat_user_indexes WHERE relname = 'ad_views';
--
-- 5. Consider BRIN indexes for time-series data if tables grow large:
--    CREATE INDEX idx_transactions_created_brin 
--    ON coin_transactions USING BRIN ("createdAt");
