-- =============================================
-- Ad Suggestion Logs — analytics table
-- =============================================
-- Tracks every AI ad-suggestion request for
-- usage analytics and feature monitoring.
-- =============================================

CREATE TABLE IF NOT EXISTS ad_suggestion_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255)  NOT NULL,
    user_plan       VARCHAR(50),
    original_title  TEXT,
    original_description TEXT,
    category        VARCHAR(100),
    suggestions_returned INTEGER DEFAULT 0,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for per-user analytics queries
CREATE INDEX IF NOT EXISTS idx_ad_suggestion_logs_user
    ON ad_suggestion_logs (user_id, created_at DESC);

-- Index for plan-level analytics
CREATE INDEX IF NOT EXISTS idx_ad_suggestion_logs_plan
    ON ad_suggestion_logs (user_plan, created_at DESC);
