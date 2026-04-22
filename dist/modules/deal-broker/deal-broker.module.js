"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealBrokerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const message_entity_1 = require("../messages/entities/message.entity");
const ai_usage_log_entity_1 = require("../negotiation-ai/entities/ai-usage-log.entity");
const deal_entity_1 = require("./entities/deal.entity");
const seller_profile_entity_1 = require("./entities/seller-profile.entity");
const alternative_seller_search_entity_1 = require("./entities/alternative-seller-search.entity");
const negotiation_chat_entity_1 = require("./entities/negotiation-chat.entity");
const deal_broker_service_1 = require("./services/deal-broker.service");
const seller_matching_service_1 = require("./services/seller-matching.service");
const negotiation_recovery_service_1 = require("./services/negotiation-recovery.service");
const deal_broker_usage_limiter_service_1 = require("./services/deal-broker-usage-limiter.service");
const deal_broker_controller_1 = require("./deal-broker.controller");
const deal_broker_guard_1 = require("./guards/deal-broker.guard");
let DealBrokerModule = class DealBrokerModule {
};
exports.DealBrokerModule = DealBrokerModule;
exports.DealBrokerModule = DealBrokerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                message_entity_1.Message,
                ai_usage_log_entity_1.AiUsageLog,
                deal_entity_1.Deal,
                seller_profile_entity_1.SellerProfile,
                alternative_seller_search_entity_1.AlternativeSellerSearch,
                negotiation_chat_entity_1.NegotiationChat,
            ]),
        ],
        controllers: [deal_broker_controller_1.DealBrokerController],
        providers: [
            deal_broker_service_1.DealBrokerService,
            seller_matching_service_1.SellerMatchingService,
            negotiation_recovery_service_1.NegotiationRecoveryService,
            deal_broker_usage_limiter_service_1.DealBrokerUsageLimiterService,
            deal_broker_guard_1.DealBrokerGuard,
        ],
        exports: [
            deal_broker_service_1.DealBrokerService,
            seller_matching_service_1.SellerMatchingService,
            negotiation_recovery_service_1.NegotiationRecoveryService,
            deal_broker_usage_limiter_service_1.DealBrokerUsageLimiterService,
        ],
    })
], DealBrokerModule);
//# sourceMappingURL=deal-broker.module.js.map