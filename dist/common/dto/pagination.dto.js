"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchDto = exports.SortOrder = exports.PaginatedResponseDto = exports.PaginationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class PaginationDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
    get safePage() {
        return Math.max(this.page || 1, 1);
    }
    get safeLimit() {
        return Math.min(Math.max(this.limit || 20, 1), 100);
    }
    get skip() {
        return (this.safePage - 1) * this.safeLimit;
    }
}
exports.PaginationDto = PaginationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1, minimum: 1, description: 'Page number (1-indexed)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], PaginationDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: 20,
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page (capped at 100)',
    }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
class PaginatedResponseDto {
    constructor(data, total, page, limit) {
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
exports.PaginatedResponseDto = PaginatedResponseDto;
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "ASC";
    SortOrder["DESC"] = "DESC";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
class SearchDto extends PaginationDto {
    constructor() {
        super(...arguments);
        this.sortBy = 'createdAt';
        this.sortOrder = SortOrder.DESC;
    }
}
exports.SearchDto = SearchDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search query string' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort field', default: 'createdAt' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: SortOrder, default: SortOrder.DESC }),
    (0, class_validator_1.IsEnum)(SortOrder),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=pagination.dto.js.map