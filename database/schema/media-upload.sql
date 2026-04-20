-- Media Upload System Migration
-- Adds video-related fields to ads table

-- Add video fields to ads table
ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS "videoUrl" VARCHAR,
ADD COLUMN IF NOT EXISTS "thumbnailUrl" VARCHAR,
ADD COLUMN IF NOT EXISTS "videoDuration" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "videoFileSize" INTEGER;

-- Create index for video ads
CREATE INDEX IF NOT EXISTS idx_ads_video ON ads("isVideoAd") WHERE "isVideoAd" = true;

-- Create index for ad category and video combination
CREATE INDEX IF NOT EXISTS idx_ads_category_video ON ads("category", "isVideoAd");
