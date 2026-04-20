import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  SearchAdsDto,
  SearchSuggestionsDto,
  TrendingSearchesDto,
  SearchResponseDto,
  SuggestionsResponseDto,
  TrendingResponseDto,
} from './dto/search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * SearchController - El Hannora Search API
 * 
 * Provides high-performance search endpoints for discovering ads
 * Handles millions of ads with intelligent search capabilities
 */
@ApiTags('search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  /**
   * Main search endpoint
   * Search ads by title, description, category with filters
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search ads',
    description: `
      Powerful full-text search across all ads.
      
      **Features:**
      - Search by title, description, category
      - Fuzzy matching for typo tolerance
      - Filter by category, price range, location
      - Multiple sort options (relevance, price, newest, popularity)
      - Pagination with cursor support
      - Premium ads boosting
      - Result highlighting
      
      **Performance:**
      - Results returned in <100ms
      - Supports millions of ads
      - Redis caching for repeated queries
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async search(
    @Query() searchDto: SearchAdsDto,
    @Request() req,
  ): Promise<SearchResponseDto> {
    const userId = req.user?.userId; // Optional user tracking
    return this.searchService.search(searchDto, userId);
  }

  /**
   * Authenticated search with personalization
   */
  @Get('personalized')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Personalized search',
    description: `
      Search with user-specific personalization and history.
      Requires authentication.
      
      **Personalization features:**
      - Results influenced by user search history
      - Preferred categories prioritized
      - Location-based relevance boost
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Personalized search results',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async personalizedSearch(
    @Query() searchDto: SearchAdsDto,
    @Request() req,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(searchDto, req.user.userId);
  }

  /**
   * Autocomplete suggestions
   */
  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get search suggestions',
    description: `
      Get autocomplete suggestions as user types.
      
      **Usage:**
      - Call as user types (debounce recommended: 150-300ms)
      - Minimum 2 characters required
      - Returns up to 10 suggestions by default
      - Can filter by category
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions returned successfully',
    type: SuggestionsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Query too short' })
  async getSuggestions(
    @Query() suggestionsDto: SearchSuggestionsDto,
  ): Promise<SuggestionsResponseDto> {
    return this.searchService.getSuggestions(suggestionsDto);
  }

  /**
   * Trending searches
   */
  @Get('trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get trending searches',
    description: `
      Get popular search terms over a time window.
      
      **Use cases:**
      - Show trending searches on home page
      - Populate search suggestions with popular terms
      - Analytics dashboard
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Trending searches returned',
    type: TrendingResponseDto,
  })
  async getTrending(
    @Query() trendingDto: TrendingSearchesDto,
  ): Promise<TrendingResponseDto> {
    return this.searchService.getTrendingSearches(trendingDto);
  }

  /**
   * Quick search - simplified endpoint for basic searches
   */
  @Get('quick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quick search',
    description: 'Simplified search endpoint with minimal parameters',
  })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({
    status: 200,
    description: 'Quick search results',
    type: SearchResponseDto,
  })
  async quickSearch(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<SearchResponseDto> {
    return this.searchService.search({
      query,
      limit: limit || 10,
      page: 1,
      sortBy: undefined,
      fuzzyMatch: true,
      boostPremium: true,
    });
  }

  /**
   * Category search - search within a specific category
   */
  @Get('category/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search within category',
    description: 'Search for ads within a specific category',
  })
  @ApiResponse({
    status: 200,
    description: 'Category search results',
    type: SearchResponseDto,
  })
  async categorySearch(
    @Query() searchDto: SearchAdsDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(searchDto);
  }

  /**
   * Track search result click
   * Used for improving search relevance
   */
  @Post('click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track search click',
    description: `
      Track when a user clicks on a search result.
      Used for improving search relevance and analytics.
    `,
  })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(
    @Body() body: { query: string; adId: string },
    @Request() req,
  ): Promise<{ success: boolean }> {
    const userId = req.user?.userId;
    await this.searchService.trackSearchClick(body.query, body.adId, userId);
    return { success: true };
  }

  /**
   * Search filters metadata
   * Returns available filter options
   */
  @Get('filters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get search filter options',
    description: 'Get available filter options for search (categories, price ranges, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter options returned',
  })
  getFilters(): {
    categories: string[];
    sortOptions: string[];
    priceRanges: { label: string; min: number; max: number | null }[];
  } {
    return {
      categories: [
        'Clothes',
        'Tech',
        'Health',
        'Jobs',
        'Services',
        'Electronics',
        'Education',
        'Sports',
        'Beauty',
        'Automobile',
        'Food',
        'Travel',
        'Real Estate/Property',
        'Pet and Animal',
        'Entertainment and Event',
        'Home and Garden',
        'Beauty and Personal Care',
        'Kid and Baby',
        'Art and Craft',
        'Travel and Tourism Service',
        'Finance and Insurance',
        'Book and Stationery',
        'Music and Instrument',
        'Sport Equipment and Outdoor',
        'Community and Local Service',
      ],
      sortOptions: [
        'relevance',
        'newest',
        'oldest',
        'price_low',
        'price_high',
        'popularity',
        'trending',
      ],
      priceRanges: [
        { label: 'Under $25', min: 0, max: 25 },
        { label: '$25 - $50', min: 25, max: 50 },
        { label: '$50 - $100', min: 50, max: 100 },
        { label: '$100 - $500', min: 100, max: 500 },
        { label: '$500 - $1000', min: 500, max: 1000 },
        { label: '$1000+', min: 1000, max: null },
      ],
    };
  }

  /**
   * Health check for search service
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search service health check',
    description: 'Check if search service is operational',
  })
  health(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
