import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AdSuggestionPlanGuard implements CanActivate {
    private readonly ALLOWED_ROLES;
    canActivate(context: ExecutionContext): boolean;
}
