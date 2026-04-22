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
exports.CreateMessageDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const message_entity_1 = require("../entities/message.entity");
class CreateMessageDto {
}
exports.CreateMessageDto = CreateMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Message content text' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the message receiver' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "receiverId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of the conversation (optional - will create if not exists)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of the product/ad this message relates to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "adId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type of message',
        enum: message_entity_1.MessageType,
        default: message_entity_1.MessageType.TEXT,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(message_entity_1.MessageType),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "messageType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'URL of attached media (image/file)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDto.prototype, "mediaUrl", void 0);
//# sourceMappingURL=create-message.dto.js.map