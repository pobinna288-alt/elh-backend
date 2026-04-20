import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

/**
 * Security Module
 * 
 * Provides comprehensive security features:
 * - Rate limiting (prevents abuse)
 * - DDoS protection
 * - Brute force protection
 * - API abuse prevention
 * 
 * Uses Redis for distributed rate limiting (scales across multiple servers)
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        return {
          throttlers: [{
            ttl: 60000, // Time window in milliseconds
            limit: 100, // Max requests per window
          }],
          
          // Use Redis for distributed rate limiting
          storage: redisUrl
            ? new ThrottlerStorageRedisService(redisUrl)
            : undefined,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class SecurityModule {}
