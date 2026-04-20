import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { User } from '../users/entities/user.entity';
import { AiUsageLog } from './entities/ai-usage-log.entity';

// Services
import { NegotiationAIService } from './services/negotiation-ai.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageLimiterService } from './services/usage-limiter.service';

// Controller
import { NegotiationAiController } from './negotiation-ai.controller';

// Guards
import { NegotiationAiGuard } from './guards/negotiation-ai.guard';

// Scheduler
import { NegotiationAiScheduler } from './negotiation-ai.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AiUsageLog]),
    ScheduleModule.forRoot(),
  ],
  controllers: [NegotiationAiController],
  providers: [
    // Core services
    NegotiationAIService,
    SubscriptionService,
    UsageLimiterService,

    // Guard (injectable for manual use too)
    NegotiationAiGuard,

    // Cron scheduler
    NegotiationAiScheduler,
  ],
  exports: [
    NegotiationAIService,
    SubscriptionService,
    UsageLimiterService,
  ],
})
export class NegotiationAiModule {}
