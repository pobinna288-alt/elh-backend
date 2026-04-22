import { ConfigService } from '@nestjs/config';
export declare enum DescriptionPlan {
    NORMAL = "normal",
    PREMIUM = "premium",
    PRO = "pro",
    HOT = "hot"
}
export declare class AiDescriptionService {
    private configService;
    constructor(configService: ConfigService);
    generateDescription(title: string, category: string, price: number, location: string, plan: DescriptionPlan, additionalInfo?: string): Promise<string>;
    private buildPrompt;
    private generateText;
    validatePlanAccess(userRole: string, requestedPlan: DescriptionPlan): boolean;
}
