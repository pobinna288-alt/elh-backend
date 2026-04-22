export declare class MarketplaceFraudJobsService {
    private readonly logger;
    recalculateActiveUserScores(): Promise<void>;
    applyScoreDecay(): Promise<void>;
    detectMultiAccountFraud(): Promise<void>;
    detectContentDuplication(): Promise<void>;
    detectImageReuse(): Promise<void>;
    escalateStaleReviews(): Promise<void>;
    sendDailyReviewSummary(): Promise<void>;
    expireTemporaryBans(): Promise<void>;
    archiveOldEvents(): Promise<void>;
    cleanupDeviceFingerprints(): Promise<void>;
    monitorFraudSpike(): Promise<void>;
    checkReviewQueueHealth(): Promise<void>;
    updateMLModels(): Promise<void>;
    detectAnomalousClusters(): Promise<void>;
    performHealthCheck(): Promise<void>;
}
