import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, IsEnum, IsString } from 'class-validator';

export class UnlockPremiumDto {
  @ApiProperty({
    description: 'Payment method for premium activation',
    enum: ['card', 'coins'],
    example: 'coins',
  })
  @IsEnum(['card', 'coins'] as any)
  paymentMethod: 'card' | 'coins';

  @ApiProperty({
    description: 'Paystack transaction reference (required when paymentMethod = card)',
    required: false,
  })
  @IsOptional()
  @IsString()
  paystackReference?: string;

  @ApiProperty({ 
    description: 'Premium duration in days',
    example: 30,
    required: false,
    default: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;
}

export class PremiumActivationResponseDto {
  @ApiProperty({ example: 'active', description: 'Subscription status after activation' })
  subscription_status: string;

  @ApiProperty({ example: 'premium', description: 'Activated plan name' })
  plan: string;

  @ApiProperty({ example: 'coins', description: 'Payment method used (card or coins)' })
  payment_method: string;

  @ApiProperty({ description: 'Premium plan expiry date' })
  expiry_date: Date;

  @ApiProperty({ description: 'Remaining coin balance after activation' })
  remaining_coins: number;
}
