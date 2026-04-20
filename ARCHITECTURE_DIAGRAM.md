# EL HANNORA Backend Architecture - Complete System Overview

> **Last Updated:** March 2026  
> **Version:** 2.0

```
═══════════════════════════════════════════════════════════════════════════════
                              SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND CLIENTS                                  │
│                                                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   Login    │  │  Profile   │  │    Ads     │  │  Messages  │              │
│  │   Page     │  │   Page     │  │   Page     │  │   Page     │              │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘              │
│        │               │               │               │                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   Coins    │  │  Premium   │  │   AI      │  │  Payment   │              │
│  │   Page     │  │   Page     │  │  Tools     │  │   Page     │              │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘              │
│        │               │               │               │                       │
│        └───────────────┴───────────────┴───────────────┘                      │
│                                │                                               │
│                    All requests include JWT token                              │
│                    (Authorization: Bearer <token>)                             │
└────────────────────────────────┼───────────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / LOAD BALANCER                            │
│                              (Nginx / Docker)                                  │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MAIN SERVER    │    │  EXPRESS SERVER │    │ PAYSTACK SERVER │
│  (server.js)    │    │  (express-server)│   │ (Payment API)   │
│   Port 5000     │    │    Port 5000    │    │   Port 3000     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVICES LAYER                                  │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         CORE API ENDPOINTS                               │ │
│  │                                                                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │   /auth     │ │   /user     │ │  /premium   │ │   /coins    │       │ │
│  │  │  /signup    │ │  /profile   │ │  /unlock    │ │  /balance   │       │ │
│  │  │  /login     │ │ PUT /profile│ │  /status    │ │  /earn      │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  │                                                                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │   /ads      │ │ /messages   │ │/notifications│ │  /streak    │       │ │
│  │  │  /create    │ │  /send      │ │  GET list   │ │  /claim     │       │ │
│  │  │  /list      │ │ /conversations│ PUT /read   │ │  /status    │       │ │
│  │  │  /:id       │ │  /:userId   │ │             │ │             │       │ │
│  │  │  DELETE     │ │             │ │             │ │             │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  │                                                                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │  /comments  │ │  /reviews   │ │  /referral  │ │  /social    │       │ │
│  │  │  /create    │ │  /create    │ │  /generate  │ │  /follow    │       │ │
│  │  │  /:adId     │ │  /:adId     │ │  /redeem    │ │  /unfollow  │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         AI SERVICES (OpenAI)                             │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │ │
│  │  │  Ad Improvement  │  │  Ad Targeting    │  │ Enterprise Ad    │      │ │
│  │  │    Service       │  │    Service       │  │    Doctor        │      │ │
│  │  │                  │  │                  │  │                  │      │ │
│  │  │ • Issue detect   │  │ • Audience match │  │ • Full diagnosis │      │ │
│  │  │ • Recommendations│  │ • Targeting tips │  │ • Global insights│      │ │
│  │  │ • Multi-tone     │  │ • Market analysis│  │ • Strategic plan │      │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘      │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │ │
│  │  │  AI Copywriter   │  │  Competitor AI   │  │  Negotiation AI  │      │ │
│  │  │                  │  │                  │  │                  │      │ │
│  │  │ • Ad copy gen    │  │ • Market research│  │ • Deal assistance│      │ │
│  │  │ • Headlines      │  │ • Price analysis │  │ • Offer helper   │      │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘      │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │ │
│  │  │  Audience AI     │  │ Enterprise Auto  │  │   AI GUARDIAN    │      │ │
│  │  │                  │  │    Post Service  │  │  (Create Flow)   │      │ │
│  │  │ • Target audience│  │ • Scheduled posts│  │                  │      │ │
│  │  │ • Demographics   │  │ • Auto-optimize  │  │ • Risk intel     │      │ │
│  │  └──────────────────┘  └──────────────────┘  │ • Market demand  │      │ │
│  │                                               │ • Budget protect │      │ │
│  │                                               │ • Timing analysis│      │ │
│  │                                               │ • Audience match │      │ │
│  │                                               │ [Pro/Hot/Ent]    │      │ │
│  │                                               └──────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       FRAUD DETECTION SYSTEM                             │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │ │
│  │  │  Fraud Scoring   │  │  Fraud Events    │  │  Fraud Decision  │      │ │
│  │  │    Service       │  │    Service       │  │    Service       │      │ │
│  │  │                  │  │                  │  │                  │      │ │
│  │  │ • Risk scoring   │  │ • Event logging  │  │ • Auto-decisions │      │ │
│  │  │ • Pattern detect │  │ • Real-time track│  │ • Manual review  │      │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘      │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                             │ │
│  │  │ Marketplace Fraud│  │   Fraud Admin    │                             │ │
│  │  │    Detection     │  │   Controller     │                             │ │
│  │  │                  │  │                  │                             │ │
│  │  │ • Transaction    │  │ • Review queue   │                             │ │
│  │  │   monitoring     │  │ • Stats & reports│                             │ │
│  │  └──────────────────┘  └──────────────────┘                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      ATTENTION SCORE SYSTEM                              │ │
│  │                                                                           │ │
│  │  Measures user engagement with ads based on behavioral signals.          │ │
│  │  Formula: score = (seen×1) + (scroll_stop×3) + (repeated_view×5)        │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │ │
│  │  │   Event Types    │  │  Score Service   │  │    Analytics     │      │ │
│  │  │                  │  │                  │  │                  │      │ │
│  │  │ • ad_seen (×1)   │  │ • Log events     │  │ • Leaderboard    │      │ │
│  │  │ • scroll_stop(×3)│  │ • Calculate score│  │ • Seller stats   │      │ │
│  │  │ • repeated_view  │  │ • Spam prevention│  │ • Score breakdown│      │ │
│  │  │   (×5)           │  │ • Real-time      │  │ • Engagement rate│      │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘      │ │
│  │                                                                           │ │
│  │  Spam Prevention Rules:                                                   │ │
│  │  • Only 1 ad_seen per session per ad                                     │ │
│  │  • Only 1 scroll_stop per session per ad                                 │ │
│  │  • repeated_view requires different session                              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       PAYMENT PROCESSING                                 │ │
│  │                                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │ │
│  │  │    Paystack      │  │  Wallet Service  │  │   Transaction    │      │ │
│  │  │   Integration    │  │                  │  │    Logging       │      │ │
│  │  │                  │  │                  │  │                  │      │ │
│  │  │ • Verify payment │  │ • Coin balance   │  │ • Audit trail    │      │ │
│  │  │ • Webhook handle │  │ • Add/deduct     │  │ • History        │      │ │
│  │  │ • Status update  │  │ • Validation     │  │ • Reports        │      │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘

                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           MIDDLEWARE PIPELINE                                  │
│                                                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   CORS     │  │    JWT     │  │   Rate     │  │   Input    │              │
│  │  Handler   │  │  Validator │  │  Limiter   │  │ Validation │              │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘              │
│        │               │               │               │                       │
│        └───────────────┴───────────────┴───────────────┘                      │
│                                │                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      JWT AUTHENTICATION                                 │  │
│  │  • Validate access token    • Extract user ID from payload             │  │
│  │  • Check token expiration   • Reject invalid/expired tokens            │  │
│  │  • Verify signature         • Support refresh token flow               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    TIER-BASED ACCESS CONTROL                            │  │
│  │                                                                          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │  NORMAL  │ │ PREMIUM  │ │   PRO    │ │   HOT    │ │ENTERPRISE│     │  │
│  │  │   Free   │ │ 15K coins│ │   $200   │ │   $400   │ │ Custom   │     │  │
│  │  │          │ │ /month   │ │  /month  │ │  /month  │ │          │     │  │
│  │  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤     │  │
│  │  │Video: 2m │ │Video: 3m │ │Video: 5m │ │Video:10m │ │Unlimited │     │  │
│  │  │Size: 20MB│ │Size: 40MB│ │Size: 80MB│ │Size:100MB│ │Custom    │     │  │
│  │  │Reach: 4K │ │Reach: 10K│ │Reach:500K│ │Reach: 1M │ │Custom    │     │  │
│  │  │AI: None  │ │AI: 3tools│ │AI: 5tools│ │AI: 5tools│ │AI: Full  │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘

                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE LAYER                                    │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        PostgreSQL DATABASE                               │ │
│  │                                                                           │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │ │
│  │  │    users      │  │     ads       │  │ transactions  │                │ │
│  │  │               │  │               │  │               │                │ │
│  │  │ • id (UUID)   │  │ • id (UUID)   │  │ • id (UUID)   │                │ │
│  │  │ • email       │  │ • user_id     │  │ • user_id     │                │ │
│  │  │ • password    │  │ • title       │  │ • amount      │                │ │
│  │  │ • coins       │  │ • description │  │ • type        │                │ │
│  │  │ • tier        │  │ • price       │  │ • status      │                │ │
│  │  │ • premium_exp │  │ • status      │  │ • created_at  │                │ │
│  │  │ • streak_data │  │ • views       │  │               │                │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘                │ │
│  │                                                                           │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │ │
│  │  │   messages    │  │ notifications │  │refresh_tokens │                │ │
│  │  │               │  │               │  │               │                │ │
│  │  │ • id          │  │ • id          │  │ • id          │                │ │
│  │  │ • sender_id   │  │ • user_id     │  │ • user_id     │                │ │
│  │  │ • receiver_id │  │ • type        │  │ • token       │                │ │
│  │  │ • content     │  │ • message     │  │ • expires_at  │                │ │
│  │  │ • read        │  │ • read        │  │               │                │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘                │ │
│  │                                                                           │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │ │
│  │  │    fraud_     │  │  social_      │  │    media      │                │ │
│  │  │    events     │  │  features     │  │   uploads     │                │ │
│  │  │               │  │               │  │               │                │ │
│  │  │ • id          │  │ • followers   │  │ • id          │                │ │
│  │  │ • user_id     │  │ • following   │  │ • user_id     │                │ │
│  │  │ • event_type  │  │ • likes       │  │ • file_path   │                │ │
│  │  │ • risk_score  │  │ • shares      │  │ • file_type   │                │ │
│  │  │ • decision    │  │               │  │ • size        │                │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘                │ │
│  │                                                                           │ │
│  │  ┌───────────────┐  ┌───────────────┐                                   │ │
│  │  │ ad_attention_ │  │ ad_attention_ │   ATTENTION SCORE TABLES          │ │
│  │  │    events     │  │    scores     │                                   │ │
│  │  │               │  │               │                                   │ │
│  │  │ • id          │  │ • ad_id (PK)  │   Score Formula:                  │ │
│  │  │ • ad_id       │  │ • seen_count  │   (seen×1) + (stop×3)            │ │
│  │  │ • user_id     │  │ • scroll_stop │   + (repeat×5)                   │ │
│  │  │ • event_type  │  │   _count      │                                   │ │
│  │  │ • session_id  │  │ • repeated_   │                                   │ │
│  │  │ • created_at  │  │   view_count  │                                   │ │
│  │  │               │  │ • attention_  │                                   │ │
│  │  │               │  │   score       │                                   │ │
│  │  └───────────────┘  └───────────────┘                                   │ │
│  │                                                                           │ │
│  │  INDEXES:                                                                 │ │
│  │  • users_email_idx      • ads_user_id_idx       • fraud_user_score_idx  │ │
│  │  • users_tier_idx       • ads_status_idx        • transactions_user_idx │ │
│  │  • idx_attention_event_ad            • idx_attention_score_value        │ │
│  │                                                                           │ │
│  │  CONSTRAINTS:                                                             │ │
│  │  • coins >= 0 (cannot be negative)                                       │ │
│  │  • email UNIQUE                                                          │ │
│  │  • tier IN ('normal', 'premium', 'pro', 'hot', 'enterprise')           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           REDIS CACHE                                    │ │
│  │  • Session storage         • Rate limit counters                        │ │
│  │  • Fraud detection cache   • AI response caching                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘

                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL INTEGRATIONS                                 │
│                                                                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                   │
│  │    OpenAI      │  │    Paystack    │  │  File Storage  │                   │
│  │    GPT-4       │  │   Payment API  │  │   (uploads/)   │                   │
│  │                │  │                │  │                │                   │
│  │ • Ad analysis  │  │ • Initialize   │  │ • Images       │                   │
│  │ • Copywriting  │  │ • Verify       │  │ • Videos       │                   │
│  │ • Negotiation  │  │ • Webhook      │  │ • Documents    │                   │
│  └────────────────┘  └────────────────┘  └────────────────┘                   │
└───────────────────────────────────────────────────────────────────────────────┘
```


═══════════════════════════════════════════════════════════════════════════════
                              DATA FLOW EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

```
1. USER AUTHENTICATION FLOW
───────────────────────────
Frontend                Backend               Database
   │                       │                     │
   │   POST /auth/login    │                     │
   │   { email, password } │                     │
   │─────────────────────→ │                     │
   │                       │  SELECT * FROM      │
   │                       │  users WHERE email  │
   │                       │────────────────────→│
   │                       │                     │
   │                       │  ← User data        │
   │                       │←────────────────────│
   │                       │                     │
   │                       │  bcrypt.compare()   │
   │                       │  Generate JWT       │
   │                       │  (access + refresh) │
   │                       │                     │
   │   ← { accessToken,    │                     │
   │       refreshToken,   │                     │
   │       user: {...} }   │                     │
   │←─────────────────────│                     │

2. GET USER PROFILE (with Tier Info)
────────────────────────────────────
Frontend                Backend               Database
   │                       │                     │
   │   GET /user/profile   │                     │
   │─────────────────────→ │                     │
   │   + JWT Token         │  Validate token     │
   │                       │  Extract user ID    │
   │                       │                     │
   │                       │  SELECT * FROM      │
   │                       │  users WHERE id=... │
   │                       │────────────────────→│
   │                       │                     │
   │                       │  ← User data        │
   │                       │←────────────────────│
   │                       │                     │
   │                       │  Calculate:         │
   │                       │  • isPremium        │
   │                       │  • tier limits      │
   │                       │  • AI tool access   │
   │                       │                     │
   │   ← { coins, tier,    │                     │
   │       isPremium,      │                     │
   │       streakData,     │                     │
   │       aiToolsAccess } │                     │
   │←─────────────────────│                     │

3. PAYSTACK PAYMENT VERIFICATION
────────────────────────────────
Frontend                Backend               Paystack API          Database
   │                       │                       │                   │
   │   POST /verify-payment│                       │                   │
   │   { reference }       │                       │                   │
   │─────────────────────→ │                       │                   │
   │                       │   GET /verify/:ref    │                   │
   │                       │─────────────────────→ │                   │
   │                       │                       │                   │
   │                       │   ← { status, data }  │                   │
   │                       │←───────────────────── │                   │
   │                       │                       │                   │
   │                       │  IF status == success │                   │
   │                       │                       │                   │
   │                       │  UPDATE users SET     │                   │
   │                       │    tier = 'pro'       │                   │
   │                       │───────────────────────────────────────────→│
   │                       │                       │                   │
   │   ← { success: true,  │                       │                   │
   │       tier: 'pro' }   │                       │                   │
   │←─────────────────────│                       │                   │

4. AI AD IMPROVEMENT (Tier-Gated)
─────────────────────────────────
Frontend                Backend               OpenAI API            Database
   │                       │                       │                   │
   │   POST /ai/improve-ad │                       │                   │
   │   { adId, adContent } │                       │                   │
   │─────────────────────→ │                       │                   │
   │   + JWT Token         │                       │                   │
   │                       │  Check user tier      │                   │
   │                       │────────────────────────────────────────────→
   │                       │                       │                   │
   │                       │  ← tier: 'pro' ✓      │                   │
   │                       │←────────────────────────────────────────────
   │                       │                       │                   │
   │                       │  Check AI quota       │                   │
   │                       │  (tier limits)        │                   │
   │                       │                       │                   │
   │                       │  Call GPT-4           │                   │
   │                       │─────────────────────→ │                   │
   │                       │                       │                   │
   │                       │  ← AI suggestions     │                   │
   │                       │←───────────────────── │                   │
   │                       │                       │                   │
   │   ← { issues: [...],  │                       │                   │
   │       recommendations,│                       │                   │
   │       improvedCopy }  │                       │                   │
   │←─────────────────────│                       │                   │

5. FRAUD DETECTION FLOW
───────────────────────
User Action             Backend               Fraud Service          Database
   │                       │                       │                   │
   │   Any transaction     │                       │                   │
   │─────────────────────→ │                       │                   │
   │                       │  Analyze action       │                   │
   │                       │─────────────────────→ │                   │
   │                       │                       │                   │
   │                       │  Calculate risk score │                   │
   │                       │  Pattern analysis     │                   │
   │                       │  Velocity checks      │                   │
   │                       │                       │                   │
   │                       │  ← risk_score: 0.3    │                   │
   │                       │←───────────────────── │                   │
   │                       │                       │                   │
   │                       │  IF score > threshold │                   │
   │                       │    → Queue for review │                   │
   │                       │    → Possible block   │                   │
   │                       │                       │                   │
   │                       │  Log fraud event      │                   │
   │                       │───────────────────────────────────────────→│
   │                       │                       │                   │

6. STREAK CLAIM FLOW
────────────────────
Frontend                Backend               Database
   │                       │                     │
   │   POST /streak/claim  │                     │
   │─────────────────────→ │                     │
   │   + JWT Token         │  Validate token     │
   │                       │                     │
   │                       │  SELECT streak_data │
   │                       │  FROM users         │
   │                       │────────────────────→│
   │                       │                     │
   │                       │  ← last_claim,      │
   │                       │    current_streak   │
   │                       │←────────────────────│
   │                       │                     │
   │                       │  Calculate reward:  │
   │                       │  Day 1: 10 coins    │
   │                       │  Day 7: 100 coins   │
   │                       │  Day 30: 500 coins  │
   │                       │                     │
   │                       │  UPDATE users SET   │
   │                       │  streak, coins      │
   │                       │────────────────────→│
   │                       │                     │
   │   ← { success: true,  │                     │
   │       coinsEarned,    │                     │
   │       currentStreak } │                     │
   │←─────────────────────│                     │

7. AI GUARDIAN FLOW (Create Ad)
───────────────────────────────
Frontend                Backend               OpenAI API            Database
   │                       │                       │                   │
   │   POST /ai/guardian   │                       │                   │
   │   { images,           │                       │                   │
   │     productCategory,  │                       │                   │
   │     adText }          │                       │                   │
   │─────────────────────→ │                       │                   │
   │   + JWT Token         │                       │                   │
   │                       │  Verify tier [Pro+]  │                   │
   │                       │────────────────────────────────────────────→
   │                       │                       │                   │
   │                       │  ← tier: 'hot' ✓      │                   │
   │                       │←────────────────────────────────────────────
   │                       │                       │                   │
   │                       │  Analyze images +     │                   │
   │                       │  product context     │                   │
   │                       │─────────────────────→ │                   │
   │                       │                       │                   │
   │                       │  ← Risk intelligence  │                   │
   │                       │←───────────────────── │                   │
   │                       │                       │                   │
   │                       │  Apply tier limits:   │                   │
   │                       │  Pro: 2 countries     │                   │
   │                       │  Hot: 4 countries     │                   │
   │                       │  Ent: 6 + fastest mkt │                   │
   │                       │                       │                   │
   │   ← {                 │                       │                   │
   │     campaignSafetyScore,                      │                   │
   │     riskLevel,        │                       │                   │
   │     demandStatus,     │                       │                   │
   │     topCountries,     │                       │                   │
   │     pricingWarning,   │                       │                   │
   │     launchTimingWarning,                      │                   │
   │     actionableInsights│                       │                   │
   │   }                   │                       │                   │
   │←─────────────────────│                       │                   │
```


═══════════════════════════════════════════════════════════════════════════════
                           SECURITY GUARANTEES
═══════════════════════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHAT FRONTEND CANNOT DO                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ❌ Modify coin balance directly                                            │
│  ❌ Set premium/tier status                                                 │
│  ❌ Bypass tier restrictions                                                │
│  ❌ Fake user ID or JWT token                                               │
│  ❌ Skip validation or business rules                                       │
│  ❌ Access other users' data                                                │
│  ❌ Bypass fraud detection                                                  │
│  ❌ Access AI tools without proper tier                                     │
│  ❌ Manipulate ad reach/view counts                                         │
│  ❌ Tamper with payment verification                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHAT BACKEND ALWAYS DOES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ Validates JWT token on every request                                     │
│  ✓ Extracts user ID from token (not request body)                          │
│  ✓ Queries database for authoritative data                                  │
│  ✓ Validates all inputs and sanitizes data                                  │
│  ✓ Enforces tier-based limits and restrictions                             │
│  ✓ Logs all operations for audit trail                                      │
│  ✓ Runs fraud detection on sensitive actions                                │
│  ✓ Verifies payments with Paystack API                                      │
│  ✓ Rate limits requests per user/IP                                         │
│  ✓ Returns authoritative, calculated data                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE GUARANTEES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ Single source of truth for all user/ad data                             │
│  ✓ Constraints prevent invalid data (coins >= 0, unique emails)            │
│  ✓ Transactions ensure consistency (ACID compliance)                       │
│  ✓ Audit trail maintained for all financial operations                     │
│  ✓ Fraud events logged and tracked                                          │
│  ✓ Indexed for performance on frequent queries                             │
└─────────────────────────────────────────────────────────────────────────────┘
```


═══════════════════════════════════════════════════════════════════════════════
                         COMPLETE ENDPOINTS REFERENCE
═══════════════════════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTHENTICATION                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /auth/signup        → Register new user                             │
│  POST   /auth/login         → Login and get JWT tokens                      │
│  POST   /auth/refresh       → Refresh access token                          │
│  POST   /auth/logout        → Invalidate tokens                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  USER MANAGEMENT                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET    /user/profile       → Get profile (coins, tier, streak)             │
│  PUT    /user/profile       → Update profile info                           │
│  GET    /user/coins         → Get coin balance                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  COINS & WALLET                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET    /coins/balance      → Get current balance                           │
│  POST   /coins/earn         → Earn coins (ad views, actions)                │
│  POST   /coins/spend        → Spend coins (premium, boosts)                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PREMIUM & TIERS                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /premium/unlock     → Unlock premium (validates + deducts)          │
│  GET    /premium/status     → Check premium status                          │
│  GET    /premium/check      → Validate premium for actions                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STREAK SYSTEM                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /api/streak/claim   → Claim daily streak bonus                      │
│  GET    /api/streak/status  → Get streak info                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ADS MANAGEMENT                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /ads/create         → Create ad (tier-validated)                    │
│  GET    /ads/list           → List all active ads                           │
│  GET    /ads/:id            → Get single ad details                         │
│  DELETE /ads/:id            → Delete user's ad                              │
│  POST   /ads/interact       → Like, save, report ad                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  MESSAGING                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /messages/send      → Send message to user                          │
│  GET    /messages/conversations → Get all conversations                     │
│  GET    /messages/:userId   → Get chat with specific user                   │
│  POST   /messages/:id/read  → Mark message as read                          │
│  POST   /chat/start         → Start new conversation                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET    /notifications      → Get user notifications                        │
│  PUT    /notifications/:id/read → Mark as read                              │
│  POST   /notifications/read → Mark all as read                              │
│  DELETE /notifications/:id  → Delete notification                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMENTS & REVIEWS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /comments/create    → Add comment to ad                             │
│  GET    /comments/:adId     → Get comments for ad                           │
│  POST   /reviews/create     → Create review                                 │
│  GET    /reviews/:adId      → Get reviews                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  AI TOOLS (Enterprise AI Suite)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /ai/copywriter      → Smart Copywriter: write/improve ad text       │
│  POST   /ai/negotiation     → Negotiation AI: buyer replies + deal closing  │
│  POST   /ai/auto-post       → AI Auto Post Generator from uploaded images   │
│  POST   /ai/guardian        → AI AdGuardian: deep ad analysis + prediction  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PAYMENTS (Paystack)                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST   /verify-payment     → Verify Paystack payment                       │
│  POST   /webhook/paystack   → Handle Paystack webhooks                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  HEALTH & MONITORING                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  GET    /health             → Basic health check                            │
│  GET    /api/health         → Detailed health status                        │
└─────────────────────────────────────────────────────────────────────────────┘
```


═══════════════════════════════════════════════════════════════════════════════
                           TIER FEATURE MATRIX
═══════════════════════════════════════════════════════════════════════════════

```
┌───────────────────┬─────────┬─────────┬──────────┬──────────┬────────────┐
│      Feature      │ Normal  │ Premium │   Pro    │   Hot    │ Enterprise │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼────────────┤
│ Video Duration    │  2 min  │  3 min  │  5 min   │  10 min  │ Unlimited  │
│ File Size         │  20 MB  │  40 MB  │  80 MB   │ 100 MB   │   Custom   │
│ Daily Uploads     │   3     │   5     │   10     │   10     │   Custom   │
│ Max Ad Reach      │  4,000  │ 10,000  │ 500,000  │  1M      │   Custom   │
│ Coins per View    │   10    │   30    │   100    │   200    │   Custom   │
│ AI Tools          │  None   │    2    │    3     │    4     │     4      │
│ AI Requests/Day   │    0    │   20    │   50     │   50     │  Unlimited │
│ Smart Copywriter  │    ❌    │    ✓    │    ✓     │    ✓     │     ✓      │
│ Negotiation AI    │    ❌    │    ✓    │    ✓     │    ✓     │     ✓      │
│ Auto Post Gen.    │    ❌    │    ❌    │    ✓     │    ✓     │     ✓      │
│ Priority          │  Low    │ Medium  │  High    │ Highest  │   VIP      │
├───────────────────┼─────────┼─────────┼──────────┼──────────┼────────────┤
│ AI ADGUARDIAN     │    ❌    │    ❌    │    ✓     │    ✓     │     ✓      │
│ • Risk Intel      │    -    │    -    │  Basic   │ Advanced │    Full    │
│ • Top Countries   │    -    │    -    │    2     │    4     │    5-6     │
│ • Demand Analysis │    -    │    -    │  Basic   │ Detailed │ Strategic  │
│ • Price Warning   │    -    │    -    │    ❌     │    ✓     │     ✓      │
│ • Budget Risk     │    -    │    -    │    ❌     │    ❌     │     ✓      │
│ • Timing Suggest  │    -    │    -    │    ❌     │    ❌     │     ✓      │
│ • Fastest Market  │    -    │    -    │    ❌     │    ❌     │     ✓      │
│ • Confidence Score│    -    │    -    │    ❌     │    ❌     │     ✓      │
└───────────────────┴─────────┴─────────┴──────────┴──────────┴────────────┘
```


═══════════════════════════════════════════════════════════════════════════════
                    AI GUARDIAN - CREATE FLOW INTELLIGENCE
═══════════════════════════════════════════════════════════════════════════════

```
TRIGGER: User uploads image(s) in "Create Ad" flow
PURPOSE: Protect ad spend, optimize campaigns, provide risk intelligence
ACCESS: Pro, Hot, Enterprise tiers only
NOTE: Does NOT modify ad copy - separate from Ad Improvement

┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI GUARDIAN ANALYSIS TASKS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. PRODUCT & AUDIENCE UNDERSTANDING                                        │
│     • Detect product type from images                                       │
│     • Infer ideal buyer persona (age, gender, interests)                    │
│     • Identify perceived product value                                      │
│     • Evaluate audience alignment                                           │
│                                                                              │
│  2. DEMAND & MARKET INTELLIGENCE                                            │
│     • Search trends analysis                                                │
│     • Seasonal demand detection                                             │
│     • Engagement windows                                                    │
│     • Global demand by tier (Pro: 2, Hot: 4, Enterprise: 5-6 countries)    │
│                                                                              │
│  3. LAUNCH & TIMING ASSESSMENT                                              │
│     • Optimal launch timing check                                           │
│     • Timing improvements (Enterprise only)                                 │
│                                                                              │
│  4. AUDIENCE-PRODUCT MATCH                                                  │
│     • Mismatch detection                                                    │
│     • Adjustment suggestions (Hot/Enterprise)                               │
│                                                                              │
│  5. PRICING & BUDGET INTELLIGENCE (Hot/Enterprise)                          │
│     • Safe price range recommendation                                       │
│     • Pricing warning if dangerous                                          │
│     • Conversion velocity impact                                            │
│     • Budget waste prediction (Enterprise)                                  │
│     • Campaign confidence score (Enterprise)                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI GUARDIAN JSON RESPONSE SCHEMA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  {                                                                           │
│    "campaignSafetyScore": "0-100",                                          │
│    "riskLevel": "Low | Medium | High",                                      │
│    "demandStatus": "High | Medium | Low",                                   │
│    "audienceMismatch": true | false,                                        │
│    "topCountries": ["Country1", "Country2", ...],                           │
│    "fastestSellingMarket": "CountryX",     // Enterprise only               │
│    "pricingWarning": true | false,                                          │
│    "recommendedPriceRange": "$XX - $XX",   // Hot/Enterprise                │
│    "launchTimingWarning": true | false,                                     │
│    "budgetRiskPercent": "XX%",             // Enterprise only               │
│    "confidenceLevel": "High | Medium | Limited",                            │
│    "actionableInsights": [                                                   │
│      "Adjust audience targeting to Age 25-34",                              │
│      "Launch during 6pm-10pm local time",                                   │
│      "Target USA + UK for maximum conversions"                              │
│    ]                                                                        │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```


═══════════════════════════════════════════════════════════════════════════════
                              PROJECT STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

```
ELH Backend/
├── server.js                    # Main Express server (Port 5000)
├── express-paystack-server.js   # Paystack payment server (Port 3000)
├── index.js                     # Entry point
│
├── backend/
│   ├── routes/
│   │   ├── adImprovementRoutes.js
│   │   ├── adTargetingRoutes.js
│   │   ├── aiGuardianRoutes.js        # AI Guardian create flow
│   │   ├── enterpriseAutoPostRoutes.js
│   │   └── proBusinessAiRoutes.js
│   │
│   └── services/
│       ├── adImprovementService.js    # Pro+ AI analysis
│       ├── adTargetingService.js      # Pro+ targeting
│       ├── aiGuardianService.js       # Pro+ risk intelligence
│       ├── enterpriseAdDoctorService.js  # Enterprise only
│       └── enterpriseAutoPostService.js  # Enterprise only
│
├── src/                         # NestJS modules
│   ├── modules/
│   │   ├── auth/               # Authentication
│   │   ├── users/              # User management
│   │   ├── ads/                # Ad management
│   │   ├── wallet/             # Coin/wallet system
│   │   ├── premium/            # Premium features
│   │   ├── payments/           # Payment processing
│   │   ├── fraud/              # Fraud detection
│   │   ├── ai-tools/           # AI integrations
│   │   ├── messages/           # Messaging
│   │   ├── notifications/      # Notifications
│   │   ├── comments/           # Comments
│   │   ├── reviews/            # Reviews
│   │   ├── social/             # Social features
│   │   ├── referral/           # Referral system
│   │   ├── streak/             # Streak system
│   │   ├── analytics/          # Analytics
│   │   ├── alerts/             # Alert system
│   │   ├── negotiation-ai/     # Negotiation AI
│   │   └── deal-broker/        # Deal brokering
│   │
│   └── common/                 # Shared utilities
│       ├── guards/
│       ├── decorators/
│       └── filters/
│
├── database/
│   ├── schema/                 # SQL schemas
│   └── indexes/                # Database indexes
│
├── uploads/                    # Media storage
│
└── docs/                       # Documentation
```


═══════════════════════════════════════════════════════════════════════════════

        🔒 BACKEND IS THE SINGLE SOURCE OF TRUTH 🔒
        
        • All business logic runs on the server
        • Frontend is display-only
        • Database is authoritative
        • JWT secures all requests
        • Tiers enforce feature access
        • Fraud detection protects the platform

═══════════════════════════════════════════════════════════════════════════════
