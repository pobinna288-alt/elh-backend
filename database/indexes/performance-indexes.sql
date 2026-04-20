/**
 * Database Indexes Guide
 * 
 * Critical indexes for optimal query performance
 * Apply these to your database schema
 */

-- ============================================
-- USER TABLE INDEXES
-- ============================================

-- Primary key already indexed by default
-- Add composite index for common queries

-- Fast lookup by email (login)
CREATE INDEX idx_users_email ON users(email);

-- Fast lookup by username
CREATE INDEX idx_users_username ON users(username);

-- Fast lookup by phone (if used for login)
CREATE INDEX idx_users_phone ON users(phone);

-- Fast filtering by account status
CREATE INDEX idx_users_status ON users(status);

-- Fast filtering by tier
CREATE INDEX idx_users_tier ON users(tier);

-- Composite index for active users search
CREATE INDEX idx_users_status_created ON users(status, created_at DESC);


-- ============================================
-- ADS TABLE INDEXES
-- ============================================

-- Fast lookup by user (for user's ads)
CREATE INDEX idx_ads_user_id ON ads(user_id);

-- Fast filtering by status
CREATE INDEX idx_ads_status ON ads(status);

-- Fast filtering by category
CREATE INDEX idx_ads_category ON ads(category);

-- Fast sorting by creation date
CREATE INDEX idx_ads_created_at ON ads(created_at DESC);

-- Composite index for active ads feed
CREATE INDEX idx_ads_status_created ON ads(status, created_at DESC);

-- Composite index for user's ads
CREATE INDEX idx_ads_user_status ON ads(user_id, status, created_at DESC);

-- Full-text search on title (PostgreSQL)
CREATE INDEX idx_ads_title_search ON ads USING gin(to_tsvector('english', title));

-- Full-text search on description (PostgreSQL)
CREATE INDEX idx_ads_description_search ON ads USING gin(to_tsvector('english', description));


-- ============================================
-- PAYMENTS TABLE INDEXES
-- ============================================

-- Fast lookup by reference (payment verification)
CREATE UNIQUE INDEX idx_payments_reference ON payments(reference);

-- Fast lookup by user
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- Fast filtering by status
CREATE INDEX idx_payments_status ON payments(status);

-- Composite index for user's payment history
CREATE INDEX idx_payments_user_status ON payments(user_id, status, created_at DESC);

-- Fast filtering by payment type
CREATE INDEX idx_payments_type ON payments(type);


-- ============================================
-- WALLET TABLE INDEXES
-- ============================================

-- One wallet per user (should be unique)
CREATE UNIQUE INDEX idx_wallet_user_id ON wallet(user_id);

-- Fast filtering by balance (for fraud detection)
CREATE INDEX idx_wallet_balance ON wallet(balance);


-- ============================================
-- WALLET TRANSACTIONS TABLE INDEXES
-- ============================================

-- Fast lookup by wallet
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);

-- Fast lookup by reference (idempotency)
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference);

-- Composite index for transaction history
CREATE INDEX idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

-- Fast filtering by type
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);


-- ============================================
-- COMMENTS TABLE INDEXES
-- ============================================

-- Fast lookup by ad (to show ad comments)
CREATE INDEX idx_comments_ad_id ON comments(ad_id);

-- Fast lookup by user
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Composite index for ad comments feed
CREATE INDEX idx_comments_ad_created ON comments(ad_id, created_at DESC);


-- ============================================
-- MESSAGES TABLE INDEXES
-- ============================================

-- Fast lookup by sender
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- Fast lookup by receiver
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);

-- Composite index for user's inbox
CREATE INDEX idx_messages_receiver_created ON messages(receiver_id, created_at DESC);

-- Composite index for user's sent messages
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at DESC);

-- Fast filtering by read status
CREATE INDEX idx_messages_read ON messages(is_read);


-- ============================================
-- FRAUD DETECTION TABLE INDEXES
-- ============================================

-- Fast lookup by user
CREATE INDEX idx_fraud_checks_user_id ON fraud_checks(user_id);

-- Fast lookup by risk level
CREATE INDEX idx_fraud_checks_risk_level ON fraud_checks(risk_level);

-- Composite index for recent high-risk users
CREATE INDEX idx_fraud_checks_risk_created ON fraud_checks(risk_level, created_at DESC);


-- ============================================
-- REFRESH TOKENS TABLE INDEXES
-- ============================================

-- Fast lookup by token
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Fast lookup by user
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Fast cleanup of expired tokens
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);


-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

-- Monitor query performance (PostgreSQL)
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries taking more than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;


-- ============================================
-- MAINTENANCE
-- ============================================

-- Analyze tables for better query planning
ANALYZE users;
ANALYZE ads;
ANALYZE payments;
ANALYZE wallet;
ANALYZE wallet_transactions;
ANALYZE comments;
ANALYZE messages;

-- Reindex if needed (run during low traffic)
-- REINDEX TABLE users;
-- REINDEX TABLE ads;
