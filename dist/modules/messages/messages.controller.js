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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const messages_service_1 = require("./messages.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let MessagesController = class MessagesController {
    constructor(messagesService) {
        this.messagesService = messagesService;
    }
    startConversation(startDto, req) {
        return this.messagesService.startConversation(startDto, req.user.id);
    }
    create(createMessageDto, req) {
        return this.messagesService.create(createMessageDto, req.user.id);
    }
    sendQuickReply(dto, req) {
        return this.messagesService.sendQuickReply(dto, req.user.id);
    }
    getQuickReplies() {
        return {
            quickReplies: this.messagesService.getQuickReplies(),
        };
    }
    getConversations(req) {
        return this.messagesService.getConversations(req.user.id);
    }
    getConversationById(conversationId, req) {
        return this.messagesService.getConversationById(conversationId, req.user.id);
    }
    getConversationByUser(otherUserId, req) {
        return this.messagesService.getConversation(req.user.id, otherUserId);
    }
    updateMessageStatus(id, dto, req) {
        return this.messagesService.updateMessageStatus(id, dto.status, req.user.id);
    }
    markAsRead(id, req) {
        return this.messagesService.markAsRead(id, req.user.id);
    }
    markMessagesAsRead(dto, req) {
        return this.messagesService.markMessagesAsRead(dto, req.user.id);
    }
    markConversationAsRead(conversationId, req) {
        return this.messagesService.markConversationAsRead(conversationId, req.user.id);
    }
    getUnreadCount(req) {
        return this.messagesService.getUnreadCount(req.user.id);
    }
    getUnreadCountsByConversation(req) {
        return this.messagesService.getUnreadCountsByConversation(req.user.id);
    }
    getSellerResponseIndicator(sellerId) {
        return this.messagesService.getSellerResponseIndicator(sellerId);
    }
    archiveConversation(conversationId, dto, req) {
        return this.messagesService.archiveConversation(conversationId, req.user.id, dto.archive);
    }
    blockUser(conversationId, dto, req) {
        return this.messagesService.blockUser(conversationId, req.user.id, dto.block);
    }
    remove(id, req) {
        return this.messagesService.remove(id, req.user.id);
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Post)('start-conversation'),
    (0, swagger_1.ApiOperation)({
        summary: 'Start conversation from product',
        description: 'Initializes a chat when buyer clicks "Message Seller" on a product ad'
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Conversation initialized with pre-filled message and product context'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.StartConversationDto, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "startConversation", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateMessageDto, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('quick-reply'),
    (0, swagger_1.ApiOperation)({
        summary: 'Send quick reply',
        description: 'Send one of the predefined quick reply messages'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SendQuickReplyDto, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendQuickReply", null);
__decorate([
    (0, common_1.Get)('quick-replies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available quick reply options' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getQuickReplies", null);
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get user conversations',
        description: 'Returns all conversations with product context and unread counts'
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('conversation/:conversationId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get conversation by ID',
        description: 'Returns conversation with all messages, product card, and quick replies'
    }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getConversationById", null);
__decorate([
    (0, common_1.Get)('conversation/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get conversation with a specific user' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getConversationByUser", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update message status',
        description: 'Update message status for read receipts (sent → delivered → read)'
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateMessageStatusDto, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "updateMessageStatus", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark message as read' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)('mark-read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark multiple messages as read' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.MarkMessagesReadDto, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "markMessagesAsRead", null);
__decorate([
    (0, common_1.Patch)('conversation/:conversationId/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all messages in conversation as read' }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "markConversationAsRead", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get total unread message count',
        description: 'Returns total unread messages for notification badge'
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('unread-counts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get unread counts by conversation',
        description: 'Returns unread counts for each conversation'
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getUnreadCountsByConversation", null);
__decorate([
    (0, common_1.Get)('seller-response/:sellerId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get seller response indicator',
        description: 'Returns average response time and indicator text for a seller'
    }),
    __param(0, (0, common_1.Param)('sellerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "getSellerResponseIndicator", null);
__decorate([
    (0, common_1.Patch)('conversation/:conversationId/archive'),
    (0, swagger_1.ApiOperation)({ summary: 'Archive or unarchive a conversation' }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "archiveConversation", null);
__decorate([
    (0, common_1.Patch)('conversation/:conversationId/block'),
    (0, swagger_1.ApiOperation)({ summary: 'Block or unblock user in conversation' }),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a message' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "remove", null);
exports.MessagesController = MessagesController = __decorate([
    (0, swagger_1.ApiTags)('messages'),
    (0, common_1.Controller)('messages'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map