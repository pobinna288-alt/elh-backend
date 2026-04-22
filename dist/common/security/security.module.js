"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const config_1 = require("@nestjs/config");
const nestjs_throttler_storage_redis_1 = require("nestjs-throttler-storage-redis");
const core_1 = require("@nestjs/core");
const custom_throttler_guard_1 = require("./guards/custom-throttler.guard");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const redisUrl = configService.get('REDIS_URL');
                    return {
                        throttlers: [{
                                ttl: 60000,
                                limit: 100,
                            }],
                        storage: redisUrl
                            ? new nestjs_throttler_storage_redis_1.ThrottlerStorageRedisService(redisUrl)
                            : undefined,
                    };
                },
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: custom_throttler_guard_1.CustomThrottlerGuard,
            },
        ],
        exports: [throttler_1.ThrottlerModule],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map