import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ─── Request DTO ────────────────────────────────────────────

export class AdSuggestionDto {
  @ApiProperty({
    description: 'Original ad title (optional if description is provided)',
    example: 'iPhone 15 Pro Max 256GB',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Original ad description (optional if title is provided)',
    example: 'Selling my iPhone, used for 3 months, good condition.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Ad category for context-aware suggestions',
    example: 'Electronics',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Target audience hint',
    example: 'tech enthusiasts',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetAudience?: string;
}

// ─── Response DTO ───────────────────────────────────────────

export class SuggestedAdCopy {
  @ApiProperty({ description: 'Suggested ad title (if original title was provided)' })
  suggestedTitle?: string;

  @ApiProperty({ description: 'Suggested ad description (if original description was provided)' })
  suggestedDescription?: string;
}

export class AdSuggestionResponseDto {
  @ApiProperty({ description: 'Original title submitted by the user' })
  originalTitle: string | null;

  @ApiProperty({ description: 'Original description submitted by the user' })
  originalDescription: string | null;

  @ApiProperty({
    description: 'Array of AI-generated suggestions (user can pick or ignore)',
    type: [SuggestedAdCopy],
  })
  suggestions: SuggestedAdCopy[];

  @ApiProperty({ description: 'Disclaimer that these are suggestions only' })
  notice: string;
}
