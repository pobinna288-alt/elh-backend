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
exports.CoinsResponseDto = exports.AddCoinsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AddCoinsDto {
}
exports.AddCoinsDto = AddCoinsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount of coins to add',
        example: 100,
        minimum: 1
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AddCoinsDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for adding coins (for logging)',
        example: 'purchase',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddCoinsDto.prototype, "reason", void 0);
class CoinsResponseDto {
}
exports.CoinsResponseDto = CoinsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], CoinsResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message' }),
    __metadata("design:type", String)
], CoinsResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Updated coin balance' }),
    __metadata("design:type", Number)
], CoinsResponseDto.prototype, "coins", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID' }),
    __metadata("design:type", String)
], CoinsResponseDto.prototype, "userId", void 0);
//# sourceMappingURL=coins.dto.js.map