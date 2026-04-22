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
exports.NegotiationChat = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let NegotiationChat = class NegotiationChat {
};
exports.NegotiationChat = NegotiationChat;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NegotiationChat.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deal_id' }),
    __metadata("design:type", String)
], NegotiationChat.prototype, "dealId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], NegotiationChat.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id' }),
    __metadata("design:type", user_entity_1.User)
], NegotiationChat.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_id' }),
    __metadata("design:type", String)
], NegotiationChat.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'seller_id' }),
    __metadata("design:type", user_entity_1.User)
], NegotiationChat.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'campaign_details' }),
    __metadata("design:type", Object)
], NegotiationChat.prototype, "campaignDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'negotiation_context' }),
    __metadata("design:type", Object)
], NegotiationChat.prototype, "negotiationContext", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'negotiation_ai_active' }),
    __metadata("design:type", Boolean)
], NegotiationChat.prototype, "negotiationAiActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], NegotiationChat.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], NegotiationChat.prototype, "createdAt", void 0);
exports.NegotiationChat = NegotiationChat = __decorate([
    (0, typeorm_1.Entity)('negotiation_chats'),
    (0, typeorm_1.Index)(['buyerId', 'sellerId']),
    (0, typeorm_1.Index)(['dealId'])
], NegotiationChat);
//# sourceMappingURL=negotiation-chat.entity.js.map