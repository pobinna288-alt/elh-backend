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
exports.PaystackService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const axios_1 = require("axios");
const caching_service_1 = require("../../../common/caching/caching.service");
const performance_logger_service_1 = require("../../../common/performance/services/performance-logger.service");
const queue_constants_1 = require("../../../common/queue/queue.constants");
let PaystackService = class PaystackService {
    constructor(configService, cachingService, performanceLogger, paymentQueue) {
        this.configService = configService;
        this.cachingService = cachingService;
        this.performanceLogger = performanceLogger;
        this.paymentQueue = paymentQueue;
        this.paystackUrl = 'https://api.paystack.co';
        this.paystackSecretKey = this.configService.get('PAYSTACK_SECRET_KEY');
        if (!this.paystackSecretKey) {
            throw new Error('PAYSTACK_SECRET_KEY is not configured');
        }
    }
    async initializePayment(email, amount, reference, metadata) {
        try {
            const response = await axios_1.default.post(`${this.paystackUrl}/transaction/initialize`, {
                email,
                amount: Math.round(amount * 100),
                reference,
                metadata,
                callback_url: this.configService.get('PAYSTACK_CALLBACK_URL'),
            }, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.data.status) {
                throw new common_1.BadRequestException('Failed to initialize payment');
            }
            return {
                authorization_url: response.data.data.authorization_url,
                reference: response.data.data.reference,
            };
        }
        catch (error) {
            this.performanceLogger.logError('Payment Initialization Error', error);
            throw new common_1.BadRequestException('Payment initialization failed');
        }
    }
    async verifyPaymentAsync(reference) {
        const cachedStatus = await this.cachingService.get(this.cachingService.keys.paymentStatus(reference));
        if (cachedStatus) {
            return cachedStatus;
        }
        await this.paymentQueue.add(queue_constants_1.JobType.VERIFY_PAYMENT, { reference }, {
            priority: queue_constants_1.QueuePriority.HIGH,
            attempts: 3,
            backoff: 2000,
        });
        return {
            status: 'processing',
            message: 'Payment verification in progress. Check status in a moment.',
        };
    }
    async verifyPaymentSync(reference) {
        try {
            const cachedStatus = await this.cachingService.get(this.cachingService.keys.paymentStatus(reference));
            if (cachedStatus) {
                return cachedStatus;
            }
            const startTime = Date.now();
            const response = await axios_1.default.get(`${this.paystackUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                },
            });
            const duration = Date.now() - startTime;
            this.performanceLogger.logInfo('Paystack API Call', {
                duration: `${duration}ms`,
                reference,
            });
            if (!response.data.status) {
                throw new common_1.BadRequestException('Payment verification failed');
            }
            const paymentData = response.data.data;
            const ttl = paymentData.status === 'success'
                ? this.cachingService.ttl.long
                : this.cachingService.ttl.short;
            await this.cachingService.set(this.cachingService.keys.paymentStatus(reference), paymentData, ttl);
            return paymentData;
        }
        catch (error) {
            this.performanceLogger.logError('Payment Verification Error', error, { reference });
            throw new common_1.BadRequestException('Payment verification failed');
        }
    }
    async getPaymentStatus(reference) {
        const cached = await this.cachingService.get(this.cachingService.keys.paymentStatus(reference));
        if (cached) {
            return cached;
        }
        return this.verifyPaymentSync(reference);
    }
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha512', this.paystackSecretKey)
            .update(payload)
            .digest('hex');
        return hash === signature;
    }
    async getTransactionAnalytics(userId) {
        const cacheKey = this.cachingService.generateKey('analytics', 'payments', userId);
        return this.cachingService.wrap(cacheKey, async () => {
            return {
                totalSpent: 0,
                totalTransactions: 0,
                successRate: 100,
            };
        }, this.cachingService.ttl.medium);
    }
};
exports.PaystackService = PaystackService;
exports.PaystackService = PaystackService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bull_1.InjectQueue)(queue_constants_1.QueueName.PAYMENT_VERIFICATION)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        caching_service_1.CachingService,
        performance_logger_service_1.PerformanceLogger, Object])
], PaystackService);
//# sourceMappingURL=paystack-optimized.service.js.map