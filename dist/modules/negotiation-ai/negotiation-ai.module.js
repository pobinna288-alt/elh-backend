"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationAiModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const user_entity_1 = require("../users/entities/user.entity");
const ai_usage_log_entity_1 = require("./entities/ai-usage-log.entity");
const negotiation_ai_service_1 = require("./services/negotiation-ai.service");
const subscription_service_1 = require("./services/subscription.service");
const usage_limiter_service_1 = require("./services/usage-limiter.service");
const negotiation_ai_controller_1 = require("./negotiation-ai.controller");
const negotiation_ai_guard_1 = require("./guards/negotiation-ai.guard");
const negotiation_ai_scheduler_1 = require("./negotiation-ai.scheduler");
let NegotiationAiModule = class NegotiationAiModule {
};
exports.NegotiationAiModule = NegotiationAiModule;
exports.NegotiationAiModule = NegotiationAiModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, ai_usage_log_entity_1.AiUsageLog]),
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [negotiation_ai_controller_1.NegotiationAiController],
        providers: [
            negotiation_ai_service_1.NegotiationAIService,
            subscription_service_1.SubscriptionService,
            usage_limiter_service_1.UsageLimiterService,
            negotiation_ai_guard_1.NegotiationAiGuard,
            negotiation_ai_scheduler_1.NegotiationAiScheduler,
        ],
        exports: [
            negotiation_ai_service_1.NegotiationAIService,
            subscription_service_1.SubscriptionService,
            usage_limiter_service_1.UsageLimiterService,
        ],
    })
], NegotiationAiModule);
//# sourceMappingURL=negotiation-ai.module.js.map