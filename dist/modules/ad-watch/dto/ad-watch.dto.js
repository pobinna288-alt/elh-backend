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
exports.WatchStatsResponseDto = exports.AdCompletionResponseDto = exports.WatchSessionResponseDto = exports.AdProgressResponseDto = exports.StartWatchSessionDto = exports.AdProgressDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AdProgressDto {
}
exports.AdProgressDto = AdProgressDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the ad being watched',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AdProgressDto.prototype, "adId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current watch percentage (0-100)',
        example: 50,
        minimum: 0,
        maximum: 100,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], AdProgressDto.prototype, "watchPercent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Actual watch time in seconds (for anti-cheat validation)',
        example: 60,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AdProgressDto.prototype, "watchTimeSeconds", void 0);
class StartWatchSessionDto {
}
exports.StartWatchSessionDto = StartWatchSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the ad to watch',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], StartWatchSessionDto.prototype, "adId", void 0);
class AdProgressResponseDto {
}
exports.AdProgressResponseDto = AdProgressResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation status' }),
    __metadata("design:type", Boolean)
], AdProgressResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current watch percentage' }),
    __metadata("design:type", Number)
], AdProgressResponseDto.prototype, "watchPercent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Coins earned from this progress update' }),
    __metadata("design:type", Number)
], AdProgressResponseDto.prototype, "coinsEarned", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total coins earned from this ad' }),
    __metadata("design:type", Number)
], AdProgressResponseDto.prototype, "totalCoinsFromAd", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User\'s new coin balance' }),
    __metadata("design:type", Number)
], AdProgressResponseDto.prototype, "newBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether ad is completed' }),
    __metadata("design:type", Boolean)
], AdProgressResponseDto.prototype, "completed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Milestones reached', type: [Number] }),
    __metadata("design:type", Array)
], AdProgressResponseDto.prototype, "milestonesReached", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Active boost multiplier if any' }),
    __metadata("design:type", Number)
], AdProgressResponseDto.prototype, "boostMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Message for the user' }),
    __metadata("design:type", String)
], AdProgressResponseDto.prototype, "message", void 0);
class WatchSessionResponseDto {
}
exports.WatchSessionResponseDto = WatchSessionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Operation status' }),
    __metadata("design:type", Boolean)
], WatchSessionResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Session ID for tracking' }),
    __metadata("design:type", String)
], WatchSessionResponseDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad ID being watched' }),
    __metadata("design:type", String)
], WatchSessionResponseDto.prototype, "adId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ad tier (NORMAL, PREMIUM, PRO, HOT)' }),
    __metadata("design:type", String)
], WatchSessionResponseDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Video duration in seconds' }),
    __metadata("design:type", Number)
], WatchSessionResponseDto.prototype, "videoDuration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Maximum coins earnable from this ad' }),
    __metadata("design:type", Number)
], WatchSessionResponseDto.prototype, "maxCoins", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Coins earned at each milestone', type: Object }),
    __metadata("design:type", Object)
], WatchSessionResponseDto.prototype, "milestoneRewards", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Active boost event details' }),
    __metadata("design:type", Object)
], WatchSessionResponseDto.prototype, "boostEvent", void 0);
class AdCompletionResponseDto {
}
exports.AdCompletionResponseDto = AdCompletionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Completion status' }),
    __metadata("design:type", String)
], AdCompletionResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total coins earned from this ad' }),
    __metadata("design:type", Number)
], AdCompletionResponseDto.prototype, "coinsEarned", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User\'s new total balance' }),
    __metadata("design:type", Number)
], AdCompletionResponseDto.prototype, "newBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current watch streak in days' }),
    __metadata("design:type", Number)
], AdCompletionResponseDto.prototype, "watchStreak", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Streak bonus coins if any' }),
    __metadata("design:type", Number)
], AdCompletionResponseDto.prototype, "streakBonus", void 0);
class WatchStatsResponseDto {
}
exports.WatchStatsResponseDto = WatchStatsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID' }),
    __metadata("design:type", String)
], WatchStatsResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total coin balance' }),
    __metadata("design:type", Number)
], WatchStatsResponseDto.prototype, "coinBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total ads watched' }),
    __metadata("design:type", Number)
], WatchStatsResponseDto.prototype, "totalAdsWatched", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ads completed (100%)' }),
    __metadata("design:type", Number)
], WatchStatsResponseDto.prototype, "adsCompleted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current watch streak in days' }),
    __metadata("design:type", Number)
], WatchStatsResponseDto.prototype, "watchStreak", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Coins earned today' }),
    __metadata("design:type", Number)
], WatchStatsResponseDto.prototype, "coinsEarnedToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Daily coin limit' }),
    __metadata("design:type", Number)
], WatchStatsResponseDto.prototype, "dailyCoinLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Active boost event' }),
    __metadata("design:type", Object)
], WatchStatsResponseDto.prototype, "activeBoostEvent", void 0);
//# sourceMappingURL=ad-watch.dto.js.map