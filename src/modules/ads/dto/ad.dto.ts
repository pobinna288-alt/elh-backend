import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { SearchDto } from '../../../common/dto/pagination.dto';
import { AdCategory, AdCondition, AdVideoLength } from '../entities/ad.entity';

/**
 * Create Ad DTO with strict validation
 * Backend enforces all rules - frontend cannot bypass
 */
export class CreateAdDto {
  @ApiProperty({ 
    example: 'iPhone 15 Pro Max - 256GB', 
    description: 'Ad title (max 80 characters)',
    maxLength: 80
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80, { message: 'Title exceeds maximum length of 80 characters' })
  title: string;

  @ApiProperty({
    example: 'Brand new iPhone 15 Pro Max with warranty.',
    description: 'Ad description (max 500 characters)',
    maxLength: 500
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description exceeds maximum length of 500 characters' })
  description?: string;

  @ApiProperty({ 
    enum: AdCategory, 
    example: AdCategory.ELECTRONICS,
    description: 'Category must be one of: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services'
  })
  @IsEnum(AdCategory, { message: 'Invalid category. Allowed: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services' })
  category: AdCategory;

  @ApiProperty({
    enum: AdCondition,
    example: AdCondition.NEW,
    description: 'Condition must be "new" or "used"'
  })
  @IsEnum(AdCondition, { message: 'Condition must be "new" or "used"' })
  @IsOptional()
  condition?: AdCondition;

  @ApiProperty({ example: 1299.99, description: 'Price (must be positive)' })
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  @ApiProperty({ example: 'USD', description: 'Currency code (e.g., USD, EUR, NGN)' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'Lagos, Nigeria', description: 'Location of the item' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ 
    type: [String],
    description: 'Image URLs (max 5 images, each max 5MB, formats: JPG, PNG, WEBP)',
    maxItems: 5
  })
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed per ad' })
  @IsOptional()
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Video URL (only 1 video per ad, MP4 format)' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Video duration in seconds' })
  @IsNumber()
  @IsOptional()
  videoDuration?: number;

  @ApiPropertyOptional({ description: 'Video file size in bytes' })
  @IsNumber()
  @IsOptional()
  videoFileSize?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasImage?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isVideoAd?: boolean;

  @ApiPropertyOptional({ enum: AdVideoLength, example: AdVideoLength.NORMAL })
  @IsEnum(AdVideoLength)
  @IsOptional()
  videoLength?: AdVideoLength;
}

export class UpdateAdDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsString()
  @MaxLength(80, { message: 'Title exceeds maximum length of 80 characters' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @MaxLength(500, { message: 'Description exceeds maximum length of 500 characters' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: AdCategory })
  @IsEnum(AdCategory, { message: 'Invalid category. Allowed: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services' })
  @IsOptional()
  category?: AdCategory;

  @ApiPropertyOptional({ enum: AdCondition })
  @IsEnum(AdCondition, { message: 'Condition must be "new" or "used"' })
  @IsOptional()
  condition?: AdCondition;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export enum AdSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  HIGH_PRICE = 'highPrice',
  LOW_PRICE = 'lowPrice',
  POPULAR = 'popular',
}

export class FilterAdsDto extends SearchDto {
  @ApiPropertyOptional({ enum: AdCategory })
  @IsEnum(AdCategory)
  @IsOptional()
  category?: AdCategory;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ enum: AdSortBy, default: AdSortBy.NEWEST })
  @IsEnum(AdSortBy)
  @IsOptional()
  sortBy?: AdSortBy = AdSortBy.NEWEST;
}
