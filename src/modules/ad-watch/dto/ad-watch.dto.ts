import { IsUUID, IsInt, Min, Max, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for tracking ad watch progress
 */
export class AdProgressDto {
  @ApiProperty({
    description: 'ID of the ad being watched',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  adId: string;

  @ApiProperty({
    description: 'Current watch percentage (0-100)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  watchPercent: number;

  @ApiPropertyOptional({
    description: 'Actual watch time in seconds (for anti-cheat validation)',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  watchTimeSeconds?: number;
}

/**
 * DTO for starting a new watch session
 */
export class StartWatchSessionDto {
  @ApiProperty({
    description: 'ID of the ad to watch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  adId: string;
}

/**
 * Response DTO for ad progress updates
 */
export class AdProgressResponseDto {
  @ApiProperty({ description: 'Operation status' })
  success: boolean;

  @ApiProperty({ description: 'Current watch percentage' })
  watchPercent: number;

  @ApiProperty({ description: 'Coins earned from this progress update' })
  coinsEarned: number;

  @ApiProperty({ description: 'Total coins earned from this ad' })
  totalCoinsFromAd: number;

  @ApiProperty({ description: 'User\'s new coin balance' })
  newBalance: number;

  @ApiProperty({ description: 'Whether ad is completed' })
  completed: boolean;

  @ApiProperty({ description: 'Milestones reached', type: [Number] })
  milestonesReached: number[];

  @ApiPropertyOptional({ description: 'Active boost multiplier if any' })
  boostMultiplier?: number;

  @ApiPropertyOptional({ description: 'Message for the user' })
  message?: string;
}

/**
 * Response DTO for watch session start
 */
export class WatchSessionResponseDto {
  @ApiProperty({ description: 'Operation status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID for tracking' })
  sessionId: string;

  @ApiProperty({ description: 'Ad ID being watched' })
  adId: string;

  @ApiProperty({ description: 'Ad tier (NORMAL, PREMIUM, PRO, HOT)' })
  tier: string;

  @ApiProperty({ description: 'Video duration in seconds' })
  videoDuration: number;

  @ApiProperty({ description: 'Maximum coins earnable from this ad' })
  maxCoins: number;

  @ApiProperty({ description: 'Coins earned at each milestone', type: Object })
  milestoneRewards: {
    '25': number;
    '50': number;
    '75': number;
    '100': number;
  };

  @ApiPropertyOptional({ description: 'Active boost event details' })
  boostEvent?: {
    name: string;
    multiplier: number;
    endsAt: Date;
  };
}

/**
 * Response DTO for ad completion
 */
export class AdCompletionResponseDto {
  @ApiProperty({ description: 'Completion status' })
  status: 'completed' | 'already_completed' | 'in_progress';

  @ApiProperty({ description: 'Total coins earned from this ad' })
  coinsEarned: number;

  @ApiProperty({ description: 'User\'s new total balance' })
  newBalance: number;

  @ApiProperty({ description: 'Current watch streak in days' })
  watchStreak: number;

  @ApiPropertyOptional({ description: 'Streak bonus coins if any' })
  streakBonus?: number;
}

/**
 * Response DTO for user's watch stats
 */
export class WatchStatsResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Total coin balance' })
  coinBalance: number;

  @ApiProperty({ description: 'Total ads watched' })
  totalAdsWatched: number;

  @ApiProperty({ description: 'Ads completed (100%)' })
  adsCompleted: number;

  @ApiProperty({ description: 'Current watch streak in days' })
  watchStreak: number;

  @ApiProperty({ description: 'Coins earned today' })
  coinsEarnedToday: number;

  @ApiProperty({ description: 'Daily coin limit' })
  dailyCoinLimit: number;

  @ApiPropertyOptional({ description: 'Active boost event' })
  activeBoostEvent?: {
    name: string;
    multiplier: number;
    endsAt: Date;
  };
}
