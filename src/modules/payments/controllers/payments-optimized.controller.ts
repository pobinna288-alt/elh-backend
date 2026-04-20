import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query, 
  UseGuards,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaystackService } from '../services/paystack-optimized.service';
import { CacheTTL, NoCache } from '../../../common/caching/decorators/cache.decorators';
import { PerformanceLogger } from '../../../common/performance/services/performance-logger.service';

/**
 * Optimized Payments Controller
 * 
 * High-performance payment endpoints:
 * - Fast payment initialization
 * - Async payment verification
 * - Cached status checks
 * - Secure webhook handling
 */
@Controller('payments')
export class PaymentsController {
  private redisClient: any;
  private static readonly RELEASE_LOCK_IF_OWNER_LUA = `
local lockKey = KEYS[1]
local token = ARGV[1]
if redis.call('GET', lockKey) == token then
  return redis.call('DEL', lockKey)
end
return 0
`;

  private static readonly REFRESH_LOCK_IF_OWNER_LUA = `
local lockKey = KEYS[1]
local token = ARGV[1]
local ttlMs = tonumber(ARGV[2])
if redis.call('GET', lockKey) == token then
  return redis.call('PEXPIRE', lockKey, ttlMs)
end
return 0
`;

  constructor(
    private paystackService: PaystackService,
    private performanceLogger: PerformanceLogger,
  ) {}

  private getRedisClient(): any {
    if (this.redisClient) {
      return this.redisClient;
    }

    // Lazy init to avoid constructor-time crash in non-payment paths.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL;

    this.redisClient = redisUrl
      ? new Redis(redisUrl, { maxRetriesPerRequest: 2, enableReadyCheck: true })
      : new Redis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
        });

    return this.redisClient;
  }

  private resolveWebhookRawPayload(req: any, body: any): string {
    if (req?.rawBody && Buffer.isBuffer(req.rawBody)) {
      return req.rawBody.toString('utf8');
    }

    if (typeof req?.rawBody === 'string') {
      return req.rawBody;
    }

    return JSON.stringify(body || {});
  }

  private verifyPaystackSignature(payload: string, signature: string): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secret || !signature) {
      return false;
    }

    const expected = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(`${signature || ''}`, 'hex');
    if (!expectedBuffer.length || expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private resolveTierFromWebhookData(data: any): string | null {
    const explicitTier = `${data?.metadata?.tier || data?.metadata?.plan || data?.metadata?.subscriptionLevel || ''}`
      .trim()
      .toLowerCase();

    if (['starter', 'pro', 'elite', 'enterprise', 'vip'].includes(explicitTier)) {
      return explicitTier;
    }

    return null;
  }

  private resolveUserIdFromWebhookData(data: any): string {
    const userId = `${data?.metadata?.userId || data?.metadata?.user_id || data?.customer?.customer_code || ''}`.trim();
    if (userId) {
      return userId;
    }

    const email = `${data?.customer?.email || ''}`.trim().toLowerCase();
    if (!email) {
      return '';
    }

    return crypto.createHash('sha256').update(email).digest('hex');
  }

  /**
   * Initialize payment
   * FAST: Just generates payment URL
   * 
   * POST /api/v1/payments/initialize
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @NoCache() // Never cache payment initialization
  async initializePayment(
    @Req() req,
    @Body() body: {
      amount: number;
      metadata?: any;
    },
  ) {
    const user = req.user;
    
    // Generate unique reference
    const reference = `PAY_${Date.now()}_${user.id}`;
    
    const result = await this.paystackService.initializePayment(
      user.email,
      body.amount,
      reference,
      {
        userId: user.id,
        ...body.metadata,
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Verify payment - ASYNC (returns immediately)
   * User can check status with separate endpoint
   * 
   * POST /api/v1/payments/verify
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @NoCache()
  async verifyPaymentAsync(
    @Body() body: { reference: string },
  ) {
    const result = await this.paystackService.verifyPaymentAsync(body.reference);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get payment status
   * FAST: Uses cache if available
   * 
   * GET /api/v1/payments/status?reference=XXX
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @CacheTTL(60) // Cache for 1 minute
  async getPaymentStatus(
    @Query('reference') reference: string,
  ) {
    if (!reference) {
      return {
        success: false,
        message: 'Reference is required',
      };
    }

    const status = await this.paystackService.getPaymentStatus(reference);
    
    return {
      success: true,
      data: status,
    };
  }

  /**
   * Paystack webhook handler
   * Critical: Processes payment confirmations from Paystack
   * 
   * POST /api/v1/payments/webhook
   */
  @Post('webhook')
  @NoCache()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    const redis = this.getRedisClient();
    const stateTtlSec = Number.parseInt(process.env.PAYSTACK_WEBHOOK_STATE_TTL_SECONDS || '7776000', 10);
    const lockTtlMs = Number.parseInt(process.env.PAYSTACK_WEBHOOK_LOCK_TTL_MS || '90000', 10);
    const staleRecoveryMs = Number.parseInt(
      process.env.PAYSTACK_WEBHOOK_STALE_RECOVERY_MS || `${Math.max(lockTtlMs * 2, 120000)}`,
      10,
    );
    const heartbeatIntervalMs = Math.max(1000, Math.floor(lockTtlMs / 3));
    let ownedEventLockKey = '';
    let ownedLockToken = '';
    let lockHeartbeat: NodeJS.Timeout | null = null;

    try {
      const payload = this.resolveWebhookRawPayload(req, body);
      const isValid = this.verifyPaystackSignature(payload, signature);
      
      if (!isValid) {
        this.performanceLogger.logError(
          'Invalid webhook signature',
          new Error('Webhook signature verification failed'),
          { event: body.event },
        );
        return { success: false, message: 'Invalid signature' };
      }

      const { event, data } = body;
      const eventId = `${body?.event_id || data?.event_id || data?.id || body?.id || ''}`.trim();
      if (!eventId) {
        return { success: false, message: 'Missing event identity' };
      }

      const eventStateKey = `paystack:webhook:event:${eventId}:state`;
      const eventLockKey = `paystack:webhook:event:${eventId}:lock`;

      const existing = await redis.hgetall(eventStateKey);
      if (existing?.status === 'SUCCESS') {
        return { success: true, idempotent: true, message: 'Event already processed' };
      }

      if (existing?.status === 'IN_PROGRESS' || existing?.status === 'EXECUTING') {
        const lockPresent = (await redis.exists(eventLockKey)) === 1;
        if (lockPresent) {
          return { success: true, idempotent: true, message: 'Event currently processing' };
        }

        const executingAt = Number.parseInt(`${existing?.executingAt || existing?.startedAt || '0'}`, 10) || 0;
        const ageMs = executingAt > 0 ? (Date.now() - executingAt) : Number.MAX_SAFE_INTEGER;
        if (ageMs < staleRecoveryMs) {
          return { success: true, idempotent: true, message: 'Event currently processing' };
        }

        await redis.hset(
          eventStateKey,
          'status', 'FAILED',
          'error', 'STALE_WEBHOOK_IN_PROGRESS_RECOVERED',
          'finishedAt', `${Date.now()}`,
        );
        await redis.expire(eventStateKey, stateTtlSec);
      }

      const lockToken = crypto.randomBytes(16).toString('hex');
      const lockAcquired = await redis.set(eventLockKey, lockToken, 'PX', lockTtlMs, 'NX');
      if (lockAcquired !== 'OK') {
        return { success: true, idempotent: true, message: 'Event lock not acquired' };
      }
      ownedEventLockKey = eventLockKey;
      ownedLockToken = lockToken;

      const releaseLock = async () => {
        await redis.eval(PaymentsController.RELEASE_LOCK_IF_OWNER_LUA, 1, eventLockKey, lockToken);
      };

      const heartbeat = setInterval(async () => {
        try {
          await redis.eval(
            PaymentsController.REFRESH_LOCK_IF_OWNER_LUA,
            1,
            eventLockKey,
            lockToken,
            `${lockTtlMs}`,
          );
        } catch (_error) {
          // Best-effort lock heartbeat; final state writes remain idempotent.
        }
      }, heartbeatIntervalMs);
      lockHeartbeat = heartbeat;
      if (typeof (heartbeat as any).unref === 'function') {
        (heartbeat as any).unref();
      }

      await redis.hset(
        eventStateKey,
        'status', 'IN_PROGRESS',
        'event', `${event || ''}`,
        'reference', `${data?.reference || ''}`,
        'startedAt', `${Date.now()}`,
      );
      await redis.expire(eventStateKey, stateTtlSec);
      await redis.hset(eventStateKey, 'status', 'EXECUTING', 'executingAt', `${Date.now()}`);
      
      if (event === 'charge.success') {
        const paymentData = await this.paystackService.verifyPaymentSync(data.reference);
        if (`${paymentData?.status || ''}`.toLowerCase() !== 'success') {
          throw new Error('Verified payment is not successful');
        }

        const userId = this.resolveUserIdFromWebhookData(paymentData);
        const tier = this.resolveTierFromWebhookData(paymentData);
        if (!userId) {
          throw new Error('Missing user identity in verified Paystack payload');
        }
        if (!tier) {
          throw new Error('Missing or invalid tier in verified Paystack payload');
        }

        if (userId) {
          const subscriptionState = {
            userId,
            tier,
            state: 'active',
            source: 'paystack_webhook',
            reference: `${paymentData?.reference || data.reference || ''}`,
            paidAt: paymentData?.paid_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await redis.set(`ai:subscription:${userId}:tier`, tier, 'EX', 60 * 60 * 24 * 400);
          await redis.set(`ai:subscription:${userId}:state`, JSON.stringify(subscriptionState), 'EX', 60 * 60 * 24 * 400);
        }
        
        this.performanceLogger.logInfo('Webhook: Payment successful', {
          reference: data.reference,
          amount: data.amount / 100,
        });
      }

      await redis.hset(
        eventStateKey,
        'status', 'SUCCESS',
        'finishedAt', `${Date.now()}`,
      );
      await redis.expire(eventStateKey, stateTtlSec);
      clearInterval(heartbeat);
      lockHeartbeat = null;
      await releaseLock();
      ownedEventLockKey = '';
      ownedLockToken = '';

      return { success: true };
    } catch (error) {
      if (lockHeartbeat) {
        clearInterval(lockHeartbeat);
        lockHeartbeat = null;
      }

      const eventId = `${body?.event_id || body?.data?.event_id || body?.data?.id || body?.id || ''}`.trim();
      if (eventId) {
        const eventStateKey = `paystack:webhook:event:${eventId}:state`;
        await redis.hset(
          eventStateKey,
          'status', 'FAILED',
          'error', `${error?.message || 'WEBHOOK_PROCESSING_FAILED'}`,
          'finishedAt', `${Date.now()}`,
        );
        await redis.expire(eventStateKey, stateTtlSec);
        if (ownedEventLockKey && ownedLockToken) {
          await redis.eval(PaymentsController.RELEASE_LOCK_IF_OWNER_LUA, 1, ownedEventLockKey, ownedLockToken);
          ownedEventLockKey = '';
          ownedLockToken = '';
        }
      }

      this.performanceLogger.logError('Webhook processing error', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  }
}
