import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '../users/entities/user.entity';
import { Message } from '../messages/entities/message.entity';
import { AiUsageLog } from '../negotiation-ai/entities/ai-usage-log.entity';
import { Deal } from './entities/deal.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { AlternativeSellerSearch } from './entities/alternative-seller-search.entity';
import { NegotiationChat } from './entities/negotiation-chat.entity';

// Services
import { DealBrokerService } from './services/deal-broker.service';
import { SellerMatchingService } from './services/seller-matching.service';
import { NegotiationRecoveryService } from './services/negotiation-recovery.service';
import { DealBrokerUsageLimiterService } from './services/deal-broker-usage-limiter.service';

// Controller
import { DealBrokerController } from './deal-broker.controller';

// Guards
import { DealBrokerGuard } from './guards/deal-broker.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Message,
      AiUsageLog,
      Deal,
      SellerProfile,
      AlternativeSellerSearch,
      NegotiationChat,
    ]),
  ],
  controllers: [DealBrokerController],
  providers: [
    DealBrokerService,
    SellerMatchingService,
    NegotiationRecoveryService,
    DealBrokerUsageLimiterService,
    DealBrokerGuard,
  ],
  exports: [
    DealBrokerService,
    SellerMatchingService,
    NegotiationRecoveryService,
    DealBrokerUsageLimiterService,
  ],
})
export class DealBrokerModule {}
