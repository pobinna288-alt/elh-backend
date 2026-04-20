import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceService } from '../services/performance.service';
import { PerformanceLogger } from '../services/performance-logger.service';

/**
 * Performance Interceptor
 * 
 * Automatically tracks performance of all requests:
 * - Measures response time
 * - Logs slow requests
 * - Tracks endpoint-specific metrics
 * 
 * Minimal overhead: Uses high-resolution timers
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private performanceService: PerformanceService,
    private performanceLogger: PerformanceLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    // Create unique label for this endpoint
    const label = `${method} ${url.split('?')[0]}`; // Remove query params
    
    // Start timing
    const stopTimer = this.performanceService.startTimer(label);
    
    return next.handle().pipe(
      tap({
        next: () => {
          const duration = stopTimer();
          const response = context.switchToHttp().getResponse();
          
          // Log if slow
          this.performanceLogger.logSlowRequest(
            method,
            url,
            duration,
            response.statusCode,
          );
        },
        error: (error) => {
          const duration = stopTimer();
          
          // Log error with timing context
          this.performanceLogger.logError(
            'Request Error',
            error,
            { method, url, duration },
          );
        },
      }),
    );
  }
}
