import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Pagination DTO
 * 
 * Standard pagination parameters for all list endpoints
 * Enforces reasonable limits to prevent performance issues
 */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number (1-indexed)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page (capped at 100)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  get safePage(): number {
    return Math.max(this.page || 1, 1);
  }

  get safeLimit(): number {
    return Math.min(Math.max(this.limit || 20, 1), 100);
  }

  get skip(): number {
    return (this.safePage - 1) * this.safeLimit;
  }
}

/**
 * Paginated Response DTO
 * 
 * Standard response format for paginated data
 * Provides metadata for frontend pagination UI
 */
export class PaginatedResponseDto<T> {
  data: T[];

  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;

    const totalPages = Math.ceil(total / limit);

    this.meta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Search DTO
 * 
 * Standard search parameters
 */
export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search query string' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}
