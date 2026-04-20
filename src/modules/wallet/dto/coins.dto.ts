import { IsNumber, IsPositive, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCoinsDto {
  @ApiProperty({ 
    description: 'Amount of coins to add', 
    example: 100,
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;

  @ApiProperty({ 
    description: 'Reason for adding coins (for logging)',
    example: 'purchase',
    required: false
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CoinsResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Updated coin balance' })
  coins: number;

  @ApiProperty({ description: 'User ID' })
  userId: string;
}
