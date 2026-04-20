import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { MediaService } from './media.service';
import { CurrencyService } from './currency.service';
import { AiDescriptionService } from './ai-description.service';
import { AdRewriteService } from './ad-rewrite.service';
import { AdWriterService } from './ad-writer.service';
import { AdPersuasiveService } from './ad-persuasive.service';
import { AdHighConvertingService } from './ad-high-converting.service';
import { Ad } from './entities/ad.entity';
import { AdMedia } from './entities/ad-media.entity';
import { User } from '../users/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ad, AdMedia, User]), RedisModule, WalletModule],
  controllers: [AdsController],
  providers: [
    AdsService,
    MediaService,
    CurrencyService,
    AiDescriptionService,
    AdRewriteService,
    AdWriterService,
    AdPersuasiveService,
    AdHighConvertingService,
  ],
  exports: [
    AdsService,
    MediaService,
    CurrencyService,
    AiDescriptionService,
    AdRewriteService,
    AdWriterService,
    AdPersuasiveService,
    AdHighConvertingService,
  ],
})
export class AdsModule {}
