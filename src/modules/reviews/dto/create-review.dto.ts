import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Rating (1-5 stars)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Review title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Review text', required: false })
  @IsOptional()
  @IsString()
  reviewText?: string;

  @ApiProperty({ description: 'Ad ID being reviewed' })
  @IsString()
  adId: string;

  @ApiProperty({ description: 'Seller ID being reviewed' })
  @IsString()
  sellerId: string;
}
