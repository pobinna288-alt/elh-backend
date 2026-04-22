import { ConfigService } from '@nestjs/config';
export declare class PerformanceLogger {
    private configService;
    private readonly logger;
    private readonly isProduction;
    private readonly slowRequestThreshold;
    constructor(configService: ConfigService);
    logSlowRequest(method: string, url: string, duration: number, statusCode: number): void;
    logQueryPerformance(query: string, duration: number, rows?: number): void;
    logCacheEvent(event: 'HIT' | 'MISS' | 'SET' | 'DELETE', key: string, duration?: number): void;
    logResponseSize(url: string, sizeBytes: number): void;
    logError(context: string, error: Error, additionalData?: Record<string, any>): void;
    logInfo(message: string, data?: Record<string, any>): void;
}
