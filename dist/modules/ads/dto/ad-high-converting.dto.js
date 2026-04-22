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
exports.HighConvertingResponseDto = exports.HighConvertingDescriptionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class HighConvertingDescriptionDto {
}
exports.HighConvertingDescriptionDto = HighConvertingDescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad title',
        example: 'Tesla Model 3 Long Range',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], HighConvertingDescriptionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad category',
        example: 'Automobile',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], HighConvertingDescriptionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Price',
        example: 42999,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], HighConvertingDescriptionDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location',
        example: 'Miami',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], HighConvertingDescriptionDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Key features or unique selling points',
        required: false,
        example: 'Low mileage, autopilot, premium interior',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], HighConvertingDescriptionDto.prototype, "keyFeatures", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Include urgency messaging',
        required: false,
        default: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], HighConvertingDescriptionDto.prototype, "urgency", void 0);
class HighConvertingResponseDto {
}
exports.HighConvertingResponseDto = HighConvertingResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'High-converting ad description',
        example: '🚀 DRIVE YOUR DREAM! Tesla Model 3 Long Range Meticulously maintained vehicle offering exceptional reliability, comfort, and value retention. Low mileage, autopilot, premium interior. Highly rated by hundreds of satisfied customers. Conveniently located in Miami at an incredible $42,999.00. ⚡ Limited availability - only a few remain at this unbeatable price! Don\'t wait another minute - message us now to claim yours before it\'s too late! 🔥'
    }),
    __metadata("design:type", String)
], HighConvertingResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Word count' }),
    __metadata("design:type", Number)
], HighConvertingResponseDto.prototype, "wordCount", void 0);
//# sourceMappingURL=ad-high-converting.dto.js.map