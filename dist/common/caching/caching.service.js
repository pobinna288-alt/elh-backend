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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const performance_logger_service_1 = require("../performance/services/performance-logger.service");
let CachingService = class CachingService {
    constructor(cacheManager, performanceLogger) {
        this.cacheManager = cacheManager;
        this.performanceLogger = performanceLogger;
        this.trackedKeys = new Set();
        this.keys = {
            user: (userId) => this.generateKey('user', userId),
            userProfile: (userId) => this.generateKey('user', userId, 'profile'),
            adsList: (page, limit) => this.generateKey('ads', 'list', page, limit),
            adDetails: (adId) => this.generateKey('ad', adId),
            userWallet: (userId) => this.generateKey('user', userId, 'wallet'),
            paymentStatus: (reference) => this.generateKey('payment', 'status', reference),
        };
        this.ttl = {
            short: 60,
            medium: 300,
            long: 1800,
            veryLong: 3600,
        };
    }
    async get(key) {
        const startTime = Date.now();
        try {
            const value = await this.cacheManager.get(key);
            const duration = Date.now() - startTime;
            this.performanceLogger.logCacheEvent(value ? 'HIT' : 'MISS', key, duration);
            return value || null;
        }
        catch (error) {
            this.performanceLogger.logError('Cache Get Error', error, { key });
            return null;
        }
    }
    async set(key, value, ttl) {
        const startTime = Date.now();
        try {
            const cacheTTL = ttl || 300;
            await this.cacheManager.set(key, value, cacheTTL * 1000);
            this.trackedKeys.add(key);
            const duration = Date.now() - startTime;
            this.performanceLogger.logCacheEvent('SET', key, duration);
        }
        catch (error) {
            this.performanceLogger.logError('Cache Set Error', error, { key });
        }
    }
    async delete(key) {
        try {
            await this.cacheManager.del(key);
            this.trackedKeys.delete(key);
            this.performanceLogger.logCacheEvent('DELETE', key);
        }
        catch (error) {
            this.performanceLogger.logError('Cache Delete Error', error, { key });
        }
    }
    async deletePattern(pattern) {
        try {
            const regex = new RegExp(`^${pattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*')}$`);
            const keysToDelete = [...this.trackedKeys].filter((key) => regex.test(key));
            if (keysToDelete.length === 0) {
                this.performanceLogger.logInfo('Cache pattern deletion skipped', { pattern, deleted: 0 });
                return;
            }
            await Promise.all(keysToDelete.map((key) => this.cacheManager.del(key)));
            keysToDelete.forEach((key) => this.trackedKeys.delete(key));
            this.performanceLogger.logInfo('Cache pattern deletion', {
                pattern,
                deleted: keysToDelete.length,
            });
        }
        catch (error) {
            this.performanceLogger.logError('Cache Pattern Delete Error', error, { pattern });
        }
    }
    generateKey(...parts) {
        return parts.join(':');
    }
    async wrap(key, fn, ttl) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const result = await fn();
        await this.set(key, result, ttl);
        return result;
    }
};
exports.CachingService = CachingService;
exports.CachingService = CachingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object, performance_logger_service_1.PerformanceLogger])
], CachingService);
//# sourceMappingURL=caching.service.js.map