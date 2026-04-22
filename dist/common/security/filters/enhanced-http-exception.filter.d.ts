import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { PerformanceLogger } from '../../performance/services/performance-logger.service';
export declare class EnhancedHttpExceptionFilter implements ExceptionFilter {
    private performanceLogger;
    constructor(performanceLogger: PerformanceLogger);
    catch(exception: unknown, host: ArgumentsHost): void;
}
