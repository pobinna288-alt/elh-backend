import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

/**
 * Query Optimization Service
 * 
 * Provides utilities for optimizing database queries:
 * - Automatic pagination
 * - Field selection (no over-fetching)
 * - Query result limiting
 * - Efficient join strategies
 */
@Injectable()
export class QueryOptimizationService {
  /**
   * Apply pagination to any query builder
   * Uses limit/offset pattern for consistent performance
   */
  paginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 20,
  ): SelectQueryBuilder<T> {
    // Enforce maximum limit to prevent performance issues
    const maxLimit = 100;
    const safeLimit = Math.min(limit, maxLimit);
    const safePage = Math.max(1, page);
    
    const offset = (safePage - 1) * safeLimit;
    
    return queryBuilder
      .take(safeLimit)
      .skip(offset);
  }

  /**
   * Select only specific fields to reduce data transfer
   * Example: selectFields(qb, 'user', ['id', 'name', 'email'])
   */
  selectFields<T>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    fields: string[],
  ): SelectQueryBuilder<T> {
    const selections = fields.map(field => `${alias}.${field}`);
    return queryBuilder.select(selections);
  }

  /**
   * Add optimized search with ILIKE (PostgreSQL)
   * Assumes index exists on search field
   */
  addSearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    field: string,
    searchTerm: string,
  ): SelectQueryBuilder<T> {
    if (!searchTerm || searchTerm.trim() === '') {
      return queryBuilder;
    }
    
    // Use ILIKE for case-insensitive search
    // IMPORTANT: Ensure index exists on this field
    return queryBuilder.andWhere(
      `${field} ILIKE :searchTerm`,
      { searchTerm: `%${searchTerm}%` },
    );
  }

  /**
   * Calculate pagination metadata
   */
  getPaginationMeta(total: number, page: number, limit: number) {
    const maxLimit = 100;
    const safeLimit = Math.min(limit, maxLimit);
    const totalPages = Math.ceil(total / safeLimit);
    
    return {
      total,
      page,
      limit: safeLimit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Efficient count query (uses COUNT(*) with proper indexing)
   */
  async getCount<T>(queryBuilder: SelectQueryBuilder<T>): Promise<number> {
    // Clone the query to avoid modifying original
    const countQuery = queryBuilder.clone();
    
    // Remove select, orderBy, skip, take for accurate count
    return await countQuery.getCount();
  }
}
