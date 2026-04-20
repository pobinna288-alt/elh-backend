# El Hannora Search API Documentation

> **Version:** 1.0  
> **Base URL:** `/search`  
> **Last Updated:** March 2026

## Overview

The El Hannora Search API provides intelligent, high-performance search capabilities for discovering ads across the platform. Designed to handle millions of ads with sub-100ms response times.

### Key Features

- **Full-text search** - Search across title, description, and category
- **Fuzzy matching** - Typo tolerance for better user experience
- **Smart relevance scoring** - Results ranked by multiple factors
- **Autocomplete** - Real-time suggestions as users type
- **Trending searches** - Popular search terms analytics
- **Redis caching** - Sub-100ms response times
- **Advanced filtering** - Category, price, location, media type

---

## Endpoints

### 1. Search Ads

```
GET /search
```

Main search endpoint for discovering ads.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | - | Search query (1-200 chars) |
| `category` | enum | ❌ | - | Filter by single category |
| `categories` | array | ❌ | - | Filter by multiple categories |
| `minPrice` | number | ❌ | 0 | Minimum price filter |
| `maxPrice` | number | ❌ | - | Maximum price filter |
| `location` | string | ❌ | - | Location filter (partial match) |
| `sortBy` | enum | ❌ | `relevance` | Sort order |
| `page` | number | ❌ | 1 | Page number (1-based) |
| `limit` | number | ❌ | 20 | Results per page (max 100) |
| `cursor` | string | ❌ | - | Pagination cursor |
| `boostPremium` | boolean | ❌ | true | Boost premium ads |
| `hasImage` | boolean | ❌ | false | Only ads with images |
| `isVideoAd` | boolean | ❌ | false | Only video ads |
| `fuzzyMatch` | boolean | ❌ | true | Enable typo tolerance |

#### Sort Options

| Value | Description |
|-------|-------------|
| `relevance` | Best match (default) |
| `newest` | Most recent first |
| `oldest` | Oldest first |
| `price_low` | Lowest price first |
| `price_high` | Highest price first |
| `popularity` | Most viewed/liked |
| `trending` | Recent engagement |

#### Categories

```
Clothes, Tech, Health, Jobs, Services, Electronics, Education,
Sports, Beauty, Automobile, Food, Travel, Real Estate/Property,
Pet and Animal, Entertainment and Event, Home and Garden,
Beauty and Personal Care, Kid and Baby, Art and Craft,
Travel and Tourism Service, Finance and Insurance,
Book and Stationery, Music and Instrument,
Sport Equipment and Outdoor, Community and Local Service
```

#### Example Request

```bash
GET /search?query=macbook&category=Tech&minPrice=500&maxPrice=2000&sortBy=relevance&limit=10
```

#### Example Response

```json
{
  "success": true,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "MacBook Pro M3 - 16GB/512GB",
      "description": "Brand new MacBook Pro with M3 chip. Perfect for professionals and developers...",
      "category": "Tech",
      "price": 1899,
      "currency": "USD",
      "location": "San Francisco, CA",
      "mediaUrls": ["https://cdn.elhannora.com/ads/img1.jpg"],
      "thumbnailUrl": "https://cdn.elhannora.com/ads/thumb1.jpg",
      "views": 1250,
      "likes": 89,
      "isPremium": true,
      "isFeatured": false,
      "isVideoAd": false,
      "authorId": "user-uuid",
      "createdAt": "2026-03-01T10:30:00.000Z",
      "relevanceScore": 0.95,
      "highlightedTitle": "<mark>MacBook</mark> Pro M3 - 16GB/512GB",
      "highlightedDescription": "Brand new <mark>MacBook</mark> Pro with M3 chip..."
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16,
  "hasMore": true,
  "nextCursor": "eyJ0aW1lc3RhbXAiOiIyMDI2LTAzLTAxVDEwOjMwOjAwLjAwMFoiLCJpZCI6IjU1MGU4NDAw...",
  "executionTimeMs": 45,
  "appliedFilters": {
    "category": "Tech",
    "minPrice": 500,
    "maxPrice": 2000,
    "sortBy": "relevance"
  }
}
```

---

### 2. Personalized Search

```
GET /search/personalized
```

Search with user-specific personalization. **Requires authentication.**

#### Headers

```
Authorization: Bearer <access_token>
```

#### Query Parameters

Same as main search endpoint.

---

### 3. Autocomplete Suggestions

```
GET /search/suggestions
```

Get real-time autocomplete suggestions as users type.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | - | Partial search query (min 2 chars) |
| `limit` | number | ❌ | 10 | Max suggestions (max 20) |
| `category` | enum | ❌ | - | Filter by category |

#### Example Request

```bash
GET /search/suggestions?query=mac&limit=5
```

#### Example Response

```json
{
  "success": true,
  "suggestions": [
    "MacBook Pro M3",
    "MacBook Air",
    "Mac Mini M2",
    "Macrame Wall Hanging",
    "Mac Makeup Set"
  ],
  "categorySuggestions": [
    {
      "category": "Tech",
      "suggestions": ["MacBook Pro M3", "MacBook Air", "Mac Mini M2"]
    },
    {
      "category": "Art and Craft",
      "suggestions": ["Macrame Wall Hanging"]
    }
  ],
  "executionTimeMs": 12
}
```

---

### 4. Trending Searches

```
GET /search/trending
```

Get popular search terms.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | ❌ | 10 | Number of results (max 50) |
| `timeWindowHours` | number | ❌ | 24 | Time window (max 168 hours) |

#### Example Response

```json
{
  "success": true,
  "trending": [
    { "term": "iphone 15", "count": 15420, "trend": "rising" },
    { "term": "macbook", "count": 12800, "trend": "stable" },
    { "term": "samsung galaxy", "count": 9650, "trend": "rising" },
    { "term": "laptop gaming", "count": 8200, "trend": "stable" },
    { "term": "apartment rent", "count": 7100, "trend": "falling" }
  ],
  "timeWindowHours": 24,
  "executionTimeMs": 8
}
```

---

### 5. Quick Search

```
GET /search/quick
```

Simplified endpoint for basic searches.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ | Search query |
| `limit` | number | ❌ | Max results (default: 10) |

#### Example

```bash
GET /search/quick?q=iphone&limit=5
```

---

### 6. Track Click

```
POST /search/click
```

Track when users click on search results (for improving search quality).

#### Request Body

```json
{
  "query": "macbook pro",
  "adId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response

```json
{
  "success": true
}
```

---

### 7. Get Filter Options

```
GET /search/filters
```

Get available filter options for the search UI.

#### Response

```json
{
  "categories": [
    "Clothes", "Tech", "Health", "Jobs", "Services", ...
  ],
  "sortOptions": [
    "relevance", "newest", "oldest", "price_low", "price_high", "popularity", "trending"
  ],
  "priceRanges": [
    { "label": "Under $25", "min": 0, "max": 25 },
    { "label": "$25 - $50", "min": 25, "max": 50 },
    { "label": "$50 - $100", "min": 50, "max": 100 },
    { "label": "$100 - $500", "min": 100, "max": 500 },
    { "label": "$500 - $1000", "min": 500, "max": 1000 },
    { "label": "$1000+", "min": 1000, "max": null }
  ]
}
```

---

### 8. Health Check

```
GET /search/health
```

Check if search service is operational.

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2026-03-05T14:30:00.000Z"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Search query must be at least 1 character",
  "error": "Bad Request"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Performance Guidelines

### Response Times

| Operation | Target | Max |
|-----------|--------|-----|
| Search (cached) | <20ms | 50ms |
| Search (uncached) | <100ms | 200ms |
| Suggestions | <30ms | 100ms |
| Trending | <10ms | 50ms |

### Best Practices

1. **Debounce autocomplete** - Wait 150-300ms between keystrokes
2. **Use pagination** - Don't request more than 20-50 results
3. **Cache on client** - Cache filter options and trending searches
4. **Use cursor pagination** - For infinite scroll UIs

### Rate Limits

- 100 requests/minute per IP
- 500 requests/minute for authenticated users

---

## Frontend Integration Examples

### React Search Component

```tsx
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const fetchSuggestions = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) return;
      const res = await fetch(`/search/suggestions?query=${q}`);
      const data = await res.json();
      setSuggestions(data.suggestions);
    }, 200),
    []
  );

  const handleSearch = async () => {
    const res = await fetch(`/search?query=${query}&limit=20`);
    const data = await res.json();
    // Handle results
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      {/* Render suggestions dropdown */}
    </div>
  );
};
```

---

## Database Indexes

For optimal performance, ensure the following indexes are created:

```sql
-- Full-text search
CREATE INDEX idx_ads_search_vector ON ads USING GIN (search_vector);

-- Fuzzy matching
CREATE INDEX idx_ads_title_trgm ON ads USING GIN (title gin_trgm_ops);
CREATE INDEX idx_ads_description_trgm ON ads USING GIN (description gin_trgm_ops);

-- Filters
CREATE INDEX idx_ads_category ON ads (category);
CREATE INDEX idx_ads_price ON ads (price);
CREATE INDEX idx_ads_active ON ads (is_active) WHERE is_active = true;

-- Sorting
CREATE INDEX idx_ads_created_at ON ads (created_at DESC);
CREATE INDEX idx_ads_views ON ads (views DESC);
```

See `database/indexes/search-indexes.sql` for the complete migration.

---

## Changelog

### v1.0 (March 2026)
- Initial release
- Full-text search with fuzzy matching
- Autocomplete suggestions
- Trending searches
- Redis caching
- Advanced filtering and sorting
