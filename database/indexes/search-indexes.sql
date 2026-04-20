-- ============================================
-- EL HANNORA - Search Optimization Indexes
-- PostgreSQL Schema for High-Performance Search
-- ============================================
-- 
-- El Hannora Marketplace Search Indexes
-- Supports millions of ads with sub-100ms query times
--
-- Features:
-- - Full-text search across title, description, category
-- - Price range filtering optimizations
-- - Location-based search (city, country, proximity)
-- - Trust score and verification filtering
-- - Seller type filtering
-- - Multiple sort options
--
-- Run this migration after the ads table is created.
-- ============================================

-- Enable required extensions for advanced search
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- Fuzzy text matching
CREATE EXTENSION IF NOT EXISTS unaccent;  -- Handle accented characters
CREATE EXTENSION IF NOT EXISTS postgis;   -- Geospatial queries (if needed)

-- ============================================
-- FULL-TEXT SEARCH CONFIGURATION
-- ============================================

-- Create a custom text search configuration for ads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'ads_search') THEN
        CREATE TEXT SEARCH CONFIGURATION ads_search (COPY = english);
    END IF;
END $$;

-- ============================================
-- FULL-TEXT SEARCH INDEX
-- Primary index for keyword search across title, description, category
-- ============================================

-- GIN index for full-text search (most critical for performance)
CREATE INDEX IF NOT EXISTS ads_search_idx
    ON ads 
    USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')));

-- Alternative: If search_vector column exists, use it directly
-- CREATE INDEX IF NOT EXISTS idx_ads_search_vector ON ads USING GIN(search_vector);

-- ============================================
-- PRIMARY FILTER INDEXES (B-tree)
-- Required for fast filtering operations
-- ============================================

-- Title index (for sorting and partial matches)
CREATE INDEX IF NOT EXISTS ads_title_idx ON ads(title);

-- Category index (for category filtering)
CREATE INDEX IF NOT EXISTS ads_category_idx ON ads(category);

-- Price index (critical for price range filters)
CREATE INDEX IF NOT EXISTS ads_price_idx ON ads(price);

-- Created at index (for newest/oldest sorting)
CREATE INDEX IF NOT EXISTS ads_created_idx ON ads(created_at DESC);

-- Trust score index (for trust filtering and sorting)
CREATE INDEX IF NOT EXISTS ads_trust_score_idx ON ads(trust_score DESC);

-- ============================================
-- LOCATION INDEXES
-- For geographic filtering (city, country, proximity)
-- ============================================

-- Location country index
CREATE INDEX IF NOT EXISTS ads_location_country_idx ON ads(location_country);

-- Location city index
CREATE INDEX IF NOT EXISTS ads_location_city_idx ON ads(location_city);

-- Geolocation index (for "near_me" proximity searches)
CREATE INDEX IF NOT EXISTS ads_geo_idx ON ads(latitude, longitude);

-- ============================================
-- SELLER AND CONDITION INDEXES
-- For seller_type and condition filtering
-- ============================================

-- Seller type index
CREATE INDEX IF NOT EXISTS ads_seller_type_idx ON ads(seller_type);

-- Seller ID index (for seller-specific queries)
CREATE INDEX IF NOT EXISTS ads_seller_id_idx ON ads(seller_id);

-- Condition index
CREATE INDEX IF NOT EXISTS ads_condition_idx ON ads(condition);

-- ============================================
-- VERIFICATION AND AI INDEXES
-- For trust-related filtering
-- ============================================

-- Verified status index
CREATE INDEX IF NOT EXISTS ads_is_verified_idx ON ads(is_verified) WHERE is_verified = TRUE;

-- AI approved index
CREATE INDEX IF NOT EXISTS ads_ai_approved_idx ON ads(ai_approved) WHERE ai_approved = TRUE;

-- ============================================
-- ENGAGEMENT INDEXES
-- For popularity-based sorting
-- ============================================

-- Views index (for most_viewed sorting)
CREATE INDEX IF NOT EXISTS ads_views_idx ON ads(views DESC);

-- Clicks index (for most_popular sorting)
CREATE INDEX IF NOT EXISTS ads_clicks_idx ON ads(clicks DESC);

-- ============================================
-- STATUS AND ACTIVE ADS
-- ============================================

-- Status index (for active ads filtering)
CREATE INDEX IF NOT EXISTS ads_status_idx ON ads(status);

-- Partial index for active ads only (huge performance boost)
CREATE INDEX IF NOT EXISTS ads_active_only_idx ON ads(id) WHERE status = 'active';

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- These optimize the most frequent search combinations
-- ============================================

-- Active ads sorted by newest (very common query)
CREATE INDEX IF NOT EXISTS ads_active_newest_idx 
    ON ads(status, created_at DESC) 
    WHERE status = 'active';

-- Category + Price range (common filter combination)
CREATE INDEX IF NOT EXISTS ads_category_price_idx 
    ON ads(category, price) 
    WHERE status = 'active';

-- Category + newest (for category browsing)
CREATE INDEX IF NOT EXISTS ads_category_created_idx 
    ON ads(category, created_at DESC) 
    WHERE status = 'active';

-- Location + category (for local category search)
CREATE INDEX IF NOT EXISTS ads_location_category_idx 
    ON ads(location_country, category) 
    WHERE status = 'active';

-- Trust + Created (for high-trust sorting)
CREATE INDEX IF NOT EXISTS ads_trust_created_idx 
    ON ads(trust_score DESC, created_at DESC) 
    WHERE status = 'active';

-- Verified + Category (for trusted sellers in category)
CREATE INDEX IF NOT EXISTS ads_verified_category_idx 
    ON ads(is_verified, category) 
    WHERE status = 'active' AND is_verified = TRUE;

-- ============================================
-- FUZZY SEARCH INDEXES (Trigram)
-- For partial matching and typo tolerance
-- ============================================

-- Title trigram index (for fuzzy title matching)
CREATE INDEX IF NOT EXISTS ads_title_trgm_idx 
    ON ads USING GIN(title gin_trgm_ops);

-- Description trigram index (for fuzzy description matching)
CREATE INDEX IF NOT EXISTS ads_description_trgm_idx 
    ON ads USING GIN(description gin_trgm_ops);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to normalize search queries
CREATE OR REPLACE FUNCTION normalize_search_query(query TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(TRIM(regexp_replace(unaccent(COALESCE(query, '')), '[^\w\s-]', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Haversine distance function for proximity searches
-- Returns distance in kilometers between two lat/lng points
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371;  -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);
    c := 2 * asin(sqrt(a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Search ranking function
CREATE OR REPLACE FUNCTION calculate_search_rank(
    ad_title TEXT,
    ad_description TEXT,
    ad_category TEXT,
    query TEXT,
    ad_trust_score INTEGER,
    ad_is_verified BOOLEAN,
    ad_ai_approved BOOLEAN
) RETURNS FLOAT AS $$
DECLARE
    base_rank FLOAT := 0;
    query_lower TEXT := LOWER(TRIM(query));
BEGIN
    -- Title match (highest weight: 0.5)
    IF LOWER(ad_title) LIKE '%' || query_lower || '%' THEN
        base_rank := base_rank + 0.5;
        -- Exact or prefix match bonus
        IF LOWER(ad_title) = query_lower OR LOWER(ad_title) LIKE query_lower || '%' THEN
            base_rank := base_rank + 0.2;
        END IF;
    END IF;
    
    -- Category match (weight: 0.3)
    IF LOWER(ad_category) LIKE '%' || query_lower || '%' THEN
        base_rank := base_rank + 0.3;
    END IF;
    
    -- Description match (weight: 0.1)
    IF LOWER(ad_description) LIKE '%' || query_lower || '%' THEN
        base_rank := base_rank + 0.1;
    END IF;
    
    -- Trust score bonus (up to 0.1)
    base_rank := base_rank + (COALESCE(ad_trust_score, 0) / 1000.0);
    
    -- Verification bonuses
    IF ad_is_verified THEN
        base_rank := base_rank + 0.05;
    END IF;
    
    IF ad_ai_approved THEN
        base_rank := base_rank + 0.03;
    END IF;
    
    RETURN LEAST(base_rank, 1.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- MATERIALIZED VIEW FOR POPULAR SEARCHES
-- Refresh periodically (e.g., every hour)
-- ============================================

-- Note: search_logs table is created in search-logs.sql
-- This view can be created after that table exists

-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_searches AS
-- SELECT 
--     query,
--     COUNT(*) as search_count,
--     AVG(results_count) as avg_results,
--     MAX(created_at) as last_searched
-- FROM search_logs
-- WHERE 
--     created_at > NOW() - INTERVAL '7 days'
--     AND query IS NOT NULL 
--     AND query != ''
-- GROUP BY query
-- HAVING COUNT(*) >= 3
-- ORDER BY search_count DESC
-- LIMIT 100;

-- ============================================
-- INDEX MAINTENANCE NOTES
-- ============================================

-- To refresh indexes after bulk inserts:
-- REINDEX INDEX CONCURRENTLY ads_search_idx;

-- To analyze tables for query optimization:
-- ANALYZE ads;

-- To check index usage statistics:
-- SELECT 
--     indexrelname, 
--     idx_scan, 
--     idx_tup_read, 
--     idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE relname = 'ads';

-- ============================================
-- PERFORMANCE TUNING RECOMMENDATIONS
-- ============================================

-- PostgreSQL configuration (postgresql.conf):
-- 
-- # Memory settings for full-text search
-- maintenance_work_mem = 512MB
-- effective_cache_size = 4GB
-- work_mem = 64MB
-- 
-- # Planner settings for better index usage
-- random_page_cost = 1.1
-- effective_io_concurrency = 200
-- 
-- # GIN index optimization
-- gin_pending_list_limit = 64MB
--
-- # Parallel query settings
-- max_parallel_workers_per_gather = 4
-- parallel_tuple_cost = 0.01
-- parallel_setup_cost = 1000
    COUNT(*) as search_count,
    AVG(results_count) as avg_results,
    COUNT(clicked_ad_id) / NULLIF(COUNT(*), 0)::FLOAT as click_through_rate,
    MAX(created_at) as last_searched
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY normalized_query
HAVING COUNT(*) >= 5
ORDER BY search_count DESC
LIMIT 100;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_popular_searches_query 
    ON mv_popular_searches (normalized_query);

-- ============================================
-- MAINTENANCE NOTES
-- ============================================

-- To refresh the materialized view (run periodically via cron):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_searches;

-- To analyze and optimize indexes:
-- ANALYZE ads;
-- REINDEX INDEX idx_ads_search_vector;

-- To check index usage:
-- SELECT * FROM pg_stat_user_indexes WHERE relname = 'ads';

-- ============================================
-- PERFORMANCE TUNING RECOMMENDATIONS
-- ============================================

-- For PostgreSQL configuration (postgresql.conf):
-- 
-- # Memory settings for full-text search
-- maintenance_work_mem = 512MB
-- effective_cache_size = 4GB
-- work_mem = 64MB
-- 
-- # Planner settings
-- random_page_cost = 1.1
-- effective_io_concurrency = 200
-- 
-- # For better GIN index performance
-- gin_pending_list_limit = 64MB
