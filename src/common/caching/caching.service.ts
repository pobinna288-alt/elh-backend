import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PerformanceLogger } from '../performance/services/performance-logger.service';

/**
 * Enhanced Caching Service
 * 
 * High-performance caching layer with:
 * - Automatic cache key generation
 * - TTL management
 * - Cache invalidation patterns
 * - Performance tracking
 * 
 * Used to minimize database queries and expensive computations
 */
@Injectable()
export class CachingService {
  private readonly trackedKeys = new Set<string>();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private performanceLogger: PerformanceLogger,
  ) {}

  /**
   * Get cached value with performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const value = await this.cacheManager.get<T>(key);
      const duration = Date.now() - startTime;
      
      this.performanceLogger.logCacheEvent(
        value ? 'HIT' : 'MISS',
        key,
        duration,
      );
      
      return value || null;
    } catch (error) {
      this.performanceLogger.logError('Cache Get Error', error, { key });
      return null; // Fail gracefully - never block requests on cache errors
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Default TTL: 5 minutes (300 seconds)
      const cacheTTL = ttl || 300;

      await this.cacheManager.set(key, value, cacheTTL * 1000); // Convert to ms
      this.trackedKeys.add(key);

      const duration = Date.now() - startTime;
      this.performanceLogger.logCacheEvent('SET', key, duration);
    } catch (error) {
      this.performanceLogger.logError('Cache Set Error', error, { key });
      // Fail gracefully
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.trackedKeys.delete(key);
      this.performanceLogger.logCacheEvent('DELETE', key);
    } catch (error) {
      this.performanceLogger.logError('Cache Delete Error', error, { key });
    }
  }

  /**
   * Delete all keys matching a pattern
   * Useful for invalidating related caches (e.g., all user data)
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(
        `^${pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')}$`,
      );

      const keysToDelete = [...this.trackedKeys].filter((key) => regex.test(key));

      if (keysToDelete.length === 0) {
        this.performanceLogger.logInfo('Cache pattern deletion skipped', { pattern, deleted: 0 });
        return;
      }

      await Promise.all(keysToDelete.map((key) => this.cacheManager.del(key)));
      keysToDelete.forEach((key) => this.trackedKeys.delete(key));

      this.performanceLogger.logInfo('Cache pattern deletion', {
        pattern,
        deleted: keysToDelete.length,
      });
    } catch (error) {
      this.performanceLogger.logError('Cache Pattern Delete Error', error, { pattern });
    }
  }

  /**
   * Generate cache key from parts
   */
  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  /**
   * Wrap a function with caching
   * Executes function only on cache miss
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function on cache miss
    const result = await fn();
    
    // Store in cache
    await this.set(key, result, ttl);
    
    return result;
  }

  /**
   * Common cache keys for the application
   */
  keys = {
    user: (userId: number) => this.generateKey('user', userId),
    userProfile: (userId: number) => this.generateKey('user', userId, 'profile'),
    adsList: (page: number, limit: number) => 
      this.generateKey('ads', 'list', page, limit),
    adDetails: (adId: number) => this.generateKey('ad', adId),
    userWallet: (userId: number) => this.generateKey('user', userId, 'wallet'),
    paymentStatus: (reference: string) => 
      this.generateKey('payment', 'status', reference),
  };

  /**
   * Common TTL values (in seconds)
   */
  ttl = {
    short: 60,        // 1 minute - for rapidly changing data
    medium: 300,      // 5 minutes - default
    long: 1800,       // 30 minutes - for stable data
    veryLong: 3600,   // 1 hour - for rarely changing data
  };
}
