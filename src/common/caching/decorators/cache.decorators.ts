import { SetMetadata } from '@nestjs/common';

/**
 * Cache TTL Decorator
 * 
 * Use on controller methods to set custom cache TTL
 * Example: @CacheTTL(60) - cache for 60 seconds
 */
export const CACHE_TTL_KEY = 'cache_ttl';
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);

/**
 * Cache Key Decorator
 * 
 * Use on controller methods to set custom cache key pattern
 * Example: @CacheKey('user-:id') - creates key 'user-123' for id=123
 */
export const CACHE_KEY = 'cache_key';
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY, key);

/**
 * No Cache Decorator
 * 
 * Use on controller methods to disable caching
 * Example: @NoCache() - never cache this endpoint
 */
export const NO_CACHE_KEY = 'no_cache';
export const NoCache = () => SetMetadata(NO_CACHE_KEY, true);
