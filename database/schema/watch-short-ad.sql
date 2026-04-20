-- ============================================
-- Watch Short Ad Feature - Database Schema
-- El Hannora Platform
-- Created: 2026-03-04
-- PostgreSQL Compatible
-- ============================================

-- ─── Trending Shorts Table ──────────────────────────────────────────────────
-- Stores trending short content for the "Watch Short Ad" feature

CREATE TABLE IF NOT EXISTS trending_shorts (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 60),
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    region VARCHAR(10) DEFAULT 'global',  -- ISO country code or 'global'
    category VARCHAR(50),
    tags JSONB,
    
    -- AI Insights
    ai_predicted_engagement INTEGER,
    ai_risk_score VARCHAR(20) DEFAULT 'Low',  -- Low, Medium, High
    ai_audience_fit INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for trending_shorts
CREATE INDEX IF NOT EXISTS idx_shorts_region ON trending_shorts(region);
CREATE INDEX IF NOT EXISTS idx_shorts_category ON trending_shorts(category);
CREATE INDEX IF NOT EXISTS idx_shorts_engagement ON trending_shorts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_shorts_active ON trending_shorts(is_active);
CREATE INDEX IF NOT EXISTS idx_shorts_created ON trending_shorts(created_at DESC);

-- ─── Watch Sessions Table ───────────────────────────────────────────────────
-- Tracks user watch sessions for analytics and progress

CREATE TABLE IF NOT EXISTS watch_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),  -- NULL for anonymous users
    region VARCHAR(100),
    region_code VARCHAR(10),
    
    -- Session data
    shorts_queue JSONB NOT NULL,  -- Array of short IDs in order
    current_index INTEGER DEFAULT 0,
    total_count INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'ended', 'abandoned')),
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    total_watch_time INTEGER DEFAULT 0,  -- Total seconds watched
    
    -- Analytics
    watched_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    
    -- Metadata
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address VARCHAR(45)
);

-- Indexes for watch_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON watch_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON watch_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_region_code ON watch_sessions(region_code);

-- ─── Watch Events Table ─────────────────────────────────────────────────────
-- Records individual watch/skip events within a session

CREATE TABLE IF NOT EXISTS watch_events (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    short_id VARCHAR(50) NOT NULL,
    
    -- Event data
    action VARCHAR(20) NOT NULL CHECK (action IN ('watched', 'skipped')),
    watch_duration INTEGER DEFAULT 0,  -- Seconds watched before next action
    completion_percentage DECIMAL(5,2),  -- How much of the video was watched
    
    -- Timing
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_watch_events_session FOREIGN KEY (session_id) REFERENCES watch_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_watch_events_short FOREIGN KEY (short_id) REFERENCES trending_shorts(id) ON DELETE SET NULL
);

-- Indexes for watch_events
CREATE INDEX IF NOT EXISTS idx_events_session ON watch_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_short ON watch_events(short_id);
CREATE INDEX IF NOT EXISTS idx_events_action ON watch_events(action);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON watch_events(timestamp DESC);

-- ─── Region Statistics Table ────────────────────────────────────────────────
-- Aggregated statistics per region for optimization

CREATE TABLE IF NOT EXISTS region_statistics (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(10) NOT NULL,
    region_name VARCHAR(100),
    
    -- Daily stats
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    total_watch_time INTEGER DEFAULT 0,
    total_content_watched INTEGER DEFAULT 0,
    total_content_skipped INTEGER DEFAULT 0,
    
    -- Engagement metrics
    avg_session_duration DECIMAL(10,2),
    avg_content_per_session DECIMAL(5,2),
    completion_rate DECIMAL(5,2),
    skip_rate DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT unique_region_date UNIQUE (region_code, date)
);

-- Indexes for region_statistics
CREATE INDEX IF NOT EXISTS idx_region_stats_region ON region_statistics(region_code);
CREATE INDEX IF NOT EXISTS idx_region_stats_date ON region_statistics(date DESC);

-- ─── User Watch History Table ───────────────────────────────────────────────
-- Tracks which shorts each user has seen (for personalization)

CREATE TABLE IF NOT EXISTS user_watch_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    short_id VARCHAR(50) NOT NULL,
    
    -- Watch data
    times_watched INTEGER DEFAULT 1,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_watch_duration INTEGER DEFAULT 0,
    was_completed BOOLEAN DEFAULT FALSE,
    
    -- User feedback
    was_liked BOOLEAN DEFAULT FALSE,
    was_shared BOOLEAN DEFAULT FALSE,
    
    -- Unique constraint
    CONSTRAINT unique_user_short UNIQUE (user_id, short_id)
);

-- Indexes for user_watch_history
CREATE INDEX IF NOT EXISTS idx_history_user ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_short ON user_watch_history(short_id);
CREATE INDEX IF NOT EXISTS idx_history_last_watched ON user_watch_history(last_watched_at DESC);

-- ─── Content Categories Table ───────────────────────────────────────────────
-- Defines available content categories

CREATE TABLE IF NOT EXISTS content_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO content_categories (id, name, description, display_order) VALUES
    ('technology', 'Technology', 'Tech gadgets, software, and innovations', 1),
    ('fashion', 'Fashion', 'Style, clothing, and accessories', 2),
    ('food', 'Food', 'Recipes, restaurants, and culinary content', 3),
    ('music', 'Music', 'Songs, artists, and music videos', 4),
    ('entertainment', 'Entertainment', 'Movies, shows, and performances', 5),
    ('lifestyle', 'Lifestyle', 'Daily life, wellness, and habits', 6),
    ('business', 'Business', 'Entrepreneurship and business tips', 7),
    ('sports', 'Sports', 'Athletics, fitness, and sports news', 8),
    ('education', 'Education', 'Learning and educational content', 9),
    ('travel', 'Travel', 'Destinations, adventures, and tourism', 10)
ON CONFLICT (id) DO NOTHING;

-- ─── Views for Analytics ────────────────────────────────────────────────────

-- Daily summary view
CREATE OR REPLACE VIEW v_daily_watch_summary AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
    SUM(watched_count) as total_watched,
    SUM(skipped_count) as total_skipped,
    SUM(total_watch_time) as total_watch_time,
    AVG(total_watch_time) as avg_watch_time,
    AVG(watched_count) as avg_content_per_session
FROM watch_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Regional performance view
CREATE OR REPLACE VIEW v_regional_performance AS
SELECT 
    region_code,
    region,
    COUNT(*) as total_sessions,
    SUM(watched_count) as total_watched,
    SUM(skipped_count) as total_skipped,
    AVG(total_watch_time) as avg_watch_time,
    ROUND(CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS NUMERIC) / COUNT(*) * 100, 2) as completion_rate
FROM watch_sessions
GROUP BY region_code, region
ORDER BY total_sessions DESC;

-- ─── Triggers ───────────────────────────────────────────────────────────────

-- Function to update session stats when event is recorded
CREATE OR REPLACE FUNCTION fn_update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE watch_sessions 
    SET 
        watched_count = (SELECT COUNT(*) FROM watch_events WHERE session_id = NEW.session_id AND action = 'watched'),
        skipped_count = (SELECT COUNT(*) FROM watch_events WHERE session_id = NEW.session_id AND action = 'skipped'),
        total_watch_time = (SELECT COALESCE(SUM(watch_duration), 0) FROM watch_events WHERE session_id = NEW.session_id)
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session stats update
DROP TRIGGER IF EXISTS trg_update_session_stats ON watch_events;
CREATE TRIGGER trg_update_session_stats
AFTER INSERT ON watch_events
FOR EACH ROW
EXECUTE FUNCTION fn_update_session_stats();

-- Function to increment view count when short is watched
CREATE OR REPLACE FUNCTION fn_increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action = 'watched' THEN
        UPDATE trending_shorts 
        SET view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.short_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for view count increment
DROP TRIGGER IF EXISTS trg_increment_view_count ON watch_events;
CREATE TRIGGER trg_increment_view_count
AFTER INSERT ON watch_events
FOR EACH ROW
EXECUTE FUNCTION fn_increment_view_count();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION fn_shorts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-update updated_at
DROP TRIGGER IF EXISTS trg_shorts_updated_at ON trending_shorts;
CREATE TRIGGER trg_shorts_updated_at
BEFORE UPDATE ON trending_shorts
FOR EACH ROW
EXECUTE FUNCTION fn_shorts_updated_at();

-- ============================================
-- Sample Data (for development/testing)
-- ============================================

-- Insert sample trending shorts
INSERT INTO trending_shorts (
    id, title, video_url, thumbnail_url, duration, engagement_score, 
    view_count, region, category, ai_predicted_engagement, ai_risk_score, ai_audience_fit
) VALUES
    ('ts_001', 'Tech Innovation 2026 - Must See!', 'https://cdn.elhannora.com/shorts/tech-innovation-2026.mp4', 'https://cdn.elhannora.com/thumbs/tech-innovation-2026.jpg', 45, 95, 125000, 'global', 'technology', 92, 'Low', 88),
    ('ts_002', 'Amazing Fashion Trends', 'https://cdn.elhannora.com/shorts/fashion-trends.mp4', 'https://cdn.elhannora.com/thumbs/fashion-trends.jpg', 30, 88, 89000, 'global', 'fashion', 85, 'Low', 82),
    ('ts_003', 'Quick Cooking Tips', 'https://cdn.elhannora.com/shorts/cooking-tips.mp4', 'https://cdn.elhannora.com/thumbs/cooking-tips.jpg', 58, 82, 67000, 'global', 'food', 78, 'Low', 75),
    ('ts_ng_001', 'Lagos Vibes - New Music Drop', 'https://cdn.elhannora.com/shorts/ng/lagos-vibes.mp4', 'https://cdn.elhannora.com/thumbs/ng/lagos-vibes.jpg', 42, 97, 250000, 'NG', 'music', 95, 'Low', 96),
    ('ts_ng_002', 'Naija Street Food Guide', 'https://cdn.elhannora.com/shorts/ng/street-food.mp4', 'https://cdn.elhannora.com/thumbs/ng/street-food.jpg', 55, 91, 180000, 'NG', 'food', 88, 'Low', 92),
    ('ts_gb_001', 'London Fashion Week Highlights', 'https://cdn.elhannora.com/shorts/gb/london-fashion.mp4', 'https://cdn.elhannora.com/thumbs/gb/london-fashion.jpg', 48, 89, 145000, 'GB', 'fashion', 86, 'Low', 88),
    ('ts_us_001', 'Silicon Valley Startup Tips', 'https://cdn.elhannora.com/shorts/us/startup-tips.mp4', 'https://cdn.elhannora.com/thumbs/us/startup-tips.jpg', 60, 93, 320000, 'US', 'business', 90, 'Low', 91),
    ('ts_us_002', 'NYC Street Style', 'https://cdn.elhannora.com/shorts/us/nyc-style.mp4', 'https://cdn.elhannora.com/thumbs/us/nyc-style.jpg', 35, 87, 210000, 'US', 'fashion', 84, 'Low', 86),
    ('ts_in_001', 'Bollywood Dance Tutorial', 'https://cdn.elhannora.com/shorts/in/bollywood-dance.mp4', 'https://cdn.elhannora.com/thumbs/in/bollywood-dance.jpg', 52, 94, 410000, 'IN', 'entertainment', 91, 'Low', 93),
    ('ts_ae_001', 'Dubai Luxury Lifestyle', 'https://cdn.elhannora.com/shorts/ae/dubai-luxury.mp4', 'https://cdn.elhannora.com/thumbs/ae/dubai-luxury.jpg', 45, 96, 280000, 'AE', 'lifestyle', 93, 'Low', 95)
ON CONFLICT (id) DO NOTHING;
