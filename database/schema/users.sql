-- PostgreSQL User Table for EL HANNORA
-- Production-ready schema with proper indexing and constraints

-- Drop existing table (use with caution in production)
-- DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication Fields
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  
  -- Profile Information
  full_name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
  location VARCHAR(255) NOT NULL,
  profile_photo VARCHAR(500),

  -- Account Status
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'premium', 'pro', 'hot', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,

  -- Gamification & Economy
  coins INTEGER DEFAULT 0 CHECK (coins >= 0),
  streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
  last_streak_date TIMESTAMP,
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),

  -- Referral System
  referral_code VARCHAR(10) NOT NULL UNIQUE,
  referred_by VARCHAR(10),
  referral_count INTEGER DEFAULT 0 CHECK (referral_count >= 0),
  referral_earnings INTEGER DEFAULT 0 CHECK (referral_earnings >= 0),

  -- Premium Features
  premium_expires_at TIMESTAMP,

  -- Notifications & Privacy
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  privacy_mode BOOLEAN DEFAULT FALSE,

  -- Security & Rate Limiting
  failed_login_attempts INTEGER DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  CONSTRAINT idx_users_email_lower CHECK (email = LOWER(email))
);

-- Indexes for fast lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_role ON users(role);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'Main user accounts table for EL HANNORA platform';
COMMENT ON COLUMN users.email IS 'User email address (normalized to lowercase)';
COMMENT ON COLUMN users.password IS 'Bcrypt hashed password (never stored in plain text)';
COMMENT ON COLUMN users.full_name IS 'User full name as provided during registration';
COMMENT ON COLUMN users.age IS 'User age (minimum 13 years old)';
COMMENT ON COLUMN users.is_email_verified IS 'Email verification status (for future implementation)';
COMMENT ON COLUMN users.trust_score IS 'User trust score (0-100) for fraud prevention';
COMMENT ON COLUMN users.referral_code IS 'Unique referral code for inviting other users';
COMMENT ON COLUMN users.coins IS 'Virtual currency balance for platform features';
