"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const core_1 = require("@nestjs/core");
const performance_module_1 = require("./common/performance/performance.module");
const caching_module_1 = require("./common/caching/caching.module");
const queue_module_1 = require("./common/queue/queue.module");
const security_module_1 = require("./common/security/security.module");
const performance_interceptor_1 = require("./common/performance/interceptors/performance.interceptor");
const http_cache_interceptor_1 = require("./common/caching/interceptors/http-cache.interceptor");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const ads_module_1 = require("./modules/ads/ads.module");
const payments_module_1 = require("./modules/payments/payments.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const premium_module_1 = require("./modules/premium/premium.module");
const comments_module_1 = require("./modules/comments/comments.module");
const messages_module_1 = require("./modules/messages/messages.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const redis_module_1 = require("./modules/redis/redis.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const streak_module_1 = require("./modules/streak/streak.module");
const social_module_1 = require("./modules/social/social.module");
const referral_module_1 = require("./modules/referral/referral.module");
const alerts_module_1 = require("./modules/alerts/alerts.module");
const ai_tools_module_1 = require("./modules/ai-tools/ai-tools.module");
const negotiation_ai_module_1 = require("./modules/negotiation-ai/negotiation-ai.module");
const deal_broker_module_1 = require("./modules/deal-broker/deal-broker.module");
const ad_suggestion_module_1 = require("./modules/ad-suggestion/ad-suggestion.module");
const search_module_1 = require("./modules/search/search.module");
const ad_watch_module_1 = require("./modules/ad-watch/ad-watch.module");
const storage_config_1 = require("./config/storage.config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                load: [storage_config_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('DB_HOST'),
                    port: configService.get('DB_PORT'),
                    username: configService.get('DB_USERNAME'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_DATABASE'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: configService.get('NODE_ENV') === 'development',
                    logging: configService.get('NODE_ENV') === 'development',
                    extra: {
                        max: 50,
                        min: 5,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 2000,
                    },
                    cache: {
                        type: 'redis',
                        options: {
                            host: configService.get('REDIS_HOST') || 'localhost',
                            port: configService.get('REDIS_PORT') || 6379,
                        },
                        duration: 30000,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => [{
                        ttl: configService.get('THROTTLE_TTL') || 60000,
                        limit: configService.get('THROTTLE_LIMIT') || 100,
                    }],
                inject: [config_1.ConfigService],
            }),
            platform_express_1.MulterModule.register({
                dest: './uploads/temp',
                limits: {
                    fileSize: 10 * 1024 * 1024,
                    files: 5,
                },
            }),
            performance_module_1.PerformanceModule,
            caching_module_1.CachingModule,
            queue_module_1.QueueModule,
            security_module_1.SecurityModule,
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            ads_module_1.AdsModule,
            payments_module_1.PaymentsModule,
            wallet_module_1.WalletModule,
            premium_module_1.PremiumModule,
            comments_module_1.CommentsModule,
            messages_module_1.MessagesModule,
            analytics_module_1.AnalyticsModule,
            reviews_module_1.ReviewsModule,
            notifications_module_1.NotificationsModule,
            streak_module_1.StreakModule,
            social_module_1.SocialModule,
            referral_module_1.ReferralModule,
            alerts_module_1.AlertsModule,
            ai_tools_module_1.AiToolsModule,
            negotiation_ai_module_1.NegotiationAiModule,
            deal_broker_module_1.DealBrokerModule,
            ad_suggestion_module_1.AdSuggestionModule,
            search_module_1.SearchModule,
            ad_watch_module_1.AdWatchModule,
        ],
        providers: [
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: performance_interceptor_1.PerformanceInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: http_cache_interceptor_1.HttpCacheInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map