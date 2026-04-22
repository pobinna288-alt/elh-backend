export declare class PerformanceService {
    private requestTimings;
    private readonly SLOW_REQUEST_THRESHOLD;
    startTimer(label: string): () => number;
    isSlowOperation(duration: number): boolean;
    getAverageTiming(label: string): number | null;
    getStats(): Record<string, any>;
    clearStats(): void;
}
