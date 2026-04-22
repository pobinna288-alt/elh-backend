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
exports.PLAN_LIMITS = exports.NormalVideoUploadResponseDto = exports.MediaUploadResponseDto = exports.UploadVideoDto = exports.UploadPlan = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var UploadPlan;
(function (UploadPlan) {
    UploadPlan["NORMAL"] = "normal";
    UploadPlan["PREMIUM"] = "premium";
    UploadPlan["PRO"] = "pro";
    UploadPlan["HOT"] = "hot";
    UploadPlan["ENTERPRISE"] = "enterprise";
})(UploadPlan || (exports.UploadPlan = UploadPlan = {}));
class UploadVideoDto {
}
exports.UploadVideoDto = UploadVideoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Upload plan type',
        enum: UploadPlan,
        example: UploadPlan.NORMAL,
    }),
    (0, class_validator_1.IsEnum)(UploadPlan),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UploadVideoDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Ad ID to associate with the video',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadVideoDto.prototype, "adId", void 0);
class MediaUploadResponseDto {
}
exports.MediaUploadResponseDto = MediaUploadResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original file URL' }),
    __metadata("design:type", String)
], MediaUploadResponseDto.prototype, "originalUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Processed/compressed video URL' }),
    __metadata("design:type", String)
], MediaUploadResponseDto.prototype, "processedUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Thumbnail URL' }),
    __metadata("design:type", String)
], MediaUploadResponseDto.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds' }),
    __metadata("design:type", Number)
], MediaUploadResponseDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes' }),
    __metadata("design:type", Number)
], MediaUploadResponseDto.prototype, "fileSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether video was compressed' }),
    __metadata("design:type", Boolean)
], MediaUploadResponseDto.prototype, "compressed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether watermark was applied' }),
    __metadata("design:type", Boolean)
], MediaUploadResponseDto.prototype, "watermarked", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Upload plan used' }),
    __metadata("design:type", String)
], MediaUploadResponseDto.prototype, "plan", void 0);
class NormalVideoUploadResponseDto {
}
exports.NormalVideoUploadResponseDto = NormalVideoUploadResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'success', description: 'Upload status' }),
    __metadata("design:type", String)
], NormalVideoUploadResponseDto.prototype, "upload_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds' }),
    __metadata("design:type", Number)
], NormalVideoUploadResponseDto.prototype, "video_duration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Coins earned for this upload (max 20)' }),
    __metadata("design:type", Number)
], NormalVideoUploadResponseDto.prototype, "coins_earned", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total coins in user wallet after reward' }),
    __metadata("design:type", Number)
], NormalVideoUploadResponseDto.prototype, "total_user_coins", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4000, description: 'Maximum allowed views for this ad' }),
    __metadata("design:type", Number)
], NormalVideoUploadResponseDto.prototype, "max_views", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'active', description: 'Ad status' }),
    __metadata("design:type", String)
], NormalVideoUploadResponseDto.prototype, "status", void 0);
exports.PLAN_LIMITS = {
    [UploadPlan.NORMAL]: {
        maxDuration: 120,
        maxFileSize: 25 * 1024 * 1024,
        compressionLevel: 'high',
        applyWatermark: true,
        requiresPayment: false,
    },
    [UploadPlan.PREMIUM]: {
        maxDuration: 180,
        maxFileSize: 40 * 1024 * 1024,
        compressionLevel: 'medium',
        applyWatermark: false,
        requiresPayment: false,
    },
    [UploadPlan.PRO]: {
        maxDuration: 300,
        maxFileSize: 60 * 1024 * 1024,
        compressionLevel: 'low',
        applyWatermark: false,
        requiresPayment: false,
    },
    [UploadPlan.HOT]: {
        maxDuration: 600,
        maxFileSize: 80 * 1024 * 1024,
        compressionLevel: 'minimal',
        applyWatermark: false,
        requiresPayment: true,
    },
    [UploadPlan.ENTERPRISE]: {
        maxDuration: Infinity,
        maxFileSize: 500 * 1024 * 1024,
        compressionLevel: 'none',
        applyWatermark: false,
        requiresPayment: true,
    },
};
//# sourceMappingURL=media-upload.dto.js.map