export declare class MarketplaceFraudEventService {
    private readonly logger;
    trackAccountCreation(userId: string, ipAddress: string, deviceFingerprint: string, userAgent: string): Promise<void>;
    trackEmailVerification(userId: string): Promise<void>;
    trackPhoneVerification(userId: string): Promise<void>;
    trackLogin(userId: string, ipAddress: string, deviceFingerprint: string, countryCode: string, userAgent: string): Promise<void>;
    trackAdCreation(adId: string, userId: string, categoryId: string, price: number, description: string, imageHashes: string[], ipAddress: string): Promise<void>;
    trackAdEdit(adId: string, userId: string, changes: {
        priceChanged?: {
            from: number;
            to: number;
        };
        descriptionChanged?: boolean;
        imagesChanged?: boolean;
    }): Promise<void>;
    trackPriceChange(adId: string, userId: string, oldPrice: number, newPrice: number): Promise<void>;
    trackMessageSent(senderId: string, recipientId: string, conversationId: string, adId: string, patternFlags: string[]): Promise<void>;
    detectOffPlatformPatterns(messageText: string): string[];
    trackUserReport(reporterId: string, reportedUserId: string, reason: string, details: string, evidenceUrls: string[], reportedAdId?: string): Promise<void>;
    trackUserBlock(blockerId: string, blockedUserId: string): Promise<void>;
    private trackDeviceFingerprint;
    private trackIpAddress;
    private checkIpChange;
    private trackContentPattern;
    private getRecentMessageCount;
    private hashFingerprint;
    private hashContent;
    private logEvent;
    cleanupOldEvents(): Promise<void>;
    recalculateFlaggedUserScores(): Promise<void>;
}
