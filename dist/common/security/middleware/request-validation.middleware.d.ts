import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceLogger } from '../../performance/services/performance-logger.service';
export declare class RequestValidationMiddleware implements NestMiddleware {
    private performanceLogger;
    private readonly maxRequestSize;
    constructor(performanceLogger: PerformanceLogger);
    use(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
    private hasAttackPatterns;
}
