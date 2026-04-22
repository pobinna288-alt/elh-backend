"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdWatchModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ad_watch_controller_1 = require("./ad-watch.controller");
const ad_watch_admin_controller_1 = require("./ad-watch-admin.controller");
const ad_watch_service_1 = require("./ad-watch.service");
const ad_view_entity_1 = require("./entities/ad-view.entity");
const coin_transaction_entity_1 = require("./entities/coin-transaction.entity");
const coin_boost_event_entity_1 = require("./entities/coin-boost-event.entity");
const user_entity_1 = require("../users/entities/user.entity");
const ad_entity_1 = require("../ads/entities/ad.entity");
let AdWatchModule = class AdWatchModule {
};
exports.AdWatchModule = AdWatchModule;
exports.AdWatchModule = AdWatchModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                ad_view_entity_1.AdView,
                coin_transaction_entity_1.CoinTransaction,
                coin_boost_event_entity_1.CoinBoostEvent,
                user_entity_1.User,
                ad_entity_1.Ad,
            ]),
        ],
        controllers: [ad_watch_controller_1.AdWatchController, ad_watch_admin_controller_1.AdWatchAdminController],
        providers: [ad_watch_service_1.AdWatchService],
        exports: [ad_watch_service_1.AdWatchService],
    })
], AdWatchModule);
//# sourceMappingURL=ad-watch.module.js.map