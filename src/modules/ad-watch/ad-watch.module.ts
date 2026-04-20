import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdWatchController } from './ad-watch.controller';
import { AdWatchAdminController } from './ad-watch-admin.controller';
import { AdWatchService } from './ad-watch.service';
import { AdView } from './entities/ad-view.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { CoinBoostEvent } from './entities/coin-boost-event.entity';
import { User } from '../users/entities/user.entity';
import { Ad } from '../ads/entities/ad.entity';

/**
 * Ad Watch Module
 * 
 * Implements the Watch Ad & Earn Coins system.
 * 
 * Features:
 * - Progressive coin rewards based on watch milestones (25%, 50%, 75%, 100%)
 * - Tier-based maximum coin rewards (Normal: 10, Premium: 40, Pro: 100, Hot: 200)
 * - Anti-cheat protection (watch time validation, progress jump limits)
 * - Daily coin limits to prevent farming
 * - Watch streak tracking and bonuses
 * - Coin boost events with multipliers
 * 
 * Security:
 * - All calculations performed server-side
 * - Frontend values are validated and never trusted
 * - Atomic database transactions for coin updates
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdView,
      CoinTransaction,
      CoinBoostEvent,
      User,
      Ad,
    ]),
  ],
  controllers: [AdWatchController, AdWatchAdminController],
  providers: [AdWatchService],
  exports: [AdWatchService],
})
export class AdWatchModule {}
