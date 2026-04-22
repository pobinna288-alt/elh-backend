import { PerformanceService } from '../services/performance.service';
export declare class PerformanceController {
    private performanceService;
    constructor(performanceService: PerformanceService);
    getStats(): {
        message: string;
        timestamp: string;
        stats: Record<string, any>;
        info: {
            description: string;
            metrics: {
                count: string;
                avg: string;
                p50: string;
                p95: string;
                p99: string;
                min: string;
                max: string;
            };
        };
    };
    getHealth(): {
        status: string;
        timestamp: string;
        slowEndpoints: {
            endpoint: string;
            metrics: any;
        }[];
        message: string;
    };
}
