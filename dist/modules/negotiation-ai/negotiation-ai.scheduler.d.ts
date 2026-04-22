import { SubscriptionService } from './services/subscription.service';
export declare class NegotiationAiScheduler {
    private readonly subscriptionService;
    private readonly logger;
    constructor(subscriptionService: SubscriptionService);
    handleDailyTasks(): Promise<void>;
    handleExpiryCheck(): Promise<void>;
}
