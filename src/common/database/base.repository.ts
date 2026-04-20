/**
 * Base Repository
 * 
 * Provides optimized query methods for all entities
 * Includes built-in pagination, caching, and performance tracking
 */
import { Repository, SelectQueryBuilder, FindManyOptions } from 'typeorm';
import { QueryOptimizationService } from '../performance/services/query-optimization.service';
import { PaginatedResponseDto } from '../dto/pagination.dto';

export abstract class BaseRepository<T> extends Repository<T> {
  constructor(
    private queryOptimization: QueryOptimizationService,
  ) {
    super(null, null); // TypeORM will inject properly
  }

  /**
   * Find with automatic pagination
   * Returns paginated response with metadata
   */
  async findPaginated(
    page: number = 1,
    limit: number = 20,
    options?: FindManyOptions<T>,
  ): Promise<PaginatedResponseDto<T>> {
    // Enforce max limit
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    
    const [data, total] = await this.findAndCount({
      ...options,
      take: safeLimit,
      skip: (safePage - 1) * safeLimit,
    });

    return new PaginatedResponseDto(data, total, safePage, safeLimit);
  }

  /**
   * Create optimized query builder with pagination
   */
  createPaginatedQuery(
    alias: string,
    page: number = 1,
    limit: number = 20,
  ): SelectQueryBuilder<T> {
    const qb = this.createQueryBuilder(alias);
    return this.queryOptimization.paginate(qb, page, limit);
  }

  /**
   * Find by IDs efficiently (uses IN clause with index)
   */
  async findByIds(ids: number[]): Promise<T[]> {
    if (ids.length === 0) return [];
    
    return this.createQueryBuilder('entity')
      .whereInIds(ids)
      .getMany();
  }

  /**
   * Check if entity exists (uses COUNT, faster than findOne)
   */
  async exists(conditions: any): Promise<boolean> {
    const count = await this.count({ where: conditions });
    return count > 0;
  }

  /**
   * Soft delete multiple records efficiently
   */
  async softDeleteMany(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    
    await this.createQueryBuilder()
      .softDelete()
      .whereInIds(ids)
      .execute();
  }

  /**
   * Bulk insert with conflict resolution
   */
  async bulkInsert(entities: Partial<T>[]): Promise<void> {
    if (entities.length === 0) return;
    
    await this.createQueryBuilder()
      .insert()
      .values(entities as any)
      .orIgnore() // Skip duplicates
      .execute();
  }
}
