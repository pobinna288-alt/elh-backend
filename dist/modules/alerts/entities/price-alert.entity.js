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
exports.PriceAlert = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const ad_entity_1 = require("../../ads/entities/ad.entity");
let PriceAlert = class PriceAlert {
};
exports.PriceAlert = PriceAlert;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PriceAlert.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], PriceAlert.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PriceAlert.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ad_entity_1.Ad, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'adId' }),
    __metadata("design:type", ad_entity_1.Ad)
], PriceAlert.prototype, "ad", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PriceAlert.prototype, "adId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PriceAlert.prototype, "targetPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'daily' }),
    __metadata("design:type", String)
], PriceAlert.prototype, "alertFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PriceAlert.prototype, "triggered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PriceAlert.prototype, "triggeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PriceAlert.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PriceAlert.prototype, "createdAt", void 0);
exports.PriceAlert = PriceAlert = __decorate([
    (0, typeorm_1.Entity)('price_alerts')
], PriceAlert);
//# sourceMappingURL=price-alert.entity.js.map