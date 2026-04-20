-- ============================================
-- EL HANNORA - Follow Seller Feature Schema
-- PostgreSQL Schema for Follower System
-- ============================================
--
-- This schema implements the Follow Seller feature:
--   - Track follower relationships
--   - Engagement tracking per ad per user per day
--   - Trust score logging for transparency
--   - Auto trust boost from high-trust followers
--
-- ============================================

-- ============================================
-- FOLLOWERS TABLE
-- Tracks who follows whom
-- ============================================

CREATE TABLE IF NOT EXISTS followers (
    id SERIAL PRIMARY KEY,
    
    -- Relationship
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Follow metadata
    notifications_enabled BOOLEAN DEFAULT TRUE,
    auto_bookmark_new_ads BOOLEAN DEFAULT FALSE,
    
    -- Engagement streak tracking
    engagement_streak INTEGER DEFAULT 0,
    last_engagement_date DATE,
    total_interactions INTEGER DEFAULT 0,
    
    -- Trust influence tracking
    trust_boost_applied BOOLEAN DEFAULT FALSE,
    trust_boost_amount INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(follower_id, seller_id),
    CONSTRAINT no_self_follow CHECK (follower_id != seller_id)
);

-- ============================================
-- FOLLOWER ENGAGEMENT EVENTS TABLE
-- Tracks user interactions with followed seller's ads
-- One unique interaction per user per ad per event type per day
-- ============================================

CREATE TABLE IF NOT EXISTS follower_engagement_events (
    id SERIAL PRIMARY KEY,
    
    -- References
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event classification
    event_type VARCHAR(20) NOT NULL
        CHECK (event_type IN ('ad_seen', 'scroll_stop', 'repeated_view', 'click', 'save', 'share')),
    
    -- Event date for daily unique constraint
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metadata
    session_id VARCHAR(100),
    device_type VARCHAR(20),
    viewport_time_ms INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate events per user per ad per type per day
    UNIQUE(ad_id, user_id, event_type, event_date)
);

-- ============================================
-- TRUST SCORE LOG TABLE
-- Complete audit trail for all trust score changes
-- ============================================

CREATE TABLE IF NOT EXISTS trust_score_log (
    id SERIAL PRIMARY KEY,
    
    -- User reference
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score change details
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    
    -- Change reason
    reason VARCHAR(100) NOT NULL,
    reason_detail TEXT,
    
    -- Source of change
    source_type VARCHAR(50) NOT NULL
        CHECK (source_type IN (
            'follower_boost',      -- From being followed by high-trust user
            'email_verified',      -- Email verification reward
            'account_age',         -- Account age bonus
            'violation_penalty',   -- Content violation penalty
            'manual_adjustment',   -- Admin adjustment
            'appeal_approved',     -- Successful appeal
            'scam_confirmed',      -- Confirmed scam penalty
            'high_engagement'      -- High engagement bonus
        )),
    source_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SELLER FOLLOWER STATS TABLE
-- Aggregated follower statistics per seller
-- ============================================

CREATE TABLE IF NOT EXISTS seller_follower_stats (
    seller_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Counts
    follower_count INTEGER DEFAULT 0,
    high_trust_follower_count INTEGER DEFAULT 0,
    
    -- Engagement metrics
    total_follower_engagements INTEGER DEFAULT 0,
    avg_engagement_per_follower DECIMAL(10, 2) DEFAULT 0,
    
    -- Trust boost tracking
    total_trust_boost_received INTEGER DEFAULT 0,
    trust_boost_cap_reached BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AD BOOKMARKS TABLE
-- For auto-bookmark feature from followed sellers
-- ============================================

CREATE TABLE IF NOT EXISTS ad_bookmarks (
    id SERIAL PRIMARY KEY,
    
    -- References
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Bookmark metadata
    auto_bookmarked BOOLEAN DEFAULT FALSE,
    from_followed_seller BOOLEAN DEFAULT FALSE,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate bookmarks
    UNIQUE(user_id, ad_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Followers indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower_id 
    ON followers(follower_id);

CREATE INDEX IF NOT EXISTS idx_followers_seller_id 
    ON followers(seller_id);

CREATE INDEX IF NOT EXISTS idx_followers_created_at 
    ON followers(created_at DESC);

-- Engagement events indexes
CREATE INDEX IF NOT EXISTS idx_engagement_ad_id 
    ON follower_engagement_events(ad_id);

CREATE INDEX IF NOT EXISTS idx_engagement_user_id 
    ON follower_engagement_events(user_id);

CREATE INDEX IF NOT EXISTS idx_engagement_seller_id 
    ON follower_engagement_events(seller_id);

CREATE INDEX IF NOT EXISTS idx_engagement_event_date 
    ON follower_engagement_events(event_date);

CREATE INDEX IF NOT EXISTS idx_engagement_type 
    ON follower_engagement_events(event_type);

-- Trust score log indexes
CREATE INDEX IF NOT EXISTS idx_trust_log_user_id 
    ON trust_score_log(user_id);

CREATE INDEX IF NOT EXISTS idx_trust_log_source_type 
    ON trust_score_log(source_type);

CREATE INDEX IF NOT EXISTS idx_trust_log_created_at 
    ON trust_score_log(created_at DESC);

-- Ad bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id 
    ON ad_bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_ad_id 
    ON ad_bookmarks(ad_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_auto 
    ON ad_bookmarks(auto_bookmarked) WHERE auto_bookmarked = TRUE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger for followers
CREATE OR REPLACE FUNCTION update_followers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER followers_updated_at
BEFORE UPDATE ON followers
FOR EACH ROW
EXECUTE FUNCTION update_followers_timestamp();

-- Update timestamp trigger for seller_follower_stats
CREATE TRIGGER seller_stats_updated_at
BEFORE UPDATE ON seller_follower_stats
FOR EACH ROW
EXECUTE FUNCTION update_followers_timestamp();

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: Followed seller feed with new badge
CREATE OR REPLACE VIEW followed_seller_feed AS
SELECT 
    ads.*,
    followers.follower_id,
    followers.created_at AS followed_at,
    CASE 
        WHEN ads.created_at > (NOW() - INTERVAL '24 hours') 
        THEN TRUE 
        ELSE FALSE 
    END AS is_new,
    CASE 
        WHEN ads.created_at > (NOW() - INTERVAL '1 hour') 
        THEN TRUE 
        ELSE FALSE 
    END AS is_very_new
FROM ads
JOIN followers ON followers.seller_id = ads.seller_id
WHERE ads.status = 'active'
  AND ads.deleted_at IS NULL;

-- View: Seller follower summary
CREATE OR REPLACE VIEW seller_follower_summary AS
SELECT 
    u.id AS seller_id,
    u.username,
    u.full_name,
    u.trust_score,
    COALESCE(s.follower_count, 0) AS follower_count,
    COALESCE(s.high_trust_follower_count, 0) AS high_trust_followers,
    COALESCE(s.total_trust_boost_received, 0) AS trust_boost_received
FROM users u
LEFT JOIN seller_follower_stats s ON s.seller_id = u.id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE followers IS 'Tracks follower relationships between users and sellers';
COMMENT ON TABLE follower_engagement_events IS 'Tracks user engagement with followed seller ads - one per type per day';
COMMENT ON TABLE trust_score_log IS 'Complete audit trail for all trust score changes';
COMMENT ON TABLE seller_follower_stats IS 'Aggregated follower statistics per seller';
COMMENT ON TABLE ad_bookmarks IS 'User bookmarks including auto-bookmarks from followed sellers';

COMMENT ON COLUMN followers.trust_boost_applied IS 'Whether this follow contributed to seller trust boost';
COMMENT ON COLUMN followers.trust_boost_amount IS 'Amount of trust boost contributed (0-3)';
COMMENT ON COLUMN follower_engagement_events.event_date IS 'Date for daily unique constraint';
COMMENT ON COLUMN trust_score_log.source_type IS 'Category of trust score change for filtering';
