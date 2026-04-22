"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ad_entity_1 = require("../ads/entities/ad.entity");
const redis_service_1 = require("../redis/redis.service");
const search_dto_1 = require("./dto/search.dto");
let SearchService = SearchService_1 = class SearchService {
    constructor(adRepository, redisService) {
        this.adRepository = adRepository;
        this.redisService = redisService;
        this.logger = new common_1.Logger(SearchService_1.name);
        this.CACHE_PREFIX = 'search:';
        this.SEARCH_CACHE_TTL = 300;
        this.SUGGESTIONS_CACHE_TTL = 600;
        this.TRENDING_CACHE_TTL = 900;
        this.ANALYTICS_PREFIX = 'search_analytics:';
        this.TRENDING_KEY = 'search:trending';
    }
    async search(dto, userId) {
        const startTime = Date.now();
        try {
            const normalizedQuery = this.normalizeQuery(dto.query);
            if (!normalizedQuery) {
                throw new common_1.BadRequestException('Invalid search query');
            }
            const cacheKey = this.generateCacheKey(dto);
            const cachedResult = await this.getCachedResult(cacheKey);
            if (cachedResult) {
                this.logger.debug(`Cache hit for query: "${normalizedQuery}"`);
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
            const { results, total } = await this.executeSearch(dto, normalizedQuery);
            const processedResults = this.processResults(results, normalizedQuery);
            const page = dto.page || 1;
            const limit = dto.limit || 20;
            const totalPages = Math.ceil(total / limit);
            const hasMore = page < totalPages;
            const response = {
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
            await this.cacheResult(cacheKey, response);
            this.trackSearchAnalytics({
                query: normalizedQuery,
                userId,
                resultsCount: total,
                executionTimeMs: response.executionTimeMs,
                filters: this.extractFilters(dto),
                timestamp: new Date(),
            });
            await this.updateTrendingSearches(normalizedQuery);
            this.logger.log(`Search completed: "${normalizedQuery}" - ${total} results in ${response.executionTimeMs}ms`);
            return response;
        }
        catch (error) {
            this.logger.error(`Search error: ${error.message}`, error.stack);
            throw error;
        }
    }
    async executeSearch(dto, normalizedQuery) {
        const queryBuilder = this.adRepository
            .createQueryBuilder('ad')
            .where('ad.isActive = :isActive', { isActive: true });
        this.applyFullTextSearch(queryBuilder, normalizedQuery, dto.fuzzyMatch ?? true);
        this.applyFilters(queryBuilder, dto);
        this.applySorting(queryBuilder, dto.sortBy || search_dto_1.SearchSortBy.RELEVANCE, dto.boostPremium ?? true);
        const total = await queryBuilder.getCount();
        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const offset = (page - 1) * limit;
        queryBuilder.skip(offset).take(limit);
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
    applyFullTextSearch(queryBuilder, query, fuzzyMatch) {
        const searchTerms = this.tokenizeQuery(query);
        if (searchTerms.length === 0)
            return;
        queryBuilder.andWhere(new typeorm_2.Brackets((qb) => {
            searchTerms.forEach((term, index) => {
                const paramKey = `term${index}`;
                if (fuzzyMatch) {
                    const fuzzyTerm = `%${term}%`;
                    qb.orWhere(`LOWER(ad.title) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
                    qb.orWhere(`LOWER(ad.description) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
                    qb.orWhere(`LOWER(ad.category) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
                    qb.orWhere(`LOWER(ad.location) LIKE LOWER(:${paramKey})`, { [paramKey]: fuzzyTerm });
                }
                else {
                    const exactTerm = `%${term}%`;
                    qb.orWhere(`ad.title ILIKE :${paramKey}`, { [paramKey]: exactTerm });
                    qb.orWhere(`ad.description ILIKE :${paramKey}`, { [paramKey]: exactTerm });
                }
            });
        }));
    }
    applyFilters(queryBuilder, dto) {
        if (dto.category) {
            queryBuilder.andWhere('ad.category = :category', { category: dto.category });
        }
        if (dto.categories && dto.categories.length > 0) {
            queryBuilder.andWhere('ad.category IN (:...categories)', { categories: dto.categories });
        }
        if (dto.minPrice !== undefined) {
            queryBuilder.andWhere('ad.price >= :minPrice', { minPrice: dto.minPrice });
        }
        if (dto.maxPrice !== undefined) {
            queryBuilder.andWhere('ad.price <= :maxPrice', { maxPrice: dto.maxPrice });
        }
        if (dto.location) {
            queryBuilder.andWhere('ad.location ILIKE :location', { location: `%${dto.location}%` });
        }
        if (dto.hasImage === true) {
            queryBuilder.andWhere('ad.hasImage = :hasImage', { hasImage: true });
        }
        if (dto.isVideoAd === true) {
            queryBuilder.andWhere('ad.isVideoAd = :isVideoAd', { isVideoAd: true });
        }
    }
    applySorting(queryBuilder, sortBy, boostPremium) {
        if (boostPremium) {
            queryBuilder.addOrderBy('ad.isFeatured', 'DESC');
            queryBuilder.addOrderBy('ad.isPremium', 'DESC');
        }
        switch (sortBy) {
            case search_dto_1.SearchSortBy.RELEVANCE:
                queryBuilder.addOrderBy('ad.views', 'DESC');
                queryBuilder.addOrderBy('ad.likes', 'DESC');
                queryBuilder.addOrderBy('ad.createdAt', 'DESC');
                break;
            case search_dto_1.SearchSortBy.NEWEST:
                queryBuilder.addOrderBy('ad.createdAt', 'DESC');
                break;
            case search_dto_1.SearchSortBy.OLDEST:
                queryBuilder.addOrderBy('ad.createdAt', 'ASC');
                break;
            case search_dto_1.SearchSortBy.PRICE_LOW:
                queryBuilder.addOrderBy('ad.price', 'ASC');
                break;
            case search_dto_1.SearchSortBy.PRICE_HIGH:
                queryBuilder.addOrderBy('ad.price', 'DESC');
                break;
            case search_dto_1.SearchSortBy.POPULARITY:
                queryBuilder.addOrderBy('ad.views', 'DESC');
                queryBuilder.addOrderBy('ad.likes', 'DESC');
                break;
            case search_dto_1.SearchSortBy.TRENDING:
                queryBuilder.addOrderBy('ad.views', 'DESC');
                queryBuilder.addOrderBy('ad.createdAt', 'DESC');
                break;
            default:
                queryBuilder.addOrderBy('ad.createdAt', 'DESC');
        }
    }
    processResults(ads, query) {
        const searchTerms = this.tokenizeQuery(query);
        return ads.map((ad) => {
            const relevanceScore = this.calculateRelevanceScore(ad, searchTerms);
            const highlightedTitle = this.highlightMatches(ad.title, searchTerms);
            const highlightedDescription = this.highlightMatches(this.truncateDescription(ad.description, 200), searchTerms);
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
    calculateRelevanceScore(ad, searchTerms) {
        let score = 0;
        const maxScore = 1;
        const titleLower = ad.title.toLowerCase();
        const descLower = ad.description.toLowerCase();
        const categoryLower = ad.category.toLowerCase();
        searchTerms.forEach((term) => {
            const termLower = term.toLowerCase();
            if (titleLower.includes(termLower)) {
                score += 0.4;
                if (titleLower.startsWith(termLower))
                    score += 0.1;
            }
            if (categoryLower.includes(termLower)) {
                score += 0.25;
            }
            if (descLower.includes(termLower)) {
                score += 0.15;
            }
        });
        if (ad.isPremium)
            score += 0.05;
        if (ad.isFeatured)
            score += 0.05;
        const engagementBoost = Math.min(ad.views / 10000, 0.1) + Math.min(ad.likes / 1000, 0.05);
        score += engagementBoost;
        return Math.min(score / searchTerms.length, maxScore);
    }
    highlightMatches(text, searchTerms) {
        let highlighted = text;
        searchTerms.forEach((term) => {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        return highlighted;
    }
    async getSuggestions(dto) {
        const startTime = Date.now();
        const normalizedQuery = this.normalizeQuery(dto.query);
        const cacheKey = `${this.CACHE_PREFIX}suggestions:${normalizedQuery}:${dto.category || 'all'}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return {
                ...parsed,
                executionTimeMs: Date.now() - startTime,
            };
        }
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
        const categorySuggestions = await this.getCategorySuggestions(normalizedQuery, dto.limit || 5);
        const response = {
            success: true,
            suggestions,
            categorySuggestions,
            executionTimeMs: Date.now() - startTime,
        };
        await this.redisService.set(cacheKey, JSON.stringify(response), this.SUGGESTIONS_CACHE_TTL);
        return response;
    }
    async getCategorySuggestions(query, limit) {
        const categories = Object.values(ad_entity_1.AdCategory).slice(0, 5);
        const results = [];
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
    async getTrendingSearches(dto) {
        const startTime = Date.now();
        const cacheKey = `${this.CACHE_PREFIX}trending:${dto.timeWindowHours || 24}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return {
                ...parsed,
                executionTimeMs: Date.now() - startTime,
            };
        }
        const trending = await this.getPopularSearchTerms(dto.limit || 10, dto.timeWindowHours || 24);
        const response = {
            success: true,
            trending,
            timeWindowHours: dto.timeWindowHours || 24,
            executionTimeMs: Date.now() - startTime,
        };
        await this.redisService.set(cacheKey, JSON.stringify(response), this.TRENDING_CACHE_TTL);
        return response;
    }
    async trackSearchClick(query, adId, userId) {
        try {
            const key = `${this.ANALYTICS_PREFIX}clicks:${adId}`;
            await this.redisService.incr(key);
            await this.adRepository.increment({ id: adId }, 'clicks', 1);
            this.logger.debug(`Tracked click: query="${query}", adId=${adId}`);
        }
        catch (error) {
            this.logger.error(`Failed to track search click: ${error.message}`);
        }
    }
    normalizeQuery(query) {
        return query
            .trim()
            .toLowerCase()
            .replace(/[^\w\s\-]/g, '')
            .replace(/\s+/g, ' ');
    }
    tokenizeQuery(query) {
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
            .slice(0, 10);
    }
    generateCacheKey(dto) {
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
    async getCachedResult(key) {
        try {
            const cached = await this.redisService.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            this.logger.warn(`Cache read error: ${error.message}`);
            return null;
        }
    }
    async cacheResult(key, result) {
        try {
            await this.redisService.set(key, JSON.stringify(result), this.SEARCH_CACHE_TTL);
        }
        catch (error) {
            this.logger.warn(`Cache write error: ${error.message}`);
        }
    }
    generateCursor(results, currentPage) {
        if (results.length === 0)
            return '';
        const lastResult = results[results.length - 1];
        const cursorData = {
            timestamp: lastResult.createdAt,
            id: lastResult.id,
            page: currentPage + 1,
        };
        return Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }
    truncateDescription(description, maxLength) {
        if (description.length <= maxLength)
            return description;
        return description.substring(0, maxLength).trim() + '...';
    }
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    extractFilters(dto) {
        const filters = {};
        if (dto.category)
            filters.category = dto.category;
        if (dto.categories)
            filters.categories = dto.categories;
        if (dto.minPrice !== undefined)
            filters.minPrice = dto.minPrice;
        if (dto.maxPrice !== undefined)
            filters.maxPrice = dto.maxPrice;
        if (dto.location)
            filters.location = dto.location;
        if (dto.hasImage)
            filters.hasImage = dto.hasImage;
        if (dto.isVideoAd)
            filters.isVideoAd = dto.isVideoAd;
        if (dto.sortBy)
            filters.sortBy = dto.sortBy;
        return filters;
    }
    async trackSearchAnalytics(analytics) {
        try {
            const key = `${this.ANALYTICS_PREFIX}${new Date().toISOString().split('T')[0]}`;
            await this.redisService.incr(key);
            this.logger.debug(`Search analytics: ${JSON.stringify(analytics)}`);
        }
        catch (error) {
            this.logger.warn(`Analytics tracking error: ${error.message}`);
        }
    }
    async updateTrendingSearches(query) {
        try {
            const cleanQuery = query.toLowerCase().trim();
            if (cleanQuery.length >= 2) {
                const key = `${this.TRENDING_KEY}:${new Date().toISOString().split('T')[0]}`;
                await this.redisService.incr(`${key}:${cleanQuery}`);
            }
        }
        catch (error) {
            this.logger.warn(`Trending update error: ${error.message}`);
        }
    }
    async getPopularSearchTerms(limit, timeWindowHours) {
        const trendingData = [
            { term: 'iphone', count: 1250, trend: 'rising' },
            { term: 'macbook', count: 980, trend: 'stable' },
            { term: 'samsung', count: 875, trend: 'rising' },
            { term: 'laptop', count: 720, trend: 'stable' },
            { term: 'car', count: 650, trend: 'falling' },
            { term: 'apartment', count: 580, trend: 'rising' },
            { term: 'job', count: 520, trend: 'stable' },
            { term: 'furniture', count: 480, trend: 'falling' },
            { term: 'electronics', count: 450, trend: 'stable' },
            { term: 'clothing', count: 420, trend: 'rising' },
        ];
        return trendingData.slice(0, limit);
    }
    async getAlternativeSuggestions(query) {
        const suggestions = [];
        const terms = query.split(' ');
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
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = SearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ad_entity_1.Ad)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        redis_service_1.RedisService])
], SearchService);
//# sourceMappingURL=search.service.js.map