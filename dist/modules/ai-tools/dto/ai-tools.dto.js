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
exports.MarketSuggestionDto = exports.AdImproverDto = exports.AudienceExpansionDto = exports.CompetitorAnalyzerDto = exports.NegotiationAiDto = exports.SmartCopywriterDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SmartCopywriterDto {
}
exports.SmartCopywriterDto = SmartCopywriterDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmartCopywriterDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmartCopywriterDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmartCopywriterDto.prototype, "targetAudience", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmartCopywriterDto.prototype, "tone", void 0);
class NegotiationAiDto {
}
exports.NegotiationAiDto = NegotiationAiDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], NegotiationAiDto.prototype, "originalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], NegotiationAiDto.prototype, "offeredPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NegotiationAiDto.prototype, "productCategory", void 0);
class CompetitorAnalyzerDto {
}
exports.CompetitorAnalyzerDto = CompetitorAnalyzerDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompetitorAnalyzerDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CompetitorAnalyzerDto.prototype, "yourPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompetitorAnalyzerDto.prototype, "location", void 0);
class AudienceExpansionDto {
}
exports.AudienceExpansionDto = AudienceExpansionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AudienceExpansionDto.prototype, "currentCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AudienceExpansionDto.prototype, "currentLocations", void 0);
class AdImproverDto {
}
exports.AdImproverDto = AdImproverDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current ad text to improve' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdImproverDto.prototype, "currentText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Optional ad title or product name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdImproverDto.prototype, "title", void 0);
class MarketSuggestionDto {
}
exports.MarketSuggestionDto = MarketSuggestionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product or service name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarketSuggestionDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Primary category for the ad' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarketSuggestionDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Current target locations (optional)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MarketSuggestionDto.prototype, "currentLocations", void 0);
//# sourceMappingURL=ai-tools.dto.js.map