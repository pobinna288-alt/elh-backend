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
exports.SellerProfile = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let SellerProfile = class SellerProfile {
};
exports.SellerProfile = SellerProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SellerProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unique: true }),
    __metadata("design:type", String)
], SellerProfile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], SellerProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SellerProfile.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SellerProfile.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SellerProfile.prototype, "availability", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 0, name: 'attention_score' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "attentionScore", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0, name: 'price_per_attention' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "pricePerAttention", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 4, default: 0, name: 'deal_success_rate' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "dealSuccessRate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 0, name: 'response_speed' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "responseSpeed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'total_deals' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "totalDeals", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'successful_deals' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "successfulDeals", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'failed_deals' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "failedDeals", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 0, name: 'avg_rating' }),
    __metadata("design:type", Number)
], SellerProfile.prototype, "avgRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_blocked' }),
    __metadata("design:type", Boolean)
], SellerProfile.prototype, "isBlocked", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true, name: 'blocked_by_user_ids' }),
    __metadata("design:type", Array)
], SellerProfile.prototype, "blockedByUserIds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SellerProfile.prototype, "createdAt", void 0);
exports.SellerProfile = SellerProfile = __decorate([
    (0, typeorm_1.Entity)('seller_profiles'),
    (0, typeorm_1.Index)(['category', 'availability']),
    (0, typeorm_1.Index)(['location', 'availability']),
    (0, typeorm_1.Index)(['attentionScore']),
    (0, typeorm_1.Index)(['pricePerAttention'])
], SellerProfile);
//# sourceMappingURL=seller-profile.entity.js.map