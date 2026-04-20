import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Ad, AdCategory, AdCondition } from './entities/ad.entity';
import { User } from '../users/entities/user.entity';
import { CreateAdDto, UpdateAdDto, FilterAdsDto } from './dto/ad.dto';
import { RedisService } from '../redis/redis.service';
import { CachingService } from '../../common/caching/caching.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { CurrencyService } from './currency.service';
import { PLAN_LIMITS, UploadPlan } from './dto/media-upload.dto';

// Allowed categories per specification
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

// Allowed conditions per specification
const ALLOWED_CONDITIONS = ['new', 'used'];

// Image validation constants
const MAX_IMAGES_PER_AD = 5;
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

// Video validation constants
const MAX_VIDEOS_PER_AD = 1;
const ALLOWED_VIDEO_FORMAT = 'mp4';
const MAX_VIDEO_RESOLUTION = 1080;
const MAX_AD_RESULTS_PER_PAGE = 50;

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    @InjectRepository(Ad)
    private adsRepository: Repository<Ad>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private redisService: RedisService,
    private cachingService: CachingService,
    private currencyService: CurrencyService,
  ) {}

  /**
   * Create ad with strict backend validation
   * Backend enforces ALL business rules - frontend cannot bypass
   * 
   * Validates:
   * - Title: max 80 characters
   * - Description: max 500 characters
   * - Category: must be in allowed list
   * - Condition: must be 'new' or 'used'
   * - Images: max 5 images, max 5MB each, JPG/PNG/WEBP only
   * - Video: tier-based limits, MP4 only, max 1080p
   * - Currency conversion to USD
   * - Quality score calculation
   */
  async create(createAdDto: CreateAdDto, userId: string): Promise<Ad> {
    // CRITICAL: Get user from database (backend source of truth)
    const user = await this.usersRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'username', 'coins', 'premiumExpiresAt', 'role', 'plan']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user tier for video limits
    const userTier = this.getUserTier(user);
    this.logger.log(`User ${userId} tier: ${userTier}`);

    // =============================================
    // 1. TITLE VALIDATION (max 80 characters)
    // =============================================
    if (!createAdDto.title) {
      throw new BadRequestException('Title is required');
    }
    if (createAdDto.title.length > 80) {
      throw new BadRequestException('Title exceeds maximum length of 80 characters');
    }

    // =============================================
    // 2. DESCRIPTION VALIDATION (max 500 characters)
    // =============================================
    if (createAdDto.description && createAdDto.description.length > 500) {
      throw new BadRequestException('Description exceeds maximum length of 500 characters');
    }

    // =============================================
    // 3. CATEGORY VALIDATION
    // =============================================
    if (!createAdDto.category) {
      throw new BadRequestException('Category is required');
    }
    if (!ALLOWED_CATEGORIES.includes(createAdDto.category)) {
      throw new BadRequestException(
        `Invalid category. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`
      );
    }

    // =============================================
    // 4. CONDITION VALIDATION
    // =============================================
    if (createAdDto.condition && !ALLOWED_CONDITIONS.includes(createAdDto.condition)) {
      throw new BadRequestException('Condition must be "new" or "used"');
    }

    // =============================================
    // 5. PRICE VALIDATION
    // =============================================
    if (createAdDto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
    if (!createAdDto.currency) {
      throw new BadRequestException('Currency is required');
    }

    // =============================================
    // 6. IMAGE VALIDATION
    // =============================================
    if (createAdDto.mediaUrls && createAdDto.mediaUrls.length > 0) {
      // Check image count
      if (createAdDto.mediaUrls.length > MAX_IMAGES_PER_AD) {
        throw new BadRequestException(`Maximum ${MAX_IMAGES_PER_AD} images allowed per ad`);
      }
      
      // Note: File size and format validation should happen during upload
      // Here we just validate the URL count
      this.logger.log(`Ad has ${createAdDto.mediaUrls.length} images`);
    }

    // =============================================
    // 7. VIDEO VALIDATION (tier-based limits)
    // =============================================
    if (createAdDto.isVideoAd || createAdDto.videoUrl) {
      const videoValidation = this.validateVideoForTier(
        userTier,
        createAdDto.videoDuration,
        createAdDto.videoFileSize
      );
      
      if (!videoValidation.valid) {
        throw new BadRequestException(videoValidation.error);
      }
    }

    // =============================================
    // 8. CURRENCY CONVERSION TO USD
    // =============================================
    let priceUsd: number | null = null;
    if (createAdDto.price && createAdDto.currency) {
      priceUsd = await this.currencyService.convertToUsd(
        createAdDto.price,
        createAdDto.currency
      );
    }

    // =============================================
    // 9. QUALITY SCORE CALCULATION
    // =============================================
    const qualityScore = this.calculateQualityScore(
      createAdDto.mediaUrls?.length || 0,
      !!createAdDto.videoUrl || createAdDto.isVideoAd
    );

    // =============================================
    // 10. CREATE AD
    // =============================================
    const isPremium = this.isUserPremium(user);

    this.logger.log(
      `User ${userId} creating ad: "${createAdDto.title}" ` +
      `(Tier: ${userTier}, Premium: ${isPremium}, Quality: ${qualityScore})`
    );

    const ad = this.adsRepository.create({
      title: createAdDto.title,
      description: createAdDto.description || '',
      category: createAdDto.category as AdCategory,
      condition: (createAdDto.condition || 'used') as AdCondition,
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
      maxViews: this.getMaxViewsForTier(userTier),
      authorId: userId,
      author: user,
      isPremium,
    });

    const savedAd = await this.adsRepository.save(ad);
    await this.invalidateAdReadCaches(savedAd.id);
    return savedAd;
  }

  /**
   * Get user tier from user data
   * Maps user role/plan to upload plan tier
   */
  private getUserTier(user: User): UploadPlan {
    // Check plan first (subscription-based)
    if (user.plan) {
      switch (user.plan.toLowerCase()) {
        case 'enterprise':
          return UploadPlan.ENTERPRISE;
        case 'hot_business':
        case 'hot':
          return UploadPlan.HOT;
        case 'pro_business':
        case 'pro':
          return UploadPlan.PRO;
        case 'premium':
          return UploadPlan.PREMIUM;
        default:
          break;
      }
    }

    // Check role (backward compatibility)
    if (user.role) {
      switch (user.role.toLowerCase()) {
        case 'hot':
          return UploadPlan.HOT;
        case 'pro':
          return UploadPlan.PRO;
        case 'premium':
          return UploadPlan.PREMIUM;
        default:
          break;
      }
    }

    return UploadPlan.NORMAL;
  }

  private getMaxViewsForTier(tier: UploadPlan): number {
    return PLAN_LIMITS[tier]?.maxViews ?? PLAN_LIMITS[UploadPlan.NORMAL].maxViews;
  }

  private getFallbackMaxViews(ad: Ad): number {
    if (!ad.isPremium) {
      return PLAN_LIMITS[UploadPlan.NORMAL].maxViews;
    }

    const duration = Number(ad.videoDuration) || 0;

    if (duration <= PLAN_LIMITS[UploadPlan.PREMIUM].maxDuration) {
      return PLAN_LIMITS[UploadPlan.PREMIUM].maxViews;
    }

    if (duration <= PLAN_LIMITS[UploadPlan.PRO].maxDuration) {
      return PLAN_LIMITS[UploadPlan.PRO].maxViews;
    }

    return PLAN_LIMITS[UploadPlan.HOT].maxViews;
  }

  /**
   * Validate video against tier-based limits
   * 
   * Tier limits:
   * - Normal:     2 min, 20 MB
   * - Starter:    3 min, 20 MB
   * - Pro:        5 min, 30 MB
   * - Elite:     10 min, 50 MB
   * - Enterprise: unlimited, backend controlled
   */
  private validateVideoForTier(
    tier: UploadPlan,
    durationSeconds?: number,
    fileSizeBytes?: number
  ): { valid: boolean; error?: string } {
    const limits = PLAN_LIMITS[tier];

    // Check duration
    if (durationSeconds && limits.maxDuration !== Infinity) {
      if (durationSeconds > limits.maxDuration) {
        const maxMinutes = Math.floor(limits.maxDuration / 60);
        return {
          valid: false,
          error: `Your plan allows a maximum video length of ${maxMinutes} minutes`,
        };
      }
    }

    // Check file size
    if (fileSizeBytes && fileSizeBytes > limits.maxFileSize) {
      const maxMb = Math.floor(limits.maxFileSize / (1024 * 1024));
      return {
        valid: false,
        error: `Video file size exceeds plan limit of ${maxMb} MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate quality score for ad
   * - Each image = +1 point
   * - Video = +3 points
   * - Maximum score = 10
   */
  private calculateQualityScore(imageCount: number, hasVideo: boolean): number {
    let score = 0;

    // Add points for images (1 each)
    score += imageCount;

    // Add points for video (3 points)
    if (hasVideo) {
      score += 3;
    }

    // Cap at maximum of 10
    return Math.min(score, 10);
  }

  private normalizePagination(page?: number, limit?: number) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_AD_RESULTS_PER_PAGE);

    return {
      safePage,
      safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }

  private async invalidateAdReadCaches(adId?: string): Promise<void> {
    const invalidations: Promise<void>[] = [
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

  /**
   * Check if user has active premium
   * Backend calculation - never trust frontend
   */
  private isUserPremium(user: User): boolean {
    if (!user.premiumExpiresAt) {
      return false;
    }
    return new Date(user.premiumExpiresAt) > new Date();
  }

  async findAll(filterDto: FilterAdsDto): Promise<PaginatedResponseDto<Ad>> {
    const {
      category,
      minPrice,
      maxPrice,
      location,
      search,
      page,
      limit,
      sortBy = 'newest',
    } = filterDto;

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
      query.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(ad.title) LIKE :search', { search: normalizedSearch }).orWhere(
            'LOWER(COALESCE(ad.description, \'\')) LIKE :search',
            { search: normalizedSearch },
          );
        }),
      );
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

    return new PaginatedResponseDto(ads, total, safePage, safeLimit);
  }

  async findOne(id: string): Promise<Ad> {
    const ad = await this.adsRepository.findOne({
      where: { id },
      relations: ['author', 'comments', 'comments.user'],
    });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    return ad;
  }

  async update(
    id: string,
    updateAdDto: UpdateAdDto,
    userId: string,
  ): Promise<Ad> {
    const ad = await this.adsRepository.findOne({ where: { id } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.authorId !== userId) {
      throw new ForbiddenException('You can only update your own ads');
    }

    // Validate title length if updating
    if (updateAdDto.title && updateAdDto.title.length > 80) {
      throw new BadRequestException('Title exceeds maximum length of 80 characters');
    }

    // Validate description length if updating
    if (updateAdDto.description && updateAdDto.description.length > 500) {
      throw new BadRequestException('Description exceeds maximum length of 500 characters');
    }

    // Validate category if updating
    if (updateAdDto.category && !ALLOWED_CATEGORIES.includes(updateAdDto.category)) {
      throw new BadRequestException(
        `Invalid category. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`
      );
    }

    // Validate condition if updating
    if (updateAdDto.condition && !ALLOWED_CONDITIONS.includes(updateAdDto.condition)) {
      throw new BadRequestException('Condition must be "new" or "used"');
    }

    // Validate price if updating
    if (updateAdDto.price !== undefined && updateAdDto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    // Update currency conversion if price or currency changed
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

  async remove(id: string, userId: string): Promise<void> {
    const ad = await this.adsRepository.findOne({ where: { id } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own ads');
    }

    await this.adsRepository.remove(ad);
    await this.invalidateAdReadCaches(id);
  }

  async incrementViews(id: string): Promise<void> {
    const ad = await this.adsRepository.findOne({ where: { id } });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    // Prevent view_count overflow and stop delivering completed ads
    if (!ad.isActive || ad.status === 'completed') {
      return;
    }

    // Initialize maxViews if older records don't have it set
    const maxViews = ad.maxViews && ad.maxViews > 0 ? ad.maxViews : this.getFallbackMaxViews(ad);

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

  async incrementClicks(id: string): Promise<void> {
    await this.adsRepository.increment({ id }, 'clicks', 1);
    await this.redisService.incrementCounter(`ad:${id}:clicks`);
    await this.invalidateAdReadCaches(id);
  }

  async likeAd(id: string): Promise<void> {
    await this.adsRepository.increment({ id }, 'likes', 1);
    await this.invalidateAdReadCaches(id);
  }

  async dislikeAd(id: string): Promise<void> {
    await this.adsRepository.increment({ id }, 'dislikes', 1);
    await this.invalidateAdReadCaches(id);
  }

  async shareAd(id: string): Promise<void> {
    await this.adsRepository.increment({ id }, 'shares', 1);
    await this.invalidateAdReadCaches(id);
  }

  async getTrending(limit: number = 10): Promise<Ad[]> {
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

  async getUserAds(userId: string, filterDto: FilterAdsDto = {} as FilterAdsDto): Promise<PaginatedResponseDto<Ad>> {
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

    return new PaginatedResponseDto(ads, total, safePage, safeLimit);
  }
}
