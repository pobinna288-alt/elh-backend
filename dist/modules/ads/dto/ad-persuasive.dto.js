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
exports.PersuasiveResponseDto = exports.PersuasiveDescriptionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class PersuasiveDescriptionDto {
}
exports.PersuasiveDescriptionDto = PersuasiveDescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad title',
        example: 'iPhone 15 Pro Max 256GB',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PersuasiveDescriptionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad category',
        example: 'Electronics',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PersuasiveDescriptionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Price',
        example: 1199.99,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PersuasiveDescriptionDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location',
        example: 'Los Angeles',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PersuasiveDescriptionDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Key features or selling points',
        required: false,
        example: 'Brand new, sealed, with warranty',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PersuasiveDescriptionDto.prototype, "keyFeatures", void 0);
class PersuasiveResponseDto {
}
exports.PersuasiveResponseDto = PersuasiveResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Persuasive ad description',
        example: '📱 iPhone 15 Pro Max 256GB - Brand new, sealed, with warranty. Experience cutting-edge technology that enhances your daily productivity and entertainment. Located in Los Angeles and priced at $1,199.99. Don\'t miss out - contact us today and make it yours! ⚡'
    }),
    __metadata("design:type", String)
], PersuasiveResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Word count' }),
    __metadata("design:type", Number)
], PersuasiveResponseDto.prototype, "wordCount", void 0);
//# sourceMappingURL=ad-persuasive.dto.js.map