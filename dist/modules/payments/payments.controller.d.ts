import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createStripeCheckout(body: {
        plan: 'premium' | 'pro' | 'hot';
    }, req: any): Promise<{
        success: boolean;
        checkoutUrl: string;
        sessionId: string;
        message: string;
    }>;
    initializePaystackPayment(body: {
        plan: 'premium' | 'pro' | 'hot';
        email: string;
    }, req: any): Promise<{
        success: boolean;
        authorizationUrl: string;
        reference: string;
        message: string;
    }>;
    verifyPaystackPayment(reference: string): Promise<{
        success: any;
        amount: any;
        metadata: any;
    }>;
    verifyStripePayment(sessionId: string): Promise<{
        success: any;
        metadata: any;
    }>;
    purchaseCoins(body: {
        amount: number;
        paymentMethod: 'stripe' | 'paystack';
        email?: string;
    }, req: any): Promise<{
        success: boolean;
        paymentUrl: string;
        sessionId: string;
        reference?: undefined;
    } | {
        success: boolean;
        paymentUrl: string;
        reference: string;
        sessionId?: undefined;
    }>;
}
