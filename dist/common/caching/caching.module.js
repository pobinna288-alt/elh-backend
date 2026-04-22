"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const cache_manager_redis_yet_1 = require("cache-manager-redis-yet");
const caching_service_1 = require("./caching.service");
let CachingModule = class CachingModule {
};
exports.CachingModule = CachingModule;
exports.CachingModule = CachingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            cache_manager_1.CacheModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const redisUrl = configService.get('REDIS_URL');
                    if (redisUrl) {
                        try {
                            const store = await (0, cache_manager_redis_yet_1.redisStore)({
                                url: redisUrl,
                                ttl: 300000,
                            });
                            return {
                                store: store,
                            };
                        }
                        catch (error) {
                            console.warn('Redis connection failed, using in-memory cache:', error.message);
                            return {
                                ttl: 300000,
                                max: 1000,
                            };
                        }
                    }
                    return {
                        ttl: 300000,
                        max: 1000,
                    };
                },
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [caching_service_1.CachingService],
        exports: [caching_service_1.CachingService, cache_manager_1.CacheModule],
    })
], CachingModule);
//# sourceMappingURL=caching.module.js.map