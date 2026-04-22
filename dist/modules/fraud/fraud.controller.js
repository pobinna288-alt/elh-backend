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
exports.FraudController = void 0;
const common_1 = require("@nestjs/common");
const fraud_service_1 = require("./fraud.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let FraudController = class FraudController {
    constructor(fraudService) {
        this.fraudService = fraudService;
    }
    async startAd(data, req) {
        return await this.fraudService.startAdSession(req.user.id, data.adId);
    }
    async saveCheckpoint(data) {
        await this.fraudService.saveCheckpoint(data.sessionId, data.progress);
        return { saved: true };
    }
    async completeAd(data, req) {
        const result = await this.fraudService.completeAd(data.sessionId, req.user.id, data, req.ip || req.connection.remoteAddress, req.headers['user-agent']);
        return result;
    }
    async getRiskScore(req) {
        const score = await this.fraudService.calculateRiskScore(req.user.id);
        return { riskScore: score };
    }
};
exports.FraudController = FraudController;
__decorate([
    (0, common_1.Post)('ad/start'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FraudController.prototype, "startAd", null);
__decorate([
    (0, common_1.Post)('ad/checkpoint'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FraudController.prototype, "saveCheckpoint", null);
__decorate([
    (0, common_1.Post)('ad/complete'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FraudController.prototype, "completeAd", null);
__decorate([
    (0, common_1.Post)('risk-score'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FraudController.prototype, "getRiskScore", null);
exports.FraudController = FraudController = __decorate([
    (0, common_1.Controller)('rewards/fraud-protected'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [fraud_service_1.FraudService])
], FraudController);
//# sourceMappingURL=fraud.controller.js.map