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
exports.BlockUserDto = exports.ArchiveConversationDto = exports.SendQuickReplyDto = exports.MarkConversationReadDto = exports.MarkMessagesReadDto = exports.UpdateMessageStatusDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const message_entity_1 = require("../entities/message.entity");
class UpdateMessageStatusDto {
}
exports.UpdateMessageStatusDto = UpdateMessageStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New status for the message',
        enum: message_entity_1.MessageStatus,
    }),
    (0, class_validator_1.IsEnum)(message_entity_1.MessageStatus),
    __metadata("design:type", String)
], UpdateMessageStatusDto.prototype, "status", void 0);
class MarkMessagesReadDto {
}
exports.MarkMessagesReadDto = MarkMessagesReadDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Array of message IDs to mark as read', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], MarkMessagesReadDto.prototype, "messageIds", void 0);
class MarkConversationReadDto {
}
exports.MarkConversationReadDto = MarkConversationReadDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Conversation ID to mark as read' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MarkConversationReadDto.prototype, "conversationId", void 0);
class SendQuickReplyDto {
}
exports.SendQuickReplyDto = SendQuickReplyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Conversation ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SendQuickReplyDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quick reply index (0-3) or custom message' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendQuickReplyDto.prototype, "quickReplyContent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Receiver ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SendQuickReplyDto.prototype, "receiverId", void 0);
class ArchiveConversationDto {
}
exports.ArchiveConversationDto = ArchiveConversationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Conversation ID to archive/unarchive' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ArchiveConversationDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether to archive (true) or unarchive (false)' }),
    __metadata("design:type", Boolean)
], ArchiveConversationDto.prototype, "archive", void 0);
class BlockUserDto {
}
exports.BlockUserDto = BlockUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Conversation ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BlockUserDto.prototype, "conversationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether to block (true) or unblock (false)' }),
    __metadata("design:type", Boolean)
], BlockUserDto.prototype, "block", void 0);
//# sourceMappingURL=update-message.dto.js.map