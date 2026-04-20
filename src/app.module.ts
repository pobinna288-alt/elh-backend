import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Performance & Optimization modules
import { PerformanceModule } from './common/performance/performance.module';
import { CachingModule } from './common/caching/caching.module';
import { QueueModule } from './common/queue/queue.module';
import { SecurityModule } from './common/security/security.module';
import { PerformanceInterceptor } from './common/performance/interceptors/performance.interceptor';
import { HttpCacheInterceptor } from './common/caching/interceptors/http-cache.interceptor';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdsModule } from './modules/ads/ads.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PremiumModule } from './modules/premium/premium.module';
import { CommentsModule } from './modules/comments/comments.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RedisModule } from './modules/redis/redis.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StreakModule } from './modules/streak/streak.module';
import { SocialModule } from './modules/social/social.module';
import { ReferralModule } from './modules/referral/referral.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AiToolsModule } from './modules/ai-tools/ai-tools.module';
import { NegotiationAiModule } from './modules/negotiation-ai/negotiation-ai.module';
import { DealBrokerModule } from './modules/deal-broker/deal-broker.module';
import { AdSuggestionModule } from './modules/ad-suggestion/ad-suggestion.module';
import { SearchModule } from './modules/search/search.module';
import { AdWatchModule } from './modules/ad-watch/ad-watch.module';
import storageConfig from './config/storage.config';

/**
 * App Module
 * 
 * High-Performance Backend Configuration
 * 
 * Features:
 * - Global performance monitoring
 * - Redis-based caching
 * - Background job processing
 * - Rate limiting & security
 * - Optimized database queries
 * - Backend single source of truth for coins, premium, and ads
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [storageConfig],
    }),

    // Database - Optimized with connection pooling
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        
        // Connection pool optimization
        extra: {
          max: 50, // Maximum pool size
          min: 5,  // Minimum pool size
          idleTimeoutMillis: 30000, // Close idle connections after 30s
          connectionTimeoutMillis: 2000, // Wait 2s for connection
        },
        
        // Enable query result caching (uses Redis if available)
        cache: {
          type: 'redis',
          options: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
          },
          duration: 30000, // 30 seconds default cache
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting (enhanced with Redis)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [{
        ttl: configService.get('THROTTLE_TTL') || 60000,
        limit: configService.get('THROTTLE_LIMIT') || 100,
      }],
      inject: [ConfigService],
    }),

    // File upload configuration (optimized)
    MulterModule.register({
      dest: './uploads/temp',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB (reduced from 120MB for performance)
        files: 5, // Max 5 files per request
      },
    }),

    // ========================================
    // PERFORMANCE MODULES (Global)
    // ========================================
    PerformanceModule,  // Performance monitoring & metrics
    CachingModule,      // Redis caching layer
    QueueModule,        // Background job processing
    SecurityModule,     // Rate limiting & security

    // ========================================
    // FEATURE MODULES
    // ========================================
    RedisModule,
    AuthModule,
    UsersModule,
    AdsModule,
    PaymentsModule,
    WalletModule,
    PremiumModule,  // Premium unlock module
    CommentsModule,
    MessagesModule,
    AnalyticsModule,
    ReviewsModule,  // Reviews and ratings
    NotificationsModule,  // Notification system
    StreakModule,  // Daily streak tracking
    SocialModule,  // Follow and wishlist
    ReferralModule,  // Referral program
    AlertsModule,  // Saved searches and price alerts
    AiToolsModule,  // AI assistant tools
    NegotiationAiModule,  // Negotiation AI access control & usage limits
    DealBrokerModule,     // AI Deal Broker & Alternative Seller Finder
    AdSuggestionModule,   // AI ad title/description suggestion (Premium+)
    SearchModule,         // High-performance search engine
    AdWatchModule,        // Watch Ad & Earn Coins system
  ],
  providers: [
    // Global performance interceptor (tracks all requests)
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    // Global HTTP cache interceptor (caches GET requests)
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
})
export class AppModule {}
