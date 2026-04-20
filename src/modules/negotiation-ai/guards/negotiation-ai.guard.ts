import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { NegotiationAIService } from '../services/negotiation-ai.service';

/**
 * NegotiationAiGuard
 *
 * Route guard that verifies the authenticated user has access
 * to Negotiation AI before the request reaches the controller.
 *
 * Checks:
 * - Active subscription
 * - Negotiation AI enabled for the plan
 * - Daily usage limit not exceeded
 *
 * Security: All validation is server-side. Never trust frontend.
 */
@Injectable()
export class NegotiationAiGuard implements CanActivate {
  constructor(private readonly negotiationAIService: NegotiationAIService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const access = await this.negotiationAIService.canUseNegotiationAI(userId);

    if (!access.allowed) {
      throw new ForbiddenException({
        status: access.status,
        message: access.message,
        dailyUsed: access.dailyUsed,
        dailyLimit: access.dailyLimit,
        remaining: access.remaining,
      });
    }

    // Attach access info to request for controller use
    request.negotiationAiAccess = access;

    return true;
  }
}
