import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
export declare class PaymentsService {
    private configService;
    private userRepository;
    private readonly logger;
    private readonly stripe;
    private readonly paystackSecretKey;
    private readonly paystackBaseUrl;
    constructor(configService: ConfigService, userRepository: Repository<User>);
    private normalizeSubscriptionPlan;
    private parseCoinPurchaseAmount;
    createStripeCheckout(plan: string, userId: string): Promise<{
        url: string;
        sessionId: string;
    }>;
    initializePaystackPayment(plan: string, email: string, userId: string): Promise<{
        authorizationUrl: string;
        reference: string;
    }>;
    verifyPaystackPayment(reference: string): Promise<any>;
    verifyStripePayment(sessionId: string): Promise<any>;
    activateSubscription(userId: string, plan: string, paymentMethod?: 'card' | 'coins'): Promise<{
        user: User;
        expiryDate: Date;
    }>;
}
