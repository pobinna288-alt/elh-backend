-- ════════════════════════════════════════════════════════════
-- AI DEAL BROKER & ALTERNATIVE SELLER FINDER
-- Database Schema for PostgreSQL
-- ════════════════════════════════════════════════════════════

-- 1. Deals Table
-- Tracks all negotiation deals between buyers and sellers
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id UUID,
    category VARCHAR(255) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    offered_price DECIMAL(10,2) NOT NULL,
    counter_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    target_location VARCHAR(255),
    required_attention INT DEFAULT 0,
    campaign_duration INT DEFAULT 0,
    budget DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    seller_declined BOOLEAN DEFAULT FALSE,
    negotiation_deadline TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    alternative_search_triggered BOOLEAN DEFAULT FALSE,
    rejected_seller_ids TEXT, -- comma-separated UUIDs
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_buyer_status ON deals(buyer_id, status);
CREATE INDEX idx_deals_seller_status ON deals(seller_id, status);
CREATE INDEX idx_deals_status_created ON deals(status, created_at);

-- 2. Seller Profiles Table
-- Stores seller marketplace metrics for matching
CREATE TABLE IF NOT EXISTS seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    availability BOOLEAN DEFAULT TRUE,
    attention_score DECIMAL(5,2) DEFAULT 0,
    price_per_attention DECIMAL(10,2) DEFAULT 0,
    deal_success_rate DECIMAL(5,4) DEFAULT 0,
    response_speed DECIMAL(5,2) DEFAULT 0,
    total_deals INT DEFAULT 0,
    successful_deals INT DEFAULT 0,
    failed_deals INT DEFAULT 0,
    avg_rating DECIMAL(5,2) DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_by_user_ids TEXT, -- comma-separated UUIDs
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_seller_category_avail ON seller_profiles(category, availability);
CREATE INDEX idx_seller_location_avail ON seller_profiles(location, availability);
CREATE INDEX idx_seller_attention ON seller_profiles(attention_score);
CREATE INDEX idx_seller_price ON seller_profiles(price_per_attention);

-- 3. Alternative Seller Searches Table
-- Logs each alternative seller search with results
CREATE TABLE IF NOT EXISTS alternative_seller_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_seller_id UUID NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    category VARCHAR(255) NOT NULL,
    target_location VARCHAR(255),
    required_attention INT DEFAULT 0,
    campaign_duration INT DEFAULT 0,
    matched_sellers JSONB, -- array of matched seller objects
    total_candidates INT DEFAULT 0,
    returned_count INT DEFAULT 0,
    trigger_reason VARCHAR(50) NOT NULL,
    selected_seller_id UUID,
    chat_created BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alt_search_buyer ON alternative_seller_searches(buyer_id, created_at);
CREATE INDEX idx_alt_search_deal ON alternative_seller_searches(deal_id);

-- 4. Negotiation Chats Table
-- Auto-created chats when buyer selects a recommended seller
CREATE TABLE IF NOT EXISTS negotiation_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_details JSONB,
    negotiation_context JSONB,
    negotiation_ai_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_neg_chat_buyer_seller ON negotiation_chats(buyer_id, seller_id);
CREATE INDEX idx_neg_chat_deal ON negotiation_chats(deal_id);

-- 5. Usage tracking for alternative_seller_finder
-- Uses the existing ai_usage_logs table with feature_name = 'alternative_seller_finder'
-- No new table needed; just ensure the unique constraint covers it.
-- The ai_usage_logs table already has:
--   UNIQUE(user_id, feature_name, usage_date)
--   INDEX(user_id, feature_name, usage_date)
