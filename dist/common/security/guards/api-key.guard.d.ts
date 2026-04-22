import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PerformanceLogger } from '../../performance/services/performance-logger.service';
export declare class ApiKeyGuard implements CanActivate {
    private configService;
    private performanceLogger;
    private readonly apiKey;
    constructor(configService: ConfigService, performanceLogger: PerformanceLogger);
    canActivate(context: ExecutionContext): boolean;
}
