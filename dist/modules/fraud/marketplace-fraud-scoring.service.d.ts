interface FraudSignal {
    name: string;
    score: number;
    weight: number;
    evidence: any;
}
interface FraudScoreResult {
    userId: string;
    finalScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    signals: FraudSignal[];
    recommendation: string;
    requiresReview: boolean;
}
interface UserContext {
    userId: string;
    accountAgeHours: number;
    emailVerified: boolean;
    phoneVerified: boolean;
    profileComplete: boolean;
    adsCreatedLast24h: number;
    adsCreatedLast7d: number;
    totalAdsCreated: number;
    messagesLast1h: number;
    reportsReceived: number;
    previousWarnings: number;
    previousTempBans: number;
    previousPermanentBans: number;
    ipChangesLast7d: number;
    countryChangesLast7d: number;
    deviceCount: number;
}
interface AdContext {
    adId: string;
    userId: string;
    categoryId: string;
    priceAmount: number;
    categoryAveragePrice?: number;
    descriptionHash: string;
    imagePerceptualHashes: string[];
    createdAt: Date;
}
export declare class MarketplaceFraudScoringService {
    private readonly logger;
    private signalWeights;
    private riskThresholds;
    calculateUserFraudScore(userContext: UserContext): Promise<FraudScoreResult>;
    calculateAdFraudScore(adContext: AdContext, userScore: number): Promise<FraudScoreResult>;
    private checkAccountSignals;
    private checkBehaviorSignals;
    private checkFeedbackSignals;
    private checkEnforcementHistory;
    private checkDeviceNetworkSignals;
    private checkPriceSignals;
    private checkContentDuplication;
    private checkImageDuplication;
    private calculateWeightedScore;
    private determineRiskLevel;
    private shouldRequireReview;
    private generateRecommendation;
    private generateAdRecommendation;
    applyScoreDecay(userId: string, currentScore: number, daysSinceLastViolation: number): Promise<number>;
    loadConfigurationFromDatabase(): Promise<void>;
}
export {};
