import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { QueueName, JobType } from '../../../common/queue/queue.constants';
import { PaystackService } from '../services/paystack-optimized.service';
import { PerformanceLogger } from '../../../common/performance/services/performance-logger.service';

/**
 * Payment Verification Processor
 * 
 * Background job processor for payment verification
 * Keeps API responses fast by processing payments asynchronously
 * 
 * Features:
 * - Automatic retries on failure
 * - Idempotent processing (safe to retry)
 * - Error logging
 */
@Processor(QueueName.PAYMENT_VERIFICATION)
@Injectable()
export class PaymentVerificationProcessor {
  constructor(
    private paystackService: PaystackService,
    private performanceLogger: PerformanceLogger,
  ) {}

  /**
   * Process payment verification job
   */
  @Process(JobType.VERIFY_PAYMENT)
  async handlePaymentVerification(job: Job): Promise<void> {
    const { reference } = job.data;
    
    try {
      this.performanceLogger.logInfo('Processing payment verification', {
        reference,
        attempt: job.attemptsMade + 1,
      });

      // Verify payment with Paystack
      const paymentData = await this.paystackService.verifyPaymentSync(reference);

      if (paymentData.status === 'success') {
        // Update database - payment successful
        // TODO: Implement your database update logic here
        // - Update payment record
        // - Credit user wallet
        // - Update ad status if applicable
        
        this.performanceLogger.logInfo('Payment verification successful', {
          reference,
          amount: paymentData.amount / 100,
        });
      } else {
        this.performanceLogger.logInfo('Payment verification failed', {
          reference,
          status: paymentData.status,
        });
      }
    } catch (error) {
      this.performanceLogger.logError('Payment verification job failed', error, {
        reference,
        attempt: job.attemptsMade + 1,
      });
      
      // Re-throw to trigger retry
      throw error;
    }
  }

  /**
   * Handle failed jobs (after all retries exhausted)
   */
  @Process()
  async handleFailed(job: Job, error: Error): Promise<void> {
    this.performanceLogger.logError('Payment verification permanently failed', error, {
      reference: job.data.reference,
      attempts: job.attemptsMade,
    });
    
    // TODO: Alert admin or mark payment as failed in database
  }
}
