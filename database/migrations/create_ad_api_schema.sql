-- ============================================
-- EL HANNORA - Create Ad API Database Schema
-- PostgreSQL Migration for Marketplace Ads
-- ============================================
-- 
-- This migration updates the ads table and creates
-- the ad_media table according to the new specification.
--
-- Run this migration to update your database schema.
-- ============================================

-- ============================================
-- 1. UPDATE USERS TABLE (add tier column if not exists)
-- ============================================

-- Add tier column for subscription levels
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'tier') THEN
        ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'normal';
    END IF;
END $$;

-- Tier values: normal, premium, pro, hot, enterprise
COMMENT ON COLUMN users.tier IS 'User subscription tier: normal, premium, pro, hot, enterprise';

-- ============================================
-- 2. UPDATE ADS TABLE
-- ============================================

-- Add condition column with check constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'condition') THEN
        ALTER TABLE ads ADD COLUMN condition TEXT DEFAULT 'used' 
            CHECK (condition IN ('new', 'used'));
    END IF;
END $$;

-- Add price_usd column for currency conversion
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'price_usd') THEN
        ALTER TABLE ads ADD COLUMN price_usd NUMERIC(15,2);
    END IF;
END $$;

-- Add quality_score column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'quality_score') THEN
        ALTER TABLE ads ADD COLUMN quality_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add video_format column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ads' AND column_name = 'video_format') THEN
        ALTER TABLE ads ADD COLUMN video_format TEXT;
    END IF;
END $$;

-- Update title column length constraint to 80 characters
-- Note: This may fail if existing data exceeds 80 chars
-- ALTER TABLE ads ALTER COLUMN title TYPE VARCHAR(80);

-- Update description column length constraint to 500 characters
-- Note: This may fail if existing data exceeds 500 chars
-- ALTER TABLE ads ALTER COLUMN description TYPE VARCHAR(500);

-- ============================================
-- 3. CREATE AD_MEDIA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ad_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    
    -- Media type: 'image' or 'video'
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    
    -- URL to the media file
    media_url TEXT NOT NULL,
    
    -- File size in megabytes
    file_size_mb NUMERIC(10, 2),
    
    -- Duration in seconds (for videos only)
    duration_seconds INTEGER,
    
    -- File format (jpg, png, webp, mp4, etc.)
    format TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ad_media
CREATE INDEX IF NOT EXISTS idx_ad_media_ad_id ON ad_media(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_media_media_type ON ad_media(media_type);

-- ============================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE ad_media IS 'Stores images and videos for ads. Max 5 images (5MB each, JPG/PNG/WEBP) and 1 video (MP4, tier-based limits)';
COMMENT ON COLUMN ad_media.media_type IS 'Type of media: image or video';
COMMENT ON COLUMN ad_media.file_size_mb IS 'File size in megabytes. Images max 5MB, videos tier-based';
COMMENT ON COLUMN ad_media.duration_seconds IS 'Video duration in seconds. Tier limits: Normal=120s, Premium=180s, Pro=300s, Hot=600s, Enterprise=unlimited';

COMMENT ON COLUMN ads.price_usd IS 'Price converted to USD for display. Only shown to Pro, Hot, Enterprise users';
COMMENT ON COLUMN ads.quality_score IS 'Ad quality score: +1 per image, +3 for video, max 10';
COMMENT ON COLUMN ads.condition IS 'Item condition: new or used';

-- ============================================
-- 5. VIDEO TIER LIMITS REFERENCE
-- ============================================

/*
Tier-based video upload limits:

| Tier       | Max Duration | Max Size |
|------------|--------------|----------|
| Normal     | 2 min (120s) | 25 MB    |
| Premium    | 3 min (180s) | 40 MB    |
| Pro        | 5 min (300s) | 60 MB    |
| Hot        | 10 min (600s)| 80 MB    |
| Enterprise | unlimited    | backend  |

Allowed categories:
- Electronics
- Vehicles
- Real Estate
- Fashion
- Phones
- Computers
- Home & Furniture
- Services
*/

-- ============================================
-- 6. VALIDATION CONSTRAINTS SUMMARY
-- ============================================

/*
Backend validates ALL of these:

1. Title: max 80 characters
2. Description: max 500 characters
3. Category: must be in allowed list
4. Condition: 'new' or 'used' only
5. Images: max 5, max 5MB each, JPG/PNG/WEBP only
6. Video: 1 max, MP4 (H264), 1080p max, tier-based duration/size
7. Price: positive number
8. Currency: required for conversion

Quality Score calculation:
- Each image = +1 point
- Video = +3 points
- Maximum = 10 points
*/
