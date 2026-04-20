import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AdCategory } from '../../ads/entities/ad.entity';

/**
 * Sort options for search results
 */
export enum SearchSortBy {
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_LOW = 'price_low',
  PRICE_HIGH = 'price_high',
  POPULARITY = 'popularity',
  TRENDING = 'trending',
}

/**
 * Main search request DTO
 * Supports full-text search, filtering, and pagination
 */
export class SearchAdsDto {
  @ApiProperty({
    description: 'Search query - searches in title, description, and category',
    example: 'macbook pro',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1, { message: 'Search query must be at least 1 character' })
  @MaxLength(200, { message: 'Search query cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: AdCategory,
    example: AdCategory.ELECTRONICS,
  })
  @IsOptional()
  @IsEnum(AdCategory)
  category?: AdCategory;

  @ApiPropertyOptional({
    description: 'Filter by multiple categories',
    type: [String],
    example: ['Electronics', 'Phones'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AdCategory, { each: true })
  categories?: AdCategory[];

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by location (supports partial match)',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({
    description: 'Sort order for results',
    enum: SearchSortBy,
    default: SearchSortBy.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy = SearchSortBy.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page (max 100)',
    example: 20,
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (for infinite scroll)',
    example: 'eyJ0aW1lc3RhbXAiOjE3MDk2NDAwMDB9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Include premium/featured ads first',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  boostPremium?: boolean = true;

  @ApiPropertyOptional({
    description: 'Only show ads with images',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasImage?: boolean;

  @ApiPropertyOptional({
    description: 'Only show video ads',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVideoAd?: boolean;

  @ApiPropertyOptional({
    description: 'Enable fuzzy matching for typo tolerance',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  fuzzyMatch?: boolean = true;
}

/**
 * Autocomplete/Suggestions request DTO
 */
export class SearchSuggestionsDto {
  @ApiProperty({
    description: 'Partial query for autocomplete',
    example: 'mac',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Query must be at least 2 characters for suggestions' })
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions',
    default: 10,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter suggestions by category',
    enum: AdCategory,
  })
  @IsOptional()
  @IsEnum(AdCategory)
  category?: AdCategory;
}

/**
 * Trending searches request DTO
 */
export class TrendingSearchesDto {
  @ApiPropertyOptional({
    description: 'Number of trending searches to return',
    default: 10,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Time window for trending (hours)',
    default: 24,
    maximum: 168,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(168)
  timeWindowHours?: number = 24;
}

/**
 * Single search result item
 */
export class SearchResultItemDto {
  @ApiProperty({ description: 'Ad ID' })
  id: string;

  @ApiProperty({ description: 'Ad title' })
  title: string;

  @ApiProperty({ description: 'Ad description' })
  description: string;

  @ApiProperty({ description: 'Ad category', enum: AdCategory })
  category: AdCategory;

  @ApiProperty({ description: 'Ad price' })
  price: number;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Ad location' })
  location: string;

  @ApiPropertyOptional({ description: 'Media URLs', type: [String] })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'View count' })
  views: number;

  @ApiProperty({ description: 'Like count' })
  likes: number;

  @ApiProperty({ description: 'Is premium ad' })
  isPremium: boolean;

  @ApiProperty({ description: 'Is featured ad' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Is video ad' })
  isVideoAd: boolean;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Relevance score (0-1)' })
  relevanceScore: number;

  @ApiPropertyOptional({ description: 'Highlighted title with matches' })
  highlightedTitle?: string;

  @ApiPropertyOptional({ description: 'Highlighted description snippet' })
  highlightedDescription?: string;
}

/**
 * Search response DTO
 */
export class SearchResponseDto {
  @ApiProperty({ description: 'Search was successful' })
  success: boolean;

  @ApiProperty({ description: 'Search results', type: [SearchResultItemDto] })
  results: SearchResultItemDto[];

  @ApiProperty({ description: 'Total number of matching ads' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Results per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has more results' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Cursor for next page' })
  nextCursor?: string;

  @ApiProperty({ description: 'Search execution time in milliseconds' })
  executionTimeMs: number;

  @ApiPropertyOptional({ description: 'Suggested alternative queries' })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Applied filters summary' })
  appliedFilters?: Record<string, any>;
}

/**
 * Suggestion response DTO
 */
export class SuggestionsResponseDto {
  @ApiProperty({ description: 'Request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Autocomplete suggestions', type: [String] })
  suggestions: string[];

  @ApiPropertyOptional({ description: 'Category-specific suggestions' })
  categorySuggestions?: {
    category: string;
    suggestions: string[];
  }[];

  @ApiProperty({ description: 'Execution time in milliseconds' })
  executionTimeMs: number;
}

/**
 * Trending searches response DTO
 */
export class TrendingResponseDto {
  @ApiProperty({ description: 'Request was successful' })
  success: boolean;

  @ApiProperty({
    description: 'Trending search terms with counts',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        term: { type: 'string' },
        count: { type: 'number' },
        trend: { type: 'string', enum: ['rising', 'stable', 'falling'] },
      },
    },
  })
  trending: {
    term: string;
    count: number;
    trend: 'rising' | 'stable' | 'falling';
  }[];

  @ApiProperty({ description: 'Time window used (hours)' })
  timeWindowHours: number;

  @ApiProperty({ description: 'Execution time in milliseconds' })
  executionTimeMs: number;
}

/**
 * Search analytics event DTO (internal use)
 */
export class SearchAnalyticsDto {
  query: string;
  userId?: string;
  resultsCount: number;
  executionTimeMs: number;
  filters?: Record<string, any>;
  clickedAdId?: string;
  timestamp: Date;
  sessionId?: string;
}
