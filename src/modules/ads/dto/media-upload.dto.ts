import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SUBSCRIPTION_PLAN_RULES } from '../../../config/subscription-pricing.config';

export enum UploadPlan {
  NORMAL = 'normal',
  PREMIUM = 'premium',
  PRO = 'pro',
  HOT = 'hot',
  ENTERPRISE = 'enterprise',
}

export class UploadVideoDto {
  @ApiProperty({
    description: 'Upload plan type',
    enum: UploadPlan,
    example: UploadPlan.NORMAL,
  })
  @IsEnum(UploadPlan)
  @IsNotEmpty()
  plan: UploadPlan;

  @ApiProperty({
    description: 'Ad ID to associate with the video',
    required: false,
  })
  @IsString()
  @IsOptional()
  adId?: string;
}

export class MediaUploadResponseDto {
  @ApiProperty({ description: 'Original file URL' })
  originalUrl: string;

  @ApiProperty({ description: 'Processed/compressed video URL' })
  processedUrl: string;

  @ApiProperty({ description: 'Thumbnail URL' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Video duration in seconds' })
  duration: number;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Whether video was compressed' })
  compressed: boolean;

  @ApiProperty({ description: 'Whether watermark was applied' })
  watermarked: boolean;

  @ApiProperty({ description: 'Upload plan used' })
  plan: UploadPlan;
}

export class NormalVideoUploadResponseDto {
  @ApiProperty({ example: 'success', description: 'Upload status' })
  upload_status: string;

  @ApiProperty({ description: 'Video duration in seconds' })
  video_duration: number;

  @ApiProperty({ description: 'Coins earned for this upload (max 20)' })
  coins_earned: number;

  @ApiProperty({ description: 'Total coins in user wallet after reward' })
  total_user_coins: number;

  @ApiProperty({ example: 4000, description: 'Maximum allowed views for this ad' })
  max_views: number;

  @ApiProperty({ example: 'active', description: 'Ad status' })
  status: string;
}

export interface PlanLimits {
  maxDuration: number; // seconds
  maxFileSize: number; // bytes
  compressionLevel: 'high' | 'medium' | 'low' | 'minimal' | 'none';
  applyWatermark: boolean;
  requiresPayment: boolean;
  maxViews: number;
  dailyUploads: number;
  aiRequestsPerToolPerDay: number;
  processingPriority: 'low' | 'medium' | 'high' | 'highest';
  videoWatchRewardLimit: number;
  coinsPerVideo: number;
  maxCoinsPerDay: number;
  publicName: string;
  displayName: string;
}

// Video tier limits according to the updated specification:
// Free/Normal: 2 min (120s), 20 MB
// Starter:     3 min (180s), 20 MB
// Pro:         5 min (300s), 30 MB
// Elite:      10 min (600s), 50 MB
// Enterprise: unlimited, backend controlled
export const PLAN_LIMITS: Record<UploadPlan, PlanLimits> = {
  [UploadPlan.NORMAL]: {
    maxDuration: 120,
    maxFileSize: 20 * 1024 * 1024,
    compressionLevel: 'high',
    applyWatermark: true,
    requiresPayment: false,
    maxViews: 4000,
    dailyUploads: 2,
    aiRequestsPerToolPerDay: 0,
    processingPriority: 'low',
    videoWatchRewardLimit: 0,
    coinsPerVideo: 0,
    maxCoinsPerDay: 0,
    publicName: 'free',
    displayName: 'Free',
  },
  [UploadPlan.PREMIUM]: {
    maxDuration: SUBSCRIPTION_PLAN_RULES.premium.maxVideoDurationSeconds,
    maxFileSize: SUBSCRIPTION_PLAN_RULES.premium.maxFileSizeMb * 1024 * 1024,
    compressionLevel: 'medium',
    applyWatermark: false,
    requiresPayment: false,
    maxViews: SUBSCRIPTION_PLAN_RULES.premium.maxAdReach,
    dailyUploads: SUBSCRIPTION_PLAN_RULES.premium.dailyUploads,
    aiRequestsPerToolPerDay: SUBSCRIPTION_PLAN_RULES.premium.aiRequestsPerToolPerDay,
    processingPriority: SUBSCRIPTION_PLAN_RULES.premium.processingPriority,
    videoWatchRewardLimit: SUBSCRIPTION_PLAN_RULES.premium.videoWatchRewardLimit,
    coinsPerVideo: SUBSCRIPTION_PLAN_RULES.premium.coinsPerVideo,
    maxCoinsPerDay: SUBSCRIPTION_PLAN_RULES.premium.maxCoinsPerDay,
    publicName: SUBSCRIPTION_PLAN_RULES.premium.publicName,
    displayName: SUBSCRIPTION_PLAN_RULES.premium.displayName,
  },
  [UploadPlan.PRO]: {
    maxDuration: SUBSCRIPTION_PLAN_RULES.pro.maxVideoDurationSeconds,
    maxFileSize: SUBSCRIPTION_PLAN_RULES.pro.maxFileSizeMb * 1024 * 1024,
    compressionLevel: 'low',
    applyWatermark: false,
    requiresPayment: false,
    maxViews: SUBSCRIPTION_PLAN_RULES.pro.maxAdReach,
    dailyUploads: SUBSCRIPTION_PLAN_RULES.pro.dailyUploads,
    aiRequestsPerToolPerDay: SUBSCRIPTION_PLAN_RULES.pro.aiRequestsPerToolPerDay,
    processingPriority: SUBSCRIPTION_PLAN_RULES.pro.processingPriority,
    videoWatchRewardLimit: SUBSCRIPTION_PLAN_RULES.pro.videoWatchRewardLimit,
    coinsPerVideo: SUBSCRIPTION_PLAN_RULES.pro.coinsPerVideo,
    maxCoinsPerDay: SUBSCRIPTION_PLAN_RULES.pro.maxCoinsPerDay,
    publicName: SUBSCRIPTION_PLAN_RULES.pro.publicName,
    displayName: SUBSCRIPTION_PLAN_RULES.pro.displayName,
  },
  [UploadPlan.HOT]: {
    maxDuration: SUBSCRIPTION_PLAN_RULES.hot.maxVideoDurationSeconds,
    maxFileSize: SUBSCRIPTION_PLAN_RULES.hot.maxFileSizeMb * 1024 * 1024,
    compressionLevel: 'minimal',
    applyWatermark: false,
    requiresPayment: true,
    maxViews: SUBSCRIPTION_PLAN_RULES.hot.maxAdReach,
    dailyUploads: SUBSCRIPTION_PLAN_RULES.hot.dailyUploads,
    aiRequestsPerToolPerDay: SUBSCRIPTION_PLAN_RULES.hot.aiRequestsPerToolPerDay,
    processingPriority: SUBSCRIPTION_PLAN_RULES.hot.processingPriority,
    videoWatchRewardLimit: SUBSCRIPTION_PLAN_RULES.hot.videoWatchRewardLimit,
    coinsPerVideo: SUBSCRIPTION_PLAN_RULES.hot.coinsPerVideo,
    maxCoinsPerDay: SUBSCRIPTION_PLAN_RULES.hot.maxCoinsPerDay,
    publicName: SUBSCRIPTION_PLAN_RULES.hot.publicName,
    displayName: SUBSCRIPTION_PLAN_RULES.hot.displayName,
  },
  [UploadPlan.ENTERPRISE]: {
    maxDuration: Infinity,
    maxFileSize: 500 * 1024 * 1024,
    compressionLevel: 'none',
    applyWatermark: false,
    requiresPayment: true,
    maxViews: Infinity,
    dailyUploads: Infinity,
    aiRequestsPerToolPerDay: Infinity,
    processingPriority: 'highest',
    videoWatchRewardLimit: Infinity,
    coinsPerVideo: 5,
    maxCoinsPerDay: Infinity,
    publicName: 'enterprise',
    displayName: 'Enterprise',
  },
};
