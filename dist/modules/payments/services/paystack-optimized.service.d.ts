import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { CachingService } from '../../../common/caching/caching.service';
import { PerformanceLogger } from '../../../common/performance/services/performance-logger.service';
export declare class PaystackService {
    private configService;
    private cachingService;
    private performanceLogger;
    private paymentQueue;
    private readonly paystackSecretKey;
    private readonly paystackUrl;
    constructor(configService: ConfigService, cachingService: CachingService, performanceLogger: PerformanceLogger, paymentQueue: Queue);
    initializePayment(email: string, amount: number, reference: string, metadata?: any): Promise<{
        authorization_url: string;
        reference: string;
    }>;
    verifyPaymentAsync(reference: string): Promise<{
        status: string;
        message: string;
    }>;
    verifyPaymentSync(reference: string): Promise<any>;
    getPaymentStatus(reference: string): Promise<any>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
    getTransactionAnalytics(userId: number): Promise<any>;
}
