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
exports.Deal = exports.DealStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
var DealStatus;
(function (DealStatus) {
    DealStatus["PENDING"] = "pending";
    DealStatus["ACCEPTED"] = "accepted";
    DealStatus["REJECTED"] = "rejected";
    DealStatus["COUNTER_OFFERED"] = "counter_offered";
    DealStatus["EXPIRED"] = "expired";
    DealStatus["CANCELLED"] = "cancelled";
    DealStatus["COMPLETED"] = "completed";
})(DealStatus || (exports.DealStatus = DealStatus = {}));
let Deal = class Deal {
};
exports.Deal = Deal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Deal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], Deal.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id' }),
    __metadata("design:type", user_entity_1.User)
], Deal.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_id' }),
    __metadata("design:type", String)
], Deal.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'seller_id' }),
    __metadata("design:type", user_entity_1.User)
], Deal.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'ad_id' }),
    __metadata("design:type", String)
], Deal.prototype, "adId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Deal.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, name: 'original_price' }),
    __metadata("design:type", Number)
], Deal.prototype, "originalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, name: 'offered_price' }),
    __metadata("design:type", Number)
], Deal.prototype, "offeredPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true, name: 'counter_price' }),
    __metadata("design:type", Number)
], Deal.prototype, "counterPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true, name: 'final_price' }),
    __metadata("design:type", Number)
], Deal.prototype, "finalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], Deal.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'target_location' }),
    __metadata("design:type", String)
], Deal.prototype, "targetLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'required_attention' }),
    __metadata("design:type", Number)
], Deal.prototype, "requiredAttention", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'campaign_duration' }),
    __metadata("design:type", Number)
], Deal.prototype, "campaignDuration", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0, name: 'budget' }),
    __metadata("design:type", Number)
], Deal.prototype, "budget", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: DealStatus.PENDING,
    }),
    __metadata("design:type", String)
], Deal.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'seller_declined' }),
    __metadata("design:type", Boolean)
], Deal.prototype, "sellerDeclined", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'negotiation_deadline' }),
    __metadata("design:type", Date)
], Deal.prototype, "negotiationDeadline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'rejection_reason' }),
    __metadata("design:type", String)
], Deal.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Deal.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'alternative_search_triggered' }),
    __metadata("design:type", Boolean)
], Deal.prototype, "alternativeSearchTriggered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true, name: 'rejected_seller_ids' }),
    __metadata("design:type", Array)
], Deal.prototype, "rejectedSellerIds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Deal.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Deal.prototype, "updatedAt", void 0);
exports.Deal = Deal = __decorate([
    (0, typeorm_1.Entity)('deals'),
    (0, typeorm_1.Index)(['buyerId', 'status']),
    (0, typeorm_1.Index)(['sellerId', 'status']),
    (0, typeorm_1.Index)(['status', 'createdAt'])
], Deal);
//# sourceMappingURL=deal.entity.js.map