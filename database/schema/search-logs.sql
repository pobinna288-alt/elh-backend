-- ============================================
-- EL HANNORA - Search Analytics Schema
-- PostgreSQL Schema for Search Logs and Analytics
-- ============================================
-- 
-- This schema enables:
-- - Search query logging for analytics
-- - Trending searches identification
-- - User search behavior analysis
-- - Filter usage statistics
-- ============================================

-- ============================================
-- SEARCH LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS search_logs (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Search query
    query VARCHAR(500),
    
    -- User information (nullable for anonymous searches)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Session tracking
    session_id VARCHAR(100),
    
    -- Filters applied (stored as JSONB for flexibility)
    filters JSONB DEFAULT '{}'::jsonb,
    
    -- Results information
    results_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    response_time_ms INTEGER,
    
    -- Search metadata
    search_type VARCHAR(50) DEFAULT 'keyword'
        CHECK (search_type IN ('keyword', 'category', 'filter_only', 'voice', 'ai_semantic')),
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'web'
        CHECK (source IN ('web', 'mobile_app', 'api', 'widget')),
    
    -- Geographic context
    user_location_country VARCHAR(100),
    user_location_city VARCHAR(100),
    user_latitude DECIMAL(10, 8),
    user_longitude DECIMAL(11, 8),
    
    -- Interaction tracking
    clicked_ad_ids UUID[] DEFAULT '{}',
    first_clicked_position INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRENDING SEARCHES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trending_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Query information
    query VARCHAR(500) NOT NULL,
    normalized_query VARCHAR(500) NOT NULL, -- Lowercase, trimmed
    
    -- Statistics
    search_count INTEGER DEFAULT 1,
    unique_users INTEGER DEFAULT 1,
    avg_results_count DECIMAL(10, 2) DEFAULT 0,
    
    -- Time window
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Trend data
    growth_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage growth from previous period
    trend_score DECIMAL(10, 4) DEFAULT 0, -- Calculated trending score
    
    -- Geolocation (for location-based trending)
    location_country VARCHAR(100),
    category VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per query and time period
    CONSTRAINT unique_trending_query_period UNIQUE (normalized_query, period_start, location_country)
);

-- ============================================
-- SEARCH SUGGESTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Suggestion text
    suggestion VARCHAR(500) NOT NULL UNIQUE,
    normalized_suggestion VARCHAR(500) NOT NULL,
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5, 4) DEFAULT 0,
    
    -- Categorization
    category VARCHAR(100),
    suggestion_type VARCHAR(50) DEFAULT 'popular'
        CHECK (suggestion_type IN ('popular', 'category', 'autocomplete', 'related', 'ai_generated')),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Search logs indexes
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_filters ON search_logs USING GIN(filters);
CREATE INDEX IF NOT EXISTS idx_search_logs_session ON search_logs(session_id);

-- Trending searches indexes
CREATE INDEX IF NOT EXISTS idx_trending_normalized ON trending_searches(normalized_query);
CREATE INDEX IF NOT EXISTS idx_trending_period ON trending_searches(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_searches(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_country ON trending_searches(location_country);
CREATE INDEX IF NOT EXISTS idx_trending_category ON trending_searches(category);

-- Search suggestions indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_normalized ON search_suggestions(normalized_suggestion);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_usage ON search_suggestions(usage_count DESC);

-- Trigram index for fuzzy suggestion matching
CREATE INDEX IF NOT EXISTS idx_suggestions_trgm ON search_suggestions 
    USING GIN(normalized_suggestion gin_trgm_ops);

-- ============================================
-- FUNCTIONS FOR ANALYTICS
-- ============================================

-- Function to log a search query
CREATE OR REPLACE FUNCTION log_search_query(
    p_query VARCHAR(500),
    p_user_id UUID,
    p_filters JSONB,
    p_results_count INTEGER,
    p_response_time_ms INTEGER,
    p_source VARCHAR(50) DEFAULT 'web'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO search_logs (query, user_id, filters, results_count, response_time_ms, source)
    VALUES (p_query, p_user_id, p_filters, p_results_count, p_response_time_ms, p_source)
    RETURNING id INTO v_log_id;
    
    -- Update search suggestions
    INSERT INTO search_suggestions (suggestion, normalized_suggestion, usage_count)
    VALUES (p_query, LOWER(TRIM(p_query)), 1)
    ON CONFLICT (suggestion) 
    DO UPDATE SET 
        usage_count = search_suggestions.usage_count + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(
    p_limit INTEGER DEFAULT 10,
    p_location_country VARCHAR(100) DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    query VARCHAR(500),
    search_count BIGINT,
    trend_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.query,
        COUNT(*)::BIGINT as search_count,
        (COUNT(*) * LOG(COUNT(DISTINCT sl.user_id) + 1))::DECIMAL as trend_score
    FROM search_logs sl
    WHERE 
        sl.created_at > CURRENT_TIMESTAMP - (p_hours_back || ' hours')::INTERVAL
        AND (p_location_country IS NULL OR sl.user_location_country = p_location_country)
        AND sl.query IS NOT NULL
        AND sl.query != ''
    GROUP BY sl.query
    ORDER BY trend_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_prefix VARCHAR(100),
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion VARCHAR(500),
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.suggestion,
        ss.usage_count
    FROM search_suggestions ss
    WHERE 
        ss.is_active = TRUE
        AND ss.normalized_suggestion LIKE LOWER(p_prefix) || '%'
    ORDER BY ss.usage_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP JOB (for old logs)
-- ============================================

-- Function to cleanup old search logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_search_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM search_logs
    WHERE created_at < CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE search_logs IS 'Logs all search queries for analytics and trending calculations';
COMMENT ON TABLE trending_searches IS 'Aggregated trending search data per time period';
COMMENT ON TABLE search_suggestions IS 'Search autocomplete suggestions based on popularity';
COMMENT ON COLUMN search_logs.filters IS 'JSON object containing all filters applied: {price: "50_200", category: "electronics", ...}';
