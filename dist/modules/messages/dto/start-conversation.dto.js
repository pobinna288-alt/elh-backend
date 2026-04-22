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
exports.ConversationInitResponse = exports.StartConversationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class StartConversationDto {
}
exports.StartConversationDto = StartConversationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the product/ad to start conversation about' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], StartConversationDto.prototype, "adId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional custom initial message (otherwise pre-filled message is used)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartConversationDto.prototype, "initialMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether to auto-send the pre-filled message or just return it' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], StartConversationDto.prototype, "autoSend", void 0);
class ConversationInitResponse {
}
exports.ConversationInitResponse = ConversationInitResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Conversation ID' }),
    __metadata("design:type", String)
], ConversationInitResponse.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product preview card data' }),
    __metadata("design:type", Object)
], ConversationInitResponse.prototype, "productCard", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pre-filled message template' }),
    __metadata("design:type", String)
], ConversationInitResponse.prototype, "preFilledMessage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quick reply suggestions', type: [String] }),
    __metadata("design:type", Array)
], ConversationInitResponse.prototype, "quickReplies", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Seller response indicator text' }),
    __metadata("design:type", String)
], ConversationInitResponse.prototype, "sellerResponseIndicator", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Seller average response time in seconds' }),
    __metadata("design:type", Number)
], ConversationInitResponse.prototype, "sellerAverageResponseTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether message was auto-sent' }),
    __metadata("design:type", Boolean)
], ConversationInitResponse.prototype, "messageSent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Initial message ID (if sent)' }),
    __metadata("design:type", String)
], ConversationInitResponse.prototype, "messageId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Conversation message history' }),
    __metadata("design:type", Array)
], ConversationInitResponse.prototype, "messages", void 0);
//# sourceMappingURL=start-conversation.dto.js.map