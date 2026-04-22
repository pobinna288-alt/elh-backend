import { AdCategory } from '../../ads/entities/ad.entity';
export declare enum SearchSortBy {
    RELEVANCE = "relevance",
    NEWEST = "newest",
    OLDEST = "oldest",
    PRICE_LOW = "price_low",
    PRICE_HIGH = "price_high",
    POPULARITY = "popularity",
    TRENDING = "trending"
}
export declare class SearchAdsDto {
    query: string;
    category?: AdCategory;
    categories?: AdCategory[];
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    sortBy?: SearchSortBy;
    page?: number;
    limit?: number;
    cursor?: string;
    boostPremium?: boolean;
    hasImage?: boolean;
    isVideoAd?: boolean;
    fuzzyMatch?: boolean;
}
export declare class SearchSuggestionsDto {
    query: string;
    limit?: number;
    category?: AdCategory;
}
export declare class TrendingSearchesDto {
    limit?: number;
    timeWindowHours?: number;
}
export declare class SearchResultItemDto {
    id: string;
    title: string;
    description: string;
    category: AdCategory;
    price: number;
    currency: string;
    location: string;
    mediaUrls?: string[];
    thumbnailUrl?: string;
    views: number;
    likes: number;
    isPremium: boolean;
    isFeatured: boolean;
    isVideoAd: boolean;
    authorId: string;
    createdAt: Date;
    relevanceScore: number;
    highlightedTitle?: string;
    highlightedDescription?: string;
}
export declare class SearchResponseDto {
    success: boolean;
    results: SearchResultItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor?: string;
    executionTimeMs: number;
    suggestions?: string[];
    appliedFilters?: Record<string, any>;
}
export declare class SuggestionsResponseDto {
    success: boolean;
    suggestions: string[];
    categorySuggestions?: {
        category: string;
        suggestions: string[];
    }[];
    executionTimeMs: number;
}
export declare class TrendingResponseDto {
    success: boolean;
    trending: {
        term: string;
        count: number;
        trend: 'rising' | 'stable' | 'falling';
    }[];
    timeWindowHours: number;
    executionTimeMs: number;
}
export declare class SearchAnalyticsDto {
    query: string;
    userId?: string;
    resultsCount: number;
    executionTimeMs: number;
    filters?: Record<string, any>;
    clickedAdId?: string;
    timestamp: Date;
    sessionId?: string;
}
