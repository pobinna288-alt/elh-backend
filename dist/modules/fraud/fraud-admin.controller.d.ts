import { FraudService } from './fraud.service';
export declare class FraudAdminController {
    private fraudService;
    constructor(fraudService: FraudService);
    getDashboard(): Promise<{
        summary: {
            totalFraudEvents: number;
            lastHour: number;
            last24h: number;
            circuitBreakerOpen: boolean;
        };
        alerts: any[];
        topSuspiciousUsers: any[];
        recentViolations: any[];
    }>;
    getUserFraudProfile(userId: string): Promise<{
        userId: string;
        riskScore: number;
        accountStatus: any;
        rewardHistory: any[];
        fraudFlags: any[];
        deviceHistory: any[];
        ipHistory: any[];
        watchPatterns: any;
        recommendedAction: string;
    }>;
    banUser(userId: string, data: {
        reason: string;
        permanent?: boolean;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        reason: string;
        permanent: true;
        timestamp: Date;
    }>;
    unbanUser(userId: string, data: {
        reason: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        reason: string;
        timestamp: Date;
    }>;
    reverseReward(rewardId: string, data: {
        reason: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        reason: string;
        timestamp: Date;
    }>;
    approveDispute(disputeId: string, data: {
        notes: string;
    }): Promise<{
        success: boolean;
        message: string;
        notes: string;
    }>;
    blacklistDevice(data: {
        fingerprint: string;
        reason: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        reason: string;
    }>;
    whitelistDevice(fingerprint: string): Promise<{
        success: boolean;
        message: string;
    }>;
    blacklistIP(data: {
        ip: string;
        reason: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        reason: string;
    }>;
    whitelistIP(ip: string): Promise<{
        success: boolean;
        message: string;
    }>;
    searchFraud(data: {
        pattern: string;
        threshold?: number;
    }): Promise<{
        results: any[];
        count: number;
    }>;
    getPendingReviews(limit?: number): Promise<{
        pending: any[];
        count: number;
    }>;
    submitReviewDecision(reviewId: string, data: {
        approved: boolean;
        notes: string;
    }, req: any): Promise<{
        success: boolean;
        decision: string;
        notes: string;
        reviewer: any;
        timestamp: Date;
    }>;
    exportFraudData(format?: 'csv' | 'json'): Promise<{
        success: boolean;
        format: "json" | "csv";
        recordCount: number;
        exportUrl: string;
        expiresAt: Date;
    }>;
    getReconciliationReport(days?: number): Promise<{
        period: string;
        reconciliations: any[];
        totalDiscrepancy: number;
        status: string;
    }>;
    triggerManualReview(): Promise<{
        success: boolean;
        message: string;
        reviewsQueued: number;
        estimatedCompleteTime: Date;
    }>;
    updateFraudConfig(data: any, req: any): Promise<{
        success: boolean;
        message: string;
        updatedBy: any;
        timestamp: Date;
    }>;
    private getTotalFraudEvents;
    private getFraudEventsLastHour;
    private getFraudEventsLast24h;
    private isCircuitBreakerOpen;
    private getActiveAlerts;
    private getTopSuspiciousUsers;
    private getRecentViolations;
    private getAccountStatus;
    private getRewardHistory;
    private getUserFlags;
    private getDeviceHistory;
    private getIPHistory;
    private getWatchPatterns;
    private getRecommendedAction;
    private reverseBan;
    private reverseRewardTransaction;
    private addDeviceBlock;
    private removeDeviceBlock;
    private addIPBlock;
    private removeIPBlock;
    private searchFraudPatterns;
    private getPendingManualReviews;
    private generateFraudExport;
    private getReconciliationData;
}
