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
exports.NegotiationAiAccessResult = exports.NegotiationAiStatusResponseDto = exports.ActivateSubscriptionDto = exports.NegotiationAiRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class NegotiationAiRequestDto {
}
exports.NegotiationAiRequestDto = NegotiationAiRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original asking price' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], NegotiationAiRequestDto.prototype, "originalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Buyer offered price' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], NegotiationAiRequestDto.prototype, "offeredPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product category' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NegotiationAiRequestDto.prototype, "productCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Additional context for negotiation' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NegotiationAiRequestDto.prototype, "context", void 0);
class ActivateSubscriptionDto {
}
exports.ActivateSubscriptionDto = ActivateSubscriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Subscription plan to activate',
        enum: ['premium', 'pro_business', 'hot_business', 'enterprise'],
    }),
    (0, class_validator_1.IsEnum)(['premium', 'pro_business', 'hot_business', 'enterprise']),
    __metadata("design:type", String)
], ActivateSubscriptionDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method used',
        enum: ['coins', 'card'],
    }),
    (0, class_validator_1.IsEnum)(['coins', 'card']),
    __metadata("design:type", String)
], ActivateSubscriptionDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        description: 'Paystack reference (required for card payments)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActivateSubscriptionDto.prototype, "paystackReference", void 0);
class NegotiationAiStatusResponseDto {
}
exports.NegotiationAiStatusResponseDto = NegotiationAiStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], NegotiationAiStatusResponseDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], NegotiationAiStatusResponseDto.prototype, "subscriptionActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], NegotiationAiStatusResponseDto.prototype, "negotiationAiEnabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], NegotiationAiStatusResponseDto.prototype, "dailyUsed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], NegotiationAiStatusResponseDto.prototype, "dailyLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], NegotiationAiStatusResponseDto.prototype, "remaining", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], NegotiationAiStatusResponseDto.prototype, "subscriptionExpiry", void 0);
class NegotiationAiAccessResult {
}
exports.NegotiationAiAccessResult = NegotiationAiAccessResult;
//# sourceMappingURL=negotiation-ai.dto.js.map