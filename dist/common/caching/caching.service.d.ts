import { Cache } from 'cache-manager';
import { PerformanceLogger } from '../performance/services/performance-logger.service';
export declare class CachingService {
    private cacheManager;
    private performanceLogger;
    private readonly trackedKeys;
    constructor(cacheManager: Cache, performanceLogger: PerformanceLogger);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    generateKey(...parts: (string | number)[]): string;
    wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
    keys: {
        user: (userId: number) => string;
        userProfile: (userId: number) => string;
        adsList: (page: number, limit: number) => string;
        adDetails: (adId: number) => string;
        userWallet: (userId: number) => string;
        paymentStatus: (reference: string) => string;
    };
    ttl: {
        short: number;
        medium: number;
        long: number;
        veryLong: number;
    };
}
