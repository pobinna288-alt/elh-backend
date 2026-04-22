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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stripe_1 = require("stripe");
const axios_1 = require("axios");
const user_entity_1 = require("../users/entities/user.entity");
const subscription_pricing_config_1 = require("../../config/subscription-pricing.config");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(configService, userRepository) {
        this.configService = configService;
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.paystackBaseUrl = 'https://api.paystack.co';
        const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
        this.paystackSecretKey = this.configService.get('PAYSTACK_SECRET_KEY');
        if (!stripeKey) {
            this.logger.error('STRIPE_SECRET_KEY not configured');
            throw new Error('Payment provider not configured');
        }
        if (!this.paystackSecretKey) {
            this.logger.error('PAYSTACK_SECRET_KEY not configured');
            throw new Error('Payment provider not configured');
        }
        this.stripe = new stripe_1.default(stripeKey, {
            apiVersion: '2023-10-16',
        });
        this.logger.log('✅ Payment service initialized (keys loaded from environment)');
    }
    normalizeSubscriptionPlan(plan) {
        const normalizedPlan = plan?.toLowerCase().trim();
        if (normalizedPlan === 'premium' || normalizedPlan === 'pro' || normalizedPlan === 'hot') {
            return normalizedPlan;
        }
        return null;
    }
    parseCoinPurchaseAmount(plan) {
        if (!plan?.startsWith('coins_')) {
            return null;
        }
        const parsedAmount = Number(plan.replace('coins_', ''));
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw new common_1.BadRequestException('Invalid coin purchase amount');
        }
        return parsedAmount;
    }
    async createStripeCheckout(plan, userId) {
        try {
            const normalizedPlan = this.normalizeSubscriptionPlan(plan);
            const coinPurchaseAmount = this.parseCoinPurchaseAmount(plan);
            let unitAmount;
            let productName;
            let description;
            if (normalizedPlan) {
                const billing = (0, subscription_pricing_config_1.getSubscriptionBilling)(normalizedPlan);
                unitAmount = billing.stripeAmountCents;
                productName = `${normalizedPlan.toUpperCase()} Subscription`;
                description = `EL HANNORA ${normalizedPlan} plan`;
            }
            else if (coinPurchaseAmount !== null) {
                unitAmount = coinPurchaseAmount * 100;
                productName = `${coinPurchaseAmount.toLocaleString()} Coin Package`;
                description = 'EL HANNORA wallet top-up';
            }
            else {
                throw new common_1.BadRequestException('Invalid plan');
            }
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: productName,
                                description,
                            },
                            unit_amount: unitAmount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${this.configService.get('FRONTEND_URL')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${this.configService.get('FRONTEND_URL')}/payment-cancel`,
                metadata: {
                    userId,
                    plan,
                },
            });
            return {
                url: session.url,
                sessionId: session.id,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Stripe error: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Payment processing failed');
        }
    }
    async initializePaystackPayment(plan, email, userId) {
        try {
            const normalizedPlan = this.normalizeSubscriptionPlan(plan);
            const coinPurchaseAmount = this.parseCoinPurchaseAmount(plan);
            let amountInNgn;
            if (normalizedPlan) {
                amountInNgn = (0, subscription_pricing_config_1.getSubscriptionBilling)(normalizedPlan).paystackAmountNgn;
            }
            else if (coinPurchaseAmount !== null) {
                amountInNgn = coinPurchaseAmount;
            }
            else {
                throw new common_1.BadRequestException('Invalid plan');
            }
            const response = await axios_1.default.post(`${this.paystackBaseUrl}/transaction/initialize`, {
                email,
                amount: amountInNgn * 100,
                metadata: {
                    userId,
                    plan,
                },
                callback_url: `${this.configService.get('FRONTEND_URL')}/payment-verify`,
            }, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                authorizationUrl: response.data.data.authorization_url,
                reference: response.data.data.reference,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Paystack error: ${error.response?.data?.message || error.message}`);
            throw new common_1.InternalServerErrorException('Payment initialization failed');
        }
    }
    async verifyPaystackPayment(reference) {
        try {
            const response = await axios_1.default.get(`${this.paystackBaseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.paystackSecretKey}`,
                },
            });
            if (response.data.data.status === 'success') {
                const paymentData = response.data.data;
                const metadata = paymentData.metadata || {};
                const userId = metadata.userId || metadata.user_id;
                const normalizedPlan = this.normalizeSubscriptionPlan(metadata.plan);
                const actualAmount = paymentData.amount / 100;
                let activationResult = null;
                if (normalizedPlan) {
                    const billing = (0, subscription_pricing_config_1.getSubscriptionBilling)(normalizedPlan);
                    if (actualAmount !== billing.paystackAmountNgn) {
                        this.logger.warn(`Paystack amount mismatch for ${normalizedPlan}: expected ₦${billing.paystackAmountNgn}, received ₦${actualAmount}`);
                        throw new common_1.BadRequestException(`Payment amount mismatch for ${normalizedPlan} plan`);
                    }
                    if (!userId) {
                        throw new common_1.BadRequestException('Payment metadata missing userId');
                    }
                    activationResult = await this.activateSubscription(userId, normalizedPlan, 'card');
                    this.logger.log(`✅ User ${userId} upgraded to ${normalizedPlan} plan`);
                }
                return {
                    success: true,
                    amount: actualAmount,
                    currency: paymentData.currency || 'NGN',
                    metadata,
                    expiresAt: activationResult?.expiryDate,
                };
            }
            return { success: false };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Paystack verification error: ${error.message}`);
            throw new common_1.InternalServerErrorException('Payment verification failed');
        }
    }
    async verifyStripePayment(sessionId) {
        try {
            const session = await this.stripe.checkout.sessions.retrieve(sessionId);
            let activationResult = null;
            if (session.payment_status === 'paid') {
                const metadata = session.metadata || {};
                const userId = metadata.userId;
                const normalizedPlan = this.normalizeSubscriptionPlan(metadata.plan);
                const totalAmount = session.amount_total ?? 0;
                if (normalizedPlan) {
                    const billing = (0, subscription_pricing_config_1.getSubscriptionBilling)(normalizedPlan);
                    if (totalAmount !== billing.stripeAmountCents) {
                        this.logger.warn(`Stripe amount mismatch for ${normalizedPlan}: expected ${billing.stripeAmountCents} cents, received ${totalAmount} cents`);
                        throw new common_1.BadRequestException(`Payment amount mismatch for ${normalizedPlan} plan`);
                    }
                    if (!userId) {
                        throw new common_1.BadRequestException('Payment metadata missing userId');
                    }
                    activationResult = await this.activateSubscription(userId, normalizedPlan, 'card');
                    this.logger.log(`✅ User ${userId} upgraded to ${normalizedPlan} plan`);
                }
            }
            return {
                success: session.payment_status === 'paid',
                amount: (session.amount_total ?? 0) / 100,
                metadata: session.metadata,
                expiresAt: activationResult?.expiryDate,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Stripe verification error: ${error.message}`);
            throw new common_1.InternalServerErrorException('Payment verification failed');
        }
    }
    async activateSubscription(userId, plan, paymentMethod = 'card') {
        const normalizedPlan = this.normalizeSubscriptionPlan(plan);
        if (!normalizedPlan) {
            this.logger.error(`Invalid plan: ${plan}`);
            throw new common_1.BadRequestException('Invalid subscription plan');
        }
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            this.logger.error(`User not found: ${userId}`);
            throw new common_1.BadRequestException('User not found');
        }
        const billing = (0, subscription_pricing_config_1.getSubscriptionBilling)(normalizedPlan);
        const roleMapping = {
            premium: user_entity_1.UserRole.PREMIUM,
            pro: user_entity_1.UserRole.PRO,
            hot: user_entity_1.UserRole.HOT,
        };
        const planMapping = {
            premium: user_entity_1.SubscriptionPlan.PREMIUM,
            pro: user_entity_1.SubscriptionPlan.PRO_BUSINESS,
            hot: user_entity_1.SubscriptionPlan.HOT_BUSINESS,
        };
        const now = new Date();
        const existingExpiry = user.subscriptionActive && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now
            ? new Date(user.subscriptionExpiry)
            : user.premiumExpiresAt && new Date(user.premiumExpiresAt) > now
                ? new Date(user.premiumExpiresAt)
                : now;
        const expiryDate = new Date(existingExpiry);
        expiryDate.setDate(expiryDate.getDate() + billing.durationDays);
        user.role = roleMapping[normalizedPlan];
        user.plan = planMapping[normalizedPlan];
        user.subscriptionActive = true;
        user.subscriptionExpiry = expiryDate;
        user.negotiationAiEnabled = true;
        user.premiumExpiresAt = expiryDate;
        user.premiumPaymentMethod = paymentMethod;
        await this.userRepository.save(user);
        this.logger.log(`📝 Database updated: ${user.email} is now ${normalizedPlan} until ${expiryDate.toISOString()}`);
        return { user, expiryDate };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map