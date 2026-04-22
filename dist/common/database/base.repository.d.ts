import { Repository, SelectQueryBuilder, FindManyOptions } from 'typeorm';
import { QueryOptimizationService } from '../performance/services/query-optimization.service';
import { PaginatedResponseDto } from '../dto/pagination.dto';
export declare abstract class BaseRepository<T> extends Repository<T> {
    private queryOptimization;
    constructor(queryOptimization: QueryOptimizationService);
    findPaginated(page?: number, limit?: number, options?: FindManyOptions<T>): Promise<PaginatedResponseDto<T>>;
    createPaginatedQuery(alias: string, page?: number, limit?: number): SelectQueryBuilder<T>;
    findByIds(ids: number[]): Promise<T[]>;
    exists(conditions: any): Promise<boolean>;
    softDeleteMany(ids: number[]): Promise<void>;
    bulkInsert(entities: Partial<T>[]): Promise<void>;
}
