import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';
import { AiUsageService } from './ai-usage.service';
import { User } from '../users/entities/user.entity';
import { RedisModule } from '../redis/redis.module';
import { NegotiationAiModule } from '../negotiation-ai/negotiation-ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RedisModule, NegotiationAiModule],
  controllers: [AiToolsController],
  providers: [AiToolsService, AiUsageService],
  exports: [AiToolsService, AiUsageService],
})
export class AiToolsModule {}
