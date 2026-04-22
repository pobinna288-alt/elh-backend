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
exports.CoinBoostEvent = void 0;
const typeorm_1 = require("typeorm");
let CoinBoostEvent = class CoinBoostEvent {
};
exports.CoinBoostEvent = CoinBoostEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CoinBoostEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CoinBoostEvent.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CoinBoostEvent.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'coin_boost' }),
    __metadata("design:type", String)
], CoinBoostEvent.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 2.0 }),
    __metadata("design:type", Number)
], CoinBoostEvent.prototype, "multiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], CoinBoostEvent.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], CoinBoostEvent.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], CoinBoostEvent.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], CoinBoostEvent.prototype, "eligibleTiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], CoinBoostEvent.prototype, "maxTotalCoins", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CoinBoostEvent.prototype, "coinsDistributed", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CoinBoostEvent.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CoinBoostEvent.prototype, "updatedAt", void 0);
exports.CoinBoostEvent = CoinBoostEvent = __decorate([
    (0, typeorm_1.Entity)('coin_boost_events'),
    (0, typeorm_1.Index)(['startTime', 'endTime']),
    (0, typeorm_1.Index)(['isActive'])
], CoinBoostEvent);
//# sourceMappingURL=coin-boost-event.entity.js.map