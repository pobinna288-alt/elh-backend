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
exports.PaymentVerificationProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const queue_constants_1 = require("../../../common/queue/queue.constants");
const paystack_optimized_service_1 = require("../services/paystack-optimized.service");
const performance_logger_service_1 = require("../../../common/performance/services/performance-logger.service");
let PaymentVerificationProcessor = class PaymentVerificationProcessor {
    constructor(paystackService, performanceLogger) {
        this.paystackService = paystackService;
        this.performanceLogger = performanceLogger;
    }
    async handlePaymentVerification(job) {
        const { reference } = job.data;
        try {
            this.performanceLogger.logInfo('Processing payment verification', {
                reference,
                attempt: job.attemptsMade + 1,
            });
            const paymentData = await this.paystackService.verifyPaymentSync(reference);
            if (paymentData.status === 'success') {
                this.performanceLogger.logInfo('Payment verification successful', {
                    reference,
                    amount: paymentData.amount / 100,
                });
            }
            else {
                this.performanceLogger.logInfo('Payment verification failed', {
                    reference,
                    status: paymentData.status,
                });
            }
        }
        catch (error) {
            this.performanceLogger.logError('Payment verification job failed', error, {
                reference,
                attempt: job.attemptsMade + 1,
            });
            throw error;
        }
    }
    async handleFailed(job, error) {
        this.performanceLogger.logError('Payment verification permanently failed', error, {
            reference: job.data.reference,
            attempts: job.attemptsMade,
        });
    }
};
exports.PaymentVerificationProcessor = PaymentVerificationProcessor;
__decorate([
    (0, bull_1.Process)(queue_constants_1.JobType.VERIFY_PAYMENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentVerificationProcessor.prototype, "handlePaymentVerification", null);
__decorate([
    (0, bull_1.Process)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", Promise)
], PaymentVerificationProcessor.prototype, "handleFailed", null);
exports.PaymentVerificationProcessor = PaymentVerificationProcessor = __decorate([
    (0, bull_1.Processor)(queue_constants_1.QueueName.PAYMENT_VERIFICATION),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [paystack_optimized_service_1.PaystackService,
        performance_logger_service_1.PerformanceLogger])
], PaymentVerificationProcessor);
//# sourceMappingURL=payment-verification.processor.js.map