import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AiToolsService } from './ai-tools.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  SmartCopywriterDto,
  NegotiationAiDto,
  CompetitorAnalyzerDto,
  AudienceExpansionDto,
  AdImproverDto,
  MarketSuggestionDto,
} from './dto/ai-tools.dto';
import { AiUsageService, AiToolName } from './ai-usage.service';
import { NegotiationAIService } from '../negotiation-ai/services/negotiation-ai.service';

@ApiTags('ai-tools')
@Controller('ai-tools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiToolsController {
  constructor(
    private readonly aiToolsService: AiToolsService,
    private readonly aiUsageService: AiUsageService,
    private readonly negotiationAIService: NegotiationAIService,
  ) {}

  @Post('smart-copywriter')
  @ApiOperation({ summary: 'Generate ad copy with AI (Premium)' })
  async smartCopywriter(@Body() dto: SmartCopywriterDto, @Request() req) {
    const userId = req.user.userId;
    const { remainingDailyUsage } = await this.aiUsageService.consume(
      userId,
      'smart_copywriter',
    );
    const aiResult = await this.aiToolsService.smartCopywriter(dto);

    return {
      result: aiResult,
      tool_used: 'Smart Copywriter',
      remaining_daily_usage: remainingDailyUsage,
    };
  }

  @Post('negotiation-ai')
  @ApiOperation({ summary: 'Get AI negotiation suggestions (Premium) — uses Negotiation AI access control' })
  async negotiationAi(@Body() dto: NegotiationAiDto, @Request() req) {
    const userId = req.user.userId || req.user.sub;

    // Use the new Negotiation AI access control and usage tracking
    const response = await this.negotiationAIService.useNegotiationAI(userId, {
      originalPrice: dto.originalPrice,
      offeredPrice: dto.offeredPrice,
      productCategory: dto.productCategory,
    });

    return {
      result: response.result,
      tool_used: 'Negotiation AI',
      remaining_daily_usage: response.usage.remaining,
      daily_used: response.usage.dailyUsed,
      daily_limit: response.usage.dailyLimit,
    };
  }

  @Post('competitor-analyzer')
  @ApiOperation({ summary: 'Analyze competitor ads (Premium)' })
  async competitorAnalyzer(@Body() dto: CompetitorAnalyzerDto, @Request() req) {
    const userId = req.user.userId;
    const { remainingDailyUsage } = await this.aiUsageService.consume(
      userId,
      'competitor_analyzer',
    );
    const aiResult = await this.aiToolsService.competitorAnalyzer(dto);

    return {
      result: aiResult,
      tool_used: 'Competitor Analyzer',
      remaining_daily_usage: remainingDailyUsage,
    };
  }

  @Post('audience-expansion')
  @ApiOperation({ summary: 'Get audience expansion suggestions (Enterprise only)' })
  async audienceExpansion(@Body() dto: AudienceExpansionDto, @Request() req) {
    const role = String(req.user?.role || '').toLowerCase();
    const plan = String(req.user?.plan || '').toLowerCase();
    const hasAudienceExpansionAccess = role === 'admin' || plan === 'enterprise';

    if (!hasAudienceExpansionAccess) {
      throw new ForbiddenException('This feature requires an Enterprise subscription');
    }

    const userId = req.user.userId;
    const { remainingDailyUsage } = await this.aiUsageService.consume(
      userId,
      'market_suggestion',
    );
    const aiResult = await this.aiToolsService.audienceExpansion(dto);

    return {
      result: aiResult,
      tool_used: 'Audience Expansion',
      remaining_daily_usage: remainingDailyUsage,
    };
  }

  @Post('ad-improver')
  @ApiOperation({ summary: 'Improve existing ad text (Premium)' })
  async adImprover(@Body() dto: AdImproverDto, @Request() req) {
    const userId = req.user.userId;
    const { remainingDailyUsage } = await this.aiUsageService.consume(
      userId,
      'ad_improver',
    );
    const aiResult = await this.aiToolsService.adImprover(dto);

    return {
      result: aiResult,
      tool_used: 'Ad Improver',
      remaining_daily_usage: remainingDailyUsage,
    };
  }

  @Post('market-suggestion')
  @ApiOperation({ summary: 'Market suggestion AI (Premium)' })
  async marketSuggestion(@Body() dto: MarketSuggestionDto, @Request() req) {
    const userId = req.user.userId;
    const { remainingDailyUsage } = await this.aiUsageService.consume(
      userId,
      'market_suggestion',
    );
    const aiResult = await this.aiToolsService.marketSuggestion(dto);

    return {
      result: aiResult,
      tool_used: 'Market Suggestion AI',
      remaining_daily_usage: remainingDailyUsage,
    };
  }
}
