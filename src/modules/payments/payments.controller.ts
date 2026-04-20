import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * BACKEND-ONLY Payment Controller
 * 
 * ⚠️ SECURITY ARCHITECTURE:
 * 1. All routes are protected by JWT authentication
 * 2. API keys NEVER exposed to frontend
 * 3. All payment operations happen server-side
 * 4. Only safe URLs returned to client
 */
@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create Stripe Checkout Session
   * 
   * FLOW:
   * 1. Frontend calls this endpoint (authenticated)
   * 2. Backend creates checkout session using SECRET_KEY (server-side)
   * 3. Backend returns only the checkout URL (safe to expose)
   * 4. Frontend redirects user to Stripe checkout page
   */
  @Post('stripe/create-checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created' })
  async createStripeCheckout(
    @Body() body: { plan: 'premium' | 'pro' | 'hot' },
    @Request() req,
  ) {
    const { url, sessionId } = await this.paymentsService.createStripeCheckout(
      body.plan,
      req.user.userId,
    );

    // ✅ SAFE: Only returning URL, not API keys
    return {
      success: true,
      checkoutUrl: url,
      sessionId,
      message: 'Redirect user to checkout URL',
    };
  }

  /**
   * Initialize Paystack Payment
   * 
   * FLOW:
   * 1. Frontend calls this endpoint (authenticated)
   * 2. Backend initializes payment using SECRET_KEY (server-side)
   * 3. Backend returns only the authorization URL (safe to expose)
   * 4. Frontend redirects user to Paystack payment page
   */
  @Post('paystack/initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize Paystack payment' })
  @ApiResponse({ status: 200, description: 'Payment initialized' })
  async initializePaystackPayment(
    @Body() body: { plan: 'premium' | 'pro' | 'hot'; email: string },
    @Request() req,
  ) {
    const { authorizationUrl, reference } = await this.paymentsService.initializePaystackPayment(
      body.plan,
      body.email,
      req.user.userId,
    );

    // ✅ SAFE: Only returning URL and reference, not API keys
    return {
      success: true,
      authorizationUrl,
      reference,
      message: 'Redirect user to authorization URL',
    };
  }

  /**
   * Verify Paystack Payment
   * 
   * Called by frontend after user completes payment
   */
  @Get('paystack/verify')
  @ApiOperation({ summary: 'Verify Paystack payment' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPaystackPayment(@Query('reference') reference: string) {
    const result = await this.paymentsService.verifyPaystackPayment(reference);

    return {
      success: result.success,
      amount: result.amount,
      metadata: result.metadata,
    };
  }

  /**
   * Verify Stripe Payment
   * 
   * Called by frontend after user completes payment
   */
  @Get('stripe/verify')
  @ApiOperation({ summary: 'Verify Stripe payment' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyStripePayment(@Query('session_id') sessionId: string) {
    const result = await this.paymentsService.verifyStripePayment(sessionId);

    return {
      success: result.success,
      metadata: result.metadata,
    };
  }

  /**
   * Purchase Coins with Real Money
   * 
   * User can buy coins using Stripe or Paystack
   */
  @Post('coins/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase coins with real money' })
  @ApiResponse({ status: 200, description: 'Coin purchase initiated' })
  async purchaseCoins(
    @Body() body: { amount: number; paymentMethod: 'stripe' | 'paystack'; email?: string },
    @Request() req,
  ) {
    if (body.paymentMethod === 'stripe') {
      // Create Stripe checkout for coins
      const { url, sessionId } = await this.paymentsService.createStripeCheckout(
        'coins_' + body.amount,
        req.user.userId,
      );

      return {
        success: true,
        paymentUrl: url,
        sessionId,
      };
    } else {
      // Initialize Paystack payment for coins
      const { authorizationUrl, reference } = await this.paymentsService.initializePaystackPayment(
        'coins_' + body.amount,
        body.email,
        req.user.userId,
      );

      return {
        success: true,
        paymentUrl: authorizationUrl,
        reference,
      };
    }
  }
}
