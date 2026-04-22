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
var SearchController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const search_service_1 = require("./search.service");
const search_dto_1 = require("./dto/search.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let SearchController = SearchController_1 = class SearchController {
    constructor(searchService) {
        this.searchService = searchService;
        this.logger = new common_1.Logger(SearchController_1.name);
    }
    async search(searchDto, req) {
        const userId = req.user?.userId;
        return this.searchService.search(searchDto, userId);
    }
    async personalizedSearch(searchDto, req) {
        return this.searchService.search(searchDto, req.user.userId);
    }
    async getSuggestions(suggestionsDto) {
        return this.searchService.getSuggestions(suggestionsDto);
    }
    async getTrending(trendingDto) {
        return this.searchService.getTrendingSearches(trendingDto);
    }
    async quickSearch(query, limit) {
        return this.searchService.search({
            query,
            limit: limit || 10,
            page: 1,
            sortBy: undefined,
            fuzzyMatch: true,
            boostPremium: true,
        });
    }
    async categorySearch(searchDto) {
        return this.searchService.search(searchDto);
    }
    async trackClick(body, req) {
        const userId = req.user?.userId;
        await this.searchService.trackSearchClick(body.query, body.adId, userId);
        return { success: true };
    }
    getFilters() {
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
    health() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Search results returned successfully',
        type: search_dto_1.SearchResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid search parameters' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchAdsDto, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('personalized'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Personalized search',
        description: `
      Search with user-specific personalization and history.
      Requires authentication.
      
      **Personalization features:**
      - Results influenced by user search history
      - Preferred categories prioritized
      - Location-based relevance boost
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Personalized search results',
        type: search_dto_1.SearchResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchAdsDto, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "personalizedSearch", null);
__decorate([
    (0, common_1.Get)('suggestions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get search suggestions',
        description: `
      Get autocomplete suggestions as user types.
      
      **Usage:**
      - Call as user types (debounce recommended: 150-300ms)
      - Minimum 2 characters required
      - Returns up to 10 suggestions by default
      - Can filter by category
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Suggestions returned successfully',
        type: search_dto_1.SuggestionsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Query too short' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchSuggestionsDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getSuggestions", null);
__decorate([
    (0, common_1.Get)('trending'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get trending searches',
        description: `
      Get popular search terms over a time window.
      
      **Use cases:**
      - Show trending searches on home page
      - Populate search suggestions with popular terms
      - Analytics dashboard
    `,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Trending searches returned',
        type: search_dto_1.TrendingResponseDto,
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.TrendingSearchesDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getTrending", null);
__decorate([
    (0, common_1.Get)('quick'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Quick search',
        description: 'Simplified search endpoint with minimal parameters',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Search query', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'limit', description: 'Max results', required: false }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Quick search results',
        type: search_dto_1.SearchResponseDto,
    }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "quickSearch", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Search within category',
        description: 'Search for ads within a specific category',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Category search results',
        type: search_dto_1.SearchResponseDto,
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_dto_1.SearchAdsDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "categorySearch", null);
__decorate([
    (0, common_1.Post)('click'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Track search click',
        description: `
      Track when a user clicks on a search result.
      Used for improving search relevance and analytics.
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Click tracked' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "trackClick", null);
__decorate([
    (0, common_1.Get)('filters'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get search filter options',
        description: 'Get available filter options for search (categories, price ranges, etc.)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Filter options returned',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], SearchController.prototype, "getFilters", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Search service health check',
        description: 'Check if search service is operational',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], SearchController.prototype, "health", null);
exports.SearchController = SearchController = SearchController_1 = __decorate([
    (0, swagger_1.ApiTags)('search'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map