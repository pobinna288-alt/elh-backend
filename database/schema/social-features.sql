-- Reviews and Ratings Schema
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_ad_id ON reviews(ad_id);
CREATE INDEX idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Notifications Schema
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    related_ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Streaks Schema
CREATE TABLE IF NOT EXISTS streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_visit_date DATE NOT NULL,
    total_coins_earned INTEGER DEFAULT 0,
    daily_coins_today INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_current_streak ON streaks(current_streak DESC);
CREATE INDEX idx_streaks_last_visit_date ON streaks(last_visit_date);

-- Follows Schema
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- Wishlist Schema
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ad_id)
);

CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX idx_wishlist_ad_id ON wishlist(ad_id);
CREATE INDEX idx_wishlist_created_at ON wishlist(created_at DESC);

-- Referrals Schema
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reward_claimed BOOLEAN DEFAULT FALSE,
    coins_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referred_user_id ON referrals(referred_user_id);

-- Saved Searches Schema
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(255) NOT NULL,
    keyword VARCHAR(255),
    category VARCHAR(100),
    location VARCHAR(255),
    min_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    notification_frequency VARCHAR(20) DEFAULT 'daily',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_category ON saved_searches(category);

-- Price Alerts Schema
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    target_price DECIMAL(10, 2) NOT NULL,
    alert_frequency VARCHAR(20) DEFAULT 'daily',
    triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_ad_id ON price_alerts(ad_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(active);
CREATE INDEX idx_price_alerts_triggered ON price_alerts(triggered);
