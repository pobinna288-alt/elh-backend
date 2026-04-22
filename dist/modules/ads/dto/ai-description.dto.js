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
exports.DescriptionResponseDto = exports.GenerateDescriptionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const ai_description_service_1 = require("../ai-description.service");
class GenerateDescriptionDto {
}
exports.GenerateDescriptionDto = GenerateDescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad title',
        example: 'iPhone 15 Pro Max',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GenerateDescriptionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad category',
        example: 'Electronics',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GenerateDescriptionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Price',
        example: 999.99,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GenerateDescriptionDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location',
        example: 'New York',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GenerateDescriptionDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description generation plan',
        enum: ai_description_service_1.DescriptionPlan,
        example: ai_description_service_1.DescriptionPlan.PREMIUM,
    }),
    (0, class_validator_1.IsEnum)(ai_description_service_1.DescriptionPlan),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GenerateDescriptionDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Additional information for better description',
        required: false,
        example: 'Brand new, sealed, 256GB storage',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateDescriptionDto.prototype, "additionalInfo", void 0);
class DescriptionResponseDto {
}
exports.DescriptionResponseDto = DescriptionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Generated description' }),
    __metadata("design:type", String)
], DescriptionResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Word count' }),
    __metadata("design:type", Number)
], DescriptionResponseDto.prototype, "wordCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Plan used' }),
    __metadata("design:type", String)
], DescriptionResponseDto.prototype, "plan", void 0);
//# sourceMappingURL=ai-description.dto.js.map