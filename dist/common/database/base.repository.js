"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const typeorm_1 = require("typeorm");
const pagination_dto_1 = require("../dto/pagination.dto");
class BaseRepository extends typeorm_1.Repository {
    constructor(queryOptimization) {
        super(null, null);
        this.queryOptimization = queryOptimization;
    }
    async findPaginated(page = 1, limit = 20, options) {
        const safeLimit = Math.min(limit, 100);
        const safePage = Math.max(1, page);
        const [data, total] = await this.findAndCount({
            ...options,
            take: safeLimit,
            skip: (safePage - 1) * safeLimit,
        });
        return new pagination_dto_1.PaginatedResponseDto(data, total, safePage, safeLimit);
    }
    createPaginatedQuery(alias, page = 1, limit = 20) {
        const qb = this.createQueryBuilder(alias);
        return this.queryOptimization.paginate(qb, page, limit);
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        return this.createQueryBuilder('entity')
            .whereInIds(ids)
            .getMany();
    }
    async exists(conditions) {
        const count = await this.count({ where: conditions });
        return count > 0;
    }
    async softDeleteMany(ids) {
        if (ids.length === 0)
            return;
        await this.createQueryBuilder()
            .softDelete()
            .whereInIds(ids)
            .execute();
    }
    async bulkInsert(entities) {
        if (entities.length === 0)
            return;
        await this.createQueryBuilder()
            .insert()
            .values(entities)
            .orIgnore()
            .execute();
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map