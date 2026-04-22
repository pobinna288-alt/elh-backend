import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PerformanceService } from '../services/performance.service';
import { PerformanceLogger } from '../services/performance-logger.service';
export declare class PerformanceInterceptor implements NestInterceptor {
    private performanceService;
    private performanceLogger;
    constructor(performanceService: PerformanceService, performanceLogger: PerformanceLogger);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
