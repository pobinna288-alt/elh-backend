import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { SavedSearch } from './entities/saved-search.entity';
import { PriceAlert } from './entities/price-alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearch, PriceAlert])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
