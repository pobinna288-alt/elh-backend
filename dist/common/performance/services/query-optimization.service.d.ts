import { SelectQueryBuilder } from 'typeorm';
export declare class QueryOptimizationService {
    paginate<T>(queryBuilder: SelectQueryBuilder<T>, page?: number, limit?: number): SelectQueryBuilder<T>;
    selectFields<T>(queryBuilder: SelectQueryBuilder<T>, alias: string, fields: string[]): SelectQueryBuilder<T>;
    addSearch<T>(queryBuilder: SelectQueryBuilder<T>, field: string, searchTerm: string): SelectQueryBuilder<T>;
    getPaginationMeta(total: number, page: number, limit: number): {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    getCount<T>(queryBuilder: SelectQueryBuilder<T>): Promise<number>;
}
