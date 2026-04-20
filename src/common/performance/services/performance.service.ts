import { Injectable } from '@nestjs/common';

/**
 * Performance Service
 * 
 * Core service for tracking and measuring performance metrics
 * - Tracks request execution times
 * - Monitors slow operations
 * - Provides performance statistics
 */
@Injectable()
export class PerformanceService {
  private requestTimings: Map<string, number[]> = new Map();
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second

  /**
   * Start timing an operation
   * Returns a function to stop timing
   */
  startTimer(label: string): () => number {
    const startTime = process.hrtime.bigint();
    
    return (): number => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      // Store timing for analytics
      if (!this.requestTimings.has(label)) {
        this.requestTimings.set(label, []);
      }
      
      const timings = this.requestTimings.get(label);
      timings.push(duration);
      
      // Keep only last 100 timings per endpoint to prevent memory issues
      if (timings.length > 100) {
        timings.shift();
      }
      
      return duration;
    };
  }

  /**
   * Check if operation is slow
   */
  isSlowOperation(duration: number): boolean {
    return duration > this.SLOW_REQUEST_THRESHOLD;
  }

  /**
   * Get average timing for a specific operation
   */
  getAverageTiming(label: string): number | null {
    const timings = this.requestTimings.get(label);
    if (!timings || timings.length === 0) return null;
    
    const sum = timings.reduce((a, b) => a + b, 0);
    return sum / timings.length;
  }

  /**
   * Get performance statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [label, timings] of this.requestTimings.entries()) {
      if (timings.length === 0) continue;
      
      const sorted = [...timings].sort((a, b) => a - b);
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      stats[label] = {
        count: timings.length,
        avg: Math.round(avg * 100) / 100,
        p50: Math.round(p50 * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        min: Math.round(sorted[0] * 100) / 100,
        max: Math.round(sorted[sorted.length - 1] * 100) / 100,
      };
    }
    
    return stats;
  }

  /**
   * Clear all statistics (useful for testing)
   */
  clearStats(): void {
    this.requestTimings.clear();
  }
}
