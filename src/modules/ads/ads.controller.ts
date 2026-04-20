import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { MediaService } from './media.service';
import { AiDescriptionService } from './ai-description.service';
import { AdRewriteService } from './ad-rewrite.service';
import { AdWriterService } from './ad-writer.service';
import { AdPersuasiveService } from './ad-persuasive.service';
import { AdHighConvertingService } from './ad-high-converting.service';
import { CreateAdDto, UpdateAdDto, FilterAdsDto } from './dto/ad.dto';
import { UploadVideoDto, MediaUploadResponseDto, NormalVideoUploadResponseDto, UploadPlan } from './dto/media-upload.dto';
import { GenerateDescriptionDto, DescriptionResponseDto } from './dto/ai-description.dto';
import { RewriteDescriptionDto, RewriteResponseDto } from './dto/ad-rewrite.dto';
import { WriteDescriptionDto, WriteResponseDto } from './dto/ad-writer.dto';
import { PersuasiveDescriptionDto, PersuasiveResponseDto } from './dto/ad-persuasive.dto';
import { HighConvertingDescriptionDto, HighConvertingResponseDto } from './dto/ad-high-converting.dto';
import { WalletService } from '../wallet/wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CacheKey, CacheTTL, NoCache } from '../../common/caching/decorators/cache.decorators';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly mediaService: MediaService,
    private readonly aiDescriptionService: AiDescriptionService,
    private readonly adRewriteService: AdRewriteService,
    private readonly adWriterService: AdWriterService,
    private readonly adPersuasiveService: AdPersuasiveService,
    private readonly adHighConvertingService: AdHighConvertingService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create a new ad with strict backend validation
   * 
   * Endpoint: POST /api/ads/create
   * 
   * Validates:
   * - title: max 80 characters
   * - description: max 500 characters  
   * - category: Electronics, Vehicles, Real Estate, Fashion, Phones, Computers, Home & Furniture, Services
   * - condition: 'new' or 'used'
   * - images: max 5, max 5MB each, JPG/PNG/WEBP
   * - video: tier-based limits (Normal: 2min/25MB, Premium: 3min/40MB, Pro: 5min/60MB, Hot: 10min/80MB, Enterprise: unlimited)
   * - price: positive number with currency
   * 
   * Returns created ad with quality_score calculated automatically
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new ad with full validation',
    description: 'Creates a new ad with strict server-side validation of all fields including tier-based video limits'
  })
  @ApiResponse({ status: 201, description: 'Ad created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error (title/description/category/condition/image/video)' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async createAd(@Body() createAdDto: CreateAdDto, @Request() req) {
    return this.adsService.create(createAdDto, req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new ad (legacy endpoint)' })
  @ApiResponse({ status: 201, description: 'Ad created successfully' })
  create(@Body() createAdDto: CreateAdDto, @Request() req) {
    return this.adsService.create(createAdDto, req.user.userId);
  }

  @Get()
  @CacheTTL(60)
  @CacheKey('ads:list')
  @ApiOperation({ summary: 'Get all ads with filters' })
  @ApiResponse({ status: 200, description: 'Return all ads' })
  findAll(@Query() filterDto: FilterAdsDto) {
    return this.adsService.findAll(filterDto);
  }

  @Get('trending')
  @CacheTTL(45)
  @CacheKey('ads:trending')
  @ApiOperation({ summary: 'Get trending ads' })
  @ApiResponse({ status: 200, description: 'Return trending ads' })
  getTrending(@Query('limit') limit?: number) {
    return this.adsService.getTrending(limit ? Number(limit) : undefined);
  }

  @Get('my-ads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @NoCache()
  @ApiOperation({ summary: 'Get current user ads' })
  @ApiResponse({ status: 200, description: 'Return user ads' })
  getMyAds(@Request() req, @Query() filterDto: FilterAdsDto) {
    return this.adsService.getUserAds(req.user.userId, filterDto);
  }

  @Get(':id')
  @CacheTTL(120)
  @CacheKey('ad:detail::id')
  @ApiOperation({ summary: 'Get ad by ID' })
  @ApiResponse({ status: 200, description: 'Return ad details' })
  @ApiResponse({ status: 404, description: 'Ad not found' })
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ad' })
  @ApiResponse({ status: 200, description: 'Ad updated successfully' })
  update(@Param('id') id: string, @Body() updateAdDto: UpdateAdDto, @Request() req) {
    return this.adsService.update(id, updateAdDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete ad' })
  @ApiResponse({ status: 200, description: 'Ad deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.adsService.remove(id, req.user.userId);
  }

  @Post('upload-video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('video'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and process video for ad' })
  @ApiBody({
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
  })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded and processed successfully',
    type: MediaUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or exceeds plan limits',
  })
  @ApiResponse({
    status: 403,
    description: 'Plan not accessible for user role',
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
  })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadVideoDto,
    @Request() req,
  ): Promise<MediaUploadResponseDto | NormalVideoUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No video file provided');
    }

    // Validate user has access to requested plan
    const hasAccess = this.mediaService.validatePlanAccess(
      req.user.role,
      uploadDto.plan,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Your account does not have access to the ${uploadDto.plan} plan`,
      );
    }

    // Process the video (server-side duration verification)
    const uploadResult = await this.mediaService.uploadVideo(file, uploadDto.plan);

    // Resolve authenticated user ID in a backend-controlled way
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    if (!userId) {
      throw new BadRequestException('Authenticated user ID is missing in token payload');
    }

    // NORMAL USER video advertisement rules
    const userRole = (req.user.role || '').toLowerCase();

    if (userRole === 'user' && uploadDto.plan === UploadPlan.NORMAL) {
      const duration = uploadResult.duration;

      // Coin reward system based on duration (seconds)
      let coinsEarned = 0;
      if (duration <= 30) {
        coinsEarned = 5;
      } else if (duration <= 60) {
        coinsEarned = 10;
      } else if (duration <= 90) {
        coinsEarned = 15;
      } else if (duration <= 120) {
        coinsEarned = 20;
      }

      // Enforce maximum 20 coins per video
      coinsEarned = Math.min(coinsEarned, 20);

      let totalCoins = 0;

      if (coinsEarned > 0) {
        // Backend-only coin update to prevent manual manipulation
        const coinsResponse = await this.walletService.addCoins(userId, {
          amount: coinsEarned,
          reason: 'normal_video_upload_reward',
        });

        totalCoins = coinsResponse.coins;
      } else {
        totalCoins = await this.walletService.getBalance(userId);
      }

      // Return normalized response for NORMAL plan users
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

    // For non-normal plans, return the standard media upload response
    return uploadResult;
  }

  @Post('generate-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI-powered ad description' })
  @ApiResponse({
    status: 201,
    description: 'Description generated successfully',
    type: DescriptionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Plan not accessible for user role',
  })
  async generateDescription(
    @Body() dto: GenerateDescriptionDto,
    @Request() req,
  ): Promise<DescriptionResponseDto> {
    // Validate user has access to requested plan
    const hasAccess = this.aiDescriptionService.validatePlanAccess(
      req.user.role,
      dto.plan,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Your account does not have access to the ${dto.plan} plan`,
      );
    }

    const description = await this.aiDescriptionService.generateDescription(
      dto.title,
      dto.category,
      dto.price,
      dto.location,
      dto.plan,
      dto.additionalInfo,
    );

    return {
      description,
      wordCount: description.split(/\s+/).length,
      plan: dto.plan,
    };
  }

  @Post('rewrite-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rewrite text into clear ad description' })
  @ApiResponse({
    status: 201,
    description: 'Description rewritten successfully',
    type: RewriteResponseDto,
  })
  async rewriteDescription(
    @Body() dto: RewriteDescriptionDto,
  ): Promise<RewriteResponseDto> {
    const rewrittenText = await this.adRewriteService.rewriteDescription(dto.text);
    
    return {
      rewrittenText,
      wordCount: this.adRewriteService.countWords(rewrittenText),
    };
  }

  @Post('write-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Write appealing ad description' })
  @ApiResponse({
    status: 201,
    description: 'Description written successfully',
    type: WriteResponseDto,
  })
  async writeDescription(
    @Body() dto: WriteDescriptionDto,
  ): Promise<WriteResponseDto> {
    const description = await this.adWriterService.writeDescription(
      dto.title,
      dto.category,
      dto.price,
      dto.location,
      dto.keyFeatures,
    );
    
    return {
      description,
      wordCount: this.adWriterService.countWords(description),
    };
  }

  @Post('persuasive-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create persuasive ad description for engagement' })
  @ApiResponse({
    status: 201,
    description: 'Persuasive description created successfully',
    type: PersuasiveResponseDto,
  })
  async createPersuasiveDescription(
    @Body() dto: PersuasiveDescriptionDto,
  ): Promise<PersuasiveResponseDto> {
    const description = await this.adPersuasiveService.createPersuasiveDescription(
      dto.title,
      dto.category,
      dto.price,
      dto.location,
      dto.keyFeatures,
    );
    
    return {
      description,
      wordCount: this.adPersuasiveService.countWords(description),
    };
  }

  @Post('high-converting-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate high-converting ad description' })
  @ApiResponse({
    status: 201,
    description: 'High-converting description generated successfully',
    type: HighConvertingResponseDto,
  })
  async generateHighConvertingDescription(
    @Body() dto: HighConvertingDescriptionDto,
  ): Promise<HighConvertingResponseDto> {
    const description = await this.adHighConvertingService.generateHighConvertingDescription(
      dto.title,
      dto.category,
      dto.price,
      dto.location,
      dto.keyFeatures,
      dto.urgency,
    );
    
    return {
      description,
      wordCount: this.adHighConvertingService.countWords(description),
    };
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment ad view count' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  incrementViews(@Param('id') id: string) {
    return this.adsService.incrementViews(id);
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Increment ad click count' })
  @ApiResponse({ status: 200, description: 'Click count incremented' })
  incrementClicks(@Param('id') id: string) {
    return this.adsService.incrementClicks(id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like ad' })
  @ApiResponse({ status: 200, description: 'Ad liked' })
  likeAd(@Param('id') id: string) {
    return this.adsService.likeAd(id);
  }

  @Post(':id/dislike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dislike ad' })
  @ApiResponse({ status: 200, description: 'Ad disliked' })
  dislikeAd(@Param('id') id: string) {
    return this.adsService.dislikeAd(id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share ad' })
  @ApiResponse({ status: 200, description: 'Ad shared' })
  shareAd(@Param('id') id: string) {
    return this.adsService.shareAd(id);
  }
}
