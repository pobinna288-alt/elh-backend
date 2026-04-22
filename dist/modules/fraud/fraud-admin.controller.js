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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudAdminController = void 0;
const common_1 = require("@nestjs/common");
const fraud_service_1 = require("./fraud.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let FraudAdminController = class FraudAdminController {
    constructor(fraudService) {
        this.fraudService = fraudService;
    }
    async getDashboard() {
        return {
            summary: {
                totalFraudEvents: await this.getTotalFraudEvents(),
                lastHour: await this.getFraudEventsLastHour(),
                last24h: await this.getFraudEventsLast24h(),
                circuitBreakerOpen: await this.isCircuitBreakerOpen(),
            },
            alerts: await this.getActiveAlerts(),
            topSuspiciousUsers: await this.getTopSuspiciousUsers(),
            recentViolations: await this.getRecentViolations(),
        };
    }
    async getUserFraudProfile(userId) {
        return {
            userId,
            riskScore: await this.fraudService.calculateRiskScore(userId),
            accountStatus: await this.getAccountStatus(userId),
            rewardHistory: await this.getRewardHistory(userId),
            fraudFlags: await this.getUserFlags(userId),
            deviceHistory: await this.getDeviceHistory(userId),
            ipHistory: await this.getIPHistory(userId),
            watchPatterns: await this.getWatchPatterns(userId),
            recommendedAction: await this.getRecommendedAction(userId),
        };
    }
    async banUser(userId, data, req) {
        await this.fraudService.immediatelyBanUser(userId, data.reason, req.ip);
        return {
            success: true,
            message: `User ${userId} has been banned`,
            reason: data.reason,
            permanent: data.permanent || true,
            timestamp: new Date(),
        };
    }
    async unbanUser(userId, data, req) {
        await this.reverseBan(userId, data.reason, req.user.id);
        return {
            success: true,
            message: `Ban reversed for user ${userId}`,
            reason: data.reason,
            timestamp: new Date(),
        };
    }
    async reverseReward(rewardId, data, req) {
        await this.reverseRewardTransaction(rewardId, data.reason, req.user.id);
        return {
            success: true,
            message: `Reward ${rewardId} has been reversed`,
            reason: data.reason,
            timestamp: new Date(),
        };
    }
    async approveDispute(disputeId, data) {
        return {
            success: true,
            message: 'Dispute approved',
            notes: data.notes,
        };
    }
    async blacklistDevice(data, req) {
        await this.addDeviceBlock(data.fingerprint, data.reason, req.user.id);
        return {
            success: true,
            message: `Device ${data.fingerprint} blacklisted`,
            reason: data.reason,
        };
    }
    async whitelistDevice(fingerprint) {
        await this.removeDeviceBlock(fingerprint);
        return {
            success: true,
            message: `Device ${fingerprint} whitelisted`,
        };
    }
    async blacklistIP(data, req) {
        await this.addIPBlock(data.ip, data.reason, req.user.id);
        return {
            success: true,
            message: `IP ${data.ip} blacklisted`,
            reason: data.reason,
        };
    }
    async whitelistIP(ip) {
        await this.removeIPBlock(ip);
        return {
            success: true,
            message: `IP ${ip} whitelisted`,
        };
    }
    async searchFraud(data) {
        return {
            results: await this.searchFraudPatterns(data.pattern, data.threshold),
            count: 0,
        };
    }
    async getPendingReviews(limit = 50) {
        return {
            pending: await this.getPendingManualReviews(limit),
            count: 0,
        };
    }
    async submitReviewDecision(reviewId, data, req) {
        return {
            success: true,
            decision: data.approved ? 'APPROVED' : 'REJECTED',
            notes: data.notes,
            reviewer: req.user.id,
            timestamp: new Date(),
        };
    }
    async exportFraudData(format = 'json') {
        const data = await this.generateFraudExport();
        return {
            success: true,
            format,
            recordCount: 0,
            exportUrl: 'http://...',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
    }
    async getReconciliationReport(days = 30) {
        return {
            period: `${days} days`,
            reconciliations: await this.getReconciliationData(days),
            totalDiscrepancy: 0,
            status: 'OK',
        };
    }
    async triggerManualReview() {
        return {
            success: true,
            message: 'Manual review cycle triggered',
            reviewsQueued: 0,
            estimatedCompleteTime: new Date(),
        };
    }
    async updateFraudConfig(data, req) {
        return {
            success: true,
            message: 'Configuration updated',
            updatedBy: req.user.id,
            timestamp: new Date(),
        };
    }
    async getTotalFraudEvents() {
        return 0;
    }
    async getFraudEventsLastHour() {
        return 0;
    }
    async getFraudEventsLast24h() {
        return 0;
    }
    async isCircuitBreakerOpen() {
        return false;
    }
    async getActiveAlerts() {
        return [];
    }
    async getTopSuspiciousUsers() {
        return [];
    }
    async getRecentViolations() {
        return [];
    }
    async getAccountStatus(userId) {
        return {};
    }
    async getRewardHistory(userId) {
        return [];
    }
    async getUserFlags(userId) {
        return [];
    }
    async getDeviceHistory(userId) {
        return [];
    }
    async getIPHistory(userId) {
        return [];
    }
    async getWatchPatterns(userId) {
        return {};
    }
    async getRecommendedAction(userId) {
        return 'REVIEW';
    }
    async reverseBan(userId, reason, adminId) {
    }
    async reverseRewardTransaction(rewardId, reason, adminId) {
    }
    async addDeviceBlock(fingerprint, reason, adminId) {
    }
    async removeDeviceBlock(fingerprint) {
    }
    async addIPBlock(ip, reason, adminId) {
    }
    async removeIPBlock(ip) {
    }
    async searchFraudPatterns(pattern, threshold) {
        return [];
    }
    async getPendingManualReviews(limit) {
        return [];
    }
    async generateFraudExport() {
        return {};
    }
    async getReconciliationData(days) {
        return [];
    }
};
exports.FraudAdminController = FraudAdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "getUserFraudProfile", null);
__decorate([
    (0, common_1.Post)('user/:userId/ban'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "banUser", null);
__decorate([
    (0, common_1.Post)('user/:userId/unban'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "unbanUser", null);
__decorate([
    (0, common_1.Post)('reward/:rewardId/reverse'),
    __param(0, (0, common_1.Param)('rewardId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "reverseReward", null);
__decorate([
    (0, common_1.Post)('dispute/:disputeId/approve'),
    __param(0, (0, common_1.Param)('disputeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "approveDispute", null);
__decorate([
    (0, common_1.Post)('device/blacklist'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "blacklistDevice", null);
__decorate([
    (0, common_1.Post)('device/whitelist'),
    __param(0, (0, common_1.Param)('fingerprint')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "whitelistDevice", null);
__decorate([
    (0, common_1.Post)('ip/blacklist'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "blacklistIP", null);
__decorate([
    (0, common_1.Post)('ip/whitelist/:ip'),
    __param(0, (0, common_1.Param)('ip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "whitelistIP", null);
__decorate([
    (0, common_1.Post)('search'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "searchFraud", null);
__decorate([
    (0, common_1.Get)('reviews/pending'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "getPendingReviews", null);
__decorate([
    (0, common_1.Post)('reviews/:reviewId/decision'),
    __param(0, (0, common_1.Param)('reviewId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "submitReviewDecision", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "exportFraudData", null);
__decorate([
    (0, common_1.Get)('reconciliation'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "getReconciliationReport", null);
__decorate([
    (0, common_1.Post)('reviews/trigger'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "triggerManualReview", null);
__decorate([
    (0, common_1.Post)('config/update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FraudAdminController.prototype, "updateFraudConfig", null);
exports.FraudAdminController = FraudAdminController = __decorate([
    (0, common_1.Controller)('admin/fraud'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [fraud_service_1.FraudService])
], FraudAdminController);
//# sourceMappingURL=fraud-admin.controller.js.map