import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class NegotiationAiRequestDto {
  @ApiProperty({ description: 'Original asking price' })
  @IsNumber()
  originalPrice: number;

  @ApiProperty({ description: 'Buyer offered price' })
  @IsNumber()
  offeredPrice: number;

  @ApiProperty({ description: 'Product category' })
  @IsString()
  productCategory: string;

  @ApiProperty({ required: false, description: 'Additional context for negotiation' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class ActivateSubscriptionDto {
  @ApiProperty({
    description: 'Subscription plan to activate',
    enum: ['premium', 'pro_business', 'hot_business', 'enterprise'],
  })
  @IsEnum(['premium', 'pro_business', 'hot_business', 'enterprise'] as const)
  plan: 'premium' | 'pro_business' | 'hot_business' | 'enterprise';

  @ApiProperty({
    description: 'Payment method used',
    enum: ['coins', 'card'],
  })
  @IsEnum(['coins', 'card'] as const)
  paymentMethod: 'coins' | 'card';

  @ApiProperty({
    required: false,
    description: 'Paystack reference (required for card payments)',
  })
  @IsOptional()
  @IsString()
  paystackReference?: string;
}

export class NegotiationAiStatusResponseDto {
  @ApiProperty()
  plan: string;

  @ApiProperty()
  subscriptionActive: boolean;

  @ApiProperty()
  negotiationAiEnabled: boolean;

  @ApiProperty()
  dailyUsed: number;

  @ApiProperty()
  dailyLimit: number | 'unlimited';

  @ApiProperty()
  remaining: number | 'unlimited';

  @ApiProperty({ required: false })
  subscriptionExpiry?: Date;
}

export class NegotiationAiAccessResult {
  allowed: boolean;
  status: 'allowed' | 'limit_reached' | 'no_subscription' | 'expired' | 'not_enabled';
  message: string;
  dailyUsed?: number;
  dailyLimit?: number | 'unlimited';
  remaining?: number | 'unlimited';
}
