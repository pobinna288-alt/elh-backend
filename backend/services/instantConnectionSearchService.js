/**
 * Instant Match + Dispatch service.
 *
 * Guarantees for single-instance MVP:
 * - Atomic seller reservation via centralized state store
 * - Strict seller state transitions
 * - No duplicate seller assignment across active connections
 * - Immediate timeout release and reroute fallback
 */

const { randomUUID } = require("crypto");
const {
  SELLER_STATES,
  getSellerState,
  transitionSellerState,
  atomicReserveSeller,
  releaseExpiredReservations,
} = require("./dispatchStateStore");

const MAX_CANDIDATES = 20;
const ALTERNATIVES_COUNT = 3;
const CONNECTION_TIMEOUT_MS = 45 * 1000;
const TARGET_RESPONSE_MS = 300;
const INITIAL_RADIUS_KM = 10;
const EXPANDED_RADIUS_KM = 25;
const MAX_RADIUS_KM = 50;
const LAST_ACTIVE_MAX_MINUTES = 20;
const STALE_AVAILABLE_STATE_MINUTES = 30;
const MAX_RESERVED_PER_SELLER = 1;

const DEFAULT_CITY = {
  city: "New York",
  country: "USA",
  latitude: 40.7128,
  longitude: -74.006,
};

const CITY_POOL = [
  { city: "New York", country: "USA", latitude: 40.7128, longitude: -74.006 },
  { city: "Los Angeles", country: "USA", latitude: 34.0522, longitude: -118.2437 },
  { city: "Chicago", country: "USA", latitude: 41.8781, longitude: -87.6298 },
  { city: "Houston", country: "USA", latitude: 29.7604, longitude: -95.3698 },
  { city: "Dallas", country: "USA", latitude: 32.7767, longitude: -96.797 },
  { city: "London", country: "UK", latitude: 51.5072, longitude: -0.1276 },
  { city: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792 },
  { city: "Accra", country: "Ghana", latitude: 5.6037, longitude: -0.187 },
];

const CATEGORY_KEYWORDS = {
  services: [
    "barber",
    "salon",
    "restaurant",
    "food",
    "mechanic",
    "repair",
    "plumber",
    "electrician",
    "cleaning",
    "tutor",
    "tutoring",
    "doctor",
    "clinic",
  ],
  real_estate: ["real estate", "apartment", "house", "property", "rent", "land"],
  electronics: ["iphone", "phone", "laptop", "macbook", "tv", "playstation", "ps5", "tablet"],
  vehicles: ["car", "vehicle", "toyota", "honda", "bike", "motorcycle"],
  jobs: ["job", "hiring", "vacancy", "position", "recruitment"],
  education: ["course", "school", "teacher", "class", "exam", "training"],
  fashion: ["shoe", "fashion", "clothes", "bag", "watch"],
};

function logInfo(message, payload = {}) {
  console.info(`[Dispatch] ${message}`, payload);
}

function logWarn(message, payload = {}) {
  console.warn(`[Dispatch] ${message}`, payload);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value) {
  return (value || "").toString().trim().toLowerCase();
}

function parseTimestamp(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function getMinutesSince(timestamp) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function normalizeZeroToOne(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 1;
  return clamp((value - min) / (max - min), 0, 1);
}

function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("::1") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const candidate = (Array.isArray(forwarded) ? forwarded[0] : forwarded || "")
    .split(",")[0]
    .trim();

  const rawIp =
    candidate ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  return rawIp.replace("::ffff:", "").trim();
}

function hashString(input) {
  let hash = 0;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function lookupCityByName(name) {
  const normalized = normalizeText(name);
  return CITY_POOL.find((entry) => normalizeText(entry.city) === normalized) || null;
}

function resolveLastKnownLocation(user) {
  if (!user) return null;

  const latitude = toNumber(user.latitude, null);
  const longitude = toNumber(user.longitude, null);
  const city = user.location_city || user.city || user.location || null;
  const country = user.location_country || user.country || null;

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      city: city || DEFAULT_CITY.city,
      country: country || DEFAULT_CITY.country,
      latitude,
      longitude,
      source: "last_known_location",
      precision: "medium",
    };
  }

  const cityMatch = city ? lookupCityByName(city) : null;
  if (cityMatch) {
    return {
      ...cityMatch,
      source: "last_known_location",
      precision: "medium",
    };
  }

  return null;
}

function resolveUserLocation(req, options = {}) {
  const ip = getClientIp(req);

  const gpsLat = toNumber(req.headers["x-gps-lat"] ?? req.query?.gps_lat ?? req.body?.gps_lat, null);
  const gpsLng = toNumber(req.headers["x-gps-lng"] ?? req.query?.gps_lng ?? req.body?.gps_lng, null);
  if (Number.isFinite(gpsLat) && Number.isFinite(gpsLng)) {
    return {
      ip,
      city: req.headers["x-gps-city"] || DEFAULT_CITY.city,
      country: req.headers["x-gps-country"] || DEFAULT_CITY.country,
      latitude: gpsLat,
      longitude: gpsLng,
      source: "gps",
      precision: "high",
    };
  }

  const geoLat = toNumber(req.headers["x-geo-lat"], null);
  const geoLng = toNumber(req.headers["x-geo-lng"], null);
  if (Number.isFinite(geoLat) && Number.isFinite(geoLng)) {
    return {
      ip,
      city: req.headers["x-geo-city"] || DEFAULT_CITY.city,
      country: req.headers["x-geo-country"] || DEFAULT_CITY.country,
      latitude: geoLat,
      longitude: geoLng,
      source: "ip_geo_headers",
      precision: "medium",
    };
  }

  if (ip && !isPrivateIp(ip)) {
    const slot = hashString(ip) % CITY_POOL.length;
    return {
      ip,
      ...CITY_POOL[slot],
      source: "ip_estimated",
      precision: "low",
    };
  }

  if (options.lastKnownLocation) {
    return {
      ip,
      ...options.lastKnownLocation,
      source: "last_known_location",
      precision: "medium",
    };
  }

  return {
    ip,
    ...DEFAULT_CITY,
    source: "default_city",
    precision: "low",
  };
}

function parseIntent(query) {
  const normalized = normalizeText(query);
  let detectedCategory = "services";
  let detectedSubcategory = null;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchedKeyword = keywords.find((keyword) => normalized.includes(keyword));
    if (matchedKeyword) {
      detectedCategory = category;
      detectedSubcategory = matchedKeyword;
      break;
    }
  }

  return {
    query: (query || "").toString().trim(),
    category: detectedCategory,
    subcategory: detectedSubcategory,
    urgency: "high",
  };
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateProximityScore(distanceKm) {
  if (!Number.isFinite(distanceKm)) return 0.2;
  if (distanceKm <= 2) return 1;
  if (distanceKm <= 5) return 0.9;
  if (distanceKm <= 10) return 0.8;
  if (distanceKm <= 25) return 0.55;
  if (distanceKm <= 50) return 0.35;
  return 0.1;
}

function ensureConnectionStore(database) {
  if (!Array.isArray(database.connectionRequests)) database.connectionRequests = [];
  if (!Array.isArray(database.connectionEvents)) database.connectionEvents = [];
}

function addConnectionEvent(database, connectionId, type, payload = {}) {
  ensureConnectionStore(database);
  database.connectionEvents.push({
    id: randomUUID(),
    connection_id: connectionId,
    type,
    payload,
    created_at: new Date().toISOString(),
  });
}

function notifySeller(database, sellerId, message, connectionId) {
  if (!Array.isArray(database.notifications)) return;

  const existingUser = Array.isArray(database.users)
    ? database.users.find((user) => user.id === sellerId)
    : null;

  database.notifications.push({
    id: randomUUID(),
    user_id: sellerId,
    type: "connection_request",
    title: "New customer ready",
    message,
    is_read: false,
    metadata: {
      connection_id: connectionId,
      seller_name: existingUser?.fullName || existingUser?.companyName || null,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

function isConnectionActive(connection) {
  return connection && ["pending", "rerouted", "accepted"].includes(connection.status);
}

function isSellerProfileActive(seller) {
  if (!seller) return false;
  if (seller.active === true || seller.isActive === true) return true;
  return normalizeText(seller.status) === "active";
}

function resolveSellerLocation(ad, seller) {
  const adLat = toNumber(ad.latitude, null);
  const adLng = toNumber(ad.longitude, null);
  if (Number.isFinite(adLat) && Number.isFinite(adLng)) {
    return {
      latitude: adLat,
      longitude: adLng,
      city: ad.location_city || ad.city || ad.location || null,
      country: ad.location_country || ad.country || null,
    };
  }

  const sellerLat = toNumber(seller?.latitude, null);
  const sellerLng = toNumber(seller?.longitude, null);
  if (Number.isFinite(sellerLat) && Number.isFinite(sellerLng)) {
    return {
      latitude: sellerLat,
      longitude: sellerLng,
      city: seller.location_city || seller.city || seller.location || null,
      country: seller.location_country || seller.country || null,
    };
  }

  const cityFallback = lookupCityByName(ad.location_city || seller?.location_city || seller?.city || ad.location || seller?.location);
  if (cityFallback) return cityFallback;

  return { ...DEFAULT_CITY };
}

function getSellerDisplayName(seller) {
  return seller?.companyName || seller?.fullName || seller?.name || "Seller";
}

function getSellerPhone(seller) {
  return seller?.phone || seller?.phone_number || seller?.phoneNumber || null;
}

function computeAttentionPerformance(database, sellerId, lastActiveAt) {
  const history = Array.isArray(database.connectionRequests)
    ? database.connectionRequests.filter(
        (entry) => entry.final_seller_id === sellerId || entry.active_seller_id === sellerId
      )
    : [];

  let respondedCount = 0;
  let acceptedCount = 0;
  let totalResponseMs = 0;

  for (const item of history) {
    if (item.responded_at) {
      respondedCount += 1;
      const responseMs = Math.max(0, new Date(item.responded_at).getTime() - new Date(item.started_at).getTime());
      totalResponseMs += responseMs;
    }

    if (item.response_status === "accepted" || item.status === "completed") {
      acceptedCount += 1;
    }
  }

  const avgResponseMs = respondedCount > 0 ? totalResponseMs / respondedCount : 12000;
  const responseSpeed = clamp(1 - avgResponseMs / 30000, 0, 1);
  const successRate = history.length > 0 ? acceptedCount / history.length : 0.5;
  const activityConsistency = clamp(1 - getMinutesSince(lastActiveAt) / (24 * 60), 0, 1);

  const attentionScore = (responseSpeed * 0.4 + successRate * 0.4 + activityConsistency * 0.2) * 100;

  return {
    attentionScore,
    responseSpeed,
    successRate,
    activityConsistency,
  };
}

function buildCandidate(ad, seller, userLocation, database) {
  const sellerLocation = resolveSellerLocation(ad, seller);
  const distanceKm = Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)
    ? calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        sellerLocation.latitude,
        sellerLocation.longitude
      )
    : null;

  const lastActiveAt =
    parseTimestamp(seller?.last_active_date) ||
    parseTimestamp(seller?.lastLoginAt) ||
    parseTimestamp(seller?.updatedAt) ||
    parseTimestamp(ad.updated_at) ||
    parseTimestamp(ad.created_at);

  const performance = computeAttentionPerformance(database, ad.seller_id || ad.userId, lastActiveAt);

  return {
    seller_id: ad.seller_id || ad.userId,
    ad_id: ad.id,
    name: getSellerDisplayName(seller),
    category: normalizeText(ad.category),
    subcategory: normalizeText(ad.title).split(" ").slice(0, 2).join(" ") || null,
    trustScore: clamp(toNumber(seller?.trust_score ?? ad.trust_score, 50), 0, 100),
    attentionScore: Math.round(performance.attentionScore * 10) / 10,
    responseSpeed: performance.responseSpeed,
    successRate: performance.successRate,
    activityConsistency: performance.activityConsistency,
    distance_km: Number.isFinite(distanceKm) ? Math.round(distanceKm * 10) / 10 : null,
    proximityScore: calculateProximityScore(distanceKm),
    location_city: sellerLocation.city || null,
    location_country: sellerLocation.country || null,
    last_active_timestamp: lastActiveAt ? new Date(lastActiveAt).toISOString() : null,
    phone: getSellerPhone(seller),
    chat_enabled: true,
    seller_profile_active: isSellerProfileActive(seller),
    explicit_online_signal:
      seller?.is_online === true ||
      seller?.online === true ||
      seller?.availability === "online" ||
      ad?.availability === "online",
  };
}

function fetchCandidatePool(database, intent, userLocation) {
  const ads = Array.isArray(database?.ads) ? database.ads : [];
  const users = Array.isArray(database?.users) ? database.users : [];
  const sellerById = new Map(users.map((entry) => [entry.id, entry]));

  const activeAds = ads.filter((ad) => ad && (ad.status === "active" || ad.isActive === true));
  const categoryAds = activeAds.filter((ad) => normalizeText(ad.category) === normalizeText(intent.category));

  const bySeller = new Map();

  for (const ad of categoryAds) {
    const sellerId = ad.seller_id || ad.userId;
    if (!sellerId) continue;

    const seller = sellerById.get(sellerId) || null;
    const candidate = buildCandidate(ad, seller, userLocation, database);

    const existing = bySeller.get(sellerId);
    if (!existing || candidate.trustScore > existing.trustScore) {
      bySeller.set(sellerId, candidate);
    }
  }

  return Array.from(bySeller.values()).slice(0, MAX_CANDIDATES);
}

function getActiveReservationCount(database, sellerId) {
  if (!Array.isArray(database.connectionRequests)) return 0;
  let count = 0;

  for (const connection of database.connectionRequests) {
    if (!isConnectionActive(connection)) continue;
    if (connection.active_seller_id === sellerId) count += 1;
  }

  return count;
}

function validateCurrentSellerState(database, candidate) {
  const state = getSellerState(database, candidate.seller_id);
  const stateUpdatedAt = parseTimestamp(state.updated_at);
  const stateAgeMinutes = getMinutesSince(stateUpdatedAt);

  if (state.state === SELLER_STATES.OFFLINE) {
    return { ok: false, reason: "seller_offline" };
  }
  if (state.state === SELLER_STATES.BUSY) {
    return { ok: false, reason: "seller_busy" };
  }
  if (state.state === SELLER_STATES.RESERVED) {
    return { ok: false, reason: "seller_reserved" };
  }

  if (state.state !== SELLER_STATES.AVAILABLE) {
    return { ok: false, reason: "invalid_state" };
  }

  if (stateAgeMinutes > STALE_AVAILABLE_STATE_MINUTES) {
    return { ok: false, reason: "stale_available_state" };
  }

  return { ok: true };
}

function hardFilterCandidate(database, candidate, intentCategory, radiusKm) {
  if (candidate.category !== normalizeText(intentCategory)) {
    return { ok: false, reason: "category_mismatch" };
  }

  if (!candidate.seller_profile_active) {
    return { ok: false, reason: "seller_inactive" };
  }

  if (!candidate.last_active_timestamp) {
    return { ok: false, reason: "missing_last_active" };
  }

  if (getMinutesSince(parseTimestamp(candidate.last_active_timestamp)) > LAST_ACTIVE_MAX_MINUTES) {
    return { ok: false, reason: "stale_last_active" };
  }

  if (!Number.isFinite(candidate.distance_km) || candidate.distance_km > radiusKm) {
    return { ok: false, reason: "outside_radius" };
  }

  const currentState = validateCurrentSellerState(database, candidate);
  if (!currentState.ok) {
    return currentState;
  }

  if (getActiveReservationCount(database, candidate.seller_id) >= MAX_RESERVED_PER_SELLER) {
    return { ok: false, reason: "seller_overloaded" };
  }

  return { ok: true };
}

function rankValidCandidates(validCandidates) {
  if (!validCandidates.length) return [];

  const attentionValues = validCandidates.map((entry) => entry.attentionScore);
  const minAttention = Math.min(...attentionValues);
  const maxAttention = Math.max(...attentionValues);

  return validCandidates
    .map((candidate) => {
      const trustNorm = normalizeZeroToOne(candidate.trustScore, 0, 100);
      const freshnessNorm = clamp(1 - getMinutesSince(parseTimestamp(candidate.last_active_timestamp)) / LAST_ACTIVE_MAX_MINUTES, 0, 1);
      const attentionNorm = normalizeZeroToOne(candidate.attentionScore, minAttention, maxAttention);
      const proximityNorm = clamp(candidate.proximityScore, 0, 1);

      const score =
        trustNorm * 0.38 +
        freshnessNorm * 0.28 +
        attentionNorm * 0.2 +
        proximityNorm * 0.14;

      return {
        ...candidate,
        match_score: Math.round(score * 1000) / 10,
      };
    })
    .sort((a, b) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      return (a.distance_km || Number.POSITIVE_INFINITY) - (b.distance_km || Number.POSITIVE_INFINITY);
    });
}

function filterAndRankCandidates(database, candidates, intent, options = {}) {
  const triedSellers = new Set(options.excludeSellerIds || []);
  const radii = [INITIAL_RADIUS_KM, EXPANDED_RADIUS_KM, MAX_RADIUS_KM];

  for (const radiusKm of radii) {
    const valid = [];

    for (const candidate of candidates) {
      if (triedSellers.has(candidate.seller_id)) continue;

      const check = hardFilterCandidate(database, candidate, intent.category, radiusKm);
      if (!check.ok) continue;

      valid.push(candidate);
    }

    if (valid.length > 0) {
      return {
        ranked: rankValidCandidates(valid),
        fallback: {
          radius_km: radiusKm,
          radius_expanded: radiusKm > INITIAL_RADIUS_KM,
          city_level: false,
        },
      };
    }
  }

  const cityLevel = candidates.filter((candidate) => {
    if (triedSellers.has(candidate.seller_id)) return false;

    const check = hardFilterCandidate(database, candidate, intent.category, Number.POSITIVE_INFINITY);
    if (!check.ok) return false;

    return true;
  });

  return {
    ranked: rankValidCandidates(cityLevel),
    fallback: {
      radius_km: Number.POSITIVE_INFINITY,
      radius_expanded: true,
      city_level: true,
    },
  };
}

function explainMatch(candidate) {
  const close = Number.isFinite(candidate.distance_km) && candidate.distance_km <= INITIAL_RADIUS_KM;
  const highTrust = candidate.trustScore >= 80;
  const highPerformance = candidate.attentionScore >= 65;

  if (close && highTrust && highPerformance) return "Closest trusted seller with strong response performance";
  if (close && highTrust) return "Closest trusted seller available now";
  if (highTrust && highPerformance) return "High trust and consistently responsive seller";
  if (highTrust) return "Best trusted seller in valid dispatch range";
  return "Best available seller for immediate connection";
}

function computeConfidence(best, second, userLocation) {
  const bestScore = clamp((best?.match_score || 0) / 100, 0, 1);
  const scoreGap = second ? clamp((best.match_score - second.match_score) / 100, 0, 1) : 0.2;

  let locationReliability = 0.7;
  if (userLocation.source === "gps") locationReliability = 1;
  else if (userLocation.source === "ip_geo_headers") locationReliability = 0.85;
  else if (userLocation.source === "last_known_location") locationReliability = 0.75;
  else if (userLocation.source === "default_city") locationReliability = 0.5;

  return Math.round(clamp(bestScore * 0.6 + scoreGap * 0.2 + locationReliability * 0.2, 0, 1) * 100) / 100;
}

function shapeSellerResult(candidate, confidence) {
  return {
    seller_id: candidate.seller_id,
    name: candidate.name,
    category: candidate.category,
    subcategory: candidate.subcategory,
    trustScore: candidate.trustScore,
    attentionScore: Math.round(candidate.attentionScore),
    distance: Number.isFinite(candidate.distance_km) ? candidate.distance_km : null,
    availability: "available_now",
    last_active_timestamp: candidate.last_active_timestamp,
    match_score: candidate.match_score,
    match_confidence: confidence,
    reason: explainMatch(candidate),
    actions: {
      connect_now: true,
      call: Boolean(candidate.phone),
      chat: Boolean(candidate.chat_enabled),
    },
  };
}

function reserveSellerAtomically(database, sellerId, connectionId) {
  const started = Date.now();
  const reserved = atomicReserveSeller(database, {
    sellerId,
    connectionId,
    ttlMs: CONNECTION_TIMEOUT_MS,
    maxReservedPerSeller: MAX_RESERVED_PER_SELLER,
  });

  const elapsedMs = Date.now() - started;
  if (elapsedMs > 10) {
    logWarn("Reservation exceeded 10ms target", {
      sellerId,
      elapsedMs,
    });
  }

  if (!reserved.ok) {
    logWarn("Duplicate/invalid reservation attempt rejected", {
      sellerId,
      connectionId,
      code: reserved.code,
    });
  }

  return reserved;
}

function tryReserveFromQueue(database, connection, startIndex) {
  for (let i = startIndex; i < connection.candidate_queue.length; i += 1) {
    const sellerId = connection.candidate_queue[i];
    const reserved = reserveSellerAtomically(database, sellerId, connection.id);
    if (!reserved.ok) continue;

    connection.active_index = i;
    connection.active_seller_id = sellerId;
    connection.deadline_at_ms = Date.now() + CONNECTION_TIMEOUT_MS;
    connection.updated_at = new Date().toISOString();
    connection.status = i === 0 ? "pending" : "rerouted";

    notifySeller(database, sellerId, "New customer ready", connection.id);
    return true;
  }

  return false;
}

function appendExpandedFallbackCandidates(database, connection) {
  const context = connection.dispatch_context;
  if (!context || !context.intent || !context.user_location) return [];

  const exclude = new Set(connection.candidate_queue);
  const allCandidates = fetchCandidatePool(database, context.intent, context.user_location);

  const { ranked } = filterAndRankCandidates(database, allCandidates, context.intent, {
    excludeSellerIds: Array.from(exclude),
  });

  if (!ranked.length) return [];

  const newSellerIds = ranked.map((entry) => entry.seller_id).filter((id) => !exclude.has(id));
  connection.candidate_queue.push(...newSellerIds);

  addConnectionEvent(database, connection.id, "fallback_expanded", {
    added_candidates: newSellerIds.length,
  });
  logInfo("Fallback expanded with new candidates", {
    connectionId: connection.id,
    added: newSellerIds.length,
  });

  return newSellerIds;
}

function buildConnectionSummary(connection) {
  return {
    connection_id: connection.id,
    status: connection.status,
    active_seller_id: connection.active_seller_id,
    started_at: connection.started_at,
    responded_at: connection.responded_at,
    completed_at: connection.completed_at,
    response_status: connection.response_status,
    rerouted_count: connection.rerouted_count,
    response_time_ms: connection.responded_at
      ? Math.max(0, new Date(connection.responded_at).getTime() - new Date(connection.started_at).getTime())
      : null,
  };
}

function findConnection(database, connectionId) {
  ensureConnectionStore(database);
  return database.connectionRequests.find((entry) => entry.id === connectionId) || null;
}

function processConnectionTimeouts(database) {
  ensureConnectionStore(database);
  releaseExpiredReservations(database);

  const now = Date.now();

  for (const connection of database.connectionRequests) {
    if (!["pending", "rerouted"].includes(connection.status)) continue;
    if (now < connection.deadline_at_ms) continue;

    const timedOutSellerId = connection.active_seller_id;
    const currentState = getSellerState(database, timedOutSellerId);
    if (currentState.state === SELLER_STATES.RESERVED) {
      transitionSellerState(database, {
        sellerId: timedOutSellerId,
        to: SELLER_STATES.AVAILABLE,
        connectionId: connection.id,
        reason: "system",
      });
    }

    connection.response_status = "expired";
    connection.status = "expired";
    connection.updated_at = new Date().toISOString();

    addConnectionEvent(database, connection.id, "seller_timeout", {
      seller_id: timedOutSellerId,
    });
    logInfo("Timeout event triggered", {
      connectionId: connection.id,
      sellerId: timedOutSellerId,
    });

    let rerouted = tryReserveFromQueue(database, connection, connection.active_index + 1);

    if (!rerouted) {
      appendExpandedFallbackCandidates(database, connection);
      rerouted = tryReserveFromQueue(database, connection, connection.active_index + 1);
    }

    if (rerouted) {
      connection.status = "rerouted";
      connection.response_status = "pending";
      connection.rerouted_count += 1;
      addConnectionEvent(database, connection.id, "timeout_reroute", {
        next_seller_id: connection.active_seller_id,
      });
      logInfo("Fallback reroute triggered", {
        connectionId: connection.id,
        nextSellerId: connection.active_seller_id,
      });
      continue;
    }

    connection.status = "failed";
    connection.response_status = "failed";
    connection.updated_at = new Date().toISOString();
    addConnectionEvent(database, connection.id, "candidate_pool_exhausted");
  }
}

function createDispatchConnection(database, params) {
  const { buyerId, query, intent, userLocation, rankedCandidates } = params;

  const connection = {
    id: randomUUID(),
    buyer_id: buyerId || null,
    query,
    intent_category: intent.category,
    intent_subcategory: intent.subcategory,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    responded_at: null,
    response_status: "pending",
    status: "pending",
    candidate_queue: rankedCandidates.map((entry) => entry.seller_id),
    active_index: -1,
    active_seller_id: null,
    final_seller_id: null,
    rerouted_count: 0,
    deadline_at_ms: Date.now() + CONNECTION_TIMEOUT_MS,
    dispatch_context: {
      intent,
      user_location: userLocation,
    },
  };

  const reserved = tryReserveFromQueue(database, connection, 0);
  if (!reserved) return null;

  ensureConnectionStore(database);
  database.connectionRequests.push(connection);
  addConnectionEvent(database, connection.id, "connection_started", {
    active_seller_id: connection.active_seller_id,
    queue_length: connection.candidate_queue.length,
  });

  return connection;
}

function buildInstantConnectionMatch({ database, query, req, userId }) {
  const startedAt = Date.now();

  processConnectionTimeouts(database);

  const buyer = Array.isArray(database?.users)
    ? database.users.find((entry) => entry.id === userId)
    : null;

  const lastKnownLocation = resolveLastKnownLocation(buyer);
  const userLocation = resolveUserLocation(req, { lastKnownLocation });
  const intent = parseIntent(query);

  const pool = fetchCandidatePool(database, intent, userLocation);
  const filtered = filterAndRankCandidates(database, pool, intent);
  const ranked = filtered.ranked;

  if (!ranked.length) {
    return {
      success: false,
      query: intent.query,
      intent,
      user_location: userLocation,
      best_match: null,
      alternatives: [],
      message: "No valid seller passed dispatch filters",
      response_time_ms: Date.now() - startedAt,
      target_response_ms: TARGET_RESPONSE_MS,
    };
  }

  const connection = createDispatchConnection(database, {
    buyerId: userId,
    query: intent.query,
    intent,
    userLocation,
    rankedCandidates: ranked,
  });

  if (!connection) {
    return {
      success: false,
      query: intent.query,
      intent,
      user_location: userLocation,
      best_match: null,
      alternatives: [],
      message: "No available seller could be reserved atomically",
      response_time_ms: Date.now() - startedAt,
      target_response_ms: TARGET_RESPONSE_MS,
    };
  }

  const bestCandidate = ranked.find((entry) => entry.seller_id === connection.active_seller_id) || ranked[0];
  const responseOrdered = [
    bestCandidate,
    ...ranked.filter((entry) => entry.seller_id !== bestCandidate.seller_id),
  ];

  const second = responseOrdered[1] || null;
  const bestConfidence = computeConfidence(bestCandidate, second, userLocation);

  return {
    success: true,
    query: intent.query,
    intent,
    user_location: userLocation,
    best_match: shapeSellerResult(bestCandidate, bestConfidence),
    alternatives: responseOrdered
      .slice(1, 1 + ALTERNATIVES_COUNT)
      .map((entry) => shapeSellerResult(entry, computeConfidence(entry, second, userLocation))),
    connection: buildConnectionSummary(connection),
    decision_mode: "dispatch_engine",
    fallback: filtered.fallback,
    candidate_count: ranked.length,
    response_time_ms: Date.now() - startedAt,
    target_response_ms: TARGET_RESPONSE_MS,
  };
}

function startConnectionRequest({ database, query, intent, bestMatch, alternatives, buyerId, connectionId }) {
  processConnectionTimeouts(database);
  ensureConnectionStore(database);

  if (connectionId) {
    const existing = findConnection(database, connectionId);
    if (existing) {
      return buildConnectionSummary(existing);
    }
  }

  const queue = [bestMatch?.seller_id, ...(Array.isArray(alternatives) ? alternatives.map((entry) => entry.seller_id) : [])]
    .filter(Boolean);

  if (!queue.length) {
    throw new Error("No candidate seller provided");
  }

  const connection = {
    id: randomUUID(),
    buyer_id: buyerId || null,
    query: query || "",
    intent_category: intent?.category || "services",
    intent_subcategory: intent?.subcategory || null,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    responded_at: null,
    response_status: "pending",
    status: "pending",
    candidate_queue: [...new Set(queue)],
    active_index: -1,
    active_seller_id: null,
    final_seller_id: null,
    rerouted_count: 0,
    deadline_at_ms: Date.now() + CONNECTION_TIMEOUT_MS,
    dispatch_context: {
      intent: intent || parseIntent(query || "service"),
      user_location: DEFAULT_CITY,
    },
  };

  const reserved = tryReserveFromQueue(database, connection, 0);
  if (!reserved) {
    throw new Error("No available seller could be reserved");
  }

  database.connectionRequests.push(connection);
  addConnectionEvent(database, connection.id, "connection_started", {
    active_seller_id: connection.active_seller_id,
    queue_length: connection.candidate_queue.length,
  });

  return buildConnectionSummary(connection);
}

function respondToConnectionRequest({ database, connectionId, sellerId, accepted }) {
  processConnectionTimeouts(database);

  const connection = findConnection(database, connectionId);
  if (!connection) {
    return {
      success: false,
      error: "Connection not found",
      statusCode: 404,
    };
  }

  const actorSellerId = sellerId || connection.active_seller_id;
  if (actorSellerId !== connection.active_seller_id) {
    return {
      success: false,
      error: "Only the currently selected seller can respond",
      statusCode: 409,
    };
  }

  connection.responded_at = new Date().toISOString();
  connection.updated_at = new Date().toISOString();

  if (accepted) {
    const transitioned = transitionSellerState(database, {
      sellerId: actorSellerId,
      to: SELLER_STATES.BUSY,
      connectionId: connection.id,
      reason: "system",
    });

    if (!transitioned.ok) {
      return {
        success: false,
        error: "Failed to move seller to BUSY state",
        statusCode: 409,
      };
    }

    connection.status = "accepted";
    connection.response_status = "accepted";
    connection.final_seller_id = actorSellerId;
    addConnectionEvent(database, connection.id, "seller_accepted", { seller_id: actorSellerId });

    return {
      success: true,
      connection: buildConnectionSummary(connection),
    };
  }

  transitionSellerState(database, {
    sellerId: actorSellerId,
    to: SELLER_STATES.AVAILABLE,
    connectionId: connection.id,
    reason: "system",
  });

  addConnectionEvent(database, connection.id, "seller_rejected", {
    seller_id: actorSellerId,
  });

  let rerouted = tryReserveFromQueue(database, connection, connection.active_index + 1);

  if (!rerouted) {
    appendExpandedFallbackCandidates(database, connection);
    rerouted = tryReserveFromQueue(database, connection, connection.active_index + 1);
  }

  if (rerouted) {
    connection.status = "rerouted";
    connection.response_status = "pending";
    connection.rerouted_count += 1;
    addConnectionEvent(database, connection.id, "seller_rejected_rerouted", {
      next_seller_id: connection.active_seller_id,
    });
    logInfo("Fallback reroute triggered", {
      connectionId: connection.id,
      nextSellerId: connection.active_seller_id,
    });
  } else {
    connection.status = "failed";
    connection.response_status = "failed";
    addConnectionEvent(database, connection.id, "candidate_pool_exhausted");
  }

  return {
    success: true,
    connection: buildConnectionSummary(connection),
  };
}

function completeConnectionRequest({ database, connectionId, completed = true }) {
  processConnectionTimeouts(database);

  const connection = findConnection(database, connectionId);
  if (!connection) {
    return {
      success: false,
      error: "Connection not found",
      statusCode: 404,
    };
  }

  connection.completed_at = new Date().toISOString();
  connection.updated_at = new Date().toISOString();

  if (completed) {
    connection.status = "completed";
    if (connection.response_status !== "accepted") {
      connection.response_status = "completed";
    }
    addConnectionEvent(database, connection.id, "connection_completed");
  } else {
    connection.status = "cancelled";
    connection.response_status = "cancelled";
    addConnectionEvent(database, connection.id, "connection_cancelled");
  }

  const targetSellerId = connection.final_seller_id || connection.active_seller_id;
  if (targetSellerId) {
    const sellerState = getSellerState(database, targetSellerId);

    if (sellerState.state === SELLER_STATES.BUSY) {
      transitionSellerState(database, {
        sellerId: targetSellerId,
        to: SELLER_STATES.AVAILABLE,
        connectionId: connection.id,
        reason: "system",
      });
    } else if (sellerState.state === SELLER_STATES.RESERVED) {
      transitionSellerState(database, {
        sellerId: targetSellerId,
        to: SELLER_STATES.AVAILABLE,
        connectionId: connection.id,
        reason: "system",
      });
    }
  }

  return {
    success: true,
    connection: buildConnectionSummary(connection),
  };
}

function getConnectionStatus({ database, connectionId }) {
  processConnectionTimeouts(database);

  const connection = findConnection(database, connectionId);
  if (!connection) {
    return {
      success: false,
      error: "Connection not found",
      statusCode: 404,
    };
  }

  return {
    success: true,
    connection: buildConnectionSummary(connection),
  };
}

function activateConnectionAfterPayment({
  database,
  connectionId,
  paymentReference,
  buyerId = null,
  amountKobo = null,
}) {
  processConnectionTimeouts(database);

  const connection = findConnection(database, connectionId);
  if (!connection) {
    return {
      success: false,
      error: "Connection not found",
      statusCode: 404,
    };
  }

  if (buyerId && connection.buyer_id && connection.buyer_id !== buyerId) {
    return {
      success: false,
      error: "Connection does not belong to this buyer",
      statusCode: 403,
    };
  }

  const selectedSellerId = connection.final_seller_id || connection.active_seller_id;
  if (!selectedSellerId) {
    return {
      success: false,
      error: "No seller selected for this connection",
      statusCode: 409,
    };
  }

  const sellerState = getSellerState(database, selectedSellerId);
  if (sellerState.state === SELLER_STATES.RESERVED) {
    const transitioned = transitionSellerState(database, {
      sellerId: selectedSellerId,
      to: SELLER_STATES.BUSY,
      connectionId: connection.id,
      reason: "system",
    });

    if (!transitioned.ok) {
      return {
        success: false,
        error: "Failed to activate selected seller",
        statusCode: 409,
      };
    }
  } else if (sellerState.state !== SELLER_STATES.BUSY) {
    return {
      success: false,
      error: "Selected seller is no longer available for activation",
      statusCode: 409,
    };
  }

  connection.status = "ACTIVE";
  connection.response_status = "active";
  connection.final_seller_id = selectedSellerId;
  connection.payment_status = "paid";
  connection.payment_reference = paymentReference || null;
  connection.payment_amount_kobo = Number.isFinite(Number(amountKobo)) ? Number(amountKobo) : null;
  connection.payment_verified_at = new Date().toISOString();
  connection.updated_at = new Date().toISOString();

  addConnectionEvent(database, connection.id, "payment_verified_connection_activated", {
    seller_id: selectedSellerId,
    payment_reference: paymentReference || null,
    payment_amount_kobo: Number.isFinite(Number(amountKobo)) ? Number(amountKobo) : null,
  });

  notifySeller(
    database,
    selectedSellerId,
    "Buyer payment confirmed. Connection is now active.",
    connection.id
  );

  return {
    success: true,
    connection: buildConnectionSummary(connection),
    selected_seller_id: selectedSellerId,
  };
}

module.exports = {
  buildInstantConnectionMatch,
  startConnectionRequest,
  respondToConnectionRequest,
  completeConnectionRequest,
  getConnectionStatus,
  processConnectionTimeouts,
  getClientIp,
  resolveUserLocation,
  parseIntent,
  calculateHaversineDistance,
  activateConnectionAfterPayment,
  SELLER_STATES,
};
