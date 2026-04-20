-- ============================================
-- EL HANNORA - Ads Table Schema
-- PostgreSQL Schema for Marketplace Ads
-- ============================================
-- 
-- This schema defines the complete ads table structure
-- for the El Hannora advertising platform.
--
-- Supports:
-- - Full-text search across title, description, category
-- - Advanced filtering by price, location, condition
-- - Trust score and verification status
-- - Geolocation for distance-based searches
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;  -- Geospatial queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Fuzzy text matching

-- ============================================
-- ADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ads (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic ad information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Pricing
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Location data
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Item condition
    condition VARCHAR(20) DEFAULT 'used' 
        CHECK (condition IN ('new', 'used', 'refurbished')),
    
    -- Seller information
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_type VARCHAR(30) DEFAULT 'individual'
        CHECK (seller_type IN ('individual', 'business', 'verified_business')),
    
    -- Trust and verification
    trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
    is_verified BOOLEAN DEFAULT FALSE,
    ai_approved BOOLEAN DEFAULT FALSE,
    
    -- Engagement metrics
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'pending', 'sold', 'expired', 'flagged')),
    
    -- Media (JSON array of media URLs)
    media JSONB DEFAULT '[]'::jsonb,
    
    -- Full-text search vector (auto-populated by trigger)
    search_vector tsvector,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Primary search indexes
CREATE INDEX IF NOT EXISTS idx_ads_title ON ads(title);
CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category);
CREATE INDEX IF NOT EXISTS idx_ads_price ON ads(price);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_trust_score ON ads(trust_score DESC);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_ads_location_country ON ads(location_country);
CREATE INDEX IF NOT EXISTS idx_ads_location_city ON ads(location_city);
CREATE INDEX IF NOT EXISTS idx_ads_lat_lng ON ads(latitude, longitude);

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_ads_condition ON ads(condition);
CREATE INDEX IF NOT EXISTS idx_ads_seller_type ON ads(seller_type);
CREATE INDEX IF NOT EXISTS idx_ads_seller_id ON ads(seller_id);
CREATE INDEX IF NOT EXISTS idx_ads_is_verified ON ads(is_verified);
CREATE INDEX IF NOT EXISTS idx_ads_ai_approved ON ads(ai_approved);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);

-- Engagement indexes
CREATE INDEX IF NOT EXISTS idx_ads_views ON ads(views DESC);
CREATE INDEX IF NOT EXISTS idx_ads_clicks ON ads(clicks DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ads_category_price ON ads(category, price);
CREATE INDEX IF NOT EXISTS idx_ads_status_created ON ads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_category_status_created ON ads(category, status, created_at DESC);

-- Full-text search index (GIN for fast lookups)
CREATE INDEX IF NOT EXISTS idx_ads_search_vector ON ads USING GIN(search_vector);

-- Trigram index for fuzzy/partial matching
CREATE INDEX IF NOT EXISTS idx_ads_title_trgm ON ads USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ads_description_trgm ON ads USING GIN(description gin_trgm_ops);

-- ============================================
-- FULL-TEXT SEARCH TRIGGER
-- ============================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_ads_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS trg_ads_search_vector ON ads;
CREATE TRIGGER trg_ads_search_vector
    BEFORE INSERT OR UPDATE OF title, description, category
    ON ads
    FOR EACH ROW
    EXECUTE FUNCTION update_ads_search_vector();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_ads_updated_at ON ads;
CREATE TRIGGER trg_ads_updated_at
    BEFORE UPDATE ON ads
    FOR EACH ROW
    EXECUTE FUNCTION update_ads_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);
    c := 2 * asin(sqrt(a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SAMPLE DATA (for development)
-- ============================================

-- Uncomment to insert sample data
/*
INSERT INTO ads (title, description, category, price, currency, location_country, location_city, latitude, longitude, condition, seller_id, seller_type, trust_score, is_verified, ai_approved, views, clicks)
VALUES 
    ('iPhone 15 Pro Max 256GB', 'Brand new sealed iPhone 15 Pro Max with warranty', 'electronics', 1199.99, 'USD', 'USA', 'New York', 40.7128, -74.0060, 'new', 'seller-uuid-here', 'verified_business', 95, true, true, 4500, 890),
    ('MacBook Pro 14" M3 Pro', 'Latest MacBook Pro with M3 Pro chip, 18GB RAM', 'electronics', 1999.00, 'USD', 'USA', 'Los Angeles', 34.0522, -118.2437, 'new', 'seller-uuid-here', 'business', 88, true, false, 3200, 567),
    ('Toyota Camry 2023', 'Low mileage Toyota Camry, excellent condition', 'vehicles', 28500.00, 'USD', 'USA', 'Chicago', 41.8781, -87.6298, 'used', 'seller-uuid-here', 'individual', 72, false, true, 2100, 345);
*/

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE ads IS 'Main ads table for El Hannora marketplace';
COMMENT ON COLUMN ads.search_vector IS 'Full-text search vector combining title, description, and category';
COMMENT ON COLUMN ads.trust_score IS 'Seller trust score from 0-100';
COMMENT ON COLUMN ads.ai_approved IS 'Whether AI has verified this ad as legitimate';
