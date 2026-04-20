import {
  Controller,
  Post,
  Get,
  Body,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NegotiationAIService } from './services/negotiation-ai.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageLimiterService } from './services/usage-limiter.service';
import {
  NegotiationAiRequestDto,
  ActivateSubscriptionDto,
} from './dto/negotiation-ai.dto';
import { SubscriptionPlan } from '../users/entities/user.entity';

@ApiTags('negotiation-ai')
@Controller('negotiation-ai')
export class NegotiationAiController {
  constructor(
    private readonly negotiationAIService: NegotiationAIService,
    private readonly subscriptionService: SubscriptionService,
    private readonly usageLimiterService: UsageLimiterService,
  ) {}

  // ========================================
  // NEGOTIATION AI ENDPOINTS
  // ========================================

  /**
   * POST /negotiation-ai/reply
   * Generate a Negotiation AI reply.
   * Validates access, enforces limits, tracks usage.
   */
  @Post('reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get AI negotiation reply',
    description:
      'Generates an AI-powered negotiation response. Requires active subscription with Negotiation AI access. Enforces daily usage limits per plan.',
  })
  @ApiResponse({ status: 200, description: 'AI negotiation reply generated' })
  @ApiResponse({ status: 403, description: 'Access denied or daily limit reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized - valid token required' })
  async getNegotiationReply(
    @Body() dto: NegotiationAiRequestDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;

    const response = await this.negotiationAIService.useNegotiationAI(userId, {
      originalPrice: dto.originalPrice,
      offeredPrice: dto.offeredPrice,
      productCategory: dto.productCategory,
      context: dto.context,
    });

    return {
      success: true,
      tool_used: 'Negotiation AI',
      ...response,
    };
  }

  /**
   * GET /negotiation-ai/access-check
   * Check if user can use Negotiation AI (without consuming a use).
   */
  @Get('access-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Negotiation AI access',
    description:
      'Returns whether the user can currently use Negotiation AI, including plan, limits, and remaining uses.',
  })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const result = await this.negotiationAIService.canUseNegotiationAI(userId);
    return result;
  }

  /**
   * GET /negotiation-ai/status
   * Get full Negotiation AI status for the user.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Negotiation AI status',
    description:
      'Returns the user plan, subscription status, AI enabled state, daily usage, and limits.',
  })
  @ApiResponse({ status: 200, description: 'Negotiation AI status' })
  async getStatus(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    return this.negotiationAIService.getNegotiationAIStatus(userId);
  }

  /**
   * GET /negotiation-ai/usage-history
   * Get usage history for analytics.
   */
  @Get('usage-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Negotiation AI usage history',
    description: 'Returns the last 30 days of Negotiation AI usage logs.',
  })
  @ApiResponse({ status: 200, description: 'Usage history' })
  async getUsageHistory(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const history = await this.usageLimiterService.getUsageHistory(userId, 30);
    return { usage_history: history };
  }

  // ========================================
  // SUBSCRIPTION ENDPOINTS
  // ========================================

  /**
   * POST /negotiation-ai/subscription/activate
   * Activate a subscription plan (called after payment succeeds).
   */
  @Post('subscription/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate subscription after payment',
    description:
      'Triggers subscription activation: updates plan, enables Negotiation AI, sets expiry. Called after successful payment (money or coins).',
  })
  @ApiResponse({ status: 200, description: 'Subscription activated' })
  @ApiResponse({ status: 400, description: 'Invalid plan' })
  async activateSubscription(
    @Body() dto: ActivateSubscriptionDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;
    const plan = dto.plan as SubscriptionPlan;

    const result = await this.subscriptionService.onSubscriptionActivated(
      userId,
      plan,
    );

    return {
      success: true,
      message: 'Subscription activated successfully. Negotiation AI is now available.',
      subscription_status: 'active',
      plan: result.user.plan,
      subscription_expiry: result.subscriptionExpiry,
      negotiation_ai_enabled: result.negotiationAiEnabled,
    };
  }

  /**
   * GET /negotiation-ai/subscription/status
   * Get current subscription status.
   */
  @Get('subscription/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription status',
    description: 'Returns the current subscription plan, active status, and expiry date.',
  })
  @ApiResponse({ status: 200, description: 'Subscription status' })
  async getSubscriptionStatus(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    return this.subscriptionService.getSubscriptionStatus(userId);
  }
}
