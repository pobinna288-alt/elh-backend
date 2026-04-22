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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdWatchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ad_watch_service_1 = require("./ad-watch.service");
const ad_watch_dto_1 = require("./dto/ad-watch.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let AdWatchController = class AdWatchController {
    constructor(adWatchService) {
        this.adWatchService = adWatchService;
    }
    async startWatchSession(dto, req) {
        return this.adWatchService.startWatchSession(req.user.sub, dto.adId);
    }
    async reportProgress(dto, req) {
        return this.adWatchService.processAdProgress(req.user.sub, dto);
    }
    async reportProgressLegacy(dto, req) {
        return this.adWatchService.processAdProgress(req.user.sub, dto);
    }
    async getWatchStats(req) {
        return this.adWatchService.getWatchStats(req.user.sub);
    }
    async getAdStatus(adId, req) {
        return this.adWatchService.getAdCompletionStatus(req.user.sub, adId);
    }
};
exports.AdWatchController = AdWatchController;
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Start watching an ad',
        description: 'Initiates a watch session for an ad. Returns session info including max coins and milestone rewards.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Watch session started successfully',
        type: ad_watch_dto_1.WatchSessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Already completed this ad' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Cannot watch own ads' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Ad not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_watch_dto_1.StartWatchSessionDto, Object]),
    __metadata("design:returntype", Promise)
], AdWatchController.prototype, "startWatchSession", null);
__decorate([
    (0, common_1.Post)('progress'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Report ad watch progress',
        description: `
      Submit watch progress to earn coins at milestones (25%, 50%, 75%, 100%).
      
      Backend validates:
      - Watch progress is legitimate (not skipped)
      - Watch time matches video duration
      - Milestones are only rewarded once
      - Daily coin limit is respected
      
      Coins are calculated based on ad owner's tier:
      - Normal: 10 coins max
      - Premium: 40 coins max
      - Pro: 100 coins max
      - Hot: 200 coins max
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Progress recorded, coins granted if milestone reached',
        type: ad_watch_dto_1.AdProgressResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid progress or anti-cheat violation' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Daily coin limit reached' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_watch_dto_1.AdProgressDto, Object]),
    __metadata("design:returntype", Promise)
], AdWatchController.prototype, "reportProgress", null);
__decorate([
    (0, common_1.Post)('/ad-progress'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Report ad watch progress (legacy endpoint)',
        description: 'Same as POST /api/ad-watch/progress',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_watch_dto_1.AdProgressDto, Object]),
    __metadata("design:returntype", Promise)
], AdWatchController.prototype, "reportProgressLegacy", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get watch statistics',
        description: 'Returns user watch stats including balance, streak, daily earnings, and active boost events.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Watch statistics retrieved',
        type: ad_watch_dto_1.WatchStatsResponseDto,
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdWatchController.prototype, "getWatchStats", null);
__decorate([
    (0, common_1.Get)('status/:adId'),
    (0, swagger_1.ApiParam)({ name: 'adId', description: 'ID of the ad' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Get ad completion status',
        description: 'Check if user has completed watching a specific ad and coins earned.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Ad completion status',
        type: ad_watch_dto_1.AdCompletionResponseDto,
    }),
    __param(0, (0, common_1.Param)('adId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdWatchController.prototype, "getAdStatus", null);
exports.AdWatchController = AdWatchController = __decorate([
    (0, swagger_1.ApiTags)('ad-watch'),
    (0, common_1.Controller)('ad-watch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ad_watch_service_1.AdWatchService])
], AdWatchController);
//# sourceMappingURL=ad-watch.controller.js.map