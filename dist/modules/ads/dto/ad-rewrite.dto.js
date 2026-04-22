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
exports.RewriteResponseDto = exports.RewriteDescriptionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RewriteDescriptionDto {
}
exports.RewriteDescriptionDto = RewriteDescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User text to rewrite into ad description',
        example: 'I have this amazing phone for sale! Its brand new and never been used!! Contact me ASAP!!!',
        maxLength: 1000,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], RewriteDescriptionDto.prototype, "text", void 0);
class RewriteResponseDto {
}
exports.RewriteResponseDto = RewriteResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Rewritten description',
        example: 'Brand new phone for sale. Never used. Excellent condition. Available for immediate purchase.'
    }),
    __metadata("design:type", String)
], RewriteResponseDto.prototype, "rewrittenText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Word count' }),
    __metadata("design:type", Number)
], RewriteResponseDto.prototype, "wordCount", void 0);
//# sourceMappingURL=ad-rewrite.dto.js.map