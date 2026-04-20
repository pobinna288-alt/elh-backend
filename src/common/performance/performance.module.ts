import { Module, Global } from '@nestjs/common';
import { PerformanceService } from './services/performance.service';
import { QueryOptimizationService } from './services/query-optimization.service';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { PerformanceLogger } from './services/performance-logger.service';

/**
 * Performance Module
 * 
 * Provides centralized performance optimization services:
 * - Request timing and monitoring
 * - Query optimization helpers
 * - Performance logging
 * - Slow request detection
 * 
 * Made global for easy access across all modules
 */
@Global()
@Module({
  providers: [
    PerformanceService,
    QueryOptimizationService,
    PerformanceLogger,
    PerformanceInterceptor,
  ],
  exports: [
    PerformanceService,
    QueryOptimizationService,
    PerformanceLogger,
    PerformanceInterceptor,
  ],
})
export class PerformanceModule {}
