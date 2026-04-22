import { Job } from 'bull';
import { PaystackService } from '../services/paystack-optimized.service';
import { PerformanceLogger } from '../../../common/performance/services/performance-logger.service';
export declare class PaymentVerificationProcessor {
    private paystackService;
    private performanceLogger;
    constructor(paystackService: PaystackService, performanceLogger: PerformanceLogger);
    handlePaymentVerification(job: Job): Promise<void>;
    handleFailed(job: Job, error: Error): Promise<void>;
}
