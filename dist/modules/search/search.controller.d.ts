import { SearchService } from './search.service';
import { SearchAdsDto, SearchSuggestionsDto, TrendingSearchesDto, SearchResponseDto, SuggestionsResponseDto, TrendingResponseDto } from './dto/search.dto';
export declare class SearchController {
    private readonly searchService;
    private readonly logger;
    constructor(searchService: SearchService);
    search(searchDto: SearchAdsDto, req: any): Promise<SearchResponseDto>;
    personalizedSearch(searchDto: SearchAdsDto, req: any): Promise<SearchResponseDto>;
    getSuggestions(suggestionsDto: SearchSuggestionsDto): Promise<SuggestionsResponseDto>;
    getTrending(trendingDto: TrendingSearchesDto): Promise<TrendingResponseDto>;
    quickSearch(query: string, limit?: number): Promise<SearchResponseDto>;
    categorySearch(searchDto: SearchAdsDto): Promise<SearchResponseDto>;
    trackClick(body: {
        query: string;
        adId: string;
    }, req: any): Promise<{
        success: boolean;
    }>;
    getFilters(): {
        categories: string[];
        sortOptions: string[];
        priceRanges: {
            label: string;
            min: number;
            max: number | null;
        }[];
    };
    health(): {
        status: string;
        timestamp: string;
    };
}
