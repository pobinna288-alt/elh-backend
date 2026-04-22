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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipRateLimit = exports.SKIP_RATE_LIMIT_KEY = exports.RateLimit = exports.RATE_LIMIT_KEY = exports.CustomThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
let CustomThrottlerGuard = class CustomThrottlerGuard extends throttler_1.ThrottlerGuard {
    constructor(reflector) {
        super({
            throttlers: [{
                    ttl: 60000,
                    limit: 100,
                }]
        }, undefined, reflector);
        this.reflector = reflector;
    }
    async getTracker(req) {
        return req.ip || req.connection.remoteAddress;
    }
    async shouldSkip(context) {
        const request = context.switchToHttp().getRequest();
        if (request.url.includes('/health')) {
            return true;
        }
        if (request.url.includes('/webhook')) {
            return true;
        }
        return false;
    }
};
exports.CustomThrottlerGuard = CustomThrottlerGuard;
exports.CustomThrottlerGuard = CustomThrottlerGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], CustomThrottlerGuard);
const common_2 = require("@nestjs/common");
exports.RATE_LIMIT_KEY = 'rate_limit';
const RateLimit = (limit, ttl = 60) => (0, common_2.SetMetadata)(exports.RATE_LIMIT_KEY, { limit, ttl });
exports.RateLimit = RateLimit;
exports.SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';
const SkipRateLimit = () => (0, common_2.SetMetadata)(exports.SKIP_RATE_LIMIT_KEY, true);
exports.SkipRateLimit = SkipRateLimit;
//# sourceMappingURL=custom-throttler.guard.js.map