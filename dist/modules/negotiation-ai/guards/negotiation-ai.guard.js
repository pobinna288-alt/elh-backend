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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationAiGuard = void 0;
const common_1 = require("@nestjs/common");
const negotiation_ai_service_1 = require("../services/negotiation-ai.service");
let NegotiationAiGuard = class NegotiationAiGuard {
    constructor(negotiationAIService) {
        this.negotiationAIService = negotiationAIService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId || request.user?.sub;
        if (!userId) {
            throw new common_1.ForbiddenException('Authentication required');
        }
        const access = await this.negotiationAIService.canUseNegotiationAI(userId);
        if (!access.allowed) {
            throw new common_1.ForbiddenException({
                status: access.status,
                message: access.message,
                dailyUsed: access.dailyUsed,
                dailyLimit: access.dailyLimit,
                remaining: access.remaining,
            });
        }
        request.negotiationAiAccess = access;
        return true;
    }
};
exports.NegotiationAiGuard = NegotiationAiGuard;
exports.NegotiationAiGuard = NegotiationAiGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [negotiation_ai_service_1.NegotiationAIService])
], NegotiationAiGuard);
//# sourceMappingURL=negotiation-ai.guard.js.map