import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DealBrokerService } from '../services/deal-broker.service';

/**
 * DealBrokerGuard
 *
 * Enforces access control for the Alternative Seller Finder endpoints.
 * Checks subscription, plan, and daily usage limits before allowing access.
 *
 * Security rules (Requirement #11):
 * - Requires authentication (JWT)
 * - Validates subscription & plan
 * - Prevents manual API calling without auth
 */
@Injectable()
export class DealBrokerGuard implements CanActivate {
  constructor(private readonly dealBrokerService: DealBrokerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const access = await this.dealBrokerService.checkAccess(userId);

    if (!access.allowed) {
      throw new ForbiddenException({
        status: access.status,
        message: access.message,
        dailyUsed: access.dailyUsed,
        dailyLimit: access.dailyLimit,
        remaining: access.remaining,
      });
    }

    // Attach access info to request for downstream use
    request.dealBrokerAccess = access;
    return true;
  }
}
