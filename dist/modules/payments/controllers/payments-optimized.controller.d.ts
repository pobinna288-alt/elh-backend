import { RawBodyRequest } from '@nestjs/common';
import { PaystackService } from '../services/paystack-optimized.service';
import { PerformanceLogger } from '../../../common/performance/services/performance-logger.service';
export declare class PaymentsController {
    private paystackService;
    private performanceLogger;
    constructor(paystackService: PaystackService, performanceLogger: PerformanceLogger);
    initializePayment(req: any, body: {
        amount: number;
        metadata?: any;
    }): Promise<{
        success: boolean;
        data: {
            authorization_url: string;
            reference: string;
        };
    }>;
    verifyPaymentAsync(body: {
        reference: string;
    }): Promise<{
        success: boolean;
        data: {
            status: string;
            message: string;
        };
    }>;
    getPaymentStatus(reference: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: any;
        message?: undefined;
    }>;
    handleWebhook(req: RawBodyRequest<Request>, signature: string, body: any): Promise<{
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message?: undefined;
    }>;
}
