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
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async createStripeCheckout(body, req) {
        const { url, sessionId } = await this.paymentsService.createStripeCheckout(body.plan, req.user.userId);
        return {
            success: true,
            checkoutUrl: url,
            sessionId,
            message: 'Redirect user to checkout URL',
        };
    }
    async initializePaystackPayment(body, req) {
        const { authorizationUrl, reference } = await this.paymentsService.initializePaystackPayment(body.plan, body.email, req.user.userId);
        return {
            success: true,
            authorizationUrl,
            reference,
            message: 'Redirect user to authorization URL',
        };
    }
    async verifyPaystackPayment(reference) {
        const result = await this.paymentsService.verifyPaystackPayment(reference);
        return {
            success: result.success,
            amount: result.amount,
            metadata: result.metadata,
        };
    }
    async verifyStripePayment(sessionId) {
        const result = await this.paymentsService.verifyStripePayment(sessionId);
        return {
            success: result.success,
            metadata: result.metadata,
        };
    }
    async purchaseCoins(body, req) {
        if (body.paymentMethod === 'stripe') {
            const { url, sessionId } = await this.paymentsService.createStripeCheckout('coins_' + body.amount, req.user.userId);
            return {
                success: true,
                paymentUrl: url,
                sessionId,
            };
        }
        else {
            const { authorizationUrl, reference } = await this.paymentsService.initializePaystackPayment('coins_' + body.amount, body.email, req.user.userId);
            return {
                success: true,
                paymentUrl: authorizationUrl,
                reference,
            };
        }
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('stripe/create-checkout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe checkout session' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Checkout session created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createStripeCheckout", null);
__decorate([
    (0, common_1.Post)('paystack/initialize'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize Paystack payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment initialized' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initializePaystackPayment", null);
__decorate([
    (0, common_1.Get)('paystack/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify Paystack payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment verified' }),
    __param(0, (0, common_1.Query)('reference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyPaystackPayment", null);
__decorate([
    (0, common_1.Get)('stripe/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify Stripe payment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment verified' }),
    __param(0, (0, common_1.Query)('session_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyStripePayment", null);
__decorate([
    (0, common_1.Post)('coins/purchase'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Purchase coins with real money' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Coin purchase initiated' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "purchaseCoins", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map