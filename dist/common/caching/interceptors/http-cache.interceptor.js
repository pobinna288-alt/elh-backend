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
exports.HttpCacheInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const caching_service_1 = require("../caching.service");
const cache_decorators_1 = require("../decorators/cache.decorators");
let HttpCacheInterceptor = class HttpCacheInterceptor {
    constructor(cachingService, reflector) {
        this.cachingService = cachingService;
        this.reflector = reflector;
    }
    async intercept(context, next) {
        const noCache = this.reflector.get(cache_decorators_1.NO_CACHE_KEY, context.getHandler());
        if (noCache) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        if (request.method !== 'GET') {
            return next.handle();
        }
        const cacheKeyPattern = this.reflector.get(cache_decorators_1.CACHE_KEY, context.getHandler());
        const cacheScope = this.getCacheScope(request);
        const cacheKeyBase = cacheKeyPattern
            ? this.buildCacheKey(cacheKeyPattern, request)
            : this.buildDefaultCacheKey(request);
        const cacheKey = `${cacheScope}:${cacheKeyBase}`;
        const cachedResponse = await this.cachingService.get(cacheKey);
        if (cachedResponse) {
            return (0, rxjs_1.of)(cachedResponse);
        }
        const ttl = this.reflector.get(cache_decorators_1.CACHE_TTL_KEY, context.getHandler());
        return next.handle().pipe((0, operators_1.tap)(async (response) => {
            if (response) {
                await this.cachingService.set(cacheKey, response, ttl);
            }
        }));
    }
    buildCacheKey(pattern, request) {
        let key = pattern;
        for (const [paramKey, paramValue] of Object.entries(request.params)) {
            key = key.replace(`:${paramKey}`, String(paramValue));
        }
        if (Object.keys(request.query).length > 0) {
            const queryString = new URLSearchParams(request.query).toString();
            key = `${key}?${queryString}`;
        }
        return key;
    }
    buildDefaultCacheKey(request) {
        const url = request.url.split('?')[0];
        const queryString = new URLSearchParams(request.query).toString();
        return queryString ? `${url}?${queryString}` : url;
    }
    getCacheScope(request) {
        const userId = request.user?.sub || request.user?.userId || request.user?.id;
        return userId ? `user:${userId}` : 'public';
    }
};
exports.HttpCacheInterceptor = HttpCacheInterceptor;
exports.HttpCacheInterceptor = HttpCacheInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [caching_service_1.CachingService,
        core_1.Reflector])
], HttpCacheInterceptor);
//# sourceMappingURL=http-cache.interceptor.js.map