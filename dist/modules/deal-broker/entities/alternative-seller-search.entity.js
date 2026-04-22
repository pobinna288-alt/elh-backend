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
exports.AlternativeSellerSearch = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const deal_entity_1 = require("./deal.entity");
let AlternativeSellerSearch = class AlternativeSellerSearch {
};
exports.AlternativeSellerSearch = AlternativeSellerSearch;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deal_id' }),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "dealId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => deal_entity_1.Deal, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'deal_id' }),
    __metadata("design:type", deal_entity_1.Deal)
], AlternativeSellerSearch.prototype, "deal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id' }),
    __metadata("design:type", user_entity_1.User)
], AlternativeSellerSearch.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'original_seller_id' }),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "originalSellerId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], AlternativeSellerSearch.prototype, "budget", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'target_location' }),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "targetLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'required_attention' }),
    __metadata("design:type", Number)
], AlternativeSellerSearch.prototype, "requiredAttention", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'campaign_duration' }),
    __metadata("design:type", Number)
], AlternativeSellerSearch.prototype, "campaignDuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'matched_sellers' }),
    __metadata("design:type", Array)
], AlternativeSellerSearch.prototype, "matchedSellers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'total_candidates' }),
    __metadata("design:type", Number)
], AlternativeSellerSearch.prototype, "totalCandidates", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'returned_count' }),
    __metadata("design:type", Number)
], AlternativeSellerSearch.prototype, "returnedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trigger_reason' }),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "triggerReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'selected_seller_id' }),
    __metadata("design:type", String)
], AlternativeSellerSearch.prototype, "selectedSellerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'chat_created' }),
    __metadata("design:type", Boolean)
], AlternativeSellerSearch.prototype, "chatCreated", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AlternativeSellerSearch.prototype, "createdAt", void 0);
exports.AlternativeSellerSearch = AlternativeSellerSearch = __decorate([
    (0, typeorm_1.Entity)('alternative_seller_searches'),
    (0, typeorm_1.Index)(['buyerId', 'createdAt']),
    (0, typeorm_1.Index)(['dealId'])
], AlternativeSellerSearch);
//# sourceMappingURL=alternative-seller-search.entity.js.map