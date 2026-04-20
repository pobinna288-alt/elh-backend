import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Performance Logger
 * 
 * Specialized logger for performance-related events:
 * - Slow requests
 * - Database query times
 * - Cache hits/misses
 * - Error tracking
 * 
 * Production-optimized: minimal overhead, async logging
 */
@Injectable()
export class PerformanceLogger {
  private readonly logger = new Logger('Performance');
  private readonly isProduction: boolean;
  private readonly slowRequestThreshold = 1000; // 1 second

  constructor(private configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  /**
   * Log slow request (only in production for critical monitoring)
   */
  logSlowRequest(
    method: string,
    url: string,
    duration: number,
    statusCode: number,
  ): void {
    if (duration > this.slowRequestThreshold) {
      this.logger.warn({
        type: 'SLOW_REQUEST',
        method,
        url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log database query performance
   */
  logQueryPerformance(
    query: string,
    duration: number,
    rows?: number,
  ): void {
    // Only log slow queries in production
    if (this.isProduction && duration > 100) {
      this.logger.warn({
        type: 'SLOW_QUERY',
        query: query.substring(0, 200), // Truncate long queries
        duration: `${duration.toFixed(2)}ms`,
        rows,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log cache events (hits/misses)
   */
  logCacheEvent(
    event: 'HIT' | 'MISS' | 'SET' | 'DELETE',
    key: string,
    duration?: number,
  ): void {
    // Only log cache misses in production (indicates opportunity for optimization)
    if (this.isProduction && event === 'MISS') {
      this.logger.debug({
        type: 'CACHE_MISS',
        key,
        timestamp: new Date().toISOString(),
      });
    } else if (!this.isProduction) {
      // Log all events in development
      this.logger.debug({
        type: `CACHE_${event}`,
        key,
        duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      });
    }
  }

  /**
   * Log API response size (to detect over-fetching)
   */
  logResponseSize(url: string, sizeBytes: number): void {
    const sizeMB = sizeBytes / (1024 * 1024);
    
    // Warn if response is larger than 1MB
    if (sizeMB > 1) {
      this.logger.warn({
        type: 'LARGE_RESPONSE',
        url,
        size: `${sizeMB.toFixed(2)}MB`,
        warning: 'Consider pagination or field selection',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log error with context
   */
  logError(
    context: string,
    error: Error,
    additionalData?: Record<string, any>,
  ): void {
    this.logger.error({
      type: 'ERROR',
      context,
      message: error.message,
      stack: this.isProduction ? undefined : error.stack,
      ...additionalData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log info message (minimal in production)
   */
  logInfo(message: string, data?: Record<string, any>): void {
    if (!this.isProduction) {
      this.logger.log({ message, ...data });
    }
  }
}
