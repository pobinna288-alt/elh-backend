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
exports.AdSuggestionResponseDto = exports.SuggestedAdCopy = exports.AdSuggestionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AdSuggestionDto {
}
exports.AdSuggestionDto = AdSuggestionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Original ad title (optional if description is provided)',
        example: 'iPhone 15 Pro Max 256GB',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AdSuggestionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Original ad description (optional if title is provided)',
        example: 'Selling my iPhone, used for 3 months, good condition.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], AdSuggestionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad category for context-aware suggestions',
        example: 'Electronics',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdSuggestionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target audience hint',
        example: 'tech enthusiasts',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdSuggestionDto.prototype, "targetAudience", void 0);
class SuggestedAdCopy {
}
exports.SuggestedAdCopy = SuggestedAdCopy;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Suggested ad title (if original title was provided)' }),
    __metadata("design:type", String)
], SuggestedAdCopy.prototype, "suggestedTitle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Suggested ad description (if original description was provided)' }),
    __metadata("design:type", String)
], SuggestedAdCopy.prototype, "suggestedDescription", void 0);
class AdSuggestionResponseDto {
}
exports.AdSuggestionResponseDto = AdSuggestionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original title submitted by the user' }),
    __metadata("design:type", String)
], AdSuggestionResponseDto.prototype, "originalTitle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original description submitted by the user' }),
    __metadata("design:type", String)
], AdSuggestionResponseDto.prototype, "originalDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of AI-generated suggestions (user can pick or ignore)',
        type: [SuggestedAdCopy],
    }),
    __metadata("design:type", Array)
], AdSuggestionResponseDto.prototype, "suggestions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Disclaimer that these are suggestions only' }),
    __metadata("design:type", String)
], AdSuggestionResponseDto.prototype, "notice", void 0);
//# sourceMappingURL=ad-suggestion.dto.js.map