interface EnforcementDecision {
    action: 'none' | 'warning' | 'soft_restriction' | 'temp_ban' | 'review_required';
    level: 1 | 2 | 3 | null;
    reason: string;
    restrictions?: {
        canPost?: boolean;
        canMessage?: boolean;
        adsHidden?: boolean;
        reducedVisibility?: boolean;
        requireVerification?: boolean;
    };
    durationHours?: number;
    requiresManualReview: boolean;
    notifyUser: boolean;
    evidence: any;
}
interface UserEnforcementContext {
    userId: string;
    currentScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    previousWarnings: number;
    previousTempBans: number;
    previousPermanentBans: number;
    reportsReceived: number;
    daysSinceLastViolation: number;
    activeRestrictions: any[];
}
export declare class MarketplaceFraudDecisionService {
    private readonly logger;
    makeEnforcementDecision(context: UserEnforcementContext): Promise<EnforcementDecision>;
    private handleLowRisk;
    private handleMediumRisk;
    private handleHighRisk;
    private handleCriticalRisk;
    private applyLevel1Restriction;
    private escalateToLevel2;
    private escalateToLevel3;
    private checkPermanentBanCriteria;
    private handleExistingRestrictions;
    private calculateTempBanDuration;
    makeAdEnforcementDecision(adScore: number, userScore: number): Promise<{
        action: 'publish' | 'publish_with_warning' | 'reduce_visibility' | 'hide' | 'remove';
        reason: string;
        requiresReview: boolean;
    }>;
    private validateDecisionSafety;
    logEnforcementDecision(userId: string, decision: EnforcementDecision, adminId?: string): Promise<void>;
}
export {};
