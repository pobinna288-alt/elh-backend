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
exports.FilterAdsDto = exports.AdSortBy = exports.UpdateAdDto = exports.CreateAdDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const ad_entity_1 = require("../entities/ad.entity");
class CreateAdDto {
}
exports.CreateAdDto = CreateAdDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'iPhone 15 Pro Max - 256GB',
        description: 'Ad title (max 80 characters)',
        maxLength: 80
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80, { message: 'Title exceeds maximum length of 80 characters' }),
    __metadata("design:type", String)
], CreateAdDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Brand new iPhone 15 Pro Max with warranty.',
        description: 'Ad description (max 500 characters)',
        maxLength: 500
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description exceeds maximum length of 500 characters' }),
    __metadata("design:type", String)
], CreateAdDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ad_entity_1.AdCategory,
        example: ad_entity_1.AdCategory.ELECTRONICS,
        description: 'Category must be one of: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services'
    }),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCategory, { message: 'Invalid category. Allowed: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services' }),
    __metadata("design:type", String)
], CreateAdDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ad_entity_1.AdCondition,
        example: ad_entity_1.AdCondition.NEW,
        description: 'Condition must be "new" or "used"'
    }),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCondition, { message: 'Condition must be "new" or "used"' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAdDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1299.99, description: 'Price (must be positive)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Price cannot be negative' }),
    __metadata("design:type", Number)
], CreateAdDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'USD', description: 'Currency code (e.g., USD, EUR, NGN)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAdDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Lagos, Nigeria', description: 'Location of the item' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAdDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [String],
        description: 'Image URLs (max 5 images, each max 5MB, formats: JPG, PNG, WEBP)',
        maxItems: 5
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(5, { message: 'Maximum 5 images allowed per ad' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateAdDto.prototype, "mediaUrls", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Video URL (only 1 video per ad, MP4 format)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAdDto.prototype, "videoUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Video duration in seconds' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateAdDto.prototype, "videoDuration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Video file size in bytes' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateAdDto.prototype, "videoFileSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateAdDto.prototype, "hasImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateAdDto.prototype, "isVideoAd", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ad_entity_1.AdVideoLength, example: ad_entity_1.AdVideoLength.NORMAL }),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdVideoLength),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAdDto.prototype, "videoLength", void 0);
class UpdateAdDto {
}
exports.UpdateAdDto = UpdateAdDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 80 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80, { message: 'Title exceeds maximum length of 80 characters' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAdDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description exceeds maximum length of 500 characters' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAdDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ad_entity_1.AdCategory }),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCategory, { message: 'Invalid category. Allowed: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAdDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ad_entity_1.AdCondition }),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCondition, { message: 'Condition must be "new" or "used"' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAdDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: 'Price cannot be negative' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateAdDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAdDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateAdDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateAdDto.prototype, "isActive", void 0);
var AdSortBy;
(function (AdSortBy) {
    AdSortBy["NEWEST"] = "newest";
    AdSortBy["OLDEST"] = "oldest";
    AdSortBy["HIGH_PRICE"] = "highPrice";
    AdSortBy["LOW_PRICE"] = "lowPrice";
    AdSortBy["POPULAR"] = "popular";
})(AdSortBy || (exports.AdSortBy = AdSortBy = {}));
class FilterAdsDto extends pagination_dto_1.SearchDto {
    constructor() {
        super(...arguments);
        this.sortBy = AdSortBy.NEWEST;
    }
}
exports.FilterAdsDto = FilterAdsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ad_entity_1.AdCategory }),
    (0, class_validator_1.IsEnum)(ad_entity_1.AdCategory),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterAdsDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], FilterAdsDto.prototype, "minPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], FilterAdsDto.prototype, "maxPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterAdsDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: AdSortBy, default: AdSortBy.NEWEST }),
    (0, class_validator_1.IsEnum)(AdSortBy),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterAdsDto.prototype, "sortBy", void 0);
//# sourceMappingURL=ad.dto.js.map