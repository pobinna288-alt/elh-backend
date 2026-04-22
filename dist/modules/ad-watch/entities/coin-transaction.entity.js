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
exports.CoinTransaction = exports.CoinTransactionType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const ad_entity_1 = require("../../ads/entities/ad.entity");
var CoinTransactionType;
(function (CoinTransactionType) {
    CoinTransactionType["AD_WATCH_REWARD"] = "ad_watch_reward";
    CoinTransactionType["STREAK_BONUS"] = "streak_bonus";
    CoinTransactionType["BOOST_EVENT_REWARD"] = "boost_event_reward";
    CoinTransactionType["REFERRAL_BONUS"] = "referral_bonus";
    CoinTransactionType["MILESTONE_BONUS"] = "milestone_bonus";
})(CoinTransactionType || (exports.CoinTransactionType = CoinTransactionType = {}));
let CoinTransaction = class CoinTransaction {
};
exports.CoinTransaction = CoinTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CoinTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], CoinTransaction.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CoinTransaction.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ad_entity_1.Ad, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'adId' }),
    __metadata("design:type", ad_entity_1.Ad)
], CoinTransaction.prototype, "ad", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CoinTransaction.prototype, "adId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], CoinTransaction.prototype, "coins", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CoinTransactionType,
        default: CoinTransactionType.AD_WATCH_REWARD,
    }),
    __metadata("design:type", String)
], CoinTransaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CoinTransaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], CoinTransaction.prototype, "milestone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 1.0 }),
    __metadata("design:type", Number)
], CoinTransaction.prototype, "multiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CoinTransaction.prototype, "boostEventId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CoinTransaction.prototype, "createdAt", void 0);
exports.CoinTransaction = CoinTransaction = __decorate([
    (0, typeorm_1.Entity)('coin_transactions'),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['userId', 'createdAt']),
    (0, typeorm_1.Index)(['adId']),
    (0, typeorm_1.Index)(['type'])
], CoinTransaction);
//# sourceMappingURL=coin-transaction.entity.js.map