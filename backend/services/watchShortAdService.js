/**
 * Watch Short Ad Service
 * Handles IP geolocation, trending content fetching, and watch tracking
 * for the "Watch Short Ad" feature in El Hannora
 */

const { v4: uuidv4 } = require("uuid");

const SHORTS_MAX_DURATION_SECONDS = 60;
const TRENDING_CACHE_TTL_MS = 60 * 1000;
const TRENDING_SHORTS_CACHE = new Map();
const LOCATION_PRIORITY_LABELS = {
  1: "city",
  2: "state",
  3: "country",
  4: "global"
};
const TIER_COIN_REWARDS = Object.freeze({
  NORMAL: 1,
  PREMIUM: 3,
  PRO: 7,
  HOT: 10
});

// ─── Region Data ────────────────────────────────────────────────────────────

/**
 * Country data with region information
 * ISO-code → { name, region, defaultLanguage }
 */
const COUNTRY_DATA = {
  // Africa
  NG: { name: "Nigeria", region: "Africa", defaultLanguage: "en" },
  GH: { name: "Ghana", region: "Africa", defaultLanguage: "en" },
  KE: { name: "Kenya", region: "Africa", defaultLanguage: "en" },
  ZA: { name: "South Africa", region: "Africa", defaultLanguage: "en" },
  EG: { name: "Egypt", region: "Africa", defaultLanguage: "ar" },
  MA: { name: "Morocco", region: "Africa", defaultLanguage: "ar" },
  
  // Middle East
  AE: { name: "UAE", region: "Middle East", defaultLanguage: "ar" },
  SA: { name: "Saudi Arabia", region: "Middle East", defaultLanguage: "ar" },
  TR: { name: "Turkey", region: "Middle East", defaultLanguage: "tr" },
  
  // Asia
  IN: { name: "India", region: "Asia", defaultLanguage: "en" },
  PK: { name: "Pakistan", region: "Asia", defaultLanguage: "ur" },
  BD: { name: "Bangladesh", region: "Asia", defaultLanguage: "bn" },
  PH: { name: "Philippines", region: "Asia", defaultLanguage: "en" },
  ID: { name: "Indonesia", region: "Asia", defaultLanguage: "id" },
  MY: { name: "Malaysia", region: "Asia", defaultLanguage: "ms" },
  SG: { name: "Singapore", region: "Asia", defaultLanguage: "en" },
  
  // Europe
  GB: { name: "United Kingdom", region: "Europe", defaultLanguage: "en" },
  DE: { name: "Germany", region: "Europe", defaultLanguage: "de" },
  FR: { name: "France", region: "Europe", defaultLanguage: "fr" },
  IT: { name: "Italy", region: "Europe", defaultLanguage: "it" },
  ES: { name: "Spain", region: "Europe", defaultLanguage: "es" },
  NL: { name: "Netherlands", region: "Europe", defaultLanguage: "nl" },
  
  // Americas
  US: { name: "United States", region: "Americas", defaultLanguage: "en" },
  CA: { name: "Canada", region: "Americas", defaultLanguage: "en" },
  MX: { name: "Mexico", region: "Americas", defaultLanguage: "es" },
  BR: { name: "Brazil", region: "Americas", defaultLanguage: "pt" },
  AR: { name: "Argentina", region: "Americas", defaultLanguage: "es" },
  CO: { name: "Colombia", region: "Americas", defaultLanguage: "es" },
  
  // Oceania
  AU: { name: "Australia", region: "Oceania", defaultLanguage: "en" },
  NZ: { name: "New Zealand", region: "Oceania", defaultLanguage: "en" },
};

// ─── In-Memory Trending Shorts Database ─────────────────────────────────────

/**
 * Sample trending shorts data
 * In production, this would come from a real database
 */
const trendingShortsDB = [
  // Global fallback ads
  {
    id: "ts_001",
    title: "Tech Innovation 2026 - Must See!",
    video_url: "https://cdn.elhannora.com/shorts/tech-innovation-2026.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/tech-innovation-2026.jpg",
    duration: 45,
    engagement_score: 95,
    view_count: 125000,
    region: "global",
    country: "Global",
    country_code: "GLOBAL",
    state: null,
    city: null,
    category: "technology",
    ad_tier: "PREMIUM",
    ai_insights: {
      predicted_engagement: 92,
      risk_score: "Low",
      audience_fit: 88
    },
    created_at: new Date("2026-03-01"),
    is_active: true
  },
  {
    id: "ts_002",
    title: "Amazing Fashion Trends",
    video_url: "https://cdn.elhannora.com/shorts/fashion-trends.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/fashion-trends.jpg",
    duration: 30,
    engagement_score: 88,
    view_count: 89000,
    region: "global",
    country: "Global",
    country_code: "GLOBAL",
    state: null,
    city: null,
    category: "fashion",
    ad_tier: "PRO",
    ai_insights: {
      predicted_engagement: 85,
      risk_score: "Low",
      audience_fit: 82
    },
    created_at: new Date("2026-03-02"),
    is_active: true
  },
  {
    id: "ts_003",
    title: "Quick Cooking Tips",
    video_url: "https://cdn.elhannora.com/shorts/cooking-tips.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/cooking-tips.jpg",
    duration: 58,
    engagement_score: 82,
    view_count: 67000,
    region: "global",
    country: "Global",
    country_code: "GLOBAL",
    state: null,
    city: null,
    category: "food",
    ad_tier: "HOT",
    ai_insights: {
      predicted_engagement: 78,
      risk_score: "Low",
      audience_fit: 75
    },
    created_at: new Date("2026-03-03"),
    is_active: true
  },

  // Nigeria / Lagos local ads
  {
    id: "ts_ng_001",
    title: "Lagos Vibes - New Music Drop",
    video_url: "https://cdn.elhannora.com/shorts/ng/lagos-vibes.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/ng/lagos-vibes.jpg",
    duration: 42,
    engagement_score: 97,
    view_count: 250000,
    region: "NG",
    country: "Nigeria",
    country_code: "NG",
    state: "Lagos",
    city: "Lagos",
    category: "music",
    ad_tier: "HOT",
    ai_insights: {
      predicted_engagement: 95,
      risk_score: "Low",
      audience_fit: 96
    },
    created_at: new Date("2026-03-02T12:00:00Z"),
    is_active: true
  },
  {
    id: "ts_ng_002",
    title: "Naija Street Food Guide",
    video_url: "https://cdn.elhannora.com/shorts/ng/street-food.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/ng/street-food.jpg",
    duration: 55,
    engagement_score: 91,
    view_count: 180000,
    region: "NG",
    country: "Nigeria",
    country_code: "NG",
    state: "Lagos",
    city: "Lagos",
    category: "food",
    ad_tier: "PRO",
    ai_insights: {
      predicted_engagement: 88,
      risk_score: "Low",
      audience_fit: 92
    },
    created_at: new Date("2026-03-03T08:00:00Z"),
    is_active: true
  },
  {
    id: "ts_ng_003",
    title: "Abuja Business Spotlight",
    video_url: "https://cdn.elhannora.com/shorts/ng/abuja-business.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/ng/abuja-business.jpg",
    duration: 37,
    engagement_score: 84,
    view_count: 99000,
    region: "NG",
    country: "Nigeria",
    country_code: "NG",
    state: "FCT",
    city: "Abuja",
    category: "business",
    ad_tier: "PREMIUM",
    ai_insights: {
      predicted_engagement: 81,
      risk_score: "Low",
      audience_fit: 80
    },
    created_at: new Date("2026-03-04T09:30:00Z"),
    is_active: true
  },

  // UK / London ads
  {
    id: "ts_gb_001",
    title: "London Fashion Week Highlights",
    video_url: "https://cdn.elhannora.com/shorts/gb/london-fashion.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/gb/london-fashion.jpg",
    duration: 48,
    engagement_score: 89,
    view_count: 145000,
    region: "GB",
    country: "United Kingdom",
    country_code: "GB",
    state: "England",
    city: "London",
    category: "fashion",
    ad_tier: "PRO",
    ai_insights: {
      predicted_engagement: 86,
      risk_score: "Low",
      audience_fit: 88
    },
    created_at: new Date("2026-03-02"),
    is_active: true
  },

  // US ads
  {
    id: "ts_us_001",
    title: "Silicon Valley Startup Tips",
    video_url: "https://cdn.elhannora.com/shorts/us/startup-tips.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/us/startup-tips.jpg",
    duration: 60,
    engagement_score: 93,
    view_count: 320000,
    region: "US",
    country: "United States",
    country_code: "US",
    state: "California",
    city: "San Francisco",
    category: "business",
    ad_tier: "HOT",
    ai_insights: {
      predicted_engagement: 90,
      risk_score: "Low",
      audience_fit: 91
    },
    created_at: new Date("2026-03-03"),
    is_active: true
  },
  {
    id: "ts_us_002",
    title: "NYC Street Style",
    video_url: "https://cdn.elhannora.com/shorts/us/nyc-style.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/us/nyc-style.jpg",
    duration: 35,
    engagement_score: 87,
    view_count: 210000,
    region: "US",
    country: "United States",
    country_code: "US",
    state: "New York",
    city: "New York",
    category: "fashion",
    ad_tier: "PREMIUM",
    ai_insights: {
      predicted_engagement: 84,
      risk_score: "Low",
      audience_fit: 86
    },
    created_at: new Date("2026-03-02"),
    is_active: true
  },

  // India ads
  {
    id: "ts_in_001",
    title: "Bollywood Dance Tutorial",
    video_url: "https://cdn.elhannora.com/shorts/in/bollywood-dance.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/in/bollywood-dance.jpg",
    duration: 52,
    engagement_score: 94,
    view_count: 410000,
    region: "IN",
    country: "India",
    country_code: "IN",
    state: "Maharashtra",
    city: "Mumbai",
    category: "entertainment",
    ad_tier: "HOT",
    ai_insights: {
      predicted_engagement: 91,
      risk_score: "Low",
      audience_fit: 93
    },
    created_at: new Date("2026-03-03"),
    is_active: true
  },

  // UAE ads
  {
    id: "ts_ae_001",
    title: "Dubai Luxury Lifestyle",
    video_url: "https://cdn.elhannora.com/shorts/ae/dubai-luxury.mp4",
    thumbnail_url: "https://cdn.elhannora.com/thumbs/ae/dubai-luxury.jpg",
    duration: 45,
    engagement_score: 96,
    view_count: 280000,
    region: "AE",
    country: "UAE",
    country_code: "AE",
    state: "Dubai",
    city: "Dubai",
    category: "lifestyle",
    ad_tier: "PRO",
    ai_insights: {
      predicted_engagement: 93,
      risk_score: "Low",
      audience_fit: 95
    },
    created_at: new Date("2026-03-02"),
    is_active: true
  }
];

// ─── Watch Session Tracking ─────────────────────────────────────────────────

/**
 * In-memory storage for watch sessions
 * In production, this would be persisted to a database
 */
const watchSessions = new Map();

// ─── IP Geolocation Functions ───────────────────────────────────────────────

/**
 * Known IP ranges for testing/demo purposes
 * In production, use a proper geolocation service like MaxMind or ip-api.com
 */
const IP_GEOLOCATION_CACHE = new Map();

/**
 * Parse IP address and extract region information
 * Uses multiple fallback strategies:
 * 1. Cache lookup
 * 2. External API (ip-api.com - free tier)
 * 3. Cloudflare headers
 * 4. X-Forwarded-For header parsing
 * 5. Default to "global"
 * 
 * @param {string} ipAddress - The IP address to geolocate
 * @param {Object} headers - Request headers (for CF-IPCountry, etc.)
 * @returns {Promise<Object>} - Region information
 */
async function detectRegionFromIP(ipAddress, headers = {}) {
  try {
    if (IP_GEOLOCATION_CACHE.has(ipAddress)) {
      return IP_GEOLOCATION_CACHE.get(ipAddress);
    }

    const headerCountryCode = headers["cf-ipcountry"] || headers["x-vercel-ip-country"];
    const headerState = headers["x-vercel-ip-country-region"] || headers["x-region"] || null;
    const headerCity = headers["x-vercel-ip-city"] || headers["x-city"] || null;

    if (headerCountryCode) {
      const region = getRegionFromCountryCode(headerCountryCode.toUpperCase(), {
        state: headerState,
        city: headerCity,
        detection_method: "edge_header"
      });
      IP_GEOLOCATION_CACHE.set(ipAddress, region);
      return region;
    }

    const axios = require("axios");
    const response = await axios.get(
      `http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,city,regionName`,
      { timeout: 2500 }
    );

    if (response.data && response.data.status === "success") {
      const region = {
        country: response.data.country || "Global",
        country_code: response.data.countryCode || "GLOBAL",
        state: response.data.regionName || null,
        city: response.data.city || null,
        region_name: response.data.regionName || "Global",
        detection_method: "ip-api",
        detected_at: new Date().toISOString()
      };

      IP_GEOLOCATION_CACHE.set(ipAddress, region);
      setTimeout(() => IP_GEOLOCATION_CACHE.delete(ipAddress), 3600000);
      return region;
    }

    return getGlobalRegion();
  } catch (error) {
    console.error("[IP Geolocation Error]", error.message);
    return getGlobalRegion();
  }
}

/**
 * Get region info from country code
 * @param {string} countryCode - ISO country code
 * @returns {Object} - Region information
 */
function getRegionFromCountryCode(countryCode, overrides = {}) {
  const normalizedCode = `${countryCode || "GLOBAL"}`.toUpperCase();
  const country = COUNTRY_DATA[normalizedCode];

  if (country) {
    return {
      country: country.name,
      country_code: normalizedCode,
      state: overrides.state || null,
      city: overrides.city || null,
      region_name: country.region,
      detection_method: overrides.detection_method || "country_code",
      detected_at: new Date().toISOString()
    };
  }

  return getGlobalRegion();
}

/**
 * Get global/fallback region
 * @returns {Object} - Global region info
 */
function getGlobalRegion() {
  return {
    country: "Global",
    country_code: "GLOBAL",
    state: null,
    city: null,
    region_name: "Global",
    detection_method: "fallback",
    detected_at: new Date().toISOString()
  };
}

/**
 * Extract client IP from request
 * Handles proxies, load balancers, and direct connections
 * 
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
function extractClientIP(req) {
  // Priority order for IP detection
  const ipSources = [
    req.headers["cf-connecting-ip"],      // Cloudflare
    req.headers["x-real-ip"],             // Nginx
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim(),  // Proxy chain
    req.connection?.remoteAddress,
    req.socket?.remoteAddress,
    req.ip
  ];
  
  for (const ip of ipSources) {
    if (ip && ip !== "::1" && !ip.startsWith("::ffff:127")) {
      // Clean up IPv6-mapped IPv4 addresses
      return ip.replace(/^::ffff:/, "");
    }
  }
  
  return "0.0.0.0";
}

// ─── Trending Content Functions ─────────────────────────────────────────────

/**
 * Fetch trending shorts based on region
 * Prioritizes region-specific content, falls back to global
 * 
 * @param {Object} options - Query options
 * @param {string} options.countryCode - ISO country code or "GLOBAL"
 * @param {number} options.limit - Maximum number of shorts to return
 * @param {string} options.category - Optional category filter
 * @param {number} options.maxDuration - Maximum duration in seconds (default: 60)
 * @returns {Array} - Array of trending shorts
 */
function normalizeLocationValue(value) {
  return `${value || ""}`.trim().toLowerCase();
}

function getCoinRewardForTier(tier) {
  const normalizedTier = `${tier || "PREMIUM"}`.toUpperCase();
  return TIER_COIN_REWARDS[normalizedTier] || TIER_COIN_REWARDS.PREMIUM;
}

function isGlobalShort(short) {
  const countryCode = `${short.country_code || short.region || ""}`.toUpperCase();
  return short.region === "global" || countryCode === "GLOBAL";
}

function getShortPriority(short, location = {}) {
  const shortCity = normalizeLocationValue(short.city);
  const shortState = normalizeLocationValue(short.state);
  const shortCountryCode = `${short.country_code || short.region || "GLOBAL"}`.toUpperCase();
  const userCity = normalizeLocationValue(location.city);
  const userState = normalizeLocationValue(location.state);
  const userCountryCode = `${location.countryCode || location.country_code || "GLOBAL"}`.toUpperCase();

  if (userCity && shortCity && shortCity === userCity && (userCountryCode === "GLOBAL" || shortCountryCode === userCountryCode)) {
    return 1;
  }

  if (userState && shortState && shortState === userState && (userCountryCode === "GLOBAL" || shortCountryCode === userCountryCode)) {
    return 2;
  }

  if (userCountryCode !== "GLOBAL" && shortCountryCode === userCountryCode) {
    return 3;
  }

  if (isGlobalShort(short)) {
    return 4;
  }

  return 99;
}

function buildCacheKey(options) {
  const excludeIds = Array.isArray(options.excludeIds) ? [...options.excludeIds].sort() : [];
  return JSON.stringify({
    countryCode: `${options.countryCode || "GLOBAL"}`.toUpperCase(),
    state: normalizeLocationValue(options.state),
    city: normalizeLocationValue(options.city),
    category: normalizeLocationValue(options.category),
    limit: options.limit || 10,
    maxDuration: options.maxDuration || SHORTS_MAX_DURATION_SECONDS,
    excludeIds
  });
}

function fetchTrendingShorts(options = {}) {
  // Guard: short ads require real CDN videos before going live.
  // Set SHORT_ADS_ENABLED=true in your environment once real video URLs are configured.
  if (process.env.SHORT_ADS_ENABLED !== "true") {
    return [];
  }

  const {
    countryCode = "GLOBAL",
    state = null,
    city = null,
    limit = 10,
    category = null,
    excludeIds = [],
    maxDuration = SHORTS_MAX_DURATION_SECONDS
  } = options;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);
  const safeMaxDuration = Math.min(Number(maxDuration) || SHORTS_MAX_DURATION_SECONDS, SHORTS_MAX_DURATION_SECONDS);
  const normalizedCategory = normalizeLocationValue(category);
  const normalizedExcludeIds = new Set((Array.isArray(excludeIds) ? excludeIds : []).map(id => `${id}`));
  const location = {
    countryCode: `${countryCode || "GLOBAL"}`.toUpperCase(),
    state,
    city
  };

  const cacheKey = buildCacheKey({
    countryCode: location.countryCode,
    state,
    city,
    category: normalizedCategory,
    limit: safeLimit,
    maxDuration: safeMaxDuration,
    excludeIds: Array.from(normalizedExcludeIds)
  });

  const cached = TRENDING_SHORTS_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data.map(short => ({ ...short }));
  }

  let shorts = trendingShortsDB.filter(short => {
    if (!short.is_active || short.duration > safeMaxDuration) {
      return false;
    }

    if (normalizedExcludeIds.has(`${short.id}`)) {
      return false;
    }

    if (normalizedCategory && normalizeLocationValue(short.category) !== normalizedCategory) {
      return false;
    }

    return true;
  });

  shorts = shorts
    .map(short => {
      const priorityRank = getShortPriority(short, location);
      return {
        ...short,
        location_priority_rank: priorityRank,
        location_priority: LOCATION_PRIORITY_LABELS[priorityRank] || "global",
        coin_reward: getCoinRewardForTier(short.ad_tier)
      };
    })
    .filter(short => short.location_priority_rank < 99)
    .sort((a, b) => {
      if (a.location_priority_rank !== b.location_priority_rank) {
        return a.location_priority_rank - b.location_priority_rank;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, safeLimit);

  TRENDING_SHORTS_CACHE.set(cacheKey, {
    data: shorts.map(short => ({ ...short })),
    expiresAt: Date.now() + TRENDING_CACHE_TTL_MS
  });

  return shorts;
}

/**
 * Format shorts for API response
 * @param {Array} shorts - Array of short objects from DB
 * @returns {Array} - Formatted array for API response
 */
function formatShortsForResponse(shorts) {
  return shorts.map(short => ({
    id: short.id,
    title: short.title,
    video_url: short.video_url,
    thumbnail_url: short.thumbnail_url,
    duration: short.duration,
    engagement_score: short.engagement_score,
    category: short.category,
    location_priority: short.location_priority || "global",
    ad_tier: `${short.ad_tier || "PREMIUM"}`.toLowerCase(),
    coin_reward: short.coin_reward || getCoinRewardForTier(short.ad_tier),
    location: {
      city: short.city || null,
      state: short.state || null,
      country: short.country || "Global",
      country_code: short.country_code || short.region || "GLOBAL"
    },
    ai_insights: {
      predicted_engagement: short.ai_insights?.predicted_engagement ?? null,
      risk_score: short.ai_insights?.risk_score ?? "Low",
      audience_fit: short.ai_insights?.audience_fit ?? null
    }
  }));
}

// ─── Watch Session Management ───────────────────────────────────────────────

/**
 * Create a new watch session
 * @param {string} userId - User ID (optional, can be anonymous)
 * @param {string} region - User's detected region
 * @param {Array} shortIds - Array of short IDs in the session
 * @returns {Object} - Session object
 */
function createWatchSession(userId, region, shortIds, regionContext = {}) {
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    user_id: userId || "anonymous",
    region: region,
    region_context: {
      country: regionContext.country || region || "Global",
      country_code: regionContext.country_code || "GLOBAL",
      state: regionContext.state || null,
      city: regionContext.city || null
    },
    shorts_queue: Array.isArray(shortIds) ? shortIds : [],
    current_index: 0,
    watched: [],
    skipped: [],
    processed_event_keys: [],
    started_at: new Date().toISOString(),
    ended_at: null,
    total_watch_time: 0,
    status: "active"
  };

  watchSessions.set(sessionId, session);
  return session;
}

/**
 * Record a watch event (watched or skipped)
 * @param {string} sessionId - Session ID
 * @param {string} shortId - Short content ID
 * @param {string} action - "watched" or "skipped"
 * @param {number} watchDuration - How long the user watched (seconds)
 * @returns {Object|null} - Updated session or null if not found
 */
function recordWatchEvent(sessionId, shortId, action, watchDuration = 0, userId = null) {
  const session = watchSessions.get(sessionId);
  if (!session) return null;

  if (userId && session.user_id !== userId) {
    return {
      ...session,
      error: "Access denied for this watch session",
      statusCode: 403,
    };
  }

  if (session.status !== "active") {
    return null;
  }

  const expectedShortId = session.shorts_queue[session.current_index];
  if (expectedShortId && `${expectedShortId}` !== `${shortId}`) {
    return {
      ...session,
      error: "Short does not match the current session queue position",
      statusCode: 409,
    };
  }

  if (!Array.isArray(session.processed_event_keys)) {
    session.processed_event_keys = [];
  }

  const eventKey = `${session.user_id}:${sessionId}:${shortId}:${action}`;
  if (session.processed_event_keys.includes(eventKey)) {
    session.duplicate_ignored = true;
    watchSessions.set(sessionId, session);
    return session;
  }

  session.processed_event_keys.push(eventKey);
  delete session.duplicate_ignored;

  const event = {
    short_id: shortId,
    action: action,
    watch_duration: watchDuration,
    timestamp: new Date().toISOString()
  };

  if (action === "watched") {
    session.watched.push(event);
    session.total_watch_time += watchDuration;
  } else if (action === "skipped") {
    session.skipped.push(event);
  }

  // Move to next in queue exactly once for each unique event
  session.current_index++;

  // Check if session is complete
  if (session.current_index >= session.shorts_queue.length) {
    session.status = "completed";
    session.ended_at = new Date().toISOString();
  }

  watchSessions.set(sessionId, session);
  return session;
}

/**
 * End a watch session
 * @param {string} sessionId - Session ID
 * @returns {Object|null} - Final session data or null if not found
 */
function endWatchSession(sessionId) {
  const session = watchSessions.get(sessionId);
  if (!session) return null;
  
  session.status = "ended";
  session.ended_at = new Date().toISOString();
  
  watchSessions.set(sessionId, session);
  return session;
}

/**
 * Get session status
 * @param {string} sessionId - Session ID
 * @returns {Object|null} - Session data or null if not found
 */
function getSessionStatus(sessionId) {
  return watchSessions.get(sessionId) || null;
}

/**
 * Get next short in session queue
 * @param {string} sessionId - Session ID
 * @returns {Object|null} - Next short info or null
 */
function getNextShortInSession(sessionId) {
  const session = watchSessions.get(sessionId);
  if (!session || session.status !== "active") return null;

  const seenIds = new Set([
    ...session.watched.map(item => item.short_id),
    ...session.skipped.map(item => item.short_id)
  ]);

  while (session.current_index < session.shorts_queue.length && seenIds.has(session.shorts_queue[session.current_index])) {
    session.current_index++;
  }

  if (session.current_index >= session.shorts_queue.length) {
    const fallbackShorts = fetchTrendingShorts({
      countryCode: session.region_context?.country_code || "GLOBAL",
      state: session.region_context?.state || null,
      city: session.region_context?.city || null,
      limit: 4,
      excludeIds: Array.from(seenIds),
      maxDuration: SHORTS_MAX_DURATION_SECONDS
    });

    if (fallbackShorts.length === 0) {
      return null;
    }

    session.shorts_queue.push(...fallbackShorts.map(short => short.id));
    watchSessions.set(sessionId, session);
  }

  const nextId = session.shorts_queue[session.current_index];
  if (!nextId) return null;

  const nextShortBatch = fetchTrendingShorts({
    countryCode: session.region_context?.country_code || "GLOBAL",
    state: session.region_context?.state || null,
    city: session.region_context?.city || null,
    limit: 4,
    excludeIds: Array.from(seenIds),
    maxDuration: SHORTS_MAX_DURATION_SECONDS
  });

  const currentShort = nextShortBatch.find(short => short.id === nextId)
    || trendingShortsDB.find(short => short.id === nextId);

  if (!currentShort) {
    return null;
  }

  const formattedBatch = formatShortsForResponse(nextShortBatch);
  const formattedCurrent = formatShortsForResponse([currentShort])[0];
  const upNext = formattedBatch.filter(short => short.id !== formattedCurrent.id).slice(0, 3);

  return {
    short: formattedCurrent,
    position: session.current_index + 1,
    total: session.shorts_queue.length,
    is_last: session.current_index === session.shorts_queue.length - 1,
    up_next: upNext
  };
}

// ─── Analytics & Insights ───────────────────────────────────────────────────

/**
 * Get aggregated watch statistics
 * @returns {Object} - Aggregate statistics
 */
function getWatchStatistics() {
  const sessions = Array.from(watchSessions.values());
  
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  const totalWatched = sessions.reduce((acc, s) => acc + s.watched.length, 0);
  const totalSkipped = sessions.reduce((acc, s) => acc + s.skipped.length, 0);
  const totalWatchTime = sessions.reduce((acc, s) => acc + s.total_watch_time, 0);
  
  return {
    total_sessions: totalSessions,
    completed_sessions: completedSessions,
    completion_rate: totalSessions > 0 
      ? ((completedSessions / totalSessions) * 100).toFixed(1) + "%" 
      : "0%",
    total_content_watched: totalWatched,
    total_content_skipped: totalSkipped,
    skip_rate: (totalWatched + totalSkipped) > 0
      ? ((totalSkipped / (totalWatched + totalSkipped)) * 100).toFixed(1) + "%"
      : "0%",
    total_watch_time_seconds: totalWatchTime,
    average_watch_time: totalSessions > 0
      ? (totalWatchTime / totalSessions).toFixed(1) + "s"
      : "0s"
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Region Detection
  detectRegionFromIP,
  extractClientIP,
  getRegionFromCountryCode,
  getGlobalRegion,
  
  // Trending Content
  fetchTrendingShorts,
  formatShortsForResponse,
  
  // Session Management
  createWatchSession,
  recordWatchEvent,
  endWatchSession,
  getSessionStatus,
  getNextShortInSession,
  
  // Analytics
  getWatchStatistics,
  
  // Data exports (for testing)
  COUNTRY_DATA,
  SHORTS_MAX_DURATION_SECONDS,
  TIER_COIN_REWARDS,
  trendingShortsDB
};
