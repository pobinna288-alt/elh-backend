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
exports.WriteResponseDto = exports.WriteDescriptionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class WriteDescriptionDto {
}
exports.WriteDescriptionDto = WriteDescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad title',
        example: 'MacBook Pro 16-inch',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WriteDescriptionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad category',
        example: 'Electronics',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WriteDescriptionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Price',
        example: 1499.99,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], WriteDescriptionDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location',
        example: 'San Francisco',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WriteDescriptionDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Key features or details',
        required: false,
        example: '16GB RAM, 512GB SSD, excellent condition',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WriteDescriptionDto.prototype, "keyFeatures", void 0);
class WriteResponseDto {
}
exports.WriteResponseDto = WriteResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Written ad description',
        example: 'MacBook Pro 16-inch available in San Francisco. 16GB RAM, 512GB SSD, excellent condition. Perfect for everyday use and reliability. Priced at $1,499.99. Contact us today to learn more.'
    }),
    __metadata("design:type", String)
], WriteResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Word count' }),
    __metadata("design:type", Number)
], WriteResponseDto.prototype, "wordCount", void 0);
//# sourceMappingURL=ad-writer.dto.js.map