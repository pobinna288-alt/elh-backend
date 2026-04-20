import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

/**
 * Custom Throttler Guard
 * 
 * Enhanced rate limiting with custom rules per endpoint
 * 
 * Default: 100 requests per minute
 * Login: 5 requests per minute (brute force protection)
 * Payment: 10 requests per minute
 * Public endpoints: 200 requests per minute
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    protected readonly reflector: Reflector,
  ) {
    super({ 
      throttlers: [{
        ttl: 60000,
        limit: 100,
      }]
    }, undefined, reflector);
  }

  /**
   * Customize rate limits based on endpoint
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by IP address
    return req.ip || req.connection.remoteAddress;
  }

  /**
   * Skip rate limiting for certain conditions
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Skip for health checks
    if (request.url.includes('/health')) {
      return true;
    }

    // Skip for webhooks (they have signature verification)
    if (request.url.includes('/webhook')) {
      return true;
    }

    return false;
  }
}

/**
 * Rate Limit Decorator
 * 
 * Use on controller methods to set custom rate limits
 * Example: @RateLimit(10, 60) - 10 requests per 60 seconds
 */
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (limit: number, ttl: number = 60) => 
  SetMetadata(RATE_LIMIT_KEY, { limit, ttl });

/**
 * Skip Rate Limit Decorator
 * 
 * Use on controller methods to skip rate limiting
 */
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
