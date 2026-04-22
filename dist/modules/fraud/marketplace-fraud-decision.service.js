"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MarketplaceFraudDecisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceFraudDecisionService = void 0;
const common_1 = require("@nestjs/common");
let MarketplaceFraudDecisionService = MarketplaceFraudDecisionService_1 = class MarketplaceFraudDecisionService {
    constructor() {
        this.logger = new common_1.Logger(MarketplaceFraudDecisionService_1.name);
    }
    async makeEnforcementDecision(context) {
        this.logger.log(`Making enforcement decision for user ${context.userId} - Score: ${context.currentScore}, Risk: ${context.riskLevel}`);
        if (context.activeRestrictions.length > 0) {
            return this.handleExistingRestrictions(context);
        }
        switch (context.riskLevel) {
            case 'low':
                return this.handleLowRisk(context);
            case 'medium':
                return this.handleMediumRisk(context);
            case 'high':
                return this.handleHighRisk(context);
            case 'critical':
                return this.handleCriticalRisk(context);
            default:
                return {
                    action: 'none',
                    level: null,
                    reason: 'Unknown risk level',
                    requiresManualReview: false,
                    notifyUser: false,
                    evidence: context,
                };
        }
    }
    handleLowRisk(context) {
        return {
            action: 'none',
            level: null,
            reason: 'Low fraud risk. Continue monitoring.',
            requiresManualReview: false,
            notifyUser: false,
            evidence: { score: context.currentScore },
        };
    }
    handleMediumRisk(context) {
        if (context.previousWarnings >= 2) {
            return this.handleHighRisk(context);
        }
        return {
            action: 'none',
            level: null,
            reason: 'Medium risk detected. Showing buyer safety warnings.',
            restrictions: {
                canPost: true,
                canMessage: true,
                adsHidden: false,
                reducedVisibility: false,
            },
            requiresManualReview: false,
            notifyUser: false,
            evidence: {
                score: context.currentScore,
                buyerWarningEnabled: true,
            },
        };
    }
    handleHighRisk(context) {
        if (context.previousTempBans > 0) {
            return this.escalateToLevel2(context);
        }
        if (context.reportsReceived >= 3) {
            return {
                action: 'review_required',
                level: 1,
                reason: 'High risk with multiple reports. Manual review required.',
                restrictions: {
                    canPost: true,
                    canMessage: true,
                    adsHidden: false,
                    reducedVisibility: true,
                },
                requiresManualReview: true,
                notifyUser: false,
                evidence: {
                    score: context.currentScore,
                    reports: context.reportsReceived,
                },
            };
        }
        return {
            action: 'soft_restriction',
            level: 1,
            reason: 'High fraud risk. Applying soft restrictions.',
            restrictions: {
                canPost: true,
                canMessage: true,
                adsHidden: false,
                reducedVisibility: true,
                requireVerification: true,
            },
            requiresManualReview: true,
            notifyUser: true,
            evidence: {
                score: context.currentScore,
                action: 'soft_restriction',
            },
        };
    }
    handleCriticalRisk(context) {
        if (context.previousTempBans >= 2) {
            return this.escalateToLevel3(context);
        }
        return this.escalateToLevel2(context);
    }
    applyLevel1Restriction(context) {
        return {
            action: 'soft_restriction',
            level: 1,
            reason: 'Fraud risk detected. Soft restrictions applied.',
            restrictions: {
                canPost: true,
                canMessage: true,
                adsHidden: false,
                reducedVisibility: true,
                requireVerification: true,
            },
            requiresManualReview: true,
            notifyUser: true,
            evidence: {
                score: context.currentScore,
                level: 1,
            },
        };
    }
    escalateToLevel2(context) {
        const durationHours = this.calculateTempBanDuration(context);
        return {
            action: 'temp_ban',
            level: 2,
            reason: 'Critical fraud risk. Temporary suspension applied.',
            restrictions: {
                canPost: false,
                canMessage: false,
                adsHidden: true,
                reducedVisibility: true,
            },
            durationHours,
            requiresManualReview: true,
            notifyUser: true,
            evidence: {
                score: context.currentScore,
                previousBans: context.previousTempBans,
                reports: context.reportsReceived,
                level: 2,
            },
        };
    }
    escalateToLevel3(context) {
        const meetsAllCriteria = this.checkPermanentBanCriteria(context);
        if (!meetsAllCriteria) {
            return this.escalateToLevel2(context);
        }
        return {
            action: 'review_required',
            level: 3,
            reason: 'User meets permanent ban criteria. URGENT manual review required.',
            restrictions: {
                canPost: false,
                canMessage: false,
                adsHidden: true,
                reducedVisibility: true,
            },
            durationHours: 72,
            requiresManualReview: true,
            notifyUser: true,
            evidence: {
                score: context.currentScore,
                previousWarnings: context.previousWarnings,
                previousTempBans: context.previousTempBans,
                reportsReceived: context.reportsReceived,
                daysSinceLastViolation: context.daysSinceLastViolation,
                level: 3,
                permanentBanCandidate: true,
                requiresAdminApproval: true,
            },
        };
    }
    checkPermanentBanCriteria(context) {
        const criteria = {
            highScoreOverTime: context.currentScore >= 85,
            multipleReports: context.reportsReceived >= 3,
            previousWarnings: context.previousWarnings >= 2,
            previousTempBans: context.previousTempBans >= 2,
            recentActivity: context.daysSinceLastViolation <= 30,
        };
        this.logger.log(`Permanent ban criteria check for user ${context.userId}:`, criteria);
        const allCriteriaMet = Object.values(criteria).every((criterion) => criterion === true);
        if (allCriteriaMet) {
            this.logger.warn(`User ${context.userId} meets ALL permanent ban criteria - flagging for urgent review`);
        }
        return allCriteriaMet;
    }
    handleExistingRestrictions(context) {
        const hasActiveTempBan = context.activeRestrictions.some((r) => r.action_type === 'temp_ban');
        const hasActivePermanentBan = context.activeRestrictions.some((r) => r.action_type === 'permanent_ban');
        if (hasActivePermanentBan) {
            return {
                action: 'none',
                level: null,
                reason: 'User is permanently banned. No further action needed.',
                requiresManualReview: false,
                notifyUser: false,
                evidence: { activeRestrictions: context.activeRestrictions },
            };
        }
        if (hasActiveTempBan && context.currentScore >= 80) {
            return {
                action: 'review_required',
                level: 3,
                reason: 'Fraud score increased during temporary ban. Escalating.',
                requiresManualReview: true,
                notifyUser: false,
                evidence: {
                    score: context.currentScore,
                    activeRestrictions: context.activeRestrictions,
                },
            };
        }
        return {
            action: 'none',
            level: null,
            reason: 'Active restrictions in place. Monitoring.',
            requiresManualReview: false,
            notifyUser: false,
            evidence: { activeRestrictions: context.activeRestrictions },
        };
    }
    calculateTempBanDuration(context) {
        let duration = 24;
        duration += context.previousTempBans * 24;
        duration = Math.min(72, duration);
        if (context.currentScore >= 85) {
            duration = 72;
        }
        this.logger.log(`Calculated temp ban duration for user ${context.userId}: ${duration} hours`);
        return duration;
    }
    async makeAdEnforcementDecision(adScore, userScore) {
        if (adScore >= 80) {
            return {
                action: 'hide',
                reason: 'Critical fraud risk detected in ad content.',
                requiresReview: true,
            };
        }
        if (adScore >= 60) {
            return {
                action: 'reduce_visibility',
                reason: 'High fraud risk. Ad visibility reduced.',
                requiresReview: true,
            };
        }
        if (adScore >= 35 || userScore >= 50) {
            return {
                action: 'publish_with_warning',
                reason: 'Moderate risk. Showing buyer safety warnings.',
                requiresReview: false,
            };
        }
        return {
            action: 'publish',
            reason: 'Low fraud risk. Normal visibility.',
            requiresReview: false,
        };
    }
    validateDecisionSafety(decision) {
        if (decision.action === 'temp_ban' && decision.level === 3) {
            if (!decision.requiresManualReview) {
                this.logger.error('SAFETY VIOLATION: Level 3 action without manual review');
                return false;
            }
        }
        if (decision.action === 'temp_ban' && !decision.durationHours) {
            this.logger.error('SAFETY VIOLATION: Temp ban without duration');
            return false;
        }
        return true;
    }
    async logEnforcementDecision(userId, decision, adminId) {
        this.logger.log(`Enforcement decision for user ${userId}: ${decision.action} (Level ${decision.level})`);
    }
};
exports.MarketplaceFraudDecisionService = MarketplaceFraudDecisionService;
exports.MarketplaceFraudDecisionService = MarketplaceFraudDecisionService = MarketplaceFraudDecisionService_1 = __decorate([
    (0, common_1.Injectable)()
], MarketplaceFraudDecisionService);
//# sourceMappingURL=marketplace-fraud-decision.service.js.map