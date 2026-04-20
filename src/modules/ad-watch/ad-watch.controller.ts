import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdWatchService } from './ad-watch.service';
import {
  AdProgressDto,
  StartWatchSessionDto,
  AdProgressResponseDto,
  WatchSessionResponseDto,
  AdCompletionResponseDto,
  WatchStatsResponseDto,
} from './dto/ad-watch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Ad Watch Controller
 * 
 * Handles the Watch Ad & Earn Coins feature.
 * All coin calculations and validations are performed server-side.
 * Frontend values are NEVER trusted.
 * 
 * Key endpoints:
 * - POST /api/ad-watch/start - Start watching an ad
 * - POST /api/ad-watch/progress - Report watch progress (triggers milestone rewards)
 * - GET /api/ad-watch/stats - Get user's watch statistics
 * - GET /api/ad-watch/status/:adId - Get completion status for an ad
 */
@ApiTags('ad-watch')
@Controller('ad-watch')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdWatchController {
  constructor(private readonly adWatchService: AdWatchService) {}

  /**
   * Start a new watch session
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start watching an ad',
    description:
      'Initiates a watch session for an ad. Returns session info including max coins and milestone rewards.',
  })
  @ApiResponse({
    status: 200,
    description: 'Watch session started successfully',
    type: WatchSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Already completed this ad' })
  @ApiResponse({ status: 403, description: 'Cannot watch own ads' })
  @ApiResponse({ status: 404, description: 'Ad not found' })
  async startWatchSession(
    @Body() dto: StartWatchSessionDto,
    @Request() req,
  ): Promise<WatchSessionResponseDto> {
    return this.adWatchService.startWatchSession(req.user.sub, dto.adId);
  }

  /**
   * Report watch progress (alias: POST /api/ad-progress)
   */
  @Post('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
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
  })
  @ApiResponse({
    status: 200,
    description: 'Progress recorded, coins granted if milestone reached',
    type: AdProgressResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid progress or anti-cheat violation' })
  @ApiResponse({ status: 403, description: 'Daily coin limit reached' })
  async reportProgress(
    @Body() dto: AdProgressDto,
    @Request() req,
  ): Promise<AdProgressResponseDto> {
    return this.adWatchService.processAdProgress(req.user.sub, dto);
  }

  /**
   * Legacy endpoint: POST /api/ad-progress
   * Alias for reportProgress to maintain backward compatibility
   */
  @Post('/ad-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report ad watch progress (legacy endpoint)',
    description: 'Same as POST /api/ad-watch/progress',
  })
  async reportProgressLegacy(
    @Body() dto: AdProgressDto,
    @Request() req,
  ): Promise<AdProgressResponseDto> {
    return this.adWatchService.processAdProgress(req.user.sub, dto);
  }

  /**
   * Get user's watch statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get watch statistics',
    description:
      'Returns user watch stats including balance, streak, daily earnings, and active boost events.',
  })
  @ApiResponse({
    status: 200,
    description: 'Watch statistics retrieved',
    type: WatchStatsResponseDto,
  })
  async getWatchStats(@Request() req): Promise<WatchStatsResponseDto> {
    return this.adWatchService.getWatchStats(req.user.sub);
  }

  /**
   * Get completion status for a specific ad
   */
  @Get('status/:adId')
  @ApiParam({ name: 'adId', description: 'ID of the ad' })
  @ApiOperation({
    summary: 'Get ad completion status',
    description: 'Check if user has completed watching a specific ad and coins earned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ad completion status',
    type: AdCompletionResponseDto,
  })
  async getAdStatus(
    @Param('adId') adId: string,
    @Request() req,
  ): Promise<AdCompletionResponseDto> {
    return this.adWatchService.getAdCompletionStatus(req.user.sub, adId);
  }
}
