import { CanActivate, ExecutionContext } from '@nestjs/common';
import { NegotiationAIService } from '../services/negotiation-ai.service';
export declare class NegotiationAiGuard implements CanActivate {
    private readonly negotiationAIService;
    constructor(negotiationAIService: NegotiationAIService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
