-- ============================================
-- EL HANNORA - Attention Score Schema
-- PostgreSQL Schema for Ad Attention Tracking
-- ============================================
--
-- The Attention Score system measures user engagement
-- with advertisements based on three core signals:
--   - ad_seen: Ad becomes visible in viewport
--   - scroll_stop: User stops on ad for 2+ seconds
--   - repeated_view: User views same ad in different session
--
-- ============================================

-- ============================================
-- AD ATTENTION EVENTS TABLE
-- Stores individual attention events
-- ============================================

CREATE TABLE IF NOT EXISTS ad_attention_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ad and user reference
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event classification
    event_type VARCHAR(20) NOT NULL
        CHECK (event_type IN ('ad_seen', 'scroll_stop', 'repeated_view')),
    
    -- Session tracking (for spam prevention)
    session_id VARCHAR(100) NOT NULL,
    
    -- Metadata
    device_type VARCHAR(20),  -- 'mobile', 'tablet', 'desktop'
    viewport_time_ms INTEGER, -- Time ad was in viewport (milliseconds)
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AD ATTENTION SCORES TABLE
-- Aggregated attention metrics per ad
-- ============================================

CREATE TABLE IF NOT EXISTS ad_attention_scores (
    ad_id UUID PRIMARY KEY REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Event counts
    seen_count INTEGER DEFAULT 0,
    scroll_stop_count INTEGER DEFAULT 0,
    repeated_view_count INTEGER DEFAULT 0,
    
    -- Computed attention score
    -- Formula: (seen * 1) + (scroll_stop * 3) + (repeated_view * 5)
    attention_score INTEGER DEFAULT 0,
    
    -- Statistics
    unique_viewers INTEGER DEFAULT 0,
    total_viewport_time_ms BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Event lookup indexes
CREATE INDEX IF NOT EXISTS idx_attention_event_ad 
    ON ad_attention_events(ad_id);

CREATE INDEX IF NOT EXISTS idx_attention_event_user 
    ON ad_attention_events(user_id);

CREATE INDEX IF NOT EXISTS idx_attention_event_session 
    ON ad_attention_events(session_id);

CREATE INDEX IF NOT EXISTS idx_attention_event_type 
    ON ad_attention_events(event_type);

-- Composite index for spam prevention queries
CREATE INDEX IF NOT EXISTS idx_attention_event_spam_check 
    ON ad_attention_events(ad_id, user_id, session_id, event_type);

-- Score lookup indexes
CREATE INDEX IF NOT EXISTS idx_attention_score_value 
    ON ad_attention_scores(attention_score DESC);

CREATE INDEX IF NOT EXISTS idx_attention_score_updated 
    ON ad_attention_scores(last_updated DESC);

-- ============================================
-- UNIQUE CONSTRAINT FOR SPAM PREVENTION
-- Only one ad_seen/scroll_stop per session per ad per user
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_event
    ON ad_attention_events(ad_id, user_id, session_id, event_type)
    WHERE event_type IN ('ad_seen', 'scroll_stop');

-- ============================================
-- FUNCTION: Calculate Attention Score
-- Formula: (seen * 1) + (scroll_stop * 3) + (repeated_view * 5)
-- ============================================

CREATE OR REPLACE FUNCTION calculate_attention_score(
    p_seen_count INTEGER,
    p_scroll_stop_count INTEGER,
    p_repeated_view_count INTEGER
) RETURNS INTEGER AS $$
BEGIN
    RETURN (p_seen_count * 1) + 
           (p_scroll_stop_count * 3) + 
           (p_repeated_view_count * 5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Update Attention Score for Ad
-- Called after each new event is logged
-- ============================================

CREATE OR REPLACE FUNCTION update_ad_attention_score(p_ad_id UUID)
RETURNS void AS $$
DECLARE
    v_seen_count INTEGER;
    v_scroll_stop_count INTEGER;
    v_repeated_view_count INTEGER;
    v_unique_viewers INTEGER;
    v_total_viewport_time BIGINT;
    v_attention_score INTEGER;
BEGIN
    -- Count events by type
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'ad_seen'),
        COUNT(*) FILTER (WHERE event_type = 'scroll_stop'),
        COUNT(*) FILTER (WHERE event_type = 'repeated_view'),
        COUNT(DISTINCT user_id),
        COALESCE(SUM(viewport_time_ms), 0)
    INTO 
        v_seen_count,
        v_scroll_stop_count,
        v_repeated_view_count,
        v_unique_viewers,
        v_total_viewport_time
    FROM ad_attention_events
    WHERE ad_id = p_ad_id;
    
    -- Calculate attention score
    v_attention_score := calculate_attention_score(
        v_seen_count, 
        v_scroll_stop_count, 
        v_repeated_view_count
    );
    
    -- Upsert into scores table
    INSERT INTO ad_attention_scores (
        ad_id, 
        seen_count, 
        scroll_stop_count, 
        repeated_view_count,
        attention_score,
        unique_viewers,
        total_viewport_time_ms,
        last_updated
    )
    VALUES (
        p_ad_id,
        v_seen_count,
        v_scroll_stop_count,
        v_repeated_view_count,
        v_attention_score,
        v_unique_viewers,
        v_total_viewport_time,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (ad_id) DO UPDATE SET
        seen_count = v_seen_count,
        scroll_stop_count = v_scroll_stop_count,
        repeated_view_count = v_repeated_view_count,
        attention_score = v_attention_score,
        unique_viewers = v_unique_viewers,
        total_viewport_time_ms = v_total_viewport_time,
        last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-update attention score on new event
-- ============================================

CREATE OR REPLACE FUNCTION trigger_update_attention_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_ad_attention_score(NEW.ad_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attention_event_insert
    AFTER INSERT ON ad_attention_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_attention_score();

-- ============================================
-- VIEW: Ads with Attention Scores
-- Join ads with their attention metrics
-- ============================================

CREATE OR REPLACE VIEW ads_with_attention AS
SELECT 
    a.id,
    a.title,
    a.description,
    a.category,
    a.price,
    a.currency,
    a.seller_id,
    a.trust_score,
    a.status,
    a.created_at,
    COALESCE(s.seen_count, 0) as seen_count,
    COALESCE(s.scroll_stop_count, 0) as scroll_stop_count,
    COALESCE(s.repeated_view_count, 0) as repeated_view_count,
    COALESCE(s.attention_score, 0) as attention_score,
    COALESCE(s.unique_viewers, 0) as unique_viewers,
    s.last_updated as attention_last_updated
FROM ads a
LEFT JOIN ad_attention_scores s ON a.id = s.ad_id
WHERE a.deleted_at IS NULL AND a.status = 'active';

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get top ads by attention score
-- SELECT * FROM ads_with_attention ORDER BY attention_score DESC LIMIT 20;

-- Get attention stats for specific ad
-- SELECT * FROM ad_attention_scores WHERE ad_id = 'uuid-here';

-- Get recent events for an ad
-- SELECT * FROM ad_attention_events WHERE ad_id = 'uuid-here' ORDER BY created_at DESC LIMIT 100;
