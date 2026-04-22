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
exports.Ad = exports.AdVideoLength = exports.AdCondition = exports.AdCategory = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const comment_entity_1 = require("../../comments/entities/comment.entity");
var AdCategory;
(function (AdCategory) {
    AdCategory["ELECTRONICS"] = "Electronics";
    AdCategory["VEHICLES"] = "Vehicles";
    AdCategory["REAL_ESTATE"] = "Real Estate";
    AdCategory["FASHION"] = "Fashion";
    AdCategory["PHONES"] = "Phones";
    AdCategory["COMPUTERS"] = "Computers";
    AdCategory["HOME_FURNITURE"] = "Home & Furniture";
    AdCategory["SERVICES"] = "Services";
})(AdCategory || (exports.AdCategory = AdCategory = {}));
var AdCondition;
(function (AdCondition) {
    AdCondition["NEW"] = "new";
    AdCondition["USED"] = "used";
})(AdCondition || (exports.AdCondition = AdCondition = {}));
var AdVideoLength;
(function (AdVideoLength) {
    AdVideoLength["SHORT"] = "short";
    AdVideoLength["NORMAL"] = "normal";
    AdVideoLength["LONG"] = "long";
    AdVideoLength["PREMIUM"] = "premium";
})(AdVideoLength || (exports.AdVideoLength = AdVideoLength = {}));
let Ad = class Ad {
};
exports.Ad = Ad;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Ad.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], Ad.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true }),
    __metadata("design:type", String)
], Ad.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AdCategory,
    }),
    __metadata("design:type", String)
], Ad.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AdCondition,
        default: AdCondition.USED,
    }),
    __metadata("design:type", String)
], Ad.prototype, "condition", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Ad.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], Ad.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Ad.prototype, "priceUsd", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ad.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Ad.prototype, "mediaUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ad.prototype, "videoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ad.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Ad.prototype, "videoDuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Ad.prototype, "videoFileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ad.prototype, "videoFormat", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Ad.prototype, "hasImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Ad.prototype, "isVideoAd", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "qualityScore", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AdVideoLength,
        default: AdVideoLength.NORMAL,
    }),
    __metadata("design:type", String)
], Ad.prototype, "videoLength", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "views", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "clicks", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "likes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "dislikes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "shares", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 4000 }),
    __metadata("design:type", Number)
], Ad.prototype, "maxViews", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Ad.prototype, "commentsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Ad.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], Ad.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Ad.prototype, "isPremium", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Ad.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.ads, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'authorId' }),
    __metadata("design:type", user_entity_1.User)
], Ad.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Ad.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => comment_entity_1.Comment, (comment) => comment.ad),
    __metadata("design:type", Array)
], Ad.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Ad.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Ad.prototype, "updatedAt", void 0);
exports.Ad = Ad = __decorate([
    (0, typeorm_1.Index)('IDX_ADS_ACTIVE_CREATED', ['isActive', 'createdAt']),
    (0, typeorm_1.Index)('IDX_ADS_CATEGORY_ACTIVE_CREATED', ['category', 'isActive', 'createdAt']),
    (0, typeorm_1.Index)('IDX_ADS_AUTHOR_CREATED', ['authorId', 'createdAt']),
    (0, typeorm_1.Index)('IDX_ADS_STATUS_VIEWS', ['status', 'views']),
    (0, typeorm_1.Entity)('ads')
], Ad);
//# sourceMappingURL=ad.entity.js.map