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
exports.PremiumActivationResponseDto = exports.UnlockPremiumDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UnlockPremiumDto {
}
exports.UnlockPremiumDto = UnlockPremiumDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method for premium activation',
        enum: ['card', 'coins'],
        example: 'coins',
    }),
    (0, class_validator_1.IsEnum)(['card', 'coins']),
    __metadata("design:type", String)
], UnlockPremiumDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Paystack transaction reference (required when paymentMethod = card)',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnlockPremiumDto.prototype, "paystackReference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Premium duration in days',
        example: 30,
        required: false,
        default: 30
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UnlockPremiumDto.prototype, "durationDays", void 0);
class PremiumActivationResponseDto {
}
exports.PremiumActivationResponseDto = PremiumActivationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'active', description: 'Subscription status after activation' }),
    __metadata("design:type", String)
], PremiumActivationResponseDto.prototype, "subscription_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'premium', description: 'Activated plan name' }),
    __metadata("design:type", String)
], PremiumActivationResponseDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'coins', description: 'Payment method used (card or coins)' }),
    __metadata("design:type", String)
], PremiumActivationResponseDto.prototype, "payment_method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Premium plan expiry date' }),
    __metadata("design:type", Date)
], PremiumActivationResponseDto.prototype, "expiry_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Remaining coin balance after activation' }),
    __metadata("design:type", Number)
], PremiumActivationResponseDto.prototype, "remaining_coins", void 0);
//# sourceMappingURL=premium.dto.js.map