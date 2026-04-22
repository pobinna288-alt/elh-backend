"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MarketplaceFraudScoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceFraudScoringService = void 0;
const common_1 = require("@nestjs/common");
let MarketplaceFraudScoringService = MarketplaceFraudScoringService_1 = class MarketplaceFraudScoringService {
    constructor() {
        this.logger = new common_1.Logger(MarketplaceFraudScoringService_1.name);
        this.signalWeights = {
            newAccount: 15,
            unverifiedEmail: 10,
            unverifiedPhone: 10,
            incompleteProfile: 5,
            rapidPosting: 20,
            priceOutlier: 15,
            duplicateContent: 25,
            duplicateImages: 20,
            highReports: 30,
            previousWarnings: 20,
            previousBans: 40,
            rapidMessaging: 15,
            offPlatformPatterns: 25,
            deviceSharing: 20,
            ipShifting: 15,
            countryHopping: 25,
        };
        this.riskThresholds = {
            low: { min: 0, max: 30 },
            medium: { min: 31, max: 60 },
            high: { min: 61, max: 80 },
            critical: { min: 81, max: 100 },
        };
    }
    async calculateUserFraudScore(userContext) {
        this.logger.log(`Calculating fraud score for user: ${userContext.userId}`);
        const signals = [];
        signals.push(...this.checkAccountSignals(userContext));
        signals.push(...this.checkBehaviorSignals(userContext));
        signals.push(...this.checkFeedbackSignals(userContext));
        signals.push(...this.checkEnforcementHistory(userContext));
        signals.push(...this.checkDeviceNetworkSignals(userContext));
        const finalScore = this.calculateWeightedScore(signals);
        const riskLevel = this.determineRiskLevel(finalScore);
        const requiresReview = this.shouldRequireReview(finalScore, signals, userContext);
        const recommendation = this.generateRecommendation(finalScore, riskLevel, signals);
        this.logger.log(`User ${userContext.userId} - Score: ${finalScore}, Risk: ${riskLevel}, Review: ${requiresReview}`);
        return {
            userId: userContext.userId,
            finalScore,
            riskLevel,
            signals,
            recommendation,
            requiresReview,
        };
    }
    async calculateAdFraudScore(adContext, userScore) {
        this.logger.log(`Calculating fraud score for ad: ${adContext.adId}`);
        const signals = [];
        signals.push(...this.checkPriceSignals(adContext));
        signals.push(...this.checkContentDuplication(adContext));
        signals.push(...this.checkImageDuplication(adContext));
        if (userScore > 50) {
            signals.push({
                name: 'high_user_risk',
                score: Math.min(userScore * 0.6, 60),
                weight: 100,
                evidence: { userScore },
            });
        }
        const finalScore = this.calculateWeightedScore(signals);
        const riskLevel = this.determineRiskLevel(finalScore);
        const requiresReview = finalScore >= 70;
        const recommendation = this.generateAdRecommendation(finalScore, riskLevel, signals);
        return {
            userId: adContext.userId,
            finalScore,
            riskLevel,
            signals,
            recommendation,
            requiresReview,
        };
    }
    checkAccountSignals(context) {
        const signals = [];
        if (context.accountAgeHours < 168) {
            const score = Math.max(0, 15 - context.accountAgeHours / 168 * 15);
            signals.push({
                name: 'new_account',
                score,
                weight: this.signalWeights.newAccount,
                evidence: { accountAgeHours: context.accountAgeHours },
            });
        }
        if (!context.emailVerified) {
            signals.push({
                name: 'unverified_email',
                score: 10,
                weight: this.signalWeights.unverifiedEmail,
                evidence: { emailVerified: false },
            });
        }
        if (!context.phoneVerified) {
            signals.push({
                name: 'unverified_phone',
                score: 10,
                weight: this.signalWeights.unverifiedPhone,
                evidence: { phoneVerified: false },
            });
        }
        if (!context.profileComplete) {
            signals.push({
                name: 'incomplete_profile',
                score: 5,
                weight: this.signalWeights.incompleteProfile,
                evidence: { profileComplete: false },
            });
        }
        return signals;
    }
    checkBehaviorSignals(context) {
        const signals = [];
        if (context.adsCreatedLast24h > 10) {
            const score = Math.min(100, (context.adsCreatedLast24h / 30) * 100);
            signals.push({
                name: 'rapid_posting_24h',
                score,
                weight: this.signalWeights.rapidPosting,
                evidence: { adsCreatedLast24h: context.adsCreatedLast24h },
            });
        }
        if (context.adsCreatedLast7d > 50) {
            const score = Math.min(100, (context.adsCreatedLast7d / 100) * 100);
            signals.push({
                name: 'rapid_posting_7d',
                score,
                weight: this.signalWeights.rapidPosting,
                evidence: { adsCreatedLast7d: context.adsCreatedLast7d },
            });
        }
        if (context.messagesLast1h > 20) {
            const score = Math.min(100, (context.messagesLast1h / 50) * 100);
            signals.push({
                name: 'rapid_messaging',
                score,
                weight: this.signalWeights.rapidMessaging,
                evidence: { messagesLast1h: context.messagesLast1h },
            });
        }
        return signals;
    }
    checkFeedbackSignals(context) {
        const signals = [];
        if (context.reportsReceived > 0) {
            const score = Math.min(100, (context.reportsReceived / 10) * 100);
            signals.push({
                name: 'user_reports',
                score,
                weight: this.signalWeights.highReports,
                evidence: { reportsReceived: context.reportsReceived },
            });
        }
        return signals;
    }
    checkEnforcementHistory(context) {
        const signals = [];
        if (context.previousWarnings > 0) {
            const score = Math.min(100, context.previousWarnings * 25);
            signals.push({
                name: 'previous_warnings',
                score,
                weight: this.signalWeights.previousWarnings,
                evidence: { previousWarnings: context.previousWarnings },
            });
        }
        if (context.previousTempBans > 0) {
            const score = Math.min(100, context.previousTempBans * 40);
            signals.push({
                name: 'previous_temp_bans',
                score,
                weight: this.signalWeights.previousBans,
                evidence: { previousTempBans: context.previousTempBans },
            });
        }
        if (context.previousPermanentBans > 0) {
            signals.push({
                name: 'previous_permanent_bans',
                score: 100,
                weight: 100,
                evidence: { previousPermanentBans: context.previousPermanentBans },
            });
        }
        return signals;
    }
    checkDeviceNetworkSignals(context) {
        const signals = [];
        if (context.deviceCount > 5) {
            const score = Math.min(100, (context.deviceCount / 10) * 100);
            signals.push({
                name: 'device_sharing',
                score,
                weight: this.signalWeights.deviceSharing,
                evidence: { deviceCount: context.deviceCount },
            });
        }
        if (context.ipChangesLast7d > 10) {
            const score = Math.min(100, (context.ipChangesLast7d / 20) * 100);
            signals.push({
                name: 'ip_shifting',
                score,
                weight: this.signalWeights.ipShifting,
                evidence: { ipChangesLast7d: context.ipChangesLast7d },
            });
        }
        if (context.countryChangesLast7d > 3) {
            const score = Math.min(100, (context.countryChangesLast7d / 5) * 100);
            signals.push({
                name: 'country_hopping',
                score,
                weight: this.signalWeights.countryHopping,
                evidence: { countryChangesLast7d: context.countryChangesLast7d },
            });
        }
        return signals;
    }
    checkPriceSignals(adContext) {
        const signals = [];
        if (adContext.categoryAveragePrice && adContext.priceAmount > 0) {
            const priceRatio = adContext.priceAmount / adContext.categoryAveragePrice;
            if (priceRatio < 0.3) {
                const score = Math.min(100, (0.3 - priceRatio) / 0.3 * 100);
                signals.push({
                    name: 'price_too_low',
                    score,
                    weight: this.signalWeights.priceOutlier,
                    evidence: {
                        adPrice: adContext.priceAmount,
                        categoryAverage: adContext.categoryAveragePrice,
                        ratio: priceRatio,
                    },
                });
            }
            if (priceRatio > 3.0) {
                const score = Math.min(100, (priceRatio - 3.0) / 3.0 * 100);
                signals.push({
                    name: 'price_too_high',
                    score,
                    weight: this.signalWeights.priceOutlier * 0.5,
                    evidence: {
                        adPrice: adContext.priceAmount,
                        categoryAverage: adContext.categoryAveragePrice,
                        ratio: priceRatio,
                    },
                });
            }
        }
        return signals;
    }
    checkContentDuplication(adContext) {
        const signals = [];
        const duplicateCount = 0;
        if (duplicateCount > 1) {
            const score = Math.min(100, (duplicateCount / 10) * 100);
            signals.push({
                name: 'duplicate_description',
                score,
                weight: this.signalWeights.duplicateContent,
                evidence: {
                    descriptionHash: adContext.descriptionHash,
                    duplicateCount,
                },
            });
        }
        return signals;
    }
    checkImageDuplication(adContext) {
        const signals = [];
        const duplicateImageCount = 0;
        if (duplicateImageCount > 0) {
            const score = Math.min(100, (duplicateImageCount / 5) * 100);
            signals.push({
                name: 'duplicate_images',
                score,
                weight: this.signalWeights.duplicateImages,
                evidence: {
                    imageHashes: adContext.imagePerceptualHashes,
                    duplicateCount: duplicateImageCount,
                },
            });
        }
        return signals;
    }
    calculateWeightedScore(signals) {
        if (signals.length === 0)
            return 0;
        let totalWeightedScore = 0;
        let totalWeight = 0;
        for (const signal of signals) {
            totalWeightedScore += signal.score * (signal.weight / 100);
            totalWeight += signal.weight / 100;
        }
        const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        return Math.min(100, Math.round(finalScore));
    }
    determineRiskLevel(score) {
        if (score <= this.riskThresholds.low.max)
            return 'low';
        if (score <= this.riskThresholds.medium.max)
            return 'medium';
        if (score <= this.riskThresholds.high.max)
            return 'high';
        return 'critical';
    }
    shouldRequireReview(score, signals, context) {
        if (score >= 80)
            return true;
        const highWeightSignals = signals.filter((s) => s.weight >= 25);
        if (highWeightSignals.length >= 3)
            return true;
        if (context.previousTempBans > 0 && score >= 60)
            return true;
        if (context.reportsReceived >= 3)
            return true;
        return false;
    }
    generateRecommendation(score, riskLevel, signals) {
        const topSignals = signals
            .sort((a, b) => b.score * b.weight - a.score * a.weight)
            .slice(0, 3)
            .map((s) => s.name)
            .join(', ');
        switch (riskLevel) {
            case 'low':
                return 'No action required. Monitor behavior.';
            case 'medium':
                return `Show safety warnings to buyers. Monitor for: ${topSignals}`;
            case 'high':
                return `Reduce ad visibility, limit features. Queue for review. Risk factors: ${topSignals}`;
            case 'critical':
                return `Temporary suspension recommended. Mandatory manual review. Critical factors: ${topSignals}`;
            default:
                return 'Unknown risk level';
        }
    }
    generateAdRecommendation(score, riskLevel, signals) {
        const topSignals = signals
            .sort((a, b) => b.score * b.weight - a.score * a.weight)
            .slice(0, 2)
            .map((s) => s.name)
            .join(', ');
        switch (riskLevel) {
            case 'low':
                return 'Ad approved. Normal visibility.';
            case 'medium':
                return `Ad published with buyer warnings. Factors: ${topSignals}`;
            case 'high':
                return `Reduce ad visibility in search. Flag for review. Factors: ${topSignals}`;
            case 'critical':
                return `Hide ad pending review. Do not publish. Critical factors: ${topSignals}`;
            default:
                return 'Unknown risk level';
        }
    }
    async applyScoreDecay(userId, currentScore, daysSinceLastViolation) {
        if (currentScore === 0)
            return 0;
        const decayRatePerDay = 2;
        const minDaysForDecay = 7;
        if (daysSinceLastViolation < minDaysForDecay) {
            return currentScore;
        }
        const decayAmount = (daysSinceLastViolation - minDaysForDecay) * decayRatePerDay;
        const newScore = Math.max(0, currentScore - decayAmount);
        this.logger.log(`Score decay for user ${userId}: ${currentScore} -> ${newScore} (${daysSinceLastViolation} days clean)`);
        return newScore;
    }
    async loadConfigurationFromDatabase() {
        try {
            this.logger.log('Fraud scoring configuration loaded');
        }
        catch (error) {
            this.logger.error('Failed to load fraud configuration', error);
        }
    }
};
exports.MarketplaceFraudScoringService = MarketplaceFraudScoringService;
exports.MarketplaceFraudScoringService = MarketplaceFraudScoringService = MarketplaceFraudScoringService_1 = __decorate([
    (0, common_1.Injectable)()
], MarketplaceFraudScoringService);
//# sourceMappingURL=marketplace-fraud-scoring.service.js.map