"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MarketplaceFraudAdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceFraudAdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let MarketplaceFraudAdminController = MarketplaceFraudAdminController_1 = class MarketplaceFraudAdminController {
    constructor() {
        this.logger = new common_1.Logger(MarketplaceFraudAdminController_1.name);
    }
    async getReviewQueue(priority, status, limit) {
        this.logger.log(`Admin fetching review queue: priority=${priority}, status=${status}`);
        return {
            items: [
                {
                    id: 'review-1',
                    userId: 'user-123',
                    userEmail: 'suspect@example.com',
                    priority: 'high',
                    fraudScore: 78,
                    reportCount: 4,
                    reviewReason: 'multiple_reports',
                    evidence: {
                        signals: ['rapid_posting', 'duplicate_content', 'price_outlier'],
                        recentAds: 25,
                        verificationStatus: 'unverified',
                    },
                    createdAt: new Date(),
                    hoursWaiting: 5.2,
                },
            ],
            pagination: {
                total: 15,
                page: 1,
                limit: limit || 20,
            },
        };
    }
    async getReviewDetails(reviewId) {
        this.logger.log(`Admin viewing review details: ${reviewId}`);
        return {
            reviewId,
            user: {
                id: 'user-123',
                email: 'suspect@example.com',
                username: 'suspect_user',
                createdAt: new Date('2025-12-01'),
                verificationStatus: {
                    email: false,
                    phone: false,
                    profileComplete: false,
                },
            },
            fraudScore: {
                current: 78,
                history: [
                    { score: 45, date: new Date('2026-01-10') },
                    { score: 62, date: new Date('2026-01-12') },
                    { score: 78, date: new Date('2026-01-15') },
                ],
                riskLevel: 'high',
                topSignals: [
                    { name: 'rapid_posting', score: 85, weight: 20 },
                    { name: 'duplicate_content', score: 70, weight: 25 },
                    { name: 'price_outlier', score: 60, weight: 15 },
                ],
            },
            activity: {
                adsCreated: 45,
                adsLast24h: 12,
                adsLast7d: 35,
                messagesLast24h: 25,
            },
            reports: [
                {
                    reporterId: 'user-456',
                    reason: 'scam',
                    details: 'Selling fake items with stolen images',
                    reportedAt: new Date('2026-01-14'),
                },
                {
                    reporterId: 'user-789',
                    reason: 'fake_ad',
                    details: 'Price too good to be true',
                    reportedAt: new Date('2026-01-15'),
                },
            ],
            enforcementHistory: [
                {
                    action: 'warning',
                    reason: 'High posting velocity',
                    appliedAt: new Date('2026-01-10'),
                },
            ],
            deviceNetwork: {
                deviceCount: 3,
                ipCount: 8,
                countryChanges: 2,
                vpnDetected: true,
            },
        };
    }
    async assignReview(reviewId, admin) {
        this.logger.log(`Admin ${admin.id} claimed review: ${reviewId}`);
        return {
            success: true,
            reviewId,
            assignedTo: admin.id,
            assignedAt: new Date(),
        };
    }
    async completeReview(reviewId, body, admin) {
        this.logger.log(`Admin ${admin.id} completed review ${reviewId} with decision: ${body.decision}`);
        if (body.decision === 'permanent_ban') {
            if (!body.reason || body.reason.length < 50) {
                return {
                    success: false,
                    error: 'Permanent ban requires detailed reason (min 50 characters)',
                };
            }
            await this.logPermanentBan(reviewId, admin.id, body.reason);
        }
        return {
            success: true,
            reviewId,
            decision: body.decision,
            appliedBy: admin.id,
            appliedAt: new Date(),
        };
    }
    async getEnforcementHistory(userId) {
        this.logger.log(`Admin viewing enforcement history for user: ${userId}`);
        return {
            userId,
            actions: [
                {
                    id: 'action-1',
                    actionType: 'warning',
                    level: 1,
                    reason: 'High posting velocity detected',
                    fraudScore: 62,
                    appliedAt: new Date('2026-01-10'),
                    appliedBy: 'system',
                    status: 'completed',
                },
                {
                    id: 'action-2',
                    actionType: 'soft_restriction',
                    level: 1,
                    reason: 'Multiple user reports received',
                    fraudScore: 78,
                    appliedAt: new Date('2026-01-15'),
                    appliedBy: 'admin-456',
                    status: 'active',
                    expiresAt: new Date('2026-01-22'),
                },
            ],
        };
    }
    async applyEnforcement(userId, body, admin) {
        this.logger.log(`Admin ${admin.id} applying ${body.actionType} to user ${userId}`);
        if (body.actionType === 'permanent_ban') {
            const validation = await this.validatePermanentBan(userId, body.reason);
            if (!validation.allowed) {
                return {
                    success: false,
                    error: validation.error,
                };
            }
        }
        return {
            success: true,
            userId,
            action: body.actionType,
            appliedBy: admin.id,
            appliedAt: new Date(),
        };
    }
    async liftEnforcement(actionId, body, admin) {
        this.logger.log(`Admin ${admin.id} lifting enforcement action: ${actionId}`);
        return {
            success: true,
            actionId,
            liftedBy: admin.id,
            liftedAt: new Date(),
            reason: body.reason,
        };
    }
    async getPendingAppeals(status) {
        this.logger.log(`Admin fetching appeals: status=${status}`);
        return {
            items: [
                {
                    id: 'appeal-1',
                    userId: 'user-123',
                    userEmail: 'user@example.com',
                    enforcementAction: {
                        type: 'temp_ban',
                        reason: 'High fraud score',
                        appliedAt: new Date('2026-01-15'),
                    },
                    appealText: 'I believe this was a mistake. I was posting multiple ads because I am moving and selling furniture. All items are legitimate.',
                    evidenceUrls: ['https://example.com/photo1.jpg'],
                    submittedAt: new Date('2026-01-16'),
                    status: 'pending',
                },
            ],
        };
    }
    async reviewAppeal(appealId, body, admin) {
        this.logger.log(`Admin ${admin.id} reviewing appeal ${appealId}: ${body.decision}`);
        return {
            success: true,
            appealId,
            decision: body.decision,
            reviewedBy: admin.id,
            reviewedAt: new Date(),
        };
    }
    async getFraudStats(days = 7) {
        this.logger.log(`Admin viewing fraud stats for last ${days} days`);
        return {
            period: `last_${days}_days`,
            reviewQueue: {
                pending: 15,
                inReview: 8,
                completed: 127,
            },
            actions: {
                warnings: 45,
                softRestrictions: 23,
                tempBans: 12,
                permanentBans: 2,
            },
            appeals: {
                pending: 5,
                approved: 8,
                rejected: 12,
            },
            topSignals: [
                { name: 'rapid_posting', count: 67 },
                { name: 'duplicate_content', count: 45 },
                { name: 'price_outlier', count: 38 },
            ],
            riskDistribution: {
                low: 8542,
                medium: 234,
                high: 45,
                critical: 12,
            },
        };
    }
    async getAuditLog(userId, adminId, limit = 50) {
        this.logger.log('Admin viewing audit log');
        return {
            items: [
                {
                    id: 'audit-1',
                    actionType: 'enforcement_applied',
                    userId: 'user-123',
                    adminId: 'admin-456',
                    beforeState: { fraudScore: 62 },
                    afterState: { fraudScore: 78, action: 'soft_restriction' },
                    reason: 'Multiple reports received',
                    timestamp: new Date(),
                    ipAddress: '192.168.1.1',
                },
            ],
            pagination: {
                total: 1523,
                limit,
            },
        };
    }
    async getConfig() {
        return {
            scoreThresholds: { low: [0, 30], medium: [31, 60], high: [61, 80], critical: [81, 100] },
            signalWeights: {
                newAccount: 15,
                rapidPosting: 20,
                duplicateContent: 25,
            },
            rateLimits: {
                maxAdsPerDay: 30,
                maxAdsPerHour: 5,
            },
            banCriteria: {
                tempBanScore: 75,
                permBanMinScore: 85,
                permBanMinReports: 3,
            },
        };
    }
    async updateConfig(config, admin) {
        this.logger.log(`Admin ${admin.id} updating fraud detection config`);
        return {
            success: true,
            updatedBy: admin.id,
            updatedAt: new Date(),
        };
    }
    async validatePermanentBan(userId, reason) {
        if (!reason || reason.length < 50) {
            return {
                allowed: false,
                error: 'Permanent ban requires detailed reason (min 50 characters)',
            };
        }
        const meetsAllCriteria = true;
        if (!meetsAllCriteria) {
            return {
                allowed: false,
                error: 'User does not meet all permanent ban criteria',
            };
        }
        return { allowed: true };
    }
    async logPermanentBan(reviewId, adminId, reason) {
        this.logger.warn(`PERMANENT BAN APPLIED - Review: ${reviewId}, Admin: ${adminId}, Reason: ${reason}`);
    }
};
exports.MarketplaceFraudAdminController = MarketplaceFraudAdminController;
__decorate([
    (0, common_1.Get)('review-queue'),
    __param(0, (0, common_1.Query)('priority')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getReviewQueue", null);
__decorate([
    (0, common_1.Get)('review-queue/:reviewId'),
    __param(0, (0, common_1.Param)('reviewId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getReviewDetails", null);
__decorate([
    (0, common_1.Put)('review-queue/:reviewId/assign'),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "assignReview", null);
__decorate([
    (0, common_1.Post)('review-queue/:reviewId/complete'),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "completeReview", null);
__decorate([
    (0, common_1.Get)('enforcement/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getEnforcementHistory", null);
__decorate([
    (0, common_1.Post)('enforcement/:userId/apply'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "applyEnforcement", null);
__decorate([
    (0, common_1.Put)('enforcement/:actionId/lift'),
    __param(0, (0, common_1.Param)('actionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "liftEnforcement", null);
__decorate([
    (0, common_1.Get)('appeals'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getPendingAppeals", null);
__decorate([
    (0, common_1.Post)('appeals/:appealId/review'),
    __param(0, (0, common_1.Param)('appealId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "reviewAppeal", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getFraudStats", null);
__decorate([
    (0, common_1.Get)('audit-log'),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('adminId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)('config'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceFraudAdminController.prototype, "updateConfig", null);
exports.MarketplaceFraudAdminController = MarketplaceFraudAdminController = MarketplaceFraudAdminController_1 = __decorate([
    (0, common_1.Controller)('admin/fraud'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard)
], MarketplaceFraudAdminController);
//# sourceMappingURL=marketplace-fraud-admin.controller.js.map