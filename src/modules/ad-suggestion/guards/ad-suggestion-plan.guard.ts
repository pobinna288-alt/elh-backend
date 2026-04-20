import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Guard that restricts access to users on eligible plans:
 *   premium, pro, hot, enterprise (admin also allowed)
 */
@Injectable()
export class AdSuggestionPlanGuard implements CanActivate {
  private readonly ALLOWED_ROLES: UserRole[] = [
    UserRole.PREMIUM,
    UserRole.PRO,
    UserRole.HOT,
    UserRole.ADMIN,
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check role-based access (covers premium, pro, hot, admin)
    if (this.ALLOWED_ROLES.includes(user.role)) {
      return true;
    }

    // Also accept enterprise subscription plan regardless of role
    if (user.plan === 'enterprise') {
      return true;
    }

    throw new ForbiddenException(
      'AI ad suggestions require a Premium, Pro, Hot, or Enterprise plan. ' +
        'Upgrade your subscription to unlock this feature.',
    );
  }
}
