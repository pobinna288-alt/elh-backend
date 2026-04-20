import { Controller, Get, UseGuards } from '@nestjs/common';
import { PerformanceService } from '../services/performance.service';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';

/**
 * Performance Monitoring Controller
 * 
 * Internal endpoint for monitoring application performance
 * Protected by authentication
 */
@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(private performanceService: PerformanceService) {}

  /**
   * Get performance statistics
   * Shows response time metrics for all endpoints
   */
  @Get('stats')
  getStats() {
    return {
      message: 'Performance Statistics',
      timestamp: new Date().toISOString(),
      stats: this.performanceService.getStats(),
      info: {
        description: 'Endpoint performance metrics',
        metrics: {
          count: 'Number of requests',
          avg: 'Average response time (ms)',
          p50: 'Median response time (ms)',
          p95: '95th percentile response time (ms)',
          p99: '99th percentile response time (ms)',
          min: 'Fastest response time (ms)',
          max: 'Slowest response time (ms)',
        },
      },
    };
  }

  /**
   * Get health status
   */
  @Get('health')
  getHealth() {
    const stats = this.performanceService.getStats();
    
    // Check if any endpoint is consistently slow
    const slowEndpoints = Object.entries(stats)
      .filter(([_, metrics]: [string, any]) => metrics.avg > 1000)
      .map(([endpoint, metrics]) => ({ endpoint, metrics }));

    return {
      status: slowEndpoints.length > 0 ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
      slowEndpoints: slowEndpoints.length > 0 ? slowEndpoints : undefined,
      message: slowEndpoints.length > 0 
        ? 'Some endpoints are experiencing slow response times'
        : 'All endpoints performing normally',
    };
  }
}
