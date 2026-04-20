import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { User } from '../users/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    WalletModule,
    PaymentsModule,
  ],
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService], // Export for use in other modules
})
export class PremiumModule {}
