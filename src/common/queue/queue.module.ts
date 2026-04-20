import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Queue Module
 * 
 * Handles background jobs to keep API responses fast:
 * - Payment verification (async)
 * - Email sending
 * - Fraud detection checks
 * - Analytics processing
 * 
 * Uses Bull (Redis-based queue) for reliable job processing
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3, // Retry failed jobs 3 times
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds delay
          },
          removeOnComplete: true, // Clean up completed jobs
          removeOnFail: false, // Keep failed jobs for debugging
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class QueueModule {}
