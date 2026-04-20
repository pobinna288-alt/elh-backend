import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisClientOptions } from 'redis';
import { CachingService } from './caching.service';

/**
 * Caching Module
 * 
 * Provides high-performance caching using Redis
 * Falls back to in-memory cache if Redis is unavailable
 * 
 * Global module for easy access across the application
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        // Use Redis if available, otherwise in-memory cache
        if (redisUrl) {
          try {
            const store = await redisStore({
              url: redisUrl,
              ttl: 300000, // 5 minutes default (in milliseconds)
            });
            return {
              store: store as any,
            };
          } catch (error) {
            console.warn('Redis connection failed, using in-memory cache:', error.message);
            return {
              ttl: 300000, // 5 minutes
              max: 1000, // Maximum number of items in cache
            };
          }
        }
        
        // In-memory cache fallback
        return {
          ttl: 300000, // 5 minutes
          max: 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CachingService],
  exports: [CachingService, CacheModule],
})
export class CachingModule {}
