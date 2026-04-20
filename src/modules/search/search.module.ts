import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Ad } from '../ads/entities/ad.entity';
import { RedisModule } from '../redis/redis.module';

/**
 * SearchModule - High-Performance Search Engine Module
 * 
 * Provides intelligent search capabilities for the El Hannora platform:
 * - Full-text search across ads
 * - Fuzzy matching with typo tolerance
 * - Autocomplete suggestions
 * - Trending searches
 * - Search analytics
 * - Redis caching for performance
 * 
 * Designed to handle millions of ads with sub-100ms response times
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ad]),
    RedisModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
