import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from './entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // Export for use in premium/ads modules
})
export class WalletModule {}
