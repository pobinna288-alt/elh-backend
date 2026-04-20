import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async incrementCounter(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async setnx(key: string, value: string): Promise<number> {
    return this.redis.setnx(key, value);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.redis.expire(key, seconds);
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    return this.redis.setex(key, seconds, value);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async getCounter(key: string): Promise<number> {
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async addToSet(key: string, value: string): Promise<void> {
    await this.redis.sadd(key, value);
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    await this.redis.srem(key, value);
  }

  async getSet(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async isMemberOfSet(key: string, value: string): Promise<boolean> {
    const result = await this.redis.sismember(key, value);
    return result === 1;
  }
}
