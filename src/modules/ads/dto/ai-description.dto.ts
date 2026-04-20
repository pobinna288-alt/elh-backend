import { IsEnum, IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DescriptionPlan } from '../ai-description.service';

export class GenerateDescriptionDto {
  @ApiProperty({
    description: 'Ad title',
    example: 'iPhone 15 Pro Max',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Ad category',
    example: 'Electronics',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Price',
    example: 999.99,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Location',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Description generation plan',
    enum: DescriptionPlan,
    example: DescriptionPlan.PREMIUM,
  })
  @IsEnum(DescriptionPlan)
  @IsNotEmpty()
  plan: DescriptionPlan;

  @ApiProperty({
    description: 'Additional information for better description',
    required: false,
    example: 'Brand new, sealed, 256GB storage',
  })
  @IsString()
  @IsOptional()
  additionalInfo?: string;
}

export class DescriptionResponseDto {
  @ApiProperty({ description: 'Generated description' })
  description: string;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;

  @ApiProperty({ description: 'Plan used' })
  plan: DescriptionPlan;
}
