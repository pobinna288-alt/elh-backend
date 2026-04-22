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
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisService = class RedisService {
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        return this.redis.get(key);
    }
    async set(key, value, ttl) {
        if (ttl) {
            await this.redis.setex(key, ttl, value);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    async del(key) {
        await this.redis.del(key);
    }
    async incrementCounter(key) {
        return this.redis.incr(key);
    }
    async setnx(key, value) {
        return this.redis.setnx(key, value);
    }
    async expire(key, seconds) {
        return this.redis.expire(key, seconds);
    }
    async setex(key, seconds, value) {
        return this.redis.setex(key, seconds, value);
    }
    async incr(key) {
        return this.redis.incr(key);
    }
    async getCounter(key) {
        const value = await this.redis.get(key);
        return value ? parseInt(value, 10) : 0;
    }
    async setHash(key, field, value) {
        await this.redis.hset(key, field, value);
    }
    async getHash(key, field) {
        return this.redis.hget(key, field);
    }
    async getAllHash(key) {
        return this.redis.hgetall(key);
    }
    async addToSet(key, value) {
        await this.redis.sadd(key, value);
    }
    async removeFromSet(key, value) {
        await this.redis.srem(key, value);
    }
    async getSet(key) {
        return this.redis.smembers(key);
    }
    async isMemberOfSet(key, value) {
        const result = await this.redis.sismember(key, value);
        return result === 1;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [ioredis_1.default])
], RedisService);
//# sourceMappingURL=redis.service.js.map