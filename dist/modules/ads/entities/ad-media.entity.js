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
exports.AdMedia = exports.ALLOWED_VIDEO_FORMATS = exports.ALLOWED_IMAGE_FORMATS = exports.MediaType = void 0;
const typeorm_1 = require("typeorm");
const ad_entity_1 = require("./ad.entity");
var MediaType;
(function (MediaType) {
    MediaType["IMAGE"] = "image";
    MediaType["VIDEO"] = "video";
})(MediaType || (exports.MediaType = MediaType = {}));
exports.ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
exports.ALLOWED_VIDEO_FORMATS = ['mp4'];
let AdMedia = class AdMedia {
};
exports.AdMedia = AdMedia;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdMedia.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ad_entity_1.Ad, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'ad_id' }),
    __metadata("design:type", ad_entity_1.Ad)
], AdMedia.prototype, "ad", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ad_id' }),
    __metadata("design:type", String)
], AdMedia.prototype, "adId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MediaType,
        name: 'media_type',
    }),
    __metadata("design:type", String)
], AdMedia.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'media_url' }),
    __metadata("design:type", String)
], AdMedia.prototype, "mediaUrl", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true, name: 'file_size_mb' }),
    __metadata("design:type", Number)
], AdMedia.prototype, "fileSizeMb", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'duration_seconds' }),
    __metadata("design:type", Number)
], AdMedia.prototype, "durationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AdMedia.prototype, "format", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AdMedia.prototype, "createdAt", void 0);
exports.AdMedia = AdMedia = __decorate([
    (0, typeorm_1.Entity)('ad_media')
], AdMedia);
//# sourceMappingURL=ad-media.entity.js.map