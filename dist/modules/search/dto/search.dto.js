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
exports.SearchAnalyticsDto = exports.TrendingResponseDto = exports.SuggestionsResponseDto = exports.SearchResponseDto = exports.SearchResultItemDto = exports.TrendingSearchesDto = exports.SearchSuggestionsDto = exports.SearchAdsDto = exports.SearchSortBy = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const ad_entity_1 = require("../../ads/entities/ad.entity");
var SearchSortBy;
(function (SearchSortBy) {
    SearchSortBy["RELEVANCE"] = "relevance";
    SearchSortBy["NEWEST"] = "newest";
    SearchSortBy["OLDEST"] = "oldest";
    SearchSortBy["PRICE_LOW"] = "price_low";
    SearchSortBy["PRICE_HIGH"] = "price_high";
    SearchSortBy["POPULARITY"] = "popularity";
    SearchSortBy["TRENDING"] = "trending";
})(SearchSortBy || (exports.SearchSortBy = SearchSortBy = {}));
class SearchAdsDto {
    constructor() {
        this.sortBy = SearchSortBy.RELEVANCE;
        this.page = 1;
        this.limit = 20;
        this.boostPremium = true;
        this.fuzzyMatch = true;
    }
}
exports.SearchAdsDto = SearchAdsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search query - searches in title, description, and category',
        example: 'macbook pro',
        minLength: 1,
        maxLength: 200,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Search query must be at least 1 character' }),
    (0, class_validator_1.MaxLength)(200, { message: 'Search query cannot exceed 200 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], SearchAdsDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by category',
        enum: ad_entity_1.AdCategory,
        example: ad_entity_1.AdCategory.ELECTRONICS,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCategory),
    __metadata("design:type", String)
], SearchAdsDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by multiple categories',
        type: [String],
        example: ['Electronics', 'Phones'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCategory, { each: true }),
    __metadata("design:type", Array)
], SearchAdsDto.prototype, "categories", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Minimum price filter',
        example: 100,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SearchAdsDto.prototype, "minPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Maximum price filter',
        example: 5000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SearchAdsDto.prototype, "maxPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by location (supports partial match)',
        example: 'New York',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SearchAdsDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order for results',
        enum: SearchSortBy,
        default: SearchSortBy.RELEVANCE,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SearchSortBy),
    __metadata("design:type", String)
], SearchAdsDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Page number (1-based)',
        example: 1,
        default: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SearchAdsDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of results per page (max 100)',
        example: 20,
        default: 20,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], SearchAdsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Cursor for pagination (for infinite scroll)',
        example: 'eyJ0aW1lc3RhbXAiOjE3MDk2NDAwMDB9',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchAdsDto.prototype, "cursor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Include premium/featured ads first',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SearchAdsDto.prototype, "boostPremium", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Only show ads with images',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SearchAdsDto.prototype, "hasImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Only show video ads',
        default: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SearchAdsDto.prototype, "isVideoAd", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Enable fuzzy matching for typo tolerance',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SearchAdsDto.prototype, "fuzzyMatch", void 0);
class SearchSuggestionsDto {
    constructor() {
        this.limit = 10;
    }
}
exports.SearchSuggestionsDto = SearchSuggestionsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Partial query for autocomplete',
        example: 'mac',
        minLength: 2,
        maxLength: 50,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Query must be at least 2 characters for suggestions' }),
    (0, class_validator_1.MaxLength)(50),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], SearchSuggestionsDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Maximum number of suggestions',
        default: 10,
        maximum: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(20),
    __metadata("design:type", Number)
], SearchSuggestionsDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter suggestions by category',
        enum: ad_entity_1.AdCategory,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCategory),
    __metadata("design:type", String)
], SearchSuggestionsDto.prototype, "category", void 0);
class TrendingSearchesDto {
    constructor() {
        this.limit = 10;
        this.timeWindowHours = 24;
    }
}
exports.TrendingSearchesDto = TrendingSearchesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of trending searches to return',
        default: 10,
        maximum: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], TrendingSearchesDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Time window for trending (hours)',
        default: 24,
        maximum: 168,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(168),
    __metadata("design:type", Number)
], TrendingSearchesDto.prototype, "timeWindowHours", void 0);
class SearchResultItemDto {
}
exports.SearchResultItemDto = SearchResultItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad ID' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad title' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad description' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad category', enum: ad_entity_1.AdCategory }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad price' }),
    __metadata("design:type", Number)
], SearchResultItemDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Currency code' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad location' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Media URLs', type: [String] }),
    __metadata("design:type", Array)
], SearchResultItemDto.prototype, "mediaUrls", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Thumbnail URL' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'View count' }),
    __metadata("design:type", Number)
], SearchResultItemDto.prototype, "views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Like count' }),
    __metadata("design:type", Number)
], SearchResultItemDto.prototype, "likes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is premium ad' }),
    __metadata("design:type", Boolean)
], SearchResultItemDto.prototype, "isPremium", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is featured ad' }),
    __metadata("design:type", Boolean)
], SearchResultItemDto.prototype, "isFeatured", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Is video ad' }),
    __metadata("design:type", Boolean)
], SearchResultItemDto.prototype, "isVideoAd", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Author ID' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "authorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Creation timestamp' }),
    __metadata("design:type", Date)
], SearchResultItemDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Relevance score (0-1)' }),
    __metadata("design:type", Number)
], SearchResultItemDto.prototype, "relevanceScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Highlighted title with matches' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "highlightedTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Highlighted description snippet' }),
    __metadata("design:type", String)
], SearchResultItemDto.prototype, "highlightedDescription", void 0);
class SearchResponseDto {
}
exports.SearchResponseDto = SearchResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Search was successful' }),
    __metadata("design:type", Boolean)
], SearchResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Search results', type: [SearchResultItemDto] }),
    __metadata("design:type", Array)
], SearchResponseDto.prototype, "results", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of matching ads' }),
    __metadata("design:type", Number)
], SearchResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current page number' }),
    __metadata("design:type", Number)
], SearchResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Results per page' }),
    __metadata("design:type", Number)
], SearchResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of pages' }),
    __metadata("design:type", Number)
], SearchResponseDto.prototype, "totalPages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Has more results' }),
    __metadata("design:type", Boolean)
], SearchResponseDto.prototype, "hasMore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cursor for next page' }),
    __metadata("design:type", String)
], SearchResponseDto.prototype, "nextCursor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Search execution time in milliseconds' }),
    __metadata("design:type", Number)
], SearchResponseDto.prototype, "executionTimeMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Suggested alternative queries' }),
    __metadata("design:type", Array)
], SearchResponseDto.prototype, "suggestions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Applied filters summary' }),
    __metadata("design:type", Object)
], SearchResponseDto.prototype, "appliedFilters", void 0);
class SuggestionsResponseDto {
}
exports.SuggestionsResponseDto = SuggestionsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Request was successful' }),
    __metadata("design:type", Boolean)
], SuggestionsResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Autocomplete suggestions', type: [String] }),
    __metadata("design:type", Array)
], SuggestionsResponseDto.prototype, "suggestions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category-specific suggestions' }),
    __metadata("design:type", Array)
], SuggestionsResponseDto.prototype, "categorySuggestions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Execution time in milliseconds' }),
    __metadata("design:type", Number)
], SuggestionsResponseDto.prototype, "executionTimeMs", void 0);
class TrendingResponseDto {
}
exports.TrendingResponseDto = TrendingResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Request was successful' }),
    __metadata("design:type", Boolean)
], TrendingResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
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
    }),
    __metadata("design:type", Array)
], TrendingResponseDto.prototype, "trending", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Time window used (hours)' }),
    __metadata("design:type", Number)
], TrendingResponseDto.prototype, "timeWindowHours", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Execution time in milliseconds' }),
    __metadata("design:type", Number)
], TrendingResponseDto.prototype, "executionTimeMs", void 0);
class SearchAnalyticsDto {
}
exports.SearchAnalyticsDto = SearchAnalyticsDto;
//# sourceMappingURL=search.dto.js.map