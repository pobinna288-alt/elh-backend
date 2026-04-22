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
exports.DealBrokerAccessResult = exports.DealBrokerUsageDto = exports.AlternativeSearchResultDto = exports.MatchedSellerDto = exports.SelectAlternativeSellerDto = exports.TriggerAlternativeSearchDto = exports.UpdateDealStatusDto = exports.CreateDealDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateDealDto {
}
exports.CreateDealDto = CreateDealDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Seller user ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDealDto.prototype, "sellerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Ad ID related to the deal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDealDto.prototype, "adId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product/service category' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDealDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original asking price' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateDealDto.prototype, "originalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Buyer offered price' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateDealDto.prototype, "offeredPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Currency code', default: 'USD' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDealDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Target location for the campaign' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDealDto.prototype, "targetLocation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Required attention/views' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateDealDto.prototype, "requiredAttention", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Campaign duration in days' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateDealDto.prototype, "campaignDuration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Buyer budget for the deal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateDealDto.prototype, "budget", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Negotiation deadline' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CreateDealDto.prototype, "negotiationDeadline", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDealDto.prototype, "notes", void 0);
class UpdateDealStatusDto {
}
exports.UpdateDealStatusDto = UpdateDealStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New deal status',
        enum: ['accepted', 'rejected', 'counter_offered', 'cancelled'],
    }),
    (0, class_validator_1.IsEnum)(['accepted', 'rejected', 'counter_offered', 'cancelled']),
    __metadata("design:type", String)
], UpdateDealStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Counter offer price (when countering)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateDealStatusDto.prototype, "counterPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reason for rejection' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDealStatusDto.prototype, "rejectionReason", void 0);
class TriggerAlternativeSearchDto {
}
exports.TriggerAlternativeSearchDto = TriggerAlternativeSearchDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Deal ID that failed negotiation' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TriggerAlternativeSearchDto.prototype, "dealId", void 0);
class SelectAlternativeSellerDto {
}
exports.SelectAlternativeSellerDto = SelectAlternativeSellerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Alternative search result ID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SelectAlternativeSellerDto.prototype, "searchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Selected seller ID from the results' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SelectAlternativeSellerDto.prototype, "sellerId", void 0);
class MatchedSellerDto {
}
exports.MatchedSellerDto = MatchedSellerDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MatchedSellerDto.prototype, "sellerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MatchedSellerDto.prototype, "expectedPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MatchedSellerDto.prototype, "attentionScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MatchedSellerDto.prototype, "matchScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MatchedSellerDto.prototype, "dealSuccessRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MatchedSellerDto.prototype, "responseSpeed", void 0);
class AlternativeSearchResultDto {
}
exports.AlternativeSearchResultDto = AlternativeSearchResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['alternative_found', 'no_alternatives', 'error'] }),
    __metadata("design:type", String)
], AlternativeSearchResultDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [MatchedSellerDto] }),
    __metadata("design:type", Array)
], AlternativeSearchResultDto.prototype, "sellers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], AlternativeSearchResultDto.prototype, "searchId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], AlternativeSearchResultDto.prototype, "totalCandidates", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], AlternativeSearchResultDto.prototype, "message", void 0);
class DealBrokerUsageDto {
}
exports.DealBrokerUsageDto = DealBrokerUsageDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DealBrokerUsageDto.prototype, "dailyUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DealBrokerUsageDto.prototype, "dailyLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DealBrokerUsageDto.prototype, "remaining", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DealBrokerUsageDto.prototype, "featureName", void 0);
class DealBrokerAccessResult {
}
exports.DealBrokerAccessResult = DealBrokerAccessResult;
//# sourceMappingURL=deal-broker.dto.js.map