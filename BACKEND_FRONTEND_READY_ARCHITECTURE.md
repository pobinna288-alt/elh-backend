# Backend Frontend-Ready Architecture Plan

## 1. Final Backend Architecture Design

### Recommended runtime
Use the **NestJS `src/` backend as the primary production runtime**.

- `src/` = production API, business logic, auth, payments, caching, queues, analytics
- `backend/` = legacy/transition layer for existing JS services
- Keep business logic centralized in service classes and expose only frontend-safe DTOs

### Domain layout
- **Core platform**: `auth`, `users`, `wallet`, `payments`, `premium`
- **Marketplace**: `ads`, `search`, `ad-watch`, `comments`, `reviews`, `social`
- **Growth & automation**: `analytics`, `alerts`, `referral`, `streak`, `notifications`
- **AI layer**: `ai-tools`, `negotiation-ai`, `deal-broker`, `ad-suggestion`
- **Infrastructure**: `common/caching`, `common/performance`, `common/security`, `common/queue`

### Backend rule
> Frontend should consume DTO-shaped responses only; it must never calculate pricing, premium status, upload permissions, fraud decisions, or analytics summaries itself.

---

## 2. Optimized Folder Structure

```text
src/
├── common/
│   ├── caching/
│   ├── dto/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── performance/
│   ├── queue/
│   └── security/
├── config/
├── modules/
│   ├── ads/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── ads.controller.ts
│   │   ├── ads.service.ts
│   │   └── media.service.ts
│   ├── analytics/
│   ├── auth/
│   ├── payments/
│   ├── premium/
│   ├── users/
│   ├── ai-tools/
│   ├── negotiation-ai/
│   ├── deal-broker/
│   └── search/
└── main.ts
```

### Placement rules for new code
- **Controllers**: request/response only
- **Services**: business logic only
- **DTOs**: validation + API contracts
- **Entities**: persistence shape only
- **Common/**: shared infra, not business rules
- **AI services**: isolated in `modules/ai-tools/` and related AI modules

---

## 3. API Endpoint Design (clean and frontend-ready)

### Ads
- `POST /api/v1/ads/create` → create ad
- `GET /api/v1/ads?page=1&limit=20&category=&search=&sortBy=` → paginated listing
- `GET /api/v1/ads/trending?limit=10` → lightweight discovery feed
- `GET /api/v1/ads/:id` → ad detail
- `GET /api/v1/ads/my-ads?page=1&limit=20` → authenticated seller inventory
- `PATCH /api/v1/ads/:id` → update seller ad
- `DELETE /api/v1/ads/:id` → remove seller ad

### Campaign / optimization
- `POST /api/v1/campaigns/optimize-budget`
- `POST /api/v1/ads/:id/recommendations`
- `POST /api/v1/ads/:id/improve-copy`
- `POST /api/v1/ads/:id/fraud-check`

### Reporting / analytics
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/ads/:id`
- `GET /api/v1/analytics/campaigns/:id`

### Payments / subscriptions
- `POST /api/v1/payments/initialize`
- `POST /api/v1/payments/verify`
- `POST /api/v1/premium/unlock`
- `GET /api/v1/wallet/balance`

---

## 4. Performance Improvements Made

These code-level improvements were applied in the repo:

1. **Safer pagination and query validation**
   - strengthened `src/common/dto/pagination.dto.ts`
   - prevents oversized list requests and normalizes paging

2. **Frontend-ready ad listing responses**
   - upgraded `FilterAdsDto`
   - paginated ad read paths in `src/modules/ads/ads.service.ts`

3. **More efficient ad queries**
   - ad listing now uses a query builder with targeted author field selection
   - better search/filter composition for category, price, location, and text search

4. **Cache safety improvement**
   - `HttpCacheInterceptor` now scopes cache keys by authenticated user where needed
   - avoids cross-user cache leakage on authenticated GET endpoints

5. **Real cache invalidation support**
   - `CachingService.deletePattern()` now actually removes tracked matching keys
   - write operations can invalidate stale read caches

6. **Compile-path improvement for media processing**
   - enterprise/no-compression video path is now handled safely in `media.service.ts`

---

## 5. Database Design Improvements

### Implemented
- Added read-heavy indexes to `ads` entity:
  - `(isActive, createdAt)`
  - `(category, isActive, createdAt)`
  - `(authorId, createdAt)`
  - `(status, views)`

### Recommended next migrations
- add composite index for analytics rollups by `(authorId, createdAt)`
- add partial indexes for active campaigns only
- move expensive reporting to pre-aggregated tables/materialized views if growth spikes

---

## 6. Why This Design Is Scalable

- **Modular domains** keep business logic separated and easier to deploy/refactor
- **Pagination by default** prevents heavy list endpoints from flooding the DB
- **User-safe caching** improves read speed without leaking data
- **Cache invalidation hooks** keep frontend responses fresh after writes
- **Indexed ad queries** reduce lookup cost for the most common filters
- **AI isolation** keeps recommendation and optimization logic from bloating core CRUD paths
- **Background-ready structure** supports queues for fraud scans, analytics aggregation, email, and AI jobs

---

## 7. Risks or Trade-offs

- More caching adds invalidation responsibility
- Extra indexes improve reads but slightly increase write cost
- Dual-stack (`src/` and `backend/`) still adds maintenance overhead until legacy JS paths are fully retired
- Full production hardening still needs:
  - migrations for new indexes
  - queue-backed heavy AI/fraud jobs
  - final load testing
  - the existing unrelated TypeScript build blockers outside these changes to be cleared

---

## Recommended Next Step

Before frontend integration, continue from this base by:
1. treating `src/` as the single source of truth
2. moving remaining legacy AI services behind NestJS modules
3. pushing heavy fraud/AI/reporting tasks onto background workers
4. exposing only paginated, DTO-shaped endpoints to the frontend
