import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdCategory } from '../../ads/entities/ad.entity';

export class CreateSavedSearchDto {
  @ApiProperty()
  @IsString()
  searchName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ enum: AdCategory, required: false })
  @IsOptional()
  @IsEnum(AdCategory)
  category?: AdCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notificationFrequency?: string;
}

export class CreatePriceAlertDto {
  @ApiProperty()
  @IsString()
  adId: string;

  @ApiProperty()
  @IsNumber()
  targetPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alertFrequency?: string;
}
