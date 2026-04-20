import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdSuggestionController } from './ad-suggestion.controller';
import { AdSuggestionService } from './ad-suggestion.service';
import { AdSuggestionLog } from './entities/ad-suggestion-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdSuggestionLog])],
  controllers: [AdSuggestionController],
  providers: [AdSuggestionService],
  exports: [AdSuggestionService],
})
export class AdSuggestionModule {}
