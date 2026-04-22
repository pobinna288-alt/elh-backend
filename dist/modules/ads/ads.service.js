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
var AdsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ad_entity_1 = require("./entities/ad.entity");
const user_entity_1 = require("../users/entities/user.entity");
const redis_service_1 = require("../redis/redis.service");
const caching_service_1 = require("../../common/caching/caching.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const currency_service_1 = require("./currency.service");
const media_upload_dto_1 = require("./dto/media-upload.dto");
const ALLOWED_CATEGORIES = [
    'Electronics',
    'Vehicles',
    'Real Estate',
    'Fashion',
    'Phones',
    'Computers',
    'Home & Furniture',
    'Services',
];
const ALLOWED_CONDITIONS = ['new', 'used'];
const MAX_IMAGES_PER_AD = 5;
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_VIDEOS_PER_AD = 1;
const ALLOWED_VIDEO_FORMAT = 'mp4';
const MAX_VIDEO_RESOLUTION = 1080;
const MAX_AD_RESULTS_PER_PAGE = 50;
let AdsService = AdsService_1 = class AdsService {
    constructor(adsRepository, usersRepository, redisService, cachingService, currencyService) {
        this.adsRepository = adsRepository;
        this.usersRepository = usersRepository;
        this.redisService = redisService;
        this.cachingService = cachingService;
        this.currencyService = currencyService;
        this.logger = new common_1.Logger(AdsService_1.name);
    }
    async create(createAdDto, userId) {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'username', 'coins', 'premiumExpiresAt', 'role', 'plan']
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const userTier = this.getUserTier(user);
        this.logger.log(`User ${userId} tier: ${userTier}`);
        if (!createAdDto.title) {
            throw new common_1.BadRequestException('Title is required');
        }
        if (createAdDto.title.length > 80) {
            throw new common_1.BadRequestException('Title exceeds maximum length of 80 characters');
        }
        if (createAdDto.description && createAdDto.description.length > 500) {
            throw new common_1.BadRequestException('Description exceeds maximum length of 500 characters');
        }
        if (!createAdDto.category) {
            throw new common_1.BadRequestException('Category is required');
        }
        if (!ALLOWED_CATEGORIES.includes(createAdDto.category)) {
            throw new common_1.BadRequestException(`Invalid category. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`);
        }
        if (createAdDto.condition && !ALLOWED_CONDITIONS.includes(createAdDto.condition)) {
            throw new common_1.BadRequestException('Condition must be "new" or "used"');
        }
        if (createAdDto.price < 0) {
            throw new common_1.BadRequestException('Price cannot be negative');
        }
        if (!createAdDto.currency) {
            throw new common_1.BadRequestException('Currency is required');
        }
        if (createAdDto.mediaUrls && createAdDto.mediaUrls.length > 0) {
            if (createAdDto.mediaUrls.length > MAX_IMAGES_PER_AD) {
                throw new common_1.BadRequestException(`Maximum ${MAX_IMAGES_PER_AD} images allowed per ad`);
            }
            this.logger.log(`Ad has ${createAdDto.mediaUrls.length} images`);
        }
        if (createAdDto.isVideoAd || createAdDto.videoUrl) {
            const videoValidation = this.validateVideoForTier(userTier, createAdDto.videoDuration, createAdDto.videoFileSize);
            if (!videoValidation.valid) {
                throw new common_1.BadRequestException(videoValidation.error);
            }
        }
        let priceUsd = null;
        if (createAdDto.price && createAdDto.currency) {
            priceUsd = await this.currencyService.convertToUsd(createAdDto.price, createAdDto.currency);
        }
        const qualityScore = this.calculateQualityScore(createAdDto.mediaUrls?.length || 0, !!createAdDto.videoUrl || createAdDto.isVideoAd);
        const isPremium = this.isUserPremium(user);
        this.logger.log(`User ${userId} creating ad: "${createAdDto.title}" ` +
            `(Tier: ${userTier}, Premium: ${isPremium}, Quality: ${qualityScore})`);
        const ad = this.adsRepository.create({
            title: createAdDto.title,
            description: createAdDto.description || '',
            category: createAdDto.category,
            condition: (createAdDto.condition || 'used'),
            price: createAdDto.price,
            currency: createAdDto.currency,
            priceUsd,
            location: createAdDto.location,
            mediaUrls: createAdDto.mediaUrls,
            videoUrl: createAdDto.videoUrl,
            videoDuration: createAdDto.videoDuration,
            videoFileSize: createAdDto.videoFileSize,
            hasImage: !!(createAdDto.mediaUrls && createAdDto.mediaUrls.length > 0),
            isVideoAd: !!createAdDto.videoUrl || createAdDto.isVideoAd,
            qualityScore,
            authorId: userId,
            author: user,
            isPremium,
        });
        const savedAd = await this.adsRepository.save(ad);
        await this.invalidateAdReadCaches(savedAd.id);
        return savedAd;
    }
    getUserTier(user) {
        if (user.plan) {
            switch (user.plan.toLowerCase()) {
                case 'enterprise':
                    return media_upload_dto_1.UploadPlan.ENTERPRISE;
                case 'hot_business':
                case 'hot':
                    return media_upload_dto_1.UploadPlan.HOT;
                case 'pro_business':
                case 'pro':
                    return media_upload_dto_1.UploadPlan.PRO;
                case 'premium':
                    return media_upload_dto_1.UploadPlan.PREMIUM;
                default:
                    break;
            }
        }
        if (user.role) {
            switch (user.role.toLowerCase()) {
                case 'hot':
                    return media_upload_dto_1.UploadPlan.HOT;
                case 'pro':
                    return media_upload_dto_1.UploadPlan.PRO;
                case 'premium':
                    return media_upload_dto_1.UploadPlan.PREMIUM;
                default:
                    break;
            }
        }
        return media_upload_dto_1.UploadPlan.NORMAL;
    }
    validateVideoForTier(tier, durationSeconds, fileSizeBytes) {
        const limits = media_upload_dto_1.PLAN_LIMITS[tier];
        if (durationSeconds && limits.maxDuration !== Infinity) {
            if (durationSeconds > limits.maxDuration) {
                const maxMinutes = Math.floor(limits.maxDuration / 60);
                return {
                    valid: false,
                    error: `Your plan allows a maximum video length of ${maxMinutes} minutes`,
                };
            }
        }
        if (fileSizeBytes && fileSizeBytes > limits.maxFileSize) {
            const maxMb = Math.floor(limits.maxFileSize / (1024 * 1024));
            return {
                valid: false,
                error: `Video file size exceeds plan limit of ${maxMb} MB`,
            };
        }
        return { valid: true };
    }
    calculateQualityScore(imageCount, hasVideo) {
        let score = 0;
        score += imageCount;
        if (hasVideo) {
            score += 3;
        }
        return Math.min(score, 10);
    }
    normalizePagination(page, limit) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_AD_RESULTS_PER_PAGE);
        return {
            safePage,
            safeLimit,
            skip: (safePage - 1) * safeLimit,
        };
    }
    async invalidateAdReadCaches(adId) {
        const invalidations = [
            this.cachingService.deletePattern('public:ads:list*'),
            this.cachingService.deletePattern('public:ads:trending*'),
            this.cachingService.deletePattern('public:/api/v1/ads*'),
            this.cachingService.deletePattern('public:/ads*'),
        ];
        if (adId) {
            invalidations.push(this.cachingService.delete(`public:ad:detail:${adId}`));
            invalidations.push(this.cachingService.delete(`public:/api/v1/ads/${adId}`));
            invalidations.push(this.cachingService.delete(`public:/ads/${adId}`));
        }
        await Promise.allSettled(invalidations);
    }
    isUserPremium(user) {
        if (!user.premiumExpiresAt) {
            return false;
        }
        return new Date(user.premiumExpiresAt) > new Date();
    }
    async findAll(filterDto) {
        const { category, minPrice, maxPrice, location, search, page, limit, sortBy = 'newest', } = filterDto;
        const { safePage, safeLimit, skip } = this.normalizePagination(page, limit);
        const query = this.adsRepository
            .createQueryBuilder('ad')
            .leftJoinAndSelect('ad.author', 'author')
            .select([
            'ad.id',
            'ad.title',
            'ad.description',
            'ad.category',
            'ad.condition',
            'ad.price',
            'ad.currency',
            'ad.priceUsd',
            'ad.location',
            'ad.mediaUrls',
            'ad.videoUrl',
            'ad.thumbnailUrl',
            'ad.hasImage',
            'ad.isVideoAd',
            'ad.qualityScore',
            'ad.views',
            'ad.likes',
            'ad.shares',
            'ad.maxViews',
            'ad.isActive',
            'ad.status',
            'ad.isPremium',
            'ad.isFeatured',
            'ad.createdAt',
            'ad.updatedAt',
            'author.id',
            'author.username',
            'author.profilePhoto',
            'author.role',
            'author.plan',
        ])
            .where('ad.isActive = :isActive', { isActive: true });
        if (category) {
            query.andWhere('ad.category = :category', { category });
        }
        if (minPrice !== undefined) {
            query.andWhere('ad.price >= :minPrice', { minPrice });
        }
        if (maxPrice !== undefined) {
            query.andWhere('ad.price <= :maxPrice', { maxPrice });
        }
        if (location) {
            query.andWhere('LOWER(COALESCE(ad.location, \'\')) LIKE :location', {
                location: `%${location.trim().toLowerCase()}%`,
            });
        }
        if (search) {
            const normalizedSearch = `%${search.trim().toLowerCase()}%`;
            query.andWhere(new typeorm_2.Brackets((qb) => {
                qb.where('LOWER(ad.title) LIKE :search', { search: normalizedSearch }).orWhere('LOWER(COALESCE(ad.description, \'\')) LIKE :search', { search: normalizedSearch });
            }));
        }
        switch (sortBy) {
            case 'oldest':
                query.orderBy('ad.createdAt', 'ASC');
                break;
            case 'highPrice':
                query.orderBy('ad.price', 'DESC').addOrderBy('ad.createdAt', 'DESC');
                break;
            case 'lowPrice':
                query.orderBy('ad.price', 'ASC').addOrderBy('ad.createdAt', 'DESC');
                break;
            case 'popular':
                query.orderBy('ad.views', 'DESC').addOrderBy('ad.likes', 'DESC').addOrderBy('ad.createdAt', 'DESC');
                break;
            case 'newest':
            default:
                query.orderBy('ad.createdAt', 'DESC');
                break;
        }
        const [ads, total] = await query.take(safeLimit).skip(skip).getManyAndCount();
        return new pagination_dto_1.PaginatedResponseDto(ads, total, safePage, safeLimit);
    }
    async findOne(id) {
        const ad = await this.adsRepository.findOne({
            where: { id },
            relations: ['author', 'comments', 'comments.user'],
        });
        if (!ad) {
            throw new common_1.NotFoundException('Ad not found');
        }
        return ad;
    }
    async update(id, updateAdDto, userId) {
        const ad = await this.adsRepository.findOne({ where: { id } });
        if (!ad) {
            throw new common_1.NotFoundException('Ad not found');
        }
        if (ad.authorId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own ads');
        }
        if (updateAdDto.title && updateAdDto.title.length > 80) {
            throw new common_1.BadRequestException('Title exceeds maximum length of 80 characters');
        }
        if (updateAdDto.description && updateAdDto.description.length > 500) {
            throw new common_1.BadRequestException('Description exceeds maximum length of 500 characters');
        }
        if (updateAdDto.category && !ALLOWED_CATEGORIES.includes(updateAdDto.category)) {
            throw new common_1.BadRequestException(`Invalid category. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`);
        }
        if (updateAdDto.condition && !ALLOWED_CONDITIONS.includes(updateAdDto.condition)) {
            throw new common_1.BadRequestException('Condition must be "new" or "used"');
        }
        if (updateAdDto.price !== undefined && updateAdDto.price < 0) {
            throw new common_1.BadRequestException('Price cannot be negative');
        }
        if (updateAdDto.price !== undefined || updateAdDto.currency) {
            const newPrice = updateAdDto.price ?? ad.price;
            const newCurrency = updateAdDto.currency ?? ad.currency;
            ad.priceUsd = await this.currencyService.convertToUsd(newPrice, newCurrency);
        }
        Object.assign(ad, updateAdDto);
        const updatedAd = await this.adsRepository.save(ad);
        await this.invalidateAdReadCaches(ad.id);
        return updatedAd;
    }
    async remove(id, userId) {
        const ad = await this.adsRepository.findOne({ where: { id } });
        if (!ad) {
            throw new common_1.NotFoundException('Ad not found');
        }
        if (ad.authorId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own ads');
        }
        await this.adsRepository.remove(ad);
        await this.invalidateAdReadCaches(id);
    }
    async incrementViews(id) {
        const ad = await this.adsRepository.findOne({ where: { id } });
        if (!ad) {
            throw new common_1.NotFoundException('Ad not found');
        }
        if (!ad.isActive || ad.status === 'completed') {
            return;
        }
        const maxViews = ad.maxViews && ad.maxViews > 0 ? ad.maxViews : 4000;
        if (ad.views >= maxViews) {
            ad.status = 'completed';
            ad.isActive = false;
            await this.adsRepository.save(ad);
            return;
        }
        ad.views = Math.min(ad.views + 1, maxViews);
        if (ad.views >= maxViews) {
            ad.status = 'completed';
            ad.isActive = false;
        }
        await this.adsRepository.save(ad);
        await this.redisService.incrementCounter(`ad:${id}:views`);
        await this.invalidateAdReadCaches(id);
    }
    async incrementClicks(id) {
        await this.adsRepository.increment({ id }, 'clicks', 1);
        await this.redisService.incrementCounter(`ad:${id}:clicks`);
        await this.invalidateAdReadCaches(id);
    }
    async likeAd(id) {
        await this.adsRepository.increment({ id }, 'likes', 1);
        await this.invalidateAdReadCaches(id);
    }
    async dislikeAd(id) {
        await this.adsRepository.increment({ id }, 'dislikes', 1);
        await this.invalidateAdReadCaches(id);
    }
    async shareAd(id) {
        await this.adsRepository.increment({ id }, 'shares', 1);
        await this.invalidateAdReadCaches(id);
    }
    async getTrending(limit = 10) {
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
        return this.adsRepository
            .createQueryBuilder('ad')
            .leftJoinAndSelect('ad.author', 'author')
            .select([
            'ad.id',
            'ad.title',
            'ad.category',
            'ad.price',
            'ad.currency',
            'ad.priceUsd',
            'ad.location',
            'ad.thumbnailUrl',
            'ad.hasImage',
            'ad.isVideoAd',
            'ad.qualityScore',
            'ad.views',
            'ad.likes',
            'ad.shares',
            'ad.isPremium',
            'ad.isFeatured',
            'ad.createdAt',
            'author.id',
            'author.username',
            'author.profilePhoto',
            'author.role',
            'author.plan',
        ])
            .where('ad.isActive = :isActive', { isActive: true })
            .orderBy('ad.views', 'DESC')
            .addOrderBy('ad.likes', 'DESC')
            .addOrderBy('ad.createdAt', 'DESC')
            .take(safeLimit)
            .getMany();
    }
    async getUserAds(userId, filterDto = {}) {
        const { page, limit, sortBy = 'newest' } = filterDto;
        const { safePage, safeLimit, skip } = this.normalizePagination(page, limit);
        const query = this.adsRepository
            .createQueryBuilder('ad')
            .leftJoinAndSelect('ad.author', 'author')
            .select([
            'ad.id',
            'ad.title',
            'ad.description',
            'ad.category',
            'ad.condition',
            'ad.price',
            'ad.currency',
            'ad.priceUsd',
            'ad.location',
            'ad.mediaUrls',
            'ad.videoUrl',
            'ad.thumbnailUrl',
            'ad.hasImage',
            'ad.isVideoAd',
            'ad.qualityScore',
            'ad.views',
            'ad.likes',
            'ad.shares',
            'ad.maxViews',
            'ad.isActive',
            'ad.status',
            'ad.isPremium',
            'ad.isFeatured',
            'ad.createdAt',
            'ad.updatedAt',
            'author.id',
            'author.username',
            'author.profilePhoto',
            'author.role',
            'author.plan',
        ])
            .where('ad.authorId = :userId', { userId });
        switch (sortBy) {
            case 'oldest':
                query.orderBy('ad.createdAt', 'ASC');
                break;
            case 'highPrice':
                query.orderBy('ad.price', 'DESC').addOrderBy('ad.createdAt', 'DESC');
                break;
            case 'lowPrice':
                query.orderBy('ad.price', 'ASC').addOrderBy('ad.createdAt', 'DESC');
                break;
            case 'popular':
                query.orderBy('ad.views', 'DESC').addOrderBy('ad.likes', 'DESC').addOrderBy('ad.createdAt', 'DESC');
                break;
            case 'newest':
            default:
                query.orderBy('ad.createdAt', 'DESC');
                break;
        }
        const [ads, total] = await query.take(safeLimit).skip(skip).getManyAndCount();
        return new pagination_dto_1.PaginatedResponseDto(ads, total, safePage, safeLimit);
    }
};
exports.AdsService = AdsService;
exports.AdsService = AdsService = AdsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ad_entity_1.Ad)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        redis_service_1.RedisService,
        caching_service_1.CachingService,
        currency_service_1.CurrencyService])
], AdsService);
//# sourceMappingURL=ads.service.js.map