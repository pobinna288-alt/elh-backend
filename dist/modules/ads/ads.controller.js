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
exports.AdsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const ads_service_1 = require("./ads.service");
const media_service_1 = require("./media.service");
const ai_description_service_1 = require("./ai-description.service");
const ad_rewrite_service_1 = require("./ad-rewrite.service");
const ad_writer_service_1 = require("./ad-writer.service");
const ad_persuasive_service_1 = require("./ad-persuasive.service");
const ad_high_converting_service_1 = require("./ad-high-converting.service");
const ad_dto_1 = require("./dto/ad.dto");
const media_upload_dto_1 = require("./dto/media-upload.dto");
const ai_description_dto_1 = require("./dto/ai-description.dto");
const ad_rewrite_dto_1 = require("./dto/ad-rewrite.dto");
const ad_writer_dto_1 = require("./dto/ad-writer.dto");
const ad_persuasive_dto_1 = require("./dto/ad-persuasive.dto");
const ad_high_converting_dto_1 = require("./dto/ad-high-converting.dto");
const wallet_service_1 = require("../wallet/wallet.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const cache_decorators_1 = require("../../common/caching/decorators/cache.decorators");
let AdsController = class AdsController {
    constructor(adsService, mediaService, aiDescriptionService, adRewriteService, adWriterService, adPersuasiveService, adHighConvertingService, walletService) {
        this.adsService = adsService;
        this.mediaService = mediaService;
        this.aiDescriptionService = aiDescriptionService;
        this.adRewriteService = adRewriteService;
        this.adWriterService = adWriterService;
        this.adPersuasiveService = adPersuasiveService;
        this.adHighConvertingService = adHighConvertingService;
        this.walletService = walletService;
    }
    async createAd(createAdDto, req) {
        return this.adsService.create(createAdDto, req.user.userId);
    }
    create(createAdDto, req) {
        return this.adsService.create(createAdDto, req.user.userId);
    }
    findAll(filterDto) {
        return this.adsService.findAll(filterDto);
    }
    getTrending(limit) {
        return this.adsService.getTrending(limit ? Number(limit) : undefined);
    }
    getMyAds(req, filterDto) {
        return this.adsService.getUserAds(req.user.userId, filterDto);
    }
    findOne(id) {
        return this.adsService.findOne(id);
    }
    update(id, updateAdDto, req) {
        return this.adsService.update(id, updateAdDto, req.user.userId);
    }
    remove(id, req) {
        return this.adsService.remove(id, req.user.userId);
    }
    async uploadVideo(file, uploadDto, req) {
        if (!file) {
            throw new common_1.BadRequestException('No video file provided');
        }
        const hasAccess = this.mediaService.validatePlanAccess(req.user.role, uploadDto.plan);
        if (!hasAccess) {
            throw new common_1.ForbiddenException(`Your account does not have access to the ${uploadDto.plan} plan`);
        }
        const uploadResult = await this.mediaService.uploadVideo(file, uploadDto.plan);
        const userId = req.user?.sub || req.user?.userId || req.user?.id;
        if (!userId) {
            throw new common_1.BadRequestException('Authenticated user ID is missing in token payload');
        }
        const userRole = (req.user.role || '').toLowerCase();
        if (userRole === 'user' && uploadDto.plan === media_upload_dto_1.UploadPlan.NORMAL) {
            const duration = uploadResult.duration;
            let coinsEarned = 0;
            if (duration <= 30) {
                coinsEarned = 5;
            }
            else if (duration <= 60) {
                coinsEarned = 10;
            }
            else if (duration <= 90) {
                coinsEarned = 15;
            }
            else if (duration <= 120) {
                coinsEarned = 20;
            }
            coinsEarned = Math.min(coinsEarned, 20);
            let totalCoins = 0;
            if (coinsEarned > 0) {
                const coinsResponse = await this.walletService.addCoins(userId, {
                    amount: coinsEarned,
                    reason: 'normal_video_upload_reward',
                });
                totalCoins = coinsResponse.coins;
            }
            else {
                totalCoins = await this.walletService.getBalance(userId);
            }
            const maxViews = 4000;
            return {
                upload_status: 'success',
                video_duration: duration,
                coins_earned: coinsEarned,
                total_user_coins: totalCoins,
                max_views: maxViews,
                status: 'active',
            };
        }
        return uploadResult;
    }
    async generateDescription(dto, req) {
        const hasAccess = this.aiDescriptionService.validatePlanAccess(req.user.role, dto.plan);
        if (!hasAccess) {
            throw new common_1.ForbiddenException(`Your account does not have access to the ${dto.plan} plan`);
        }
        const description = await this.aiDescriptionService.generateDescription(dto.title, dto.category, dto.price, dto.location, dto.plan, dto.additionalInfo);
        return {
            description,
            wordCount: description.split(/\s+/).length,
            plan: dto.plan,
        };
    }
    async rewriteDescription(dto) {
        const rewrittenText = await this.adRewriteService.rewriteDescription(dto.text);
        return {
            rewrittenText,
            wordCount: this.adRewriteService.countWords(rewrittenText),
        };
    }
    async writeDescription(dto) {
        const description = await this.adWriterService.writeDescription(dto.title, dto.category, dto.price, dto.location, dto.keyFeatures);
        return {
            description,
            wordCount: this.adWriterService.countWords(description),
        };
    }
    async createPersuasiveDescription(dto) {
        const description = await this.adPersuasiveService.createPersuasiveDescription(dto.title, dto.category, dto.price, dto.location, dto.keyFeatures);
        return {
            description,
            wordCount: this.adPersuasiveService.countWords(description),
        };
    }
    async generateHighConvertingDescription(dto) {
        const description = await this.adHighConvertingService.generateHighConvertingDescription(dto.title, dto.category, dto.price, dto.location, dto.keyFeatures, dto.urgency);
        return {
            description,
            wordCount: this.adHighConvertingService.countWords(description),
        };
    }
    incrementViews(id) {
        return this.adsService.incrementViews(id);
    }
    incrementClicks(id) {
        return this.adsService.incrementClicks(id);
    }
    likeAd(id) {
        return this.adsService.likeAd(id);
    }
    dislikeAd(id) {
        return this.adsService.dislikeAd(id);
    }
    shareAd(id) {
        return this.adsService.shareAd(id);
    }
};
exports.AdsController = AdsController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new ad with full validation',
        description: 'Creates a new ad with strict server-side validation of all fields including tier-based video limits'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Ad created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error (title/description/category/condition/image/video)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - JWT token required' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_dto_1.CreateAdDto, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "createAd", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new ad (legacy endpoint)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Ad created successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_dto_1.CreateAdDto, Object]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, cache_decorators_1.CacheTTL)(60),
    (0, cache_decorators_1.CacheKey)('ads:list'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all ads with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return all ads' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_dto_1.FilterAdsDto]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('trending'),
    (0, cache_decorators_1.CacheTTL)(45),
    (0, cache_decorators_1.CacheKey)('ads:trending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trending ads' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return trending ads' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "getTrending", null);
__decorate([
    (0, common_1.Get)('my-ads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, cache_decorators_1.NoCache)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user ads' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return user ads' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ad_dto_1.FilterAdsDto]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "getMyAds", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, cache_decorators_1.CacheTTL)(120),
    (0, cache_decorators_1.CacheKey)('ad:detail::id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get ad by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return ad details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Ad not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update ad' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ad updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ad_dto_1.UpdateAdDto, Object]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete ad' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ad deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('upload-video'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload and process video for ad' }),
    (0, swagger_1.ApiBody)({
        description: 'Video file and upload plan',
        schema: {
            type: 'object',
            properties: {
                video: {
                    type: 'string',
                    format: 'binary',
                    description: 'Video file to upload',
                },
                plan: {
                    type: 'string',
                    enum: ['normal', 'premium', 'pro', 'hot'],
                    description: 'Upload plan type',
                },
                adId: {
                    type: 'string',
                    description: 'Optional ad ID to associate with the video',
                },
            },
            required: ['video', 'plan'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Video uploaded and processed successfully',
        type: media_upload_dto_1.MediaUploadResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid file or exceeds plan limits',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Plan not accessible for user role',
    }),
    (0, swagger_1.ApiResponse)({
        status: 413,
        description: 'File too large',
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, media_upload_dto_1.UploadVideoDto, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "uploadVideo", null);
__decorate([
    (0, common_1.Post)('generate-description'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate AI-powered ad description' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Description generated successfully',
        type: ai_description_dto_1.DescriptionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Plan not accessible for user role',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_description_dto_1.GenerateDescriptionDto, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "generateDescription", null);
__decorate([
    (0, common_1.Post)('rewrite-description'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Rewrite text into clear ad description' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Description rewritten successfully',
        type: ad_rewrite_dto_1.RewriteResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_rewrite_dto_1.RewriteDescriptionDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "rewriteDescription", null);
__decorate([
    (0, common_1.Post)('write-description'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Write appealing ad description' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Description written successfully',
        type: ad_writer_dto_1.WriteResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_writer_dto_1.WriteDescriptionDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "writeDescription", null);
__decorate([
    (0, common_1.Post)('persuasive-description'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create persuasive ad description for engagement' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Persuasive description created successfully',
        type: ad_persuasive_dto_1.PersuasiveResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_persuasive_dto_1.PersuasiveDescriptionDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "createPersuasiveDescription", null);
__decorate([
    (0, common_1.Post)('high-converting-description'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate high-converting ad description' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'High-converting description generated successfully',
        type: ad_high_converting_dto_1.HighConvertingResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ad_high_converting_dto_1.HighConvertingDescriptionDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "generateHighConvertingDescription", null);
__decorate([
    (0, common_1.Post)(':id/view'),
    (0, swagger_1.ApiOperation)({ summary: 'Increment ad view count' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'View count incremented' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "incrementViews", null);
__decorate([
    (0, common_1.Post)(':id/click'),
    (0, swagger_1.ApiOperation)({ summary: 'Increment ad click count' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Click count incremented' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "incrementClicks", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Like ad' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ad liked' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "likeAd", null);
__decorate([
    (0, common_1.Post)(':id/dislike'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Dislike ad' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ad disliked' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "dislikeAd", null);
__decorate([
    (0, common_1.Post)(':id/share'),
    (0, swagger_1.ApiOperation)({ summary: 'Share ad' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ad shared' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "shareAd", null);
exports.AdsController = AdsController = __decorate([
    (0, swagger_1.ApiTags)('ads'),
    (0, common_1.Controller)('ads'),
    __metadata("design:paramtypes", [ads_service_1.AdsService,
        media_service_1.MediaService,
        ai_description_service_1.AiDescriptionService,
        ad_rewrite_service_1.AdRewriteService,
        ad_writer_service_1.AdWriterService,
        ad_persuasive_service_1.AdPersuasiveService,
        ad_high_converting_service_1.AdHighConvertingService,
        wallet_service_1.WalletService])
], AdsController);
//# sourceMappingURL=ads.controller.js.map