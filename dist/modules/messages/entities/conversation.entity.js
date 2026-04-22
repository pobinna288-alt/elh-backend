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
exports.Conversation = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const ad_entity_1 = require("../../ads/entities/ad.entity");
const message_entity_1 = require("./message.entity");
let Conversation = class Conversation {
    getSellerResponseIndicator() {
        if (this.sellerMessageCount === 0) {
            return 'New seller - no response history yet';
        }
        const avgSeconds = this.averageResponseTime;
        if (avgSeconds <= 300) {
            return 'Seller usually replies within 5 minutes';
        }
        else if (avgSeconds <= 600) {
            return 'Seller usually replies within 10 minutes';
        }
        else if (avgSeconds <= 3600) {
            return 'Seller usually replies within 1 hour';
        }
        else {
            return 'Seller usually replies within a few hours';
        }
    }
    getProductCard() {
        return {
            productName: this.productName || this.ad?.title || 'Unknown Product',
            productPrice: this.productPrice || this.ad?.price || 0,
            productCurrency: this.productCurrency || this.ad?.currency || 'USD',
            productThumbnail: this.productThumbnail || this.ad?.thumbnailUrl || this.ad?.mediaUrls?.[0] || null,
            sellerName: this.seller?.username || this.seller?.fullName || 'Unknown Seller',
            sellerId: this.sellerId,
        };
    }
};
exports.Conversation = Conversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Conversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'buyerId' }),
    __metadata("design:type", user_entity_1.User)
], Conversation.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Conversation.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sellerId' }),
    __metadata("design:type", user_entity_1.User)
], Conversation.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Conversation.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ad_entity_1.Ad, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'adId' }),
    __metadata("design:type", ad_entity_1.Ad)
], Conversation.prototype, "ad", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "adId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Conversation.prototype, "productPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "productCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "productThumbnail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Conversation.prototype, "lastMessageContent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Conversation.prototype, "lastMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Conversation.prototype, "lastMessageSenderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "buyerUnreadCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "sellerUnreadCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isArchivedByBuyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isArchivedBySeller", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isBlockedByBuyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "isBlockedBySeller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "averageResponseTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "sellerMessageCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "totalResponseTime", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (message) => message.conversation),
    __metadata("design:type", Array)
], Conversation.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Conversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Conversation.prototype, "updatedAt", void 0);
exports.Conversation = Conversation = __decorate([
    (0, typeorm_1.Entity)('conversations'),
    (0, typeorm_1.Index)(['buyerId', 'sellerId', 'adId'], { unique: true })
], Conversation);
//# sourceMappingURL=conversation.entity.js.map