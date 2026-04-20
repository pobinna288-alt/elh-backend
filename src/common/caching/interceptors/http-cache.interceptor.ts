import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CachingService } from '../caching.service';
import { CACHE_TTL_KEY, CACHE_KEY, NO_CACHE_KEY } from '../decorators/cache.decorators';

/**
 * HTTP Cache Interceptor
 * 
 * Automatically caches GET requests based on URL
 * Respects cache decorators for custom behavior
 * 
 * Performance boost: Serves cached responses without hitting database
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private cachingService: CachingService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Check if caching is disabled for this endpoint
    const noCache = this.reflector.get<boolean>(
      NO_CACHE_KEY,
      context.getHandler(),
    );
    
    if (noCache) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Generate cache key
    const cacheKeyPattern = this.reflector.get<string>(
      CACHE_KEY,
      context.getHandler(),
    );
    
    const cacheScope = this.getCacheScope(request);
    const cacheKeyBase = cacheKeyPattern
      ? this.buildCacheKey(cacheKeyPattern, request)
      : this.buildDefaultCacheKey(request);
    const cacheKey = `${cacheScope}:${cacheKeyBase}`;

    // Try to get cached response
    const cachedResponse = await this.cachingService.get(cacheKey);
    
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Get custom TTL or use default
    const ttl = this.reflector.get<number>(
      CACHE_TTL_KEY,
      context.getHandler(),
    );

    // Execute request and cache response
    return next.handle().pipe(
      tap(async (response) => {
        // Only cache successful responses
        if (response) {
          await this.cachingService.set(cacheKey, response, ttl);
        }
      }),
    );
  }

  /**
   * Build cache key from pattern and request params
   */
  private buildCacheKey(pattern: string, request: any): string {
    let key = pattern;
    
    // Replace :param with actual values
    for (const [paramKey, paramValue] of Object.entries(request.params)) {
      key = key.replace(`:${paramKey}`, String(paramValue));
    }
    
    // Add query params
    if (Object.keys(request.query).length > 0) {
      const queryString = new URLSearchParams(request.query).toString();
      key = `${key}?${queryString}`;
    }
    
    return key;
  }

  /**
   * Build default cache key from URL
   */
  private buildDefaultCacheKey(request: any): string {
    const url = request.url.split('?')[0];
    const queryString = new URLSearchParams(request.query).toString();

    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Separate public and authenticated cache entries to avoid leaking
   * one user's cached response to another user.
   */
  private getCacheScope(request: any): string {
    const userId = request.user?.sub || request.user?.userId || request.user?.id;
    return userId ? `user:${userId}` : 'public';
  }
}
