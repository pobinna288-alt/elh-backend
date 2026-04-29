/**
 * El Hannora - Search and Filtering Service
 * 
 * Comprehensive search service for the marketplace advertising platform.
 * Supports:
 * - Full-text search across title, description, category
 * - Multiple filter options (price, location, condition, trust, seller type)
 * - Multiple sort options (newest, oldest, price, popularity, trust)
 * - Pagination with limit/offset
 * - Search analytics logging
 * - Redis caching for popular searches
 * 
 * @author El Hannora Team
 * @version 2.0.0
 */

 const { normalizePrice } = require("../utils/normalizePrice");

// ============================================
// CONSTANTS AND CONFIGURATION
// ============================================

/**
 * Valid categories for filtering
 */
const VALID_CATEGORIES = [
  'electronics',
  'fashion',
  'vehicles',
  'jobs',
  'services',
  'real_estate',
  'education',
  'home_garden',
  'sports',
  'entertainment',
  'other'
];

/**
 * Valid sort options
 */
const VALID_SORT_OPTIONS = {
  newest: { field: 'created_at', direction: 'DESC' },
  oldest: { field: 'created_at', direction: 'ASC' },
  most_popular: { field: 'clicks', direction: 'DESC' },
  most_viewed: { field: 'views', direction: 'DESC' },
  highest_trust: { field: 'trust_score', direction: 'DESC' },
  lowest_price: { field: 'price', direction: 'ASC' },
  highest_price: { field: 'price', direction: 'DESC' }
};

/**
 * Price range presets
 */
const PRICE_RANGES = {
  under_50: { min: 0, max: 50 },
  '50_200': { min: 50, max: 200 },
  '200_500': { min: 200, max: 500 },
  over_500: { min: 500, max: Infinity },
  custom: null  // Uses min_price and max_price parameters
};

/**
 * Location filter options
 */
const LOCATION_FILTERS = ['near_me', 'same_locality', 'same_city', 'country', 'worldwide'];

/**
 * Condition options
 */
const VALID_CONDITIONS = ['new', 'used', 'refurbished'];

/**
 * Trust filter options
 */
const TRUST_FILTERS = ['any', 'highest', 'verified', 'ai_approved'];

/**
 * Seller type options
 */
const VALID_SELLER_TYPES = ['individual', 'business', 'verified_business'];

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const POPULAR_SEARCH_CACHE_KEY = 'popular_searches';

// ============================================
// SEARCH CACHE (In-Memory for demo, use Redis in production)
// ============================================

const searchCache = new Map();

/**
 * Get cached search results
 * @param {string} cacheKey - Cache key
 * @returns {object|null} - Cached results or null
 */
function getCachedResults(cacheKey) {
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  // Remove expired cache entry
  if (cached) {
    searchCache.delete(cacheKey);
  }
  return null;
}

/**
 * Set cached search results
 * @param {string} cacheKey - Cache key
 * @param {object} data - Data to cache
 */
function setCachedResults(cacheKey, data) {
  searchCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + (CACHE_TTL_SECONDS * 1000)
  });
}

/**
 * Generate cache key from search parameters
 * @param {object} params - Search parameters
 * @returns {string} - Cache key
 */
function generateCacheKey(params) {
  return JSON.stringify({
    q: params.q || '',
    sort: params.sort || 'newest',
    price: params.price,
    min_price: params.min_price,
    max_price: params.max_price,
    location: params.location,
    user_lat: params.user_lat,
    user_lng: params.user_lng,
    user_locality: params.user_locality,
    user_city: params.user_city,
    user_country: params.user_country,
    category: params.category,
    condition: params.condition,
    trust: params.trust,
    seller_type: params.seller_type,
    page: params.page || DEFAULT_PAGE,
    limit: params.limit || DEFAULT_LIMIT
  });
}

// ============================================
// SEARCH ANALYTICS
// ============================================

const searchLogs = [];

/**
 * Log search query for analytics
 * @param {object} params - Search parameters and results
 */
function logSearchQuery({
  query,
  userId,
  filters,
  resultsCount,
  responseTimeMs,
  source = 'web'
}) {
  const logEntry = {
    id: generateUUID(),
    query: query || null,
    user_id: userId || null,
    filters: filters || {},
    results_count: resultsCount,
    response_time_ms: responseTimeMs,
    source,
    created_at: new Date().toISOString()
  };
  
  searchLogs.push(logEntry);
  
  // Keep only last 10000 entries in memory
  if (searchLogs.length > 10000) {
    searchLogs.splice(0, searchLogs.length - 10000);
  }
  
  return logEntry;
}

/**
 * Get trending searches from analytics
 * @param {number} limit - Number of trending searches to return
 * @param {number} hoursBack - How many hours to look back
 * @returns {Array} - Trending searches
 */
function getTrendingSearches(limit = 10, hoursBack = 24) {
  const cutoff = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
  
  // Count queries
  const queryCounts = {};
  searchLogs.forEach(log => {
    if (log.query && new Date(log.created_at) > cutoff) {
      const normalizedQuery = log.query.toLowerCase().trim();
      queryCounts[normalizedQuery] = (queryCounts[normalizedQuery] || 0) + 1;
    }
  });
  
  // Sort by count and return top results
  return Object.entries(queryCounts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate UUID v4
 * @returns {string} - UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Calculate Haversine distance between two coordinates
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Normalize search query
 * @param {string} query - Raw query string
 * @returns {string} - Normalized query
 */
function normalizeQuery(query) {
  if (!query) return '';
  return query.toLowerCase().trim().replace(/[^\w\s-]/g, '');
}

function normalizeLocationValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function extractAdLocationParts(ad) {
  const rawLocation = typeof ad.location === 'string' ? ad.location : '';
  let locality = ad.location_locality || ad.locality || '';
  let city = ad.location_city || ad.city || '';
  let country = ad.location_country || ad.country || '';

  if (rawLocation && (!city || !country)) {
    const parts = rawLocation.split(',').map(part => part.trim()).filter(Boolean);

    if (parts.length === 1) {
      if (!country) country = parts[0];
    } else if (parts.length === 2) {
      if (!city) city = parts[0];
      if (!country) country = parts[1];
    } else if (parts.length >= 3) {
      if (!locality) locality = parts[0];
      if (!city) city = parts[parts.length - 2];
      if (!country) country = parts[parts.length - 1];
    }
  }

  const targetCountries = Array.isArray(ad.targetCountries)
    ? ad.targetCountries
        .map(countryName => typeof countryName === 'string' ? countryName.trim() : '')
        .filter(Boolean)
    : [];

  return {
    locality,
    city,
    country,
    targetCountries,
    normalizedLocality: normalizeLocationValue(locality),
    normalizedCity: normalizeLocationValue(city),
    normalizedCountry: normalizeLocationValue(country),
    normalizedTargetCountries: targetCountries.map(normalizeLocationValue),
  };
}

/**
 * Validate and sanitize search parameters
 * @param {object} params - Raw parameters
 * @returns {object} - Sanitized parameters
 */
function validateSearchParams(params) {
  const sanitized = {};
  
  // Query (sanitize for SQL injection)
  if (params.q) {
    sanitized.q = params.q.toString().substring(0, 200);
  }
  
  // Sort option
  if (params.sort && VALID_SORT_OPTIONS[params.sort]) {
    sanitized.sort = params.sort;
  } else {
    sanitized.sort = 'newest';
  }
  
  // Price filter
  if (params.price && PRICE_RANGES.hasOwnProperty(params.price)) {
    sanitized.price = params.price;
  }
  
  // Custom price range
  if (params.min_price !== undefined) {
    const minPrice = parseFloat(params.min_price);
    if (!isNaN(minPrice) && minPrice >= 0) {
      sanitized.min_price = minPrice;
    }
  }
  
  if (params.max_price !== undefined) {
    const maxPrice = parseFloat(params.max_price);
    if (!isNaN(maxPrice) && maxPrice >= 0) {
      sanitized.max_price = maxPrice;
    }
  }
  
  // Location filter
  if (params.location && LOCATION_FILTERS.includes(params.location)) {
    sanitized.location = params.location;
  }
  
  // User coordinates (for near_me filter)
  if (params.user_lat !== undefined && params.user_lng !== undefined) {
    const lat = parseFloat(params.user_lat);
    const lng = parseFloat(params.user_lng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      sanitized.user_lat = lat;
      sanitized.user_lng = lng;
    }
  }
  
  // Location city/country for specific location filters
  if (params.user_locality) {
    sanitized.user_locality = params.user_locality.toString().substring(0, 100);
  }
  if (params.user_city) {
    sanitized.user_city = params.user_city.toString().substring(0, 100);
  }
  if (params.user_country) {
    sanitized.user_country = params.user_country.toString().substring(0, 100);
  }
  
  // Category filter
  if (params.category) {
    const category = params.category.toString().toLowerCase();
    if (VALID_CATEGORIES.includes(category)) {
      sanitized.category = category;
    }
  }
  
  // Condition filter
  if (params.condition) {
    const condition = params.condition.toString().toLowerCase();
    if (VALID_CONDITIONS.includes(condition)) {
      sanitized.condition = condition;
    }
  }
  
  // Trust filter
  if (params.trust && TRUST_FILTERS.includes(params.trust)) {
    sanitized.trust = params.trust;
  }
  
  // Seller type filter
  if (params.seller_type) {
    const sellerType = params.seller_type.toString().toLowerCase();
    if (VALID_SELLER_TYPES.includes(sellerType)) {
      sanitized.seller_type = sellerType;
    }
  }
  
  // Pagination
  const page = parseInt(params.page);
  sanitized.page = (page > 0) ? page : DEFAULT_PAGE;
  
  const limit = parseInt(params.limit);
  sanitized.limit = (limit > 0 && limit <= MAX_LIMIT) ? limit : DEFAULT_LIMIT;
  
  return sanitized;
}

// ============================================
// FILTER FUNCTIONS
// ============================================

/**
 * Apply text search filter (full-text search simulation)
 * @param {Array} ads - Ads array
 * @param {string} query - Search query
 * @returns {Array} - Filtered ads with relevance score
 */
function applyTextSearch(ads, query) {
  if (!query) return ads.map(ad => ({ ...ad, _relevance: 1 }));
  
  const normalizedQuery = normalizeQuery(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  
  return ads
    .map(ad => {
      let relevance = 0;
      const titleLower = (ad.title || '').toLowerCase();
      const descLower = (ad.description || '').toLowerCase();
      const categoryLower = (ad.category || '').toLowerCase();
      
      queryWords.forEach(word => {
        // Title match (highest weight)
        if (titleLower.includes(word)) {
          relevance += 0.5;
          // Exact or prefix match bonus
          if (titleLower.startsWith(word) || titleLower.includes(' ' + word)) {
            relevance += 0.2;
          }
        }
        
        // Description match
        if (descLower.includes(word)) {
          relevance += 0.2;
        }
        
        // Category match
        if (categoryLower.includes(word)) {
          relevance += 0.3;
        }
      });
      
      return { ...ad, _relevance: relevance };
    })
    .filter(ad => ad._relevance > 0);
}

/**
 * Apply price filter
 * @param {Array} ads - Ads array
 * @param {object} params - Filter parameters
 * @returns {Array} - Filtered ads
 */
function applyPriceFilter(ads, params) {
  let minPrice = 0;
  let maxPrice = Infinity;
  
  if (params.price && params.price !== 'custom') {
    const range = PRICE_RANGES[params.price];
    if (range) {
      minPrice = range.min;
      maxPrice = range.max;
    }
  } else if (params.price === 'custom' || params.min_price !== undefined || params.max_price !== undefined) {
    minPrice = params.min_price !== undefined ? params.min_price : 0;
    maxPrice = params.max_price !== undefined ? params.max_price : Infinity;
  }
  
  if (minPrice === 0 && maxPrice === Infinity) {
    return ads;
  }
  
  return ads.filter(ad => {
    const price = normalizePrice(ad.price);

    if (price === null) {
      return false;
    }

    return price >= minPrice && price <= maxPrice;
  });
}

/**
 * Apply location filter
 * @param {Array} ads - Ads array
 * @param {object} params - Filter parameters
 * @returns {Array} - Filtered ads
 */
function applyLocationFilter(ads, params) {
  if (!params.location || params.location === 'worldwide') {
    return ads;
  }

  const requestedLocality = normalizeLocationValue(params.user_locality);
  const requestedCity = normalizeLocationValue(params.user_city);
  const requestedCountry = normalizeLocationValue(params.user_country);
  
  switch (params.location) {
    case 'near_me':
      // Filter by proximity (50km radius)
      if (params.user_lat !== undefined && params.user_lng !== undefined) {
        return ads.filter(ad => {
          if (ad.latitude && ad.longitude) {
            const distance = calculateHaversineDistance(
              params.user_lat, params.user_lng,
              parseFloat(ad.latitude), parseFloat(ad.longitude)
            );
            return distance <= 50; // 50km radius
          }
          return false;
        }).map(ad => ({
          ...ad,
          _distance: calculateHaversineDistance(
            params.user_lat, params.user_lng,
            parseFloat(ad.latitude), parseFloat(ad.longitude)
          )
        }));
      }
      return ads;

    case 'same_locality':
      if (requestedLocality || requestedCountry) {
        return ads.filter(ad => {
          const location = extractAdLocationParts(ad);
          const localityMatch = requestedLocality && location.normalizedLocality === requestedLocality;
          const countrywideMatch = requestedCountry && (
            location.normalizedCountry === requestedCountry ||
            location.normalizedTargetCountries.includes(requestedCountry)
          );
          return Boolean(localityMatch || countrywideMatch);
        });
      }
      return ads;
      
    case 'same_city':
      if (requestedCity || requestedCountry) {
        return ads.filter(ad => {
          const location = extractAdLocationParts(ad);
          const cityMatch = requestedCity && location.normalizedCity === requestedCity;
          const countrywideMatch = requestedCountry && (
            location.normalizedCountry === requestedCountry ||
            location.normalizedTargetCountries.includes(requestedCountry)
          );
          return Boolean(cityMatch || countrywideMatch);
        });
      }
      return ads;
      
    case 'country':
      if (requestedCountry) {
        return ads.filter(ad => {
          const location = extractAdLocationParts(ad);
          return (
            location.normalizedCountry === requestedCountry ||
            location.normalizedTargetCountries.includes(requestedCountry)
          );
        });
      }
      return ads;
      
    default:
      return ads;
  }
}

/**
 * Apply category filter
 * @param {Array} ads - Ads array
 * @param {string} category - Category to filter by
 * @returns {Array} - Filtered ads
 */
function applyCategoryFilter(ads, category) {
  if (!category) return ads;
  return ads.filter(ad => 
    ad.category && ad.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Apply condition filter
 * @param {Array} ads - Ads array
 * @param {string} condition - Condition to filter by
 * @returns {Array} - Filtered ads
 */
function applyConditionFilter(ads, condition) {
  if (!condition) return ads;
  return ads.filter(ad => 
    ad.condition && ad.condition.toLowerCase() === condition.toLowerCase()
  );
}

/**
 * Apply trust filter
 * @param {Array} ads - Ads array
 * @param {string} trust - Trust filter option
 * @returns {Array} - Filtered ads
 */
function applyTrustFilter(ads, trust) {
  if (!trust || trust === 'any') return ads;
  
  switch (trust) {
    case 'highest':
      // Trust score > 80
      return ads.filter(ad => (ad.trust_score || 0) > 80);
      
    case 'verified':
      // is_verified = true
      return ads.filter(ad => ad.is_verified === true);
      
    case 'ai_approved':
      // ai_approved = true
      return ads.filter(ad => ad.ai_approved === true);
      
    default:
      return ads;
  }
}

/**
 * Apply seller type filter
 * @param {Array} ads - Ads array
 * @param {string} sellerType - Seller type to filter by
 * @returns {Array} - Filtered ads
 */
function applySellerTypeFilter(ads, sellerType) {
  if (!sellerType) return ads;
  return ads.filter(ad => 
    ad.seller_type && ad.seller_type.toLowerCase() === sellerType.toLowerCase()
  );
}

// ============================================
// SORTING FUNCTIONS
// ============================================

/**
 * Apply sorting to ads
 * @param {Array} ads - Ads array
 * @param {string} sortOption - Sort option key
 * @param {boolean} hasSearchQuery - Whether there's a search query (for relevance sorting)
 * @returns {Array} - Sorted ads
 */
function applySorting(ads, sortOption, hasSearchQuery = false) {
  const sort = VALID_SORT_OPTIONS[sortOption] || VALID_SORT_OPTIONS.newest;
  
  return [...ads].sort((a, b) => {
    // If there's a search query, add relevance as secondary sort
    if (hasSearchQuery && a._relevance !== b._relevance) {
      return b._relevance - a._relevance;
    }
    
    let valA = a[sort.field];
    let valB = b[sort.field];
    
    // Handle date fields
    if (sort.field === 'created_at') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    
    // Handle numeric fields
    if (['price', 'views', 'clicks', 'trust_score'].includes(sort.field)) {
      if (sort.field === 'price') {
        valA = normalizePrice(valA);
        valB = normalizePrice(valB);

        if (valA === null && valB === null) {
          return 0;
        }

        if (valA === null) {
          return 1;
        }

        if (valB === null) {
          return -1;
        }
      } else {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
    }
    
    if (sort.direction === 'DESC') {
      return valB - valA;
    } else {
      return valA - valB;
    }
  });
}

// ============================================
// PAGINATION
// ============================================

/**
 * Apply pagination to results
 * @param {Array} ads - Ads array
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {object} - Paginated results with metadata
 */
function applyPagination(ads, page, limit) {
  const totalResults = ads.length;
  const totalPages = Math.ceil(totalResults / limit);
  const offset = (page - 1) * limit;
  
  const paginatedAds = ads.slice(offset, offset + limit);
  
  return {
    results: paginatedAds,
    pagination: {
      page,
      limit,
      total_results: totalResults,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  };
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================

/**
 * Perform search with all filters and options
 * @param {Array} adsDatabase - The ads database array
 * @param {object} rawParams - Raw search parameters from request
 * @param {object} options - Additional options (userId, etc.)
 * @returns {object} - Search results with metadata
 */
function performSearch(adsDatabase, rawParams, options = {}) {
  const startTime = Date.now();
  
  // Validate and sanitize parameters
  const params = validateSearchParams(rawParams);
  
  // Check cache for popular searches
  const cacheKey = generateCacheKey(params);
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    // Log search even for cached results
    logSearchQuery({
      query: params.q,
      userId: options.userId,
      filters: getAppliedFilters(params),
      resultsCount: cachedResults.total_results,
      responseTimeMs: Date.now() - startTime,
      source: options.source || 'web'
    });
    
    return {
      ...cachedResults,
      cached: true
    };
  }
  
  // Start with all active ads
  let results = adsDatabase.filter(ad => 
    ad.status === 'active' || ad.status === undefined
  );
  
  // Apply text search
  results = applyTextSearch(results, params.q);
  
  // Apply filters in order
  results = applyPriceFilter(results, params);
  results = applyLocationFilter(results, params);
  results = applyCategoryFilter(results, params.category);
  results = applyConditionFilter(results, params.condition);
  results = applyTrustFilter(results, params.trust);
  results = applySellerTypeFilter(results, params.seller_type);
  
  // Apply sorting
  results = applySorting(results, params.sort, !!params.q);
  
  // Get total before pagination
  const totalResults = results.length;
  
  // Apply pagination
  const { results: paginatedResults, pagination } = applyPagination(
    results, params.page, params.limit
  );
  
  // Format results for response
  const formattedResults = paginatedResults.map(ad => formatAdForResponse(ad));
  
  // Calculate response time
  const responseTimeMs = Date.now() - startTime;
  
  // Build response
  const response = {
    query: params.q || null,
    page: pagination.page,
    limit: pagination.limit,
    total_results: totalResults,
    total_pages: pagination.total_pages,
    has_next: pagination.has_next,
    has_prev: pagination.has_prev,
    filters_applied: getAppliedFilters(params),
    sort: params.sort,
    results: formattedResults,
    response_time_ms: responseTimeMs,
    cached: false
  };
  
  // Cache results for popular searches
  if (totalResults > 0) {
    setCachedResults(cacheKey, response);
  }
  
  // Log search query for analytics
  logSearchQuery({
    query: params.q,
    userId: options.userId,
    filters: getAppliedFilters(params),
    resultsCount: totalResults,
    responseTimeMs,
    source: options.source || 'web'
  });
  
  return response;
}

/**
 * Format an ad object for API response
 * @param {object} ad - Raw ad object
 * @returns {object} - Formatted ad for response
 */
function formatAdForResponse(ad) {
  const location = extractAdLocationParts(ad);
  const displayLocation = [location.locality, location.city, location.country]
    .filter(Boolean)
    .join(', ') || ad.location || null;

  const normalizedPrice = normalizePrice(ad.price);

  return {
    ad_id: ad.id,
    title: ad.title,
    description: ad.description ? ad.description.substring(0, 200) : null,
    price: normalizedPrice,
    currency: ad.currency || 'USD',
    category: ad.category,
    condition: ad.condition,
    location: displayLocation,
    location_locality: location.locality || null,
    location_city: location.city || null,
    location_country: location.country || null,
    target_countries: location.targetCountries,
    global_reach: location.targetCountries.length > 1,
    seller_id: ad.seller_id,
    seller_type: ad.seller_type,
    trust_score: ad.trust_score || 0,
    is_verified: ad.is_verified || false,
    ai_approved: ad.ai_approved || false,
    views: ad.views || 0,
    clicks: ad.clicks || 0,
    media: ad.media || [],
    created_at: ad.created_at,
    // Distance if calculated
    ...(ad._distance !== undefined ? { distance_km: Math.round(ad._distance * 10) / 10 } : {})
  };
}

/**
 * Get the filters that were applied
 * @param {object} params - Validated parameters
 * @returns {object} - Object with applied filters
 */
function getAppliedFilters(params) {
  const filters = {};
  
  if (params.price) filters.price = params.price;
  if (params.min_price !== undefined) filters.min_price = params.min_price;
  if (params.max_price !== undefined) filters.max_price = params.max_price;
  if (params.location) filters.location = params.location;
  if (params.category) filters.category = params.category;
  if (params.condition) filters.condition = params.condition;
  if (params.trust) filters.trust = params.trust;
  if (params.seller_type) filters.seller_type = params.seller_type;
  
  return filters;
}

// ============================================
// SEARCH SUGGESTIONS
// ============================================

/**
 * Get search suggestions based on prefix
 * @param {Array} adsDatabase - The ads database
 * @param {string} prefix - Search prefix
 * @param {number} limit - Max suggestions to return
 * @returns {Array} - Suggestion strings
 */
function getSearchSuggestions(adsDatabase, prefix, limit = 10) {
  if (!prefix || prefix.length < 2) return [];
  
  const normalizedPrefix = normalizeQuery(prefix);
  const suggestions = new Set();
  
  // Get suggestions from ad titles
  adsDatabase.forEach(ad => {
    if (ad.title && ad.title.toLowerCase().includes(normalizedPrefix)) {
      // Extract relevant words from title
      const words = ad.title.split(/\s+/);
      words.forEach(word => {
        if (word.toLowerCase().startsWith(normalizedPrefix)) {
          suggestions.add(word.toLowerCase());
        }
      });
      
      // Also add full title if it matches
      if (ad.title.toLowerCase().startsWith(normalizedPrefix)) {
        suggestions.add(ad.title);
      }
    }
  });
  
  // Get suggestions from categories
  VALID_CATEGORIES.forEach(cat => {
    if (cat.includes(normalizedPrefix)) {
      suggestions.add(cat);
    }
  });
  
  return Array.from(suggestions).slice(0, limit);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Main search function
  performSearch,
  
  // Utility functions
  validateSearchParams,
  normalizeQuery,
  calculateHaversineDistance,
  
  // Filter functions (for testing/advanced usage)
  applyTextSearch,
  applyPriceFilter,
  applyLocationFilter,
  applyCategoryFilter,
  applyConditionFilter,
  applyTrustFilter,
  applySellerTypeFilter,
  applySorting,
  applyPagination,
  
  // Analytics
  logSearchQuery,
  getTrendingSearches,
  getSearchSuggestions,
  
  // Cache
  getCachedResults,
  setCachedResults,
  
  // Constants (for documentation/validation)
  VALID_CATEGORIES,
  VALID_SORT_OPTIONS,
  PRICE_RANGES,
  LOCATION_FILTERS,
  VALID_CONDITIONS,
  TRUST_FILTERS,
  VALID_SELLER_TYPES,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT
};
