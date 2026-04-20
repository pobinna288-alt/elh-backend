import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import axios from 'axios';
import { User, UserRole, SubscriptionPlan } from '../users/entities/user.entity';
import { getSubscriptionBilling } from '../../config/subscription-pricing.config';

type SubscriptionTier = 'premium' | 'pro' | 'hot';

/**
 * BACKEND-ONLY Payment Service
 * 
 * ⚠️ SECURITY CRITICAL:
 * - All API keys are stored in environment variables
 * - Private keys NEVER sent to frontend
 * - All payment operations happen server-side only
 * - Errors sanitized to prevent key leakage
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!stripeKey) {
      this.logger.error('STRIPE_SECRET_KEY not configured');
      throw new Error('Payment provider not configured');
    }

    if (!this.paystackSecretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY not configured');
      throw new Error('Payment provider not configured');
    }

    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    this.logger.log('✅ Payment service initialized (keys loaded from environment)');
  }

  private normalizeSubscriptionPlan(plan: string): SubscriptionTier | null {
    const normalizedPlan = plan?.toLowerCase().trim();

    if (normalizedPlan === 'premium' || normalizedPlan === 'pro' || normalizedPlan === 'hot') {
      return normalizedPlan;
    }

    return null;
  }

  private parseCoinPurchaseAmount(plan: string): number | null {
    if (!plan?.startsWith('coins_')) {
      return null;
    }

    const parsedAmount = Number(plan.replace('coins_', ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException('Invalid coin purchase amount');
    }

    return parsedAmount;
  }

  /**
   * Create Stripe Checkout Session (Server-Side Only)
   */
  async createStripeCheckout(plan: string, userId: string): Promise<{ url: string; sessionId: string }> {
    try {
      const normalizedPlan = this.normalizeSubscriptionPlan(plan);
      const coinPurchaseAmount = this.parseCoinPurchaseAmount(plan);

      let unitAmount: number;
      let productName: string;
      let description: string;

      if (normalizedPlan) {
        const billing = getSubscriptionBilling(normalizedPlan);
        unitAmount = billing.stripeAmountCents;
        productName = `${normalizedPlan.toUpperCase()} Subscription`;
        description = `EL HANNORA ${normalizedPlan} plan`;
      } else if (coinPurchaseAmount !== null) {
        unitAmount = coinPurchaseAmount * 100;
        productName = `${coinPurchaseAmount.toLocaleString()} Coin Package`;
        description = 'EL HANNORA wallet top-up';
      } else {
        throw new BadRequestException('Invalid plan');
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: productName,
                description,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.configService.get('FRONTEND_URL')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/payment-cancel`,
        metadata: {
          userId,
          plan,
        },
      });

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Stripe error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Payment processing failed');
    }
  }

  /**
   * Initialize Paystack Payment (Server-Side Only)
   */
  async initializePaystackPayment(
    plan: string,
    email: string,
    userId: string,
  ): Promise<{ authorizationUrl: string; reference: string }> {
    try {
      const normalizedPlan = this.normalizeSubscriptionPlan(plan);
      const coinPurchaseAmount = this.parseCoinPurchaseAmount(plan);

      let amountInNgn: number;

      if (normalizedPlan) {
        amountInNgn = getSubscriptionBilling(normalizedPlan).paystackAmountNgn;
      } else if (coinPurchaseAmount !== null) {
        amountInNgn = coinPurchaseAmount;
      } else {
        throw new BadRequestException('Invalid plan');
      }

      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email,
          amount: amountInNgn * 100,
          metadata: {
            userId,
            plan,
          },
          callback_url: `${this.configService.get('FRONTEND_URL')}/payment-verify`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Paystack error: ${error.response?.data?.message || error.message}`);
      throw new InternalServerErrorException('Payment initialization failed');
    }
  }

  /**
   * Verify Paystack Payment (Server-Side Only)
   */
  async verifyPaystackPayment(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      if (response.data.data.status === 'success') {
        const paymentData = response.data.data;
        const metadata = paymentData.metadata || {};
        const userId = metadata.userId || metadata.user_id;
        const normalizedPlan = this.normalizeSubscriptionPlan(metadata.plan);
        const actualAmount = paymentData.amount / 100;

        let activationResult: { user: User; expiryDate: Date } | null = null;

        if (normalizedPlan) {
          const billing = getSubscriptionBilling(normalizedPlan);

          if (actualAmount !== billing.paystackAmountNgn) {
            this.logger.warn(
              `Paystack amount mismatch for ${normalizedPlan}: expected ₦${billing.paystackAmountNgn}, received ₦${actualAmount}`,
            );
            throw new BadRequestException(`Payment amount mismatch for ${normalizedPlan} plan`);
          }

          if (!userId) {
            throw new BadRequestException('Payment metadata missing userId');
          }

          activationResult = await this.activateSubscription(userId, normalizedPlan, 'card');
          this.logger.log(`✅ User ${userId} upgraded to ${normalizedPlan} plan`);
        }

        return {
          success: true,
          amount: actualAmount,
          currency: paymentData.currency || 'NGN',
          metadata,
          expiresAt: activationResult?.expiryDate,
        };
      }

      return { success: false };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Paystack verification error: ${error.message}`);
      throw new InternalServerErrorException('Payment verification failed');
    }
  }

  /**
   * Verify Stripe Payment (Server-Side Only)
   */
  async verifyStripePayment(sessionId: string): Promise<any> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      let activationResult: { user: User; expiryDate: Date } | null = null;

      if (session.payment_status === 'paid') {
        const metadata = session.metadata || {};
        const userId = metadata.userId;
        const normalizedPlan = this.normalizeSubscriptionPlan(metadata.plan);
        const totalAmount = session.amount_total ?? 0;

        if (normalizedPlan) {
          const billing = getSubscriptionBilling(normalizedPlan);

          if (totalAmount !== billing.stripeAmountCents) {
            this.logger.warn(
              `Stripe amount mismatch for ${normalizedPlan}: expected ${billing.stripeAmountCents} cents, received ${totalAmount} cents`,
            );
            throw new BadRequestException(`Payment amount mismatch for ${normalizedPlan} plan`);
          }

          if (!userId) {
            throw new BadRequestException('Payment metadata missing userId');
          }

          activationResult = await this.activateSubscription(userId, normalizedPlan, 'card');
          this.logger.log(`✅ User ${userId} upgraded to ${normalizedPlan} plan`);
        }
      }

      return {
        success: session.payment_status === 'paid',
        amount: (session.amount_total ?? 0) / 100,
        metadata: session.metadata,
        expiresAt: activationResult?.expiryDate,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Stripe verification error: ${error.message}`);
      throw new InternalServerErrorException('Payment verification failed');
    }
  }

  /**
   * Activate or renew a paid subscription while preserving backward compatibility.
   */
  async activateSubscription(
    userId: string,
    plan: string,
    paymentMethod: 'card' | 'coins' = 'card',
  ): Promise<{ user: User; expiryDate: Date }> {
    const normalizedPlan = this.normalizeSubscriptionPlan(plan);

    if (!normalizedPlan) {
      this.logger.error(`Invalid plan: ${plan}`);
      throw new BadRequestException('Invalid subscription plan');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      throw new BadRequestException('User not found');
    }

    const billing = getSubscriptionBilling(normalizedPlan);
    const roleMapping: Record<SubscriptionTier, UserRole> = {
      premium: UserRole.PREMIUM,
      pro: UserRole.PRO,
      hot: UserRole.HOT,
    };
    const planMapping: Record<SubscriptionTier, SubscriptionPlan> = {
      premium: SubscriptionPlan.PREMIUM,
      pro: SubscriptionPlan.PRO_BUSINESS,
      hot: SubscriptionPlan.HOT_BUSINESS,
    };

    const now = new Date();
    const existingExpiry = user.subscriptionActive && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now
      ? new Date(user.subscriptionExpiry)
      : user.premiumExpiresAt && new Date(user.premiumExpiresAt) > now
        ? new Date(user.premiumExpiresAt)
        : now;

    const expiryDate = new Date(existingExpiry);
    expiryDate.setDate(expiryDate.getDate() + billing.durationDays);

    user.role = roleMapping[normalizedPlan];
    user.plan = planMapping[normalizedPlan];
    user.subscriptionActive = true;
    user.subscriptionExpiry = expiryDate;
    user.negotiationAiEnabled = true;
    user.premiumExpiresAt = expiryDate;
    user.premiumPaymentMethod = paymentMethod;

    await this.userRepository.save(user);

    this.logger.log(
      `📝 Database updated: ${user.email} is now ${normalizedPlan} until ${expiryDate.toISOString()}`,
    );

    return { user, expiryDate };
  }
}
