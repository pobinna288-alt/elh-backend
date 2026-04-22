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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const paystack_optimized_service_1 = require("../services/paystack-optimized.service");
const cache_decorators_1 = require("../../../common/caching/decorators/cache.decorators");
const performance_logger_service_1 = require("../../../common/performance/services/performance-logger.service");
let PaymentsController = class PaymentsController {
    constructor(paystackService, performanceLogger) {
        this.paystackService = paystackService;
        this.performanceLogger = performanceLogger;
    }
    async initializePayment(req, body) {
        const user = req.user;
        const reference = `PAY_${Date.now()}_${user.id}`;
        const result = await this.paystackService.initializePayment(user.email, body.amount, reference, {
            userId: user.id,
            ...body.metadata,
        });
        return {
            success: true,
            data: result,
        };
    }
    async verifyPaymentAsync(body) {
        const result = await this.paystackService.verifyPaymentAsync(body.reference);
        return {
            success: true,
            data: result,
        };
    }
    async getPaymentStatus(reference) {
        if (!reference) {
            return {
                success: false,
                message: 'Reference is required',
            };
        }
        const status = await this.paystackService.getPaymentStatus(reference);
        return {
            success: true,
            data: status,
        };
    }
    async handleWebhook(req, signature, body) {
        try {
            const payload = JSON.stringify(body);
            const isValid = this.paystackService.verifyWebhookSignature(payload, signature);
            if (!isValid) {
                this.performanceLogger.logError('Invalid webhook signature', new Error('Webhook signature verification failed'), { event: body.event });
                return { success: false, message: 'Invalid signature' };
            }
            const { event, data } = body;
            if (event === 'charge.success') {
                await this.paystackService.verifyPaymentSync(data.reference);
                this.performanceLogger.logInfo('Webhook: Payment successful', {
                    reference: data.reference,
                    amount: data.amount / 100,
                });
            }
            return { success: true };
        }
        catch (error) {
            this.performanceLogger.logError('Webhook processing error', error);
            return { success: false, message: 'Webhook processing failed' };
        }
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('initialize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, cache_decorators_1.NoCache)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initializePayment", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, cache_decorators_1.NoCache)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyPaymentAsync", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, cache_decorators_1.CacheTTL)(60),
    __param(0, (0, common_1.Query)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentStatus", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, cache_decorators_1.NoCache)(),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-paystack-signature')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [paystack_optimized_service_1.PaystackService,
        performance_logger_service_1.PerformanceLogger])
], PaymentsController);
//# sourceMappingURL=payments-optimized.controller.js.map