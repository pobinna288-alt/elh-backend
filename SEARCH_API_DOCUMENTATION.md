# El Hannora - Search and Filtering API Documentation

> **Last Updated:** March 2026  
> **Version:** 2.0.0

## Overview

The Search and Filtering API for El Hannora advertising platform enables users to search ads and apply multiple filters simultaneously to discover relevant ads quickly. The system is designed to be fast, scalable, secure, and capable of handling millions of ads.

## Core Features

- **Full-text search** across title, description, and category
- **Advanced filtering** by price, location, condition, trust score, and seller type
- **Multiple sort options** (newest, oldest, price, popularity, trust)
- **Pagination** with configurable limits
- **Search analytics** for trending searches
- **Caching** for popular searches (5-minute TTL)
- **Rate limiting** for security
- **Input validation** and SQL injection protection

---

## API Endpoints

### 1. Main Search Endpoint

```
GET /api/search
```

#### Query Parameters

| Parameter | Type | Required | Default | Options | Description |
|-----------|------|----------|---------|---------|-------------|
| `q` | string | No | - | - | Search keyword (searches title, description, category) |
| `sort` | string | No | `newest` | `newest`, `oldest`, `most_popular`, `most_viewed`, `highest_trust`, `lowest_price`, `highest_price` | Sort order |
| `price` | string | No | - | `under_50`, `50_200`, `200_500`, `over_500`, `custom` | Price range preset |
| `min_price` | number | No | - | - | Minimum price (for custom range) |
| `max_price` | number | No | - | - | Maximum price (for custom range) |
| `location` | string | No | - | `near_me`, `same_city`, `country`, `worldwide` | Location filter |
| `user_lat` | number | No | - | - | User latitude (required for `near_me`) |
| `user_lng` | number | No | - | - | User longitude (required for `near_me`) |
| `user_city` | string | No | - | - | User city (required for `same_city`) |
| `user_country` | string | No | - | - | User country (required for `country` filter) |
| `category` | string | No | - | `electronics`, `fashion`, `vehicles`, `jobs`, `services`, `real_estate`, `education` | Category filter |
| `condition` | string | No | - | `new`, `used`, `refurbished` | Item condition filter |
| `trust` | string | No | `any` | `any`, `highest`, `verified`, `ai_approved` | Trust/verification filter |
| `seller_type` | string | No | - | `individual`, `business`, `verified_business` | Seller type filter |
| `page` | integer | No | `1` | - | Page number |
| `limit` | integer | No | `20` | 1-100 | Results per page |

#### Example Request

```
GET /api/search?q=iphone&sort=newest&price=50_200&location=near_me&category=electronics&page=1&limit=20
```

#### Example Response

```json
{
  "success": true,
  "query": "iphone",
  "page": 1,
  "limit": 20,
  "total_results": 428,
  "total_pages": 22,
  "has_next": true,
  "has_prev": false,
  "filters_applied": {
    "price": "50_200",
    "location": "near_me",
    "category": "electronics"
  },
  "sort": "newest",
  "results": [
    {
      "ad_id": "ad_39291",
      "title": "iPhone 15 Pro Max",
      "description": "Brand new sealed iPhone 15 Pro Max with Apple warranty...",
      "price": 1200,
      "currency": "USD",
      "category": "electronics",
      "condition": "new",
      "location": "Texas, USA",
      "location_city": "Houston",
      "location_country": "USA",
      "seller_id": "user_12345",
      "seller_type": "verified_business",
      "trust_score": 92,
      "is_verified": true,
      "ai_approved": true,
      "views": 4300,
      "clicks": 890,
      "media": [],
      "created_at": "2026-03-03T10:30:00Z"
    }
  ],
  "response_time_ms": 45,
  "cached": false
}
```

---

### 2. Search Suggestions (Autocomplete)

```
GET /api/search/suggestions
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search prefix (min 2 characters) |
| `limit` | integer | No | `10` | Max suggestions (max 20) |

#### Example Request

```
GET /api/search/suggestions?q=iph&limit=5
```

#### Example Response

```json
{
  "success": true,
  "query": "iph",
  "suggestions": [
    "iphone",
    "iphone 15",
    "iphone pro",
    "iphone case",
    "iphone charger"
  ]
}
```

---

### 3. Trending Searches

```
GET /api/search/trending
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | `10` | Max results (max 50) |
| `hours` | integer | No | `24` | Hours to look back (max 168) |

#### Example Response

```json
{
  "success": true,
  "period_hours": 24,
  "trending": [
    { "query": "iphone", "count": 1250 },
    { "query": "car", "count": 890 },
    { "query": "laptop", "count": 756 },
    { "query": "apartment", "count": 543 },
    { "query": "ps5", "count": 421 }
  ]
}
```

---

### 4. Available Categories

```
GET /api/search/categories
```

#### Example Response

```json
{
  "success": true,
  "categories": [
    { "id": "electronics", "name": "Electronics", "slug": "electronics" },
    { "id": "fashion", "name": "Fashion", "slug": "fashion" },
    { "id": "vehicles", "name": "Vehicles", "slug": "vehicles" },
    { "id": "jobs", "name": "Jobs", "slug": "jobs" },
    { "id": "services", "name": "Services", "slug": "services" },
    { "id": "real_estate", "name": "Real estate", "slug": "real_estate" },
    { "id": "education", "name": "Education", "slug": "education" }
  ]
}
```

---

### 5. All Filter Options

```
GET /api/search/filters
```

Returns complete documentation of all available filter options with descriptions.

---

### 6. API Documentation

```
GET /api/search/docs
```

Returns complete API documentation in JSON format.

---

## Filter Logic Details

### Price Filter Logic

| Value | Condition |
|-------|-----------|
| `under_50` | `price < 50` |
| `50_200` | `price BETWEEN 50 AND 200` |
| `200_500` | `price BETWEEN 200 AND 500` |
| `over_500` | `price > 500` |
| `custom` | `price BETWEEN min_price AND max_price` |

### Location Filter Logic

| Value | Condition |
|-------|-----------|
| `near_me` | Distance < 50km (Haversine formula) |
| `same_city` | `location_city = user_city` |
| `country` | `location_country = user_country` |
| `worldwide` | No restriction |

### Trust Filter Logic

| Value | Condition |
|-------|-----------|
| `any` | No restriction |
| `highest` | `trust_score > 80` |
| `verified` | `is_verified = true` |
| `ai_approved` | `ai_approved = true` |

### Sorting Logic

| Value | SQL Equivalent |
|-------|---------------|
| `newest` | `ORDER BY created_at DESC` |
| `oldest` | `ORDER BY created_at ASC` |
| `lowest_price` | `ORDER BY price ASC` |
| `highest_price` | `ORDER BY price DESC` |
| `most_popular` | `ORDER BY clicks DESC` |
| `most_viewed` | `ORDER BY views DESC` |
| `highest_trust` | `ORDER BY trust_score DESC` |

---

## Database Schema

### Ads Table

```sql
CREATE TABLE ads (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    condition VARCHAR(20) CHECK (condition IN ('new', 'used', 'refurbished')),
    seller_id UUID NOT NULL,
    seller_type VARCHAR(30) CHECK (seller_type IN ('individual', 'business', 'verified_business')),
    trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
    is_verified BOOLEAN DEFAULT FALSE,
    ai_approved BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    search_vector tsvector,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Search Logs Table

```sql
CREATE TABLE search_logs (
    id UUID PRIMARY KEY,
    query VARCHAR(500),
    user_id UUID,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    source VARCHAR(50) DEFAULT 'web',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Performance Indexes

### Primary Indexes

```sql
-- Full-text search index
CREATE INDEX ads_search_idx ON ads 
USING GIN(to_tsvector('english', title || ' ' || description || ' ' || category));

-- Primary filter indexes
CREATE INDEX ads_price_idx ON ads(price);
CREATE INDEX ads_created_idx ON ads(created_at DESC);
CREATE INDEX ads_category_idx ON ads(category);
CREATE INDEX ads_trust_score_idx ON ads(trust_score DESC);
CREATE INDEX ads_location_country_idx ON ads(location_country);
CREATE INDEX ads_location_city_idx ON ads(location_city);
CREATE INDEX ads_condition_idx ON ads(condition);
CREATE INDEX ads_seller_type_idx ON ads(seller_type);
```

### Composite Indexes

```sql
-- Common query combinations
CREATE INDEX ads_category_price_idx ON ads(category, price) WHERE status = 'active';
CREATE INDEX ads_category_created_idx ON ads(category, created_at DESC) WHERE status = 'active';
CREATE INDEX ads_trust_created_idx ON ads(trust_score DESC, created_at DESC) WHERE status = 'active';
```

---

## Caching Strategy

- **Cache TTL:** 5 minutes
- **Cache Key:** SHA256 hash of query parameters
- **Popular Searches:** Automatically cached based on frequency
- **Cache Invalidation:** On ad create/update/delete

Example cached searches:
- `iphone`
- `car`
- `laptop`
- `apartment`

---

## Security Features

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/search` | 100 requests/minute |
| `/api/search/suggestions` | 200 requests/minute |

### Input Validation

- Query length: max 200 characters
- SQL injection patterns removed
- Special characters sanitized
- Numeric parameters validated

### Security Headers

- CORS configured for allowed origins
- JWT authentication (optional)
- Request logging for audit

---

## Error Responses

### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Too many search requests. Please try again later.",
  "retry_after_seconds": 60
}
```

### Invalid Parameters

```json
{
  "success": false,
  "error": "Invalid category specified",
  "valid_options": ["electronics", "fashion", "vehicles", ...]
}
```

### Server Error

```json
{
  "success": false,
  "error": "An error occurred while searching. Please try again."
}
```

---

## Future Upgrades (AI Search)

In future versions, the search API will integrate:

- **Semantic Search:** Understanding user intent
- **Vector Embeddings:** Deep learning-based similarity
- **AI Intent Matching:** Query expansion

Example:
- User searches: `cheap laptop`
- System returns: `budget laptop`, `refurbished laptop`, `student laptop`

Similar to intelligent search used by Google and Amazon.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                            │
│   GET /api/search?q=iphone&category=electronics&sort=newest     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        RATE LIMITER                              │
│                    100 requests/min/IP                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INPUT SANITIZER                              │
│              • SQL injection prevention                          │
│              • Parameter validation                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CACHE CHECK                                 │
│              • Redis/In-memory cache                             │
│              • 5-minute TTL                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ Cache HIT?                   │
              └──────────────┬──────────────┘
            YES              │              NO
              │              │              │
              ▼              │              ▼
┌─────────────────┐          │    ┌─────────────────────────────┐
│ Return Cached   │          │    │    SEARCH SERVICE           │
│ Results         │          │    │                             │
└─────────────────┘          │    │ 1. Full-text search         │
                             │    │ 2. Apply filters:           │
                             │    │    • Price range            │
                             │    │    • Location (Haversine)   │
                             │    │    • Category               │
                             │    │    • Condition              │
                             │    │    • Trust score            │
                             │    │    • Seller type            │
                             │    │ 3. Apply sorting            │
                             │    │ 4. Paginate results         │
                             │    │ 5. Cache results            │
                             │    │ 6. Log analytics            │
                             │    └──────────────┬──────────────┘
                             │                   │
                             └───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       JSON RESPONSE                              │
│  { success, query, page, total_results, results: [...] }        │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
backend/
├── routes/
│   └── searchRoutes.js      # API endpoints
├── services/
│   └── searchService.js     # Search logic
database/
├── schema/
│   ├── ads.sql              # Ads table schema
│   └── search-logs.sql      # Search analytics schema
├── indexes/
│   └── search-indexes.sql   # Performance indexes
```

---

## Quick Start

```bash
# Start the server
node server.js

# Test search endpoint
curl "http://localhost:5000/api/search?q=iphone&category=electronics"

# Get filter options
curl "http://localhost:5000/api/search/filters"

# Get trending searches
curl "http://localhost:5000/api/search/trending"
```

---

✅ **This search API ensures:**
- Fast search (< 100ms response time)
- Advanced filtering with multiple options
- AI trust filtering for verified content
- Marketplace-level scalability
- Comprehensive analytics for business insights
