import { FraudService } from './fraud.service';
export declare class FraudController {
    private fraudService;
    constructor(fraudService: FraudService);
    startAd(data: {
        adId: string;
    }, req: any): Promise<{
        sessionId: string;
        temporaryToken: string;
    }>;
    saveCheckpoint(data: {
        sessionId: string;
        progress: number;
    }): Promise<{
        saved: boolean;
    }>;
    completeAd(data: {
        sessionId: string;
        adId: string;
        deviceFingerprint: string;
    }, req: any): Promise<{
        success: boolean;
        coinsEarned?: number;
        message: string;
        recovered?: boolean;
        withdrawableBalance?: number;
    }>;
    getRiskScore(req: any): Promise<{
        riskScore: number;
    }>;
}
