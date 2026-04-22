export declare class MarketplaceFraudAdminController {
    private readonly logger;
    getReviewQueue(priority?: string, status?: string, limit?: number): Promise<{
        items: {
            id: string;
            userId: string;
            userEmail: string;
            priority: string;
            fraudScore: number;
            reportCount: number;
            reviewReason: string;
            evidence: {
                signals: string[];
                recentAds: number;
                verificationStatus: string;
            };
            createdAt: Date;
            hoursWaiting: number;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    getReviewDetails(reviewId: string): Promise<{
        reviewId: string;
        user: {
            id: string;
            email: string;
            username: string;
            createdAt: Date;
            verificationStatus: {
                email: boolean;
                phone: boolean;
                profileComplete: boolean;
            };
        };
        fraudScore: {
            current: number;
            history: {
                score: number;
                date: Date;
            }[];
            riskLevel: string;
            topSignals: {
                name: string;
                score: number;
                weight: number;
            }[];
        };
        activity: {
            adsCreated: number;
            adsLast24h: number;
            adsLast7d: number;
            messagesLast24h: number;
        };
        reports: {
            reporterId: string;
            reason: string;
            details: string;
            reportedAt: Date;
        }[];
        enforcementHistory: {
            action: string;
            reason: string;
            appliedAt: Date;
        }[];
        deviceNetwork: {
            deviceCount: number;
            ipCount: number;
            countryChanges: number;
            vpnDetected: boolean;
        };
    }>;
    assignReview(reviewId: string, admin: any): Promise<{
        success: boolean;
        reviewId: string;
        assignedTo: any;
        assignedAt: Date;
    }>;
    completeReview(reviewId: string, body: {
        decision: 'no_action' | 'warning' | 'soft_restriction' | 'temp_ban' | 'permanent_ban' | 'false_positive';
        reason: string;
        durationHours?: number;
    }, admin: any): Promise<{
        success: boolean;
        error: string;
        reviewId?: undefined;
        decision?: undefined;
        appliedBy?: undefined;
        appliedAt?: undefined;
    } | {
        success: boolean;
        reviewId: string;
        decision: "warning" | "no_action" | "soft_restriction" | "temp_ban" | "permanent_ban" | "false_positive";
        appliedBy: any;
        appliedAt: Date;
        error?: undefined;
    }>;
    getEnforcementHistory(userId: string): Promise<{
        userId: string;
        actions: ({
            id: string;
            actionType: string;
            level: number;
            reason: string;
            fraudScore: number;
            appliedAt: Date;
            appliedBy: string;
            status: string;
            expiresAt?: undefined;
        } | {
            id: string;
            actionType: string;
            level: number;
            reason: string;
            fraudScore: number;
            appliedAt: Date;
            appliedBy: string;
            status: string;
            expiresAt: Date;
        })[];
    }>;
    applyEnforcement(userId: string, body: {
        actionType: 'warning' | 'soft_restriction' | 'temp_ban' | 'permanent_ban';
        reason: string;
        durationHours?: number;
        restrictions?: any;
    }, admin: any): Promise<{
        success: boolean;
        error: string;
        userId?: undefined;
        action?: undefined;
        appliedBy?: undefined;
        appliedAt?: undefined;
    } | {
        success: boolean;
        userId: string;
        action: "warning" | "soft_restriction" | "temp_ban" | "permanent_ban";
        appliedBy: any;
        appliedAt: Date;
        error?: undefined;
    }>;
    liftEnforcement(actionId: string, body: {
        reason: string;
    }, admin: any): Promise<{
        success: boolean;
        actionId: string;
        liftedBy: any;
        liftedAt: Date;
        reason: string;
    }>;
    getPendingAppeals(status?: string): Promise<{
        items: {
            id: string;
            userId: string;
            userEmail: string;
            enforcementAction: {
                type: string;
                reason: string;
                appliedAt: Date;
            };
            appealText: string;
            evidenceUrls: string[];
            submittedAt: Date;
            status: string;
        }[];
    }>;
    reviewAppeal(appealId: string, body: {
        decision: 'approved' | 'rejected';
        reviewNotes: string;
    }, admin: any): Promise<{
        success: boolean;
        appealId: string;
        decision: "rejected" | "approved";
        reviewedBy: any;
        reviewedAt: Date;
    }>;
    getFraudStats(days?: number): Promise<{
        period: string;
        reviewQueue: {
            pending: number;
            inReview: number;
            completed: number;
        };
        actions: {
            warnings: number;
            softRestrictions: number;
            tempBans: number;
            permanentBans: number;
        };
        appeals: {
            pending: number;
            approved: number;
            rejected: number;
        };
        topSignals: {
            name: string;
            count: number;
        }[];
        riskDistribution: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
    }>;
    getAuditLog(userId?: string, adminId?: string, limit?: number): Promise<{
        items: {
            id: string;
            actionType: string;
            userId: string;
            adminId: string;
            beforeState: {
                fraudScore: number;
            };
            afterState: {
                fraudScore: number;
                action: string;
            };
            reason: string;
            timestamp: Date;
            ipAddress: string;
        }[];
        pagination: {
            total: number;
            limit: number;
        };
    }>;
    getConfig(): Promise<{
        scoreThresholds: {
            low: number[];
            medium: number[];
            high: number[];
            critical: number[];
        };
        signalWeights: {
            newAccount: number;
            rapidPosting: number;
            duplicateContent: number;
        };
        rateLimits: {
            maxAdsPerDay: number;
            maxAdsPerHour: number;
        };
        banCriteria: {
            tempBanScore: number;
            permBanMinScore: number;
            permBanMinReports: number;
        };
    }>;
    updateConfig(config: any, admin: any): Promise<{
        success: boolean;
        updatedBy: any;
        updatedAt: Date;
    }>;
    private validatePermanentBan;
    private logPermanentBan;
}
