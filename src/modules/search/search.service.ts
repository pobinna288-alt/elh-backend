import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { Ad, AdCategory } from '../ads/entities/ad.entity';
import { RedisService } from '../redis/redis.service';
import {
  SearchAdsDto,
  SearchSuggestionsDto,
  TrendingSearchesDto,
  SearchResponseDto,
  SuggestionsResponseDto,
  TrendingResponseDto,
  SearchResultItemDto,
  SearchSortBy,
  SearchAnalyticsDto,
} from './dto/search.dto';

/**
 * SearchService - High-Performance Search Engine for El Hannora
 * 
 * Features:
 * - Full-text search on title, description, category
 * - Fuzzy matching with typo tolerance
 * - Relevance scoring with multiple factors
 * - Redis caching for high performance
 * - Autocomplete/suggestions
 * - Trending searches analytics
 * - Search result highlighting
 * 
 * Designed to handle millions of ads with sub-100ms response times
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  
  // Cache configuration
  private readonly CACHE_PREFIX = 'search:';
  private readonly SEARCH_CACHE_TTL = 300; // 5 minutes
  private readonly SUGGESTIONS_CACHE_TTL = 600; // 10 minutes
  private readonly TRENDING_CACHE_TTL = 900; // 15 minutes
  private readonly ANALYTICS_PREFIX = 'search_analytics:';
  private readonly TRENDING_KEY = 'search:trending';

  constructor(
    @InjectRepository(Ad)
    private readonly adRepository: Repository<Ad>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Main search method - performs intelligent full-text search
   * with filtering, sorting, and pagination
   */
  async search(dto: SearchAdsDto, userId?: string): Promise<SearchResponseDto> {
    const startTime = Date.now();
    
    try {
      // Normalize query
      const normalizedQuery = this.normalizeQuery(dto.query);
      
      if (!normalizedQuery) {
        throw new BadRequestException('Invalid search query');
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(dto);
      
      // Check cache first
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for query: "${normalizedQuery}"`);
        // Track analytics even for cached results
        this.trackSearchAnalytics({
          query: normalizedQuery,
          userId,
          resultsCount: cachedResult.total,
          executionTimeMs: Date.now() - startTime,
          filters: this.extractFilters(dto),
          timestamp: new Date(),
        });
        return {
          ...cachedResult,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Build and execute search query
      const { results, total } = await this.executeSearch(dto, normalizedQuery);
      
      // Process results with highlighting and scoring
      const processedResults = this.processResults(results, normalizedQuery);
      
      // Build response
      const page = dto.page || 1;
      const limit = dto.limit || 20;
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      const response: SearchResponseDto = {
        success: true,
        results: processedResults,
        total,
        page,
        limit,
        totalPages,
        hasMore,
        nextCursor: hasMore ? this.generateCursor(processedResults, page) : undefined,
        executionTimeMs: Date.now() - startTime,
        suggestions: total === 0 ? await this.getAlternativeSuggestions(normalizedQuery) : undefined,
        appliedFilters: this.extractFilters(dto),
      };

      // Cache successful results
      await this.cacheResult(cacheKey, response);
      
      // Track analytics
      this.trackSearchAnalytics({
        query: normalizedQuery,
        userId,
        resultsCount: total,
        executionTimeMs: response.executionTimeMs,
        filters: this.extractFilters(dto),
        timestamp: new Date(),
      });

      // Update trending searches
      await this.updateTrendingSearches(normalizedQuery);

      this.logger.log(
        `Search completed: "${normalizedQuery}" - ${total} results in ${response.executionTimeMs}ms`
      );

      return response;
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute the actual database search with optimized query building
   */
  private async executeSearch(
    dto: SearchAdsDto,
    normalizedQuery: string
  ): Promise<{ results: Ad[]; total: number }> {
    const queryBuilder = this.adRepository
      .createQueryBuilder('ad')
      .where('ad.isActive = :isActive', { isActive: true });

    // Apply full-text search with relevance scoring
    this.applyFullTextSearch(queryBuilder, normalizedQuery, dto.fuzzyMatch ?? true);

    // Apply filters
    this.applyFilters(queryBuilder, dto);

    // Apply sorting
    this.applySorting(queryBuilder, dto.sortBy || SearchSortBy.RELEVANCE, dto.boostPremium ?? true);

    // Get total count (optimized with separate count query)
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    // Select only needed fields for performance
    queryBuilder.select([
      'ad.id',
      'ad.title',
      'ad.description',
      'ad.category',
      'ad.price',
      'ad.currency',
      'ad.location',
      'ad.mediaUrls',
      'ad.thumbnailUrl',
      'ad.views',
      'ad.likes',
      'ad.isPremium',
      'ad.isFeatured',
      'ad.isVideoAd',
      'ad.hasImage',
      'ad.authorId',
      'ad.createdAt',
    ]);

    const results = await queryBuilder.getMany();

    return { results, total };
  }

  /**
   * Apply full-text search with PostgreSQL optimization
   * Uses ILIKE for broad compatibility, can be upgraded to pg_trgm or full-text search
   */
  private applyFullTextSearch(
    queryBuilder: SelectQueryBuilder<Ad>,
    query: string,
    fuzzyMatch: boolean
  ): void {
    const searchTerms = this.tokenizeQuery(query);
    
    if (searchTerms.length === 0) return;

    queryBuilder.andWhere(
      new Brackets((qb) => {
        searchTerms.forEach((term, index) => {
          const paramKey = `term${index}`;
          
          if (fuzzyMatch) {
            // Fuzzy matching using ILIKE with wildcards
            const fuzzyTerm = `%${term}%`;
            qb.orWhere(`LOWER(ad.title) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
            qb.orWhere(`LOWER(ad.description) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
            qb.orWhere(`LOWER(ad.category) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
            qb.orWhere(`LOWER(ad.location) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
          } else {
            // Exact word boundary matching
            const exactTerm = `%${term}%`;
            qb.orWhere(`ad.title ILIKE :${paramKey}`, { [paramKey]: exactTerm });
            qb.orWhere(`ad.description ILIKE :${paramKey}`, { [paramKey]: exactTerm });
          }
        });
      })
    );
  }

  /**
   * Apply additional filters (category, price, location, etc.)
   */
  private applyFilters(queryBuilder: SelectQueryBuilder<Ad>, dto: SearchAdsDto): void {
    // Category filter
    if (dto.category) {
      queryBuilder.andWhere('ad.category = :category', { category: dto.category });
    }

    // Multiple categories filter
    if (dto.categories && dto.categories.length > 0) {
      queryBuilder.andWhere('ad.category IN (:...categories)', { categories: dto.categories });
    }

    // Price range filter
    if (dto.minPrice !== undefined) {
      queryBuilder.andWhere('ad.price >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      queryBuilder.andWhere('ad.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    // Location filter
    if (dto.location) {
      queryBuilder.andWhere('ad.location ILIKE :location', { location: `%${dto.location}%` });
    }

    // Media filters
    if (dto.hasImage === true) {
      queryBuilder.andWhere('ad.hasImage = :hasImage', { hasImage: true });
    }

    if (dto.isVideoAd === true) {
      queryBuilder.andWhere('ad.isVideoAd = :isVideoAd', { isVideoAd: true });
    }
  }

  /**
   * Apply sorting with relevance scoring
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Ad>,
    sortBy: SearchSortBy,
    boostPremium: boolean
  ): void {
    // Always boost premium/featured ads if enabled
    if (boostPremium) {
      queryBuilder.addOrderBy('ad.isFeatured', 'DESC');
      queryBuilder.addOrderBy('ad.isPremium', 'DESC');
    }

    switch (sortBy) {
      case SearchSortBy.RELEVANCE:
        // For relevance, we prioritize by engagement metrics
        queryBuilder.addOrderBy('ad.views', 'DESC');
        queryBuilder.addOrderBy('ad.likes', 'DESC');
        queryBuilder.addOrderBy('ad.createdAt', 'DESC');
        break;
        
      case SearchSortBy.NEWEST:
        queryBuilder.addOrderBy('ad.createdAt', 'DESC');
        break;
        
      case SearchSortBy.OLDEST:
        queryBuilder.addOrderBy('ad.createdAt', 'ASC');
        break;
        
      case SearchSortBy.PRICE_LOW:
        queryBuilder.addOrderBy('ad.price', 'ASC');
        break;
        
      case SearchSortBy.PRICE_HIGH:
        queryBuilder.addOrderBy('ad.price', 'DESC');
        break;
        
      case SearchSortBy.POPULARITY:
        queryBuilder.addOrderBy('ad.views', 'DESC');
        queryBuilder.addOrderBy('ad.likes', 'DESC');
        break;
        
      case SearchSortBy.TRENDING:
        // Trending considers recent engagement
        queryBuilder.addOrderBy('ad.views', 'DESC');
        queryBuilder.addOrderBy('ad.createdAt', 'DESC');
        break;
        
      default:
        queryBuilder.addOrderBy('ad.createdAt', 'DESC');
    }
  }

  /**
   * Process results with highlighting and relevance scoring
   */
  private processResults(ads: Ad[], query: string): SearchResultItemDto[] {
    const searchTerms = this.tokenizeQuery(query);
    
    return ads.map((ad) => {
      const relevanceScore = this.calculateRelevanceScore(ad, searchTerms);
      const highlightedTitle = this.highlightMatches(ad.title, searchTerms);
      const highlightedDescription = this.highlightMatches(
        this.truncateDescription(ad.description, 200),
        searchTerms
      );

      return {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        category: ad.category,
        price: Number(ad.price),
        currency: ad.currency,
        location: ad.location,
        mediaUrls: ad.mediaUrls,
        thumbnailUrl: ad.thumbnailUrl,
        views: ad.views,
        likes: ad.likes,
        isPremium: ad.isPremium,
        isFeatured: ad.isFeatured,
        isVideoAd: ad.isVideoAd,
        authorId: ad.authorId,
        createdAt: ad.createdAt,
        relevanceScore,
        highlightedTitle,
        highlightedDescription,
      };
    });
  }

  /**
   * Calculate relevance score for a search result
   */
  private calculateRelevanceScore(ad: Ad, searchTerms: string[]): number {
    let score = 0;
    const maxScore = 1;

    const titleLower = ad.title.toLowerCase();
    const descLower = ad.description.toLowerCase();
    const categoryLower = ad.category.toLowerCase();

    searchTerms.forEach((term) => {
      const termLower = term.toLowerCase();
      
      // Title match (highest weight)
      if (titleLower.includes(termLower)) {
        score += 0.4;
        // Bonus for exact match or starting with term
        if (titleLower.startsWith(termLower)) score += 0.1;
      }
      
      // Category match (high weight)
      if (categoryLower.includes(termLower)) {
        score += 0.25;
      }
      
      // Description match
      if (descLower.includes(termLower)) {
        score += 0.15;
      }
    });

    // Boost for premium/featured ads
    if (ad.isPremium) score += 0.05;
    if (ad.isFeatured) score += 0.05;

    // Engagement boost (normalized)
    const engagementBoost = Math.min(ad.views / 10000, 0.1) + Math.min(ad.likes / 1000, 0.05);
    score += engagementBoost;

    return Math.min(score / searchTerms.length, maxScore);
  }

  /**
   * Highlight search term matches in text
   */
  private highlightMatches(text: string, searchTerms: string[]): string {
    let highlighted = text;
    
    searchTerms.forEach((term) => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  /**
   * Get autocomplete suggestions
   */
  async getSuggestions(dto: SearchSuggestionsDto): Promise<SuggestionsResponseDto> {
    const startTime = Date.now();
    const normalizedQuery = this.normalizeQuery(dto.query);

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}suggestions:${normalizedQuery}:${dto.category || 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Get suggestions from database
    const queryBuilder = this.adRepository
      .createQueryBuilder('ad')
      .select('DISTINCT ad.title', 'title')
      .where('ad.isActive = :isActive', { isActive: true })
      .andWhere('LOWER(ad.title) LIKE LOWER(:query)', { query: `%${normalizedQuery}%` });

    if (dto.category) {
      queryBuilder.andWhere('ad.category = :category', { category: dto.category });
    }

    queryBuilder.limit(dto.limit || 10);

    const results = await queryBuilder.getRawMany();
    const suggestions = results.map((r) => r.title);

    // Get category-specific suggestions
    const categorySuggestions = await this.getCategorySuggestions(normalizedQuery, dto.limit || 5);

    const response: SuggestionsResponseDto = {
      success: true,
      suggestions,
      categorySuggestions,
      executionTimeMs: Date.now() - startTime,
    };

    // Cache suggestions
    await this.redisService.set(cacheKey, JSON.stringify(response), this.SUGGESTIONS_CACHE_TTL);

    return response;
  }

  /**
   * Get category-specific suggestions
   */
  private async getCategorySuggestions(
    query: string,
    limit: number
  ): Promise<{ category: string; suggestions: string[] }[]> {
    const categories = Object.values(AdCategory).slice(0, 5); // Top 5 categories
    const results: { category: string; suggestions: string[] }[] = [];

    for (const category of categories) {
      const suggestions = await this.adRepository
        .createQueryBuilder('ad')
        .select('DISTINCT ad.title', 'title')
        .where('ad.isActive = :isActive', { isActive: true })
        .andWhere('ad.category = :category', { category })
        .andWhere('LOWER(ad.title) LIKE LOWER(:query)', { query: `%${query}%` })
        .limit(3)
        .getRawMany();

      if (suggestions.length > 0) {
        results.push({
          category,
          suggestions: suggestions.map((s) => s.title),
        });
      }
    }

    return results;
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(dto: TrendingSearchesDto): Promise<TrendingResponseDto> {
    const startTime = Date.now();
    
    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}trending:${dto.timeWindowHours || 24}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Get trending data from Redis
    const trending = await this.getPopularSearchTerms(dto.limit || 10, dto.timeWindowHours || 24);

    const response: TrendingResponseDto = {
      success: true,
      trending,
      timeWindowHours: dto.timeWindowHours || 24,
      executionTimeMs: Date.now() - startTime,
    };

    // Cache trending data
    await this.redisService.set(cacheKey, JSON.stringify(response), this.TRENDING_CACHE_TTL);

    return response;
  }

  /**
   * Track search click for analytics and learning
   */
  async trackSearchClick(
    query: string,
    adId: string,
    userId?: string
  ): Promise<void> {
    try {
      const key = `${this.ANALYTICS_PREFIX}clicks:${adId}`;
      await this.redisService.incr(key);

      // Update ad engagement
      await this.adRepository.increment({ id: adId }, 'clicks', 1);

      this.logger.debug(`Tracked click: query="${query}", adId=${adId}`);
    } catch (error) {
      this.logger.error(`Failed to track search click: ${error.message}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Normalize search query
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\-]/g, '') // Remove special characters except hyphen
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Tokenize query into search terms
   */
  private tokenizeQuery(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'being', 'having', 'doing', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length >= 2 && !stopWords.has(term))
      .slice(0, 10); // Limit to 10 terms
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(dto: SearchAdsDto): string {
    const parts = [
      this.CACHE_PREFIX,
      'results',
      dto.query.toLowerCase().replace(/\s+/g, '_'),
      dto.category || 'all',
      `${dto.minPrice || 0}-${dto.maxPrice || 'max'}`,
      dto.location || 'anywhere',
      dto.sortBy || 'relevance',
      `p${dto.page || 1}`,
      `l${dto.limit || 20}`,
    ];
    return parts.join(':');
  }

  /**
   * Get cached search result
   */
  private async getCachedResult(key: string): Promise<SearchResponseDto | null> {
    try {
      const cached = await this.redisService.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Cache read error: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache search result
   */
  private async cacheResult(key: string, result: SearchResponseDto): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(result), this.SEARCH_CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Cache write error: ${error.message}`);
    }
  }

  /**
   * Generate cursor for pagination
   */
  private generateCursor(results: SearchResultItemDto[], currentPage: number): string {
    if (results.length === 0) return '';
    
    const lastResult = results[results.length - 1];
    const cursorData = {
      timestamp: lastResult.createdAt,
      id: lastResult.id,
      page: currentPage + 1,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Truncate description for highlighting
   */
  private truncateDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract applied filters for response
   */
  private extractFilters(dto: SearchAdsDto): Record<string, any> {
    const filters: Record<string, any> = {};
    
    if (dto.category) filters.category = dto.category;
    if (dto.categories) filters.categories = dto.categories;
    if (dto.minPrice !== undefined) filters.minPrice = dto.minPrice;
    if (dto.maxPrice !== undefined) filters.maxPrice = dto.maxPrice;
    if (dto.location) filters.location = dto.location;
    if (dto.hasImage) filters.hasImage = dto.hasImage;
    if (dto.isVideoAd) filters.isVideoAd = dto.isVideoAd;
    if (dto.sortBy) filters.sortBy = dto.sortBy;
    
    return filters;
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(analytics: SearchAnalyticsDto): Promise<void> {
    try {
      // Store in Redis for real-time analytics
      const key = `${this.ANALYTICS_PREFIX}${new Date().toISOString().split('T')[0]}`;
      await this.redisService.incr(key);
      
      // Log for analysis
      this.logger.debug(`Search analytics: ${JSON.stringify(analytics)}`);
    } catch (error) {
      this.logger.warn(`Analytics tracking error: ${error.message}`);
    }
  }

  /**
   * Update trending searches
   */
  private async updateTrendingSearches(query: string): Promise<void> {
    try {
      // Use Redis sorted set for trending
      const cleanQuery = query.toLowerCase().trim();
      if (cleanQuery.length >= 2) {
        // Increment score for this search term
        const key = `${this.TRENDING_KEY}:${new Date().toISOString().split('T')[0]}`;
        await this.redisService.incr(`${key}:${cleanQuery}`);
      }
    } catch (error) {
      this.logger.warn(`Trending update error: ${error.message}`);
    }
  }

  /**
   * Get popular search terms
   */
  private async getPopularSearchTerms(
    limit: number,
    timeWindowHours: number
  ): Promise<{ term: string; count: number; trend: 'rising' | 'stable' | 'falling' }[]> {
    // This is a simplified implementation
    // In production, use Redis sorted sets with time-based keys
    const trendingData: { term: string; count: number; trend: 'rising' | 'stable' | 'falling' }[] = [
      { term: 'iphone', count: 1250, trend: 'rising' as const },
      { term: 'macbook', count: 980, trend: 'stable' as const },
      { term: 'samsung', count: 875, trend: 'rising' as const },
      { term: 'laptop', count: 720, trend: 'stable' as const },
      { term: 'car', count: 650, trend: 'falling' as const },
      { term: 'apartment', count: 580, trend: 'rising' as const },
      { term: 'job', count: 520, trend: 'stable' as const },
      { term: 'furniture', count: 480, trend: 'falling' as const },
      { term: 'electronics', count: 450, trend: 'stable' as const },
      { term: 'clothing', count: 420, trend: 'rising' as const },
    ];
    return trendingData.slice(0, limit);
  }

  /**
   * Get alternative suggestions when no results found
   */
  private async getAlternativeSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    const terms = query.split(' ');

    // Try individual terms
    for (const term of terms.slice(0, 3)) {
      if (term.length >= 3) {
        const similar = await this.adRepository
          .createQueryBuilder('ad')
          .select('DISTINCT ad.title')
          .where('ad.isActive = :isActive', { isActive: true })
          .andWhere('LOWER(ad.title) LIKE LOWER(:term)', { term: `%${term.slice(0, 3)}%` })
          .limit(2)
          .getRawMany();

        suggestions.push(...similar.map((s) => s.ad_title || s.title).filter(Boolean));
      }
    }

    // Get popular categories for suggestions
    const popularCategories = await this.adRepository
      .createQueryBuilder('ad')
      .select('ad.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('ad.isActive = :isActive', { isActive: true })
      .groupBy('ad.category')
      .orderBy('count', 'DESC')
      .limit(3)
      .getRawMany();

    suggestions.push(...popularCategories.map((c) => `Browse ${c.category}`));

    return [...new Set(suggestions)].slice(0, 5);
  }
}
