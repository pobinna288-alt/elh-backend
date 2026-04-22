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
var NegotiationAiScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationAiScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const subscription_service_1 = require("./services/subscription.service");
let NegotiationAiScheduler = NegotiationAiScheduler_1 = class NegotiationAiScheduler {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
        this.logger = new common_1.Logger(NegotiationAiScheduler_1.name);
    }
    async handleDailyTasks() {
        this.logger.log('Running midnight cron: checking expired subscriptions...');
        try {
            const expiredCount = await this.subscriptionService.handleExpiredSubscriptions();
            this.logger.log(`Midnight cron complete. Expired subscriptions processed: ${expiredCount}`);
        }
        catch (error) {
            this.logger.error(`Midnight cron failed: ${error.message}`, error.stack);
        }
    }
    async handleExpiryCheck() {
        this.logger.debug('Running 6-hour expiry safety check...');
        try {
            const expiredCount = await this.subscriptionService.handleExpiredSubscriptions();
            if (expiredCount > 0) {
                this.logger.warn(`Safety check found ${expiredCount} expired subscriptions (missed by midnight cron)`);
            }
        }
        catch (error) {
            this.logger.error(`Expiry safety check failed: ${error.message}`, error.stack);
        }
    }
};
exports.NegotiationAiScheduler = NegotiationAiScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NegotiationAiScheduler.prototype, "handleDailyTasks", null);
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NegotiationAiScheduler.prototype, "handleExpiryCheck", null);
exports.NegotiationAiScheduler = NegotiationAiScheduler = NegotiationAiScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService])
], NegotiationAiScheduler);
//# sourceMappingURL=negotiation-ai.scheduler.js.map