import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { CachingService } from '../../../common/caching/caching.service';
import { PerformanceLogger } from '../../../common/performance/services/performance-logger.service';
import { QueueName, JobType, QueuePriority } from '../../../common/queue/queue.constants';

/**
 * Optimized Paystack Service
 * 
 * High-performance payment processing:
 * - Async payment verification (non-blocking)
 * - Cached payment status checks
 * - Idempotent operations (no double charging)
 * - Background job processing
 * 
 * SECURITY: Never exposes secret keys to frontend
 */
@Injectable()
export class PaystackService {
  private readonly paystackSecretKey: string;
  private readonly paystackUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private cachingService: CachingService,
    private performanceLogger: PerformanceLogger,
    @InjectQueue(QueueName.PAYMENT_VERIFICATION) private paymentQueue: Queue,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    
    if (!this.paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
  }

  /**
   * Initialize payment (returns authorization URL)
   * This is FAST - just generates payment URL
   */
  async initializePayment(
    email: string,
    amount: number,
    reference: string,
    metadata?: any,
  ): Promise<{ authorization_url: string; reference: string }> {
    try {
      const response = await axios.post(
        `${this.paystackUrl}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100), // Convert to kobo
          reference,
          metadata,
          callback_url: this.configService.get('PAYSTACK_CALLBACK_URL'),
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to initialize payment');
      }

      return {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
      };
    } catch (error) {
      this.performanceLogger.logError('Payment Initialization Error', error);
      throw new BadRequestException('Payment initialization failed');
    }
  }

  /**
   * Verify payment - ASYNC VERSION
   * Returns immediately and processes verification in background
   * Much faster than blocking verification
   */
  async verifyPaymentAsync(reference: string): Promise<{ status: string; message: string }> {
    // Check if already verified (cached)
    const cachedStatus = await this.cachingService.get(
      this.cachingService.keys.paymentStatus(reference),
    );

    if (cachedStatus) {
      return cachedStatus as any;
    }

    // Queue verification job (non-blocking)
    await this.paymentQueue.add(
      JobType.VERIFY_PAYMENT,
      { reference },
      {
        priority: QueuePriority.HIGH,
        attempts: 3,
        backoff: 2000,
      },
    );

    return {
      status: 'processing',
      message: 'Payment verification in progress. Check status in a moment.',
    };
  }

  /**
   * Verify payment - SYNC VERSION (for webhooks)
   * Actually checks with Paystack API
   * Used by background job or webhook handler
   */
  async verifyPaymentSync(reference: string): Promise<any> {
    try {
      // Check cache first
      const cachedStatus = await this.cachingService.get(
        this.cachingService.keys.paymentStatus(reference),
      );

      if (cachedStatus) {
        return cachedStatus;
      }

      // Call Paystack API
      const startTime = Date.now();
      const response = await axios.get(
        `${this.paystackUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      const duration = Date.now() - startTime;
      this.performanceLogger.logInfo('Paystack API Call', {
        duration: `${duration}ms`,
        reference,
      });

      if (!response.data.status) {
        throw new BadRequestException('Payment verification failed');
      }

      const paymentData = response.data.data;
      
      // Cache the result (10 minutes for successful, 1 minute for failed)
      const ttl = paymentData.status === 'success' 
        ? this.cachingService.ttl.long 
        : this.cachingService.ttl.short;
      
      await this.cachingService.set(
        this.cachingService.keys.paymentStatus(reference),
        paymentData,
        ttl,
      );

      return paymentData;
    } catch (error) {
      this.performanceLogger.logError('Payment Verification Error', error, { reference });
      throw new BadRequestException('Payment verification failed');
    }
  }

  /**
   * Get payment status (from cache if available)
   * VERY FAST - no API call if cached
   */
  async getPaymentStatus(reference: string): Promise<any> {
    // Try cache first
    const cached = await this.cachingService.get(
      this.cachingService.keys.paymentStatus(reference),
    );

    if (cached) {
      return cached;
    }

    // If not cached, verify synchronously
    return this.verifyPaymentSync(reference);
  }

  /**
   * Verify webhook signature
   * Critical for security - ensures webhook is from Paystack
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  }

  /**
   * Get payment analytics (cached)
   */
  async getTransactionAnalytics(userId: number): Promise<any> {
    const cacheKey = this.cachingService.generateKey('analytics', 'payments', userId);
    
    return this.cachingService.wrap(
      cacheKey,
      async () => {
        // Fetch from database
        // This is just a placeholder - implement based on your schema
        return {
          totalSpent: 0,
          totalTransactions: 0,
          successRate: 100,
        };
      },
      this.cachingService.ttl.medium,
    );
  }
}
