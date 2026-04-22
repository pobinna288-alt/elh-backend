"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ads_controller_1 = require("./ads.controller");
const ads_service_1 = require("./ads.service");
const media_service_1 = require("./media.service");
const currency_service_1 = require("./currency.service");
const ai_description_service_1 = require("./ai-description.service");
const ad_rewrite_service_1 = require("./ad-rewrite.service");
const ad_writer_service_1 = require("./ad-writer.service");
const ad_persuasive_service_1 = require("./ad-persuasive.service");
const ad_high_converting_service_1 = require("./ad-high-converting.service");
const ad_entity_1 = require("./entities/ad.entity");
const ad_media_entity_1 = require("./entities/ad-media.entity");
const user_entity_1 = require("../users/entities/user.entity");
const wallet_module_1 = require("../wallet/wallet.module");
const redis_module_1 = require("../redis/redis.module");
let AdsModule = class AdsModule {
};
exports.AdsModule = AdsModule;
exports.AdsModule = AdsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([ad_entity_1.Ad, ad_media_entity_1.AdMedia, user_entity_1.User]), redis_module_1.RedisModule, wallet_module_1.WalletModule],
        controllers: [ads_controller_1.AdsController],
        providers: [
            ads_service_1.AdsService,
            media_service_1.MediaService,
            currency_service_1.CurrencyService,
            ai_description_service_1.AiDescriptionService,
            ad_rewrite_service_1.AdRewriteService,
            ad_writer_service_1.AdWriterService,
            ad_persuasive_service_1.AdPersuasiveService,
            ad_high_converting_service_1.AdHighConvertingService,
        ],
        exports: [
            ads_service_1.AdsService,
            media_service_1.MediaService,
            currency_service_1.CurrencyService,
            ai_description_service_1.AiDescriptionService,
            ad_rewrite_service_1.AdRewriteService,
            ad_writer_service_1.AdWriterService,
            ad_persuasive_service_1.AdPersuasiveService,
            ad_high_converting_service_1.AdHighConvertingService,
        ],
    })
], AdsModule);
//# sourceMappingURL=ads.module.js.map