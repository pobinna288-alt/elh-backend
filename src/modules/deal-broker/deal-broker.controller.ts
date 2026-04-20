import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DealBrokerService } from './services/deal-broker.service';
import { DealBrokerUsageLimiterService } from './services/deal-broker-usage-limiter.service';
import { NegotiationRecoveryService } from './services/negotiation-recovery.service';
import {
  TriggerAlternativeSearchDto,
  SelectAlternativeSellerDto,
  CreateDealDto,
  UpdateDealStatusDto,
} from './dto/deal-broker.dto';

@ApiTags('deal-broker')
@Controller('deal-broker')
export class DealBrokerController {
  constructor(
    private readonly dealBrokerService: DealBrokerService,
    private readonly usageLimiterService: DealBrokerUsageLimiterService,
    private readonly recoveryService: NegotiationRecoveryService,
  ) {}

  // ════════════════════════════════════════════
  // ALTERNATIVE SELLER FINDER ENDPOINTS
  // ════════════════════════════════════════════

  @Post('alternative-search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find alternative sellers after negotiation failure',
    description:
      'Triggers the AI Alternative Seller Finder when a deal negotiation fails. ' +
      'Requires active subscription (premium/pro_business/hot_business/enterprise). ' +
      'Enforces daily usage limits per plan.',
  })
  @ApiResponse({ status: 200, description: 'Alternative sellers found or no matches' })
  @ApiResponse({ status: 403, description: 'Access denied, limit reached, or subscription expired' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  @ApiResponse({ status: 400, description: 'Deal does not meet failure criteria' })
  async findAlternativeSellers(
    @Body() dto: TriggerAlternativeSearchDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;

    const result = await this.dealBrokerService.onNegotiationFailed(
      dto.dealId,
      userId,
    );

    return {
      success: true,
      tool_used: 'AI Alternative Seller Finder',
      ...result,
    };
  }

  @Post('select-seller')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select a recommended alternative seller',
    description:
      'When buyer selects a recommended seller, automatically creates a negotiation chat ' +
      'with campaign details and activates Negotiation AI.',
  })
  @ApiResponse({ status: 200, description: 'Negotiation chat created' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Search record not found' })
  async selectAlternativeSeller(
    @Body() dto: SelectAlternativeSellerDto,
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;

    const result = await this.dealBrokerService.selectAlternativeSeller(
      userId,
      dto.searchId,
      dto.sellerId,
    );

    return {
      success: true,
      tool_used: 'AI Deal Broker',
      ...result,
    };
  }

  // ════════════════════════════════════════════
  // ACCESS & STATUS ENDPOINTS
  // ════════════════════════════════════════════

  @Get('access-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Alternative Seller Finder access',
    description:
      'Returns whether the user can use the Alternative Seller Finder, ' +
      'including plan info, daily limits, and remaining uses.',
  })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkAccess(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const result = await this.dealBrokerService.checkAccess(userId);

    return {
      success: true,
      feature: 'alternative_seller_finder',
      ...result,
    };
  }

  @Get('usage-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Alternative Seller Finder usage history',
    description: 'Returns daily usage logs for the last 30 days.',
  })
  @ApiResponse({ status: 200, description: 'Usage history' })
  async getUsageHistory(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const history = await this.usageLimiterService.getUsageHistory(userId, 30);

    return {
      success: true,
      feature: 'alternative_seller_finder',
      usage_history: history,
    };
  }

  @Get('search-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get alternative seller search history',
    description: 'Returns past alternative seller searches for the user.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search history' })
  async getSearchHistory(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.userId || req.user.sub;
    const searches = await this.dealBrokerService.getSearchHistory(
      userId,
      limit || 20,
    );

    return {
      success: true,
      count: searches.length,
      searches,
    };
  }

  // ════════════════════════════════════════════
  // DEAL MANAGEMENT ENDPOINTS
  // ════════════════════════════════════════════

  @Get('deal/:dealId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get deal by ID',
    description: 'Returns deal details. Only the buyer or seller can view.',
  })
  @ApiParam({ name: 'dealId', type: String })
  @ApiResponse({ status: 200, description: 'Deal details' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async getDeal(@Param('dealId') dealId: string, @Request() req) {
    const userId = req.user.userId || req.user.sub;
    const deal = await this.dealBrokerService.getDealById(dealId, userId);

    return {
      success: true,
      deal,
    };
  }

  // ════════════════════════════════════════════
  // NEGOTIATION CHAT ENDPOINTS
  // ════════════════════════════════════════════

  @Get('chats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get negotiation chats',
    description: 'Returns all negotiation chats created via the Deal Broker.',
  })
  @ApiResponse({ status: 200, description: 'Negotiation chats list' })
  async getNegotiationChats(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const chats = await this.recoveryService.getChatsByBuyer(userId);

    return {
      success: true,
      count: chats.length,
      chats,
    };
  }

  @Get('chat/:chatId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get negotiation chat by ID',
  })
  @ApiParam({ name: 'chatId', type: String })
  @ApiResponse({ status: 200, description: 'Chat details' })
  async getNegotiationChat(@Param('chatId') chatId: string) {
    const chat = await this.recoveryService.getChatById(chatId);

    return {
      success: true,
      chat,
    };
  }
}
