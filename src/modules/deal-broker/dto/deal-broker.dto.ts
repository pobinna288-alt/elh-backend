import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// ════════════════════════════════════════════
// DEAL BROKER DTOs
// ════════════════════════════════════════════

export class CreateDealDto {
  @ApiProperty({ description: 'Seller user ID' })
  @IsUUID()
  sellerId: string;

  @ApiPropertyOptional({ description: 'Ad ID related to the deal' })
  @IsOptional()
  @IsUUID()
  adId?: string;

  @ApiProperty({ description: 'Product/service category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Original asking price' })
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @ApiProperty({ description: 'Buyer offered price' })
  @IsNumber()
  @Min(0)
  offeredPrice: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Target location for the campaign' })
  @IsOptional()
  @IsString()
  targetLocation?: string;

  @ApiPropertyOptional({ description: 'Required attention/views' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  requiredAttention?: number;

  @ApiPropertyOptional({ description: 'Campaign duration in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  campaignDuration?: number;

  @ApiPropertyOptional({ description: 'Buyer budget for the deal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Negotiation deadline' })
  @IsOptional()
  negotiationDeadline?: Date;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDealStatusDto {
  @ApiProperty({
    description: 'New deal status',
    enum: ['accepted', 'rejected', 'counter_offered', 'cancelled'],
  })
  @IsEnum(['accepted', 'rejected', 'counter_offered', 'cancelled'] as const)
  status: 'accepted' | 'rejected' | 'counter_offered' | 'cancelled';

  @ApiPropertyOptional({ description: 'Counter offer price (when countering)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  counterPrice?: number;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ════════════════════════════════════════════
// ALTERNATIVE SELLER FINDER DTOs
// ════════════════════════════════════════════

export class TriggerAlternativeSearchDto {
  @ApiProperty({ description: 'Deal ID that failed negotiation' })
  @IsUUID()
  dealId: string;
}

export class SelectAlternativeSellerDto {
  @ApiProperty({ description: 'Alternative search result ID' })
  @IsUUID()
  searchId: string;

  @ApiProperty({ description: 'Selected seller ID from the results' })
  @IsUUID()
  sellerId: string;
}

// ════════════════════════════════════════════
// RESPONSE DTOs
// ════════════════════════════════════════════

export class MatchedSellerDto {
  @ApiProperty()
  sellerId: string;

  @ApiProperty()
  expectedPrice: number;

  @ApiProperty()
  attentionScore: number;

  @ApiProperty()
  matchScore: number;

  @ApiProperty()
  dealSuccessRate: number;

  @ApiProperty()
  responseSpeed: number;
}

export class AlternativeSearchResultDto {
  @ApiProperty({ enum: ['alternative_found', 'no_alternatives', 'error'] })
  status: 'alternative_found' | 'no_alternatives' | 'error';

  @ApiProperty({ type: [MatchedSellerDto] })
  sellers: MatchedSellerDto[];

  @ApiPropertyOptional()
  searchId?: string;

  @ApiPropertyOptional()
  totalCandidates?: number;

  @ApiPropertyOptional()
  message?: string;
}

export class DealBrokerUsageDto {
  @ApiProperty()
  dailyUsed: number;

  @ApiProperty()
  dailyLimit: number | 'unlimited';

  @ApiProperty()
  remaining: number | 'unlimited';

  @ApiProperty()
  featureName: string;
}

export class DealBrokerAccessResult {
  allowed: boolean;
  status:
    | 'allowed'
    | 'limit_reached'
    | 'no_subscription'
    | 'expired'
    | 'not_enabled'
    | 'access_denied';
  message: string;
  dailyUsed?: number;
  dailyLimit?: number | 'unlimited';
  remaining?: number | 'unlimited';
}
