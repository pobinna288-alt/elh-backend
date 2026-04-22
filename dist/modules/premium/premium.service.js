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
var PremiumService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PremiumService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const wallet_service_1 = require("../wallet/wallet.service");
const payments_service_1 = require("../payments/payments.service");
const subscription_pricing_config_1 = require("../../config/subscription-pricing.config");
let PremiumService = PremiumService_1 = class PremiumService {
    constructor(userRepository, walletService, paymentsService) {
        this.userRepository = userRepository;
        this.walletService = walletService;
        this.paymentsService = paymentsService;
        this.logger = new common_1.Logger(PremiumService_1.name);
    }
    async unlockPremium(userId, unlockPremiumDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const paymentMethod = unlockPremiumDto.paymentMethod;
        const premiumBilling = (0, subscription_pricing_config_1.getSubscriptionBilling)('premium');
        if (!premiumBilling) {
            throw new common_1.BadRequestException('Premium billing configuration is missing');
        }
        if (paymentMethod !== 'coins' && paymentMethod !== 'card') {
            throw new common_1.BadRequestException('Invalid payment method');
        }
        let remainingCoins = user.coins;
        let expirationDate;
        if (paymentMethod === 'coins') {
            if (user.coins < premiumBilling.coins) {
                this.logger.warn(`Premium unlock failed for user ${userId}: Insufficient coins (has ${user.coins}, needs ${premiumBilling.coins})`);
                throw new common_1.BadRequestException('Insufficient coins');
            }
            await this.walletService.deductCoins(userId, premiumBilling.coins, `Premium unlock via coins (${premiumBilling.coins} coins)`);
            remainingCoins = await this.walletService.getBalance(userId);
            const activation = await this.paymentsService.activateSubscription(userId, 'premium', 'coins');
            expirationDate = activation.expiryDate;
        }
        else {
            const reference = unlockPremiumDto.paystackReference;
            if (!reference) {
                throw new common_1.BadRequestException('Paystack reference is required for card payment');
            }
            const verification = await this.paymentsService.verifyPaystackPayment(reference);
            if (!verification?.success) {
                throw new common_1.BadRequestException('Payment verification failed');
            }
            if (verification.amount !== premiumBilling.paystackAmountNgn) {
                throw new common_1.BadRequestException(`Payment amount mismatch. Required: ₦${premiumBilling.paystackAmountNgn}`);
            }
            const metadataUserId = verification.metadata?.userId || verification.metadata?.user_id;
            const metadataPlan = verification.metadata?.plan;
            if (metadataUserId && metadataUserId !== userId) {
                throw new common_1.BadRequestException('Payment reference does not belong to this user');
            }
            if (metadataPlan && metadataPlan.toLowerCase() !== 'premium') {
                throw new common_1.BadRequestException('Payment is not for premium plan');
            }
            remainingCoins = await this.walletService.getBalance(userId);
            expirationDate = verification.expiresAt ? new Date(verification.expiresAt) : new Date();
        }
        this.logger.log(`Premium activated for user ${userId} via ${paymentMethod}. Expires: ${expirationDate.toISOString()}`);
        return {
            subscription_status: 'active',
            plan: 'premium',
            payment_method: paymentMethod,
            expiry_date: expirationDate,
            remaining_coins: remainingCoins,
        };
    }
    isUserPremium(user) {
        if (!user.premiumExpiresAt) {
            return false;
        }
        return new Date(user.premiumExpiresAt) > new Date();
    }
    async checkPremiumStatus(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['premiumExpiresAt'],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isPremium = this.isUserPremium(user);
        return {
            isPremium,
            expiresAt: isPremium ? user.premiumExpiresAt : undefined,
        };
    }
};
exports.PremiumService = PremiumService;
exports.PremiumService = PremiumService = PremiumService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        wallet_service_1.WalletService,
        payments_service_1.PaymentsService])
], PremiumService);
//# sourceMappingURL=premium.service.js.map