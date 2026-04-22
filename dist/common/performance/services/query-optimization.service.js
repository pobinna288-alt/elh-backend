"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOptimizationService = void 0;
const common_1 = require("@nestjs/common");
let QueryOptimizationService = class QueryOptimizationService {
    paginate(queryBuilder, page = 1, limit = 20) {
        const maxLimit = 100;
        const safeLimit = Math.min(limit, maxLimit);
        const safePage = Math.max(1, page);
        const offset = (safePage - 1) * safeLimit;
        return queryBuilder
            .take(safeLimit)
            .skip(offset);
    }
    selectFields(queryBuilder, alias, fields) {
        const selections = fields.map(field => `${alias}.${field}`);
        return queryBuilder.select(selections);
    }
    addSearch(queryBuilder, field, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return queryBuilder;
        }
        return queryBuilder.andWhere(`${field} ILIKE :searchTerm`, { searchTerm: `%${searchTerm}%` });
    }
    getPaginationMeta(total, page, limit) {
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
    async getCount(queryBuilder) {
        const countQuery = queryBuilder.clone();
        return await countQuery.getCount();
    }
};
exports.QueryOptimizationService = QueryOptimizationService;
exports.QueryOptimizationService = QueryOptimizationService = __decorate([
    (0, common_1.Injectable)()
], QueryOptimizationService);
//# sourceMappingURL=query-optimization.service.js.map