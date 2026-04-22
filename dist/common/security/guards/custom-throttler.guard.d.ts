import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
export declare class CustomThrottlerGuard extends ThrottlerGuard {
    protected readonly reflector: Reflector;
    constructor(reflector: Reflector);
    protected getTracker(req: Record<string, any>): Promise<string>;
    protected shouldSkip(context: ExecutionContext): Promise<boolean>;
}
export declare const RATE_LIMIT_KEY = "rate_limit";
export declare const RateLimit: (limit: number, ttl?: number) => import("@nestjs/common").CustomDecorator<string>;
export declare const SKIP_RATE_LIMIT_KEY = "skip_rate_limit";
export declare const SkipRateLimit: () => import("@nestjs/common").CustomDecorator<string>;
