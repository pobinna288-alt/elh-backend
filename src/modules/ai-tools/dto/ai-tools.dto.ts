import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SmartCopywriterDto {
  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tone?: string; // professional, casual, funny, urgent
}

export class NegotiationAiDto {
  @ApiProperty()
  @IsNumber()
  originalPrice: number;

  @ApiProperty()
  @IsNumber()
  offeredPrice: number;

  @ApiProperty()
  @IsString()
  productCategory: string;
}

export class CompetitorAnalyzerDto {
  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsNumber()
  yourPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

export class AudienceExpansionDto {
  @ApiProperty()
  @IsString()
  currentCategory: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  currentLocations: string[];
}

export class AdImproverDto {
  @ApiProperty({ description: 'Current ad text to improve' })
  @IsString()
  currentText: string;

  @ApiProperty({ required: false, description: 'Optional ad title or product name' })
  @IsOptional()
  @IsString()
  title?: string;
}

export class MarketSuggestionDto {
  @ApiProperty({ description: 'Product or service name' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Primary category for the ad' })
  @IsString()
  category: string;

  @ApiProperty({ required: false, description: 'Current target locations (optional)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentLocations?: string[];
}
