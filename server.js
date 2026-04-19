/**
 * El Hannora - Production Backend Server
 * AI-Powered Ad Prediction Platform
 * Node.js + Express.js
 */

console.log("🚀 SERVER INIT START");
console.log("📡 LOADING CONFIG");

require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const { OpenAI } = require("openai");

// Central route registration
const createAdminRouter = require("./routes/admin");
const { getAllAdCategories } = require("./backend/config/adCategories");
const { validateAdCreateRequest } = require("./backend/middleware/adValidation");
const { generateAdTargeting } = require("./backend/services/adTargetingService");
const { convertToUsd, normalizeCurrencyCode } = require("./backend/services/currencyConversionService");
const followSellerService = require("./backend/services/followSellerService");
const attentionScoreService = require("./backend/services/attentionScoreService");
const createAdminRouter = require("./routes/admin");
const { createGetAdminDashboardHandler } = require("./controllers/adminController");
const { createRequireAdmin } = require("./middleware/auth");
const { createAdminDataSource } = require("./models/adminDataSource");
const {
  appendLedgerTransaction,
  ensureUserLedger,
  syncUserBalanceFromLedger,
} = require("./backend/common/coinLedger");

// ============================================
// SERVER CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 4010;
const REQUEST_TIMEOUT_MIN_MS = 10000;
const REQUEST_TIMEOUT_MAX_MS = 15000;
const REQUEST_TIMEOUT_DEFAULT_MS = 15000;
const REQUEST_TIMEOUT_MS = resolveRequestTimeoutMs(process.env.REQUEST_TIMEOUT_MS);
const EXTERNAL_CALL_TIMEOUT_MS = Number(process.env.EXTERNAL_CALL_TIMEOUT_MS || 12000);
const RESTART_DELAY_MS = Number(process.env.RESTART_DELAY_MS || 2000);
const MAX_RESTART_ATTEMPTS = Number(process.env.MAX_RESTART_ATTEMPTS || 20);
const HOST = process.env.HOST || "0.0.0.0";
const BASE_URL = `${process.env.BASE_URL || ""}`.trim().replace(/\/+$/, "");

let isManualShutdownRequested = false;
let restartAttempts = 0;
let restartTimer = null;

const startupReadiness = {
  envValidated: false,
  paymentModuleLoaded: false,
  databaseConnected: false,
  degradedMode: false,
  degradedReasons: [],
};

const EXPRESS_ROUTE_METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "all"];

function resolveRequestTimeoutMs(rawTimeoutMs) {
  const parsed = Number.parseInt(`${rawTimeoutMs ?? ""}`.trim(), 10);
  if (!Number.isFinite(parsed)) {
    return REQUEST_TIMEOUT_DEFAULT_MS;
  }

  if (parsed < REQUEST_TIMEOUT_MIN_MS) {
    console.warn(`⚠ REQUEST_TIMEOUT_MS=${parsed} is below supported minimum. Using ${REQUEST_TIMEOUT_MIN_MS}ms.`);
    return REQUEST_TIMEOUT_MIN_MS;
  }

  if (parsed > REQUEST_TIMEOUT_MAX_MS) {
    console.warn(`⚠ REQUEST_TIMEOUT_MS=${parsed} is above supported maximum. Using ${REQUEST_TIMEOUT_MAX_MS}ms.`);
    return REQUEST_TIMEOUT_MAX_MS;
  }

  return parsed;
}

function isRoutePathArgument(value) {
  if (typeof value === "string" || value instanceof RegExp) {
    return true;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value.every((item) => typeof item === "string" || item instanceof RegExp);
  }

  return false;
}

function wrapAsyncHandler(handler) {
  if (typeof handler !== "function") {
    return handler;
  }

  if (handler.length >= 4) {
    // Keep error middleware signatures intact.
    return handler;
  }

  return function resilientAsyncHandler(req, res, next) {
    try {
      const maybePromise = handler(req, res, next);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch((error) => {
          console.error("🔥 ASYNC ROUTE ERROR:", error);
          next(error);
        });
      }
      return maybePromise;
    } catch (error) {
      console.error("🔥 ROUTE HANDLER ERROR:", error);
      return next(error);
    }
  };
}

function wrapAsyncHandlersInArgs(args, skipFirstPath = false) {
  return args.map((arg, index) => {
    if (skipFirstPath && index === 0 && isRoutePathArgument(arg)) {
      return arg;
    }

    if (Array.isArray(arg)) {
      return arg.map((item) => wrapAsyncHandler(item));
    }

    return wrapAsyncHandler(arg);
  });
}

function patchMethodSet(targetObject, methodNames, skipFirstPath = true) {
  for (const methodName of methodNames) {
    const originalMethod = targetObject?.[methodName];
    if (typeof originalMethod !== "function" || originalMethod.__asyncSafetyPatched === true) {
      continue;
    }

    const patchedMethod = function patchedExpressMethod(...args) {
      const wrappedArgs = wrapAsyncHandlersInArgs(args, skipFirstPath);
      return originalMethod.apply(this, wrappedArgs);
    };

    patchedMethod.__asyncSafetyPatched = true;
    targetObject[methodName] = patchedMethod;
  }
}

function applyAsyncSafetyToExpress() {
  patchMethodSet(express.application, EXPRESS_ROUTE_METHODS, true);
  patchMethodSet(express.application, ["use"], true);

  const routerPrototype = Object.getPrototypeOf(express.Router());
  patchMethodSet(routerPrototype, EXPRESS_ROUTE_METHODS, true);
  patchMethodSet(routerPrototype, ["use"], true);
}

applyAsyncSafetyToExpress();

function validateStartupEnvironment() {
  const missingKeys = [];
  const rawPort = `${PORT || ""}`.trim();
  const paystackSecret = `${process.env.PAYSTACK_SECRET_KEY || ""}`.trim();
  const databaseUrl = `${process.env.DATABASE_URL || process.env.MONGODB_URI || process.env.DB_URL || ""}`.trim();
  const jwtSecret = `${process.env.JWT_SECRET || ""}`.trim();

  if (!paystackSecret) {
    console.error("❌ Missing ENV: PAYSTACK_SECRET_KEY");
    missingKeys.push("PAYSTACK_SECRET_KEY");
  }

  if (!databaseUrl) {
    console.error("❌ Missing ENV: DATABASE_URL");
    missingKeys.push("DATABASE_URL");
  }

  if (!jwtSecret) {
    console.error("❌ Missing ENV: JWT_SECRET");
    missingKeys.push("JWT_SECRET");
  }

  if (missingKeys.length > 0) {
    startupReadiness.degradedMode = true;
    startupReadiness.degradedReasons.push(`Missing required environment variables: ${missingKeys.join(", ")}`);
    console.warn(`⚠ Startup degraded mode: missing env vars (${missingKeys.join(", ")})`);
  }

  if (!Number.isInteger(Number(rawPort)) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    startupReadiness.degradedMode = true;
    startupReadiness.degradedReasons.push(`Invalid PORT value: ${rawPort}`);
    console.warn(`⚠ Invalid PORT value: ${rawPort}. Fallback will be used.`);
  }

  if (paystackSecret && !paystackSecret.startsWith("sk_")) {
    startupReadiness.degradedMode = true;
    startupReadiness.degradedReasons.push("PAYSTACK_SECRET_KEY format is invalid");
    console.warn("⚠ PAYSTACK_SECRET_KEY format is invalid. Payment features may be degraded.");
  }

  console.log("✅ Database connection string detected.");

  startupReadiness.envValidated = true;
}

function verifyPaymentModuleLoading() {
  const requiredModules = [
    "./backend/modules/payments/payments.routes.js",
    "./backend/modules/payments/payments.controller.js",
    "./backend/modules/payments/payments.service.js",
    "./backend/services/instantConnectionSearchService.js",
  ];

  for (const modulePath of requiredModules) {
    require(modulePath);
  }

  startupReadiness.paymentModuleLoaded = true;
  console.log("Payment module loaded successfully");
}

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION:", err);
});

process.on("warning", (warning) => {
  console.warn("⚠ PROCESS WARNING:", warning);
});

process.on("multipleResolves", (type, promise, reason) => {
  console.error("🔥 MULTIPLE RESOLVES DETECTED:", { type, promise, reason });
});

process.on("beforeExit", (code) => {
  console.warn("⚠ Process beforeExit event:", code);
});

process.on("exit", (code) => {
  console.log("⚠️ Process exiting with code:", code);
});

function buildHealthPayload() {
  return {
    status: "ok",
    success: true,
    message: "Backend is running",
  };
}

function sendHealthResponse(req, res) {
  console.log("💚 HEALTH HIT", req.method, req.originalUrl || req.url);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return res.status(200).json(buildHealthPayload());
}

function getLocalIP() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const netInfo of nets[name] || []) {
      const isIPv4 = netInfo.family === "IPv4" || netInfo.family === 4;
      if (isIPv4 && !netInfo.internal) {
        return netInfo.address;
      }
    }
  }

  return "0.0.0.0";
}

function runStartupHealthCheck(port) {
  const targetBaseUrl = BASE_URL || `http://${HOST}:${port}`;
  const targetUrl = `${targetBaseUrl}/api/health`;

  return new Promise((resolve) => {
    const request = http.get(targetUrl, (response) => {
      response.resume();

      if (response.statusCode === 200) {
        console.log("💚 Health check OK");
        resolve(true);
        return;
      }

      console.error(`❌ Health check FAILED (status ${response.statusCode})`);
      resolve(false);
    });

    request.setTimeout(4000, () => {
      request.destroy(new Error("startup health check timeout"));
    });

    request.on("error", (error) => {
      console.error("❌ Health check FAILED", error.message || error);
      resolve(false);
    });
  });
}

// Keep health checks isolated from all downstream middleware and services.
app.options(["/health", "/api/health"], (req, res) => {
  console.log("💚 HEALTH PRE-FLIGHT", req.method, req.originalUrl || req.url);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return res.sendStatus(204);
});

app.get("/health", (req, res) => {
  return sendHealthResponse(req, res);
});

app.get("/api/health", (req, res) => {
  return sendHealthResponse(req, res);
});

console.log("HEALTH ROUTE LOADED");
console.log("HEALTH ROUTE ACTIVE");

app.get("/api/network-check", (req, res) => {
  return res.json({
    ip: req.ip,
    host: req.headers.host,
    message: "Network reachable",
  });
});

const JWT_SECRET = process.env.JWT_SECRET || "";

let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    console.warn("⚠ OPENAI_API_KEY is not set. AI features will return a service-unavailable error.");
  }
} catch (error) {
  console.error("❌ Failed to initialize OpenAI client. AI features will be unavailable.", error);
}
const APP_BASE_URL = (process.env.BASE_URL || process.env.FRONTEND_URL || process.env.APP_BASE_URL || "").replace(/\/+$/, "");
const PROFILE_CACHE_TTL_MS = 30 * 1000;
const PROFILE_POSTS_DEFAULT_LIMIT = 20;
const PROFILE_POSTS_MAX_LIMIT = 50;
const PROFILE_POST_FILTERS = new Set(["all", "text", "recent", "popular"]);
const UPLOAD_ROOT = path.join(__dirname, "uploads");
const PROFILE_PICTURE_DIR = path.join(UPLOAD_ROOT, "profile-pictures");
const AD_MEDIA_DIR = path.join(UPLOAD_ROOT, "ads");
const PROFILE_IMAGE_DIR = path.join(UPLOAD_ROOT, "profile");
const profileCache = new Map();

[UPLOAD_ROOT, PROFILE_PICTURE_DIR, AD_MEDIA_DIR, PROFILE_IMAGE_DIR].forEach((directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
});

const profilePictureUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PROFILE_PICTURE_DIR),
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `${Date.now()}-${uuidv4()}${extension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const hasAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
    const hasAllowedExtension = allowedExtensions.includes(extension);

    if (hasAllowedMimeType && hasAllowedExtension) {
      cb(null, true);
      return;
    }

    cb(new Error("Only JPG, PNG, and WEBP profile images are allowed"));
  },
});

const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PROFILE_IMAGE_DIR),
    filename: (req, file, cb) => {
      const userId = req.user?.id || "unknown";
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      const random = crypto.randomBytes(4).toString("hex");
      cb(null, `user_${userId}_${Date.now()}_${random}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP images allowed"));
    }
  },
});

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AD_MEDIA_DIR),
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || "").toLowerCase() || ".bin";
      cb(null, `${Date.now()}-${uuidv4()}${extension}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB – accommodate video uploads
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed. Accepted: JPEG, PNG, WEBP images and MP4, WEBM videos`));
    }
  },
});

// ============================================
// MIDDLEWARE
// ============================================

console.log("🧩 Startup stage: initializing middleware");

// CORS - Allow frontend access via configured origins
app.use(cors({
  origin: "*", // MVP: allow all origins, restrict in production
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: "*"
}));

// Parse JSON bodies with size limits
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use("/uploads", express.static(UPLOAD_ROOT));

// Request lifecycle guard: no request should stay pending forever.
app.use((req, res, next) => {
  let responseCompleted = false;
  const timer = setTimeout(() => {
    if (responseCompleted || res.headersSent || res.writableEnded) {
      return;
    }

    console.error(`⏱ REQUEST TIMEOUT: ${req.method} ${req.originalUrl || req.url}`);
    return res.status(504).json({
      success: false,
      message: "Request timeout",
      retryable: true,
      code: "REQUEST_TIMEOUT",
    });
  }, REQUEST_TIMEOUT_MS);

  res.on("finish", () => {
    responseCompleted = true;
    clearTimeout(timer);
  });

  res.on("close", () => {
    responseCompleted = true;
    clearTimeout(timer);
  });

  try {
    return next();
  } catch (error) {
    clearTimeout(timer);
    return next(error);
  }
});

// Request logging
app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`➡ REQUEST: ${req.method} ${req.originalUrl || req.url}`);
  res.on("finish", () => {
    console.log(`✅ RESPONSE CLOSED: ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
  });
  res.on("close", () => {
    if (!res.writableEnded) {
      console.warn(`⚠ RESPONSE CLOSED EARLY: ${req.method} ${req.originalUrl || req.url}`);
    }
  });
  try {
    return next();
  } catch (error) {
    return next(error);
  }
});

// ============================================
// IN-MEMORY DATABASE
// ============================================

const database = {
  users: [],
  workspaces: [],
  ads: [],
  messages: [],
  notifications: [],
  transactions: [],
  referrals: [],
  enterpriseLeads: [],
  enterpriseChats: [],
  enterpriseMessages: [],
  tokenBlacklist: [],
  loginAttempts: [],
  passwordResetAttempts: []
};

const PUBLISH_AD_TYPES = new Set(["image", "video", "text"]);
const publishRateLimitWindowMs = 60 * 1000;
const publishRateLimitMaxRequests = 5;
const publishRateTracker = new Map();
const adIndexes = {
  byUserId: new Map(),
  byCreatedAt: [],
};

function sanitizePublishAdString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return `${value}`
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStoredAdId(ad = {}) {
  return sanitizePublishAdString(ad.ad_id || ad.id || ad.post_id);
}

function getStoredAdUserId(ad = {}) {
  return sanitizePublishAdString(ad.user_id || ad.userId || ad.seller_id);
}

function getStoredAdCreatedAt(ad = {}) {
  const value = ad.created_at || ad.createdAt || ad.updated_at || ad.updatedAt || new Date().toISOString();
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function isAdActive(ad = {}) {
  const status = sanitizePublishAdString(ad.status || "active").toLowerCase();
  return status === "active" && ad.isActive !== false;
}

function normalizePublishedAd(ad = {}) {
  const adId = getStoredAdId(ad);
  const userId = getStoredAdUserId(ad);
  const createdAtValue = ad.created_at || ad.createdAt || new Date().toISOString();
  const normalizedType = sanitizePublishAdString(ad.ad_type || ad.adType || ad.type || "text").toLowerCase() || "text";
  const mediaUrl = sanitizePublishAdString(ad.media_url || (Array.isArray(ad.media) ? ad.media[0] : ""));

  return {
    ...ad,
    ad_id: adId,
    id: adId,
    user_id: userId,
    seller_id: ad.seller_id || userId,
    ad_type: normalizedType,
    media_url: mediaUrl,
    price: Number.isFinite(Number(ad.price)) ? Number(ad.price) : 0,
    country: sanitizePublishAdString(ad.country || ad.location_country || ""),
    status: sanitizePublishAdString(ad.status || "active") || "active",
    views: Number(ad.views || 0),
    scroll_stop: Number(ad.scroll_stop ?? ad.scrollStops ?? ad.scroll_stops ?? 0),
    repeat_views: Number(ad.repeat_views ?? ad.repeats ?? ad.repeated_views ?? 0),
    attention_score: Number(ad.attention_score ?? 0),
    created_at: normalizeFeedTimestamp(createdAtValue),
  };
}

function sortAdsNewestFirst(ads = []) {
  return [...ads].sort((first, second) => getStoredAdCreatedAt(second) - getStoredAdCreatedAt(first));
}

function rebuildAdIndexes() {
  adIndexes.byUserId = new Map();
  adIndexes.byCreatedAt = sortAdsNewestFirst(database.ads);

  for (const ad of database.ads) {
    const userId = getStoredAdUserId(ad);
    if (!userId) {
      continue;
    }

    if (!adIndexes.byUserId.has(userId)) {
      adIndexes.byUserId.set(userId, []);
    }

    adIndexes.byUserId.get(userId).push(ad);
  }

  for (const [userId, ads] of adIndexes.byUserId.entries()) {
    adIndexes.byUserId.set(userId, sortAdsNewestFirst(ads));
  }
}

function storeAdRecord(ad) {
  database.ads.push(ad);
  const userId = getStoredAdUserId(ad);

  if (userId) {
    if (!adIndexes.byUserId.has(userId)) {
      adIndexes.byUserId.set(userId, []);
    }

    adIndexes.byUserId.get(userId).unshift(ad);
  }

  adIndexes.byCreatedAt.unshift(ad);
  return ad;
}

function isPublishRequestRateLimited(userId, ipAddress) {
  const key = sanitizePublishAdString(userId || ipAddress || "anonymous");
  const now = Date.now();
  const recentAttempts = (publishRateTracker.get(key) || [])
    .filter((timestamp) => now - timestamp < publishRateLimitWindowMs);

  recentAttempts.push(now);
  publishRateTracker.set(key, recentAttempts);

  return recentAttempts.length > publishRateLimitMaxRequests;
}

function validatePublishAdPayload(body = {}) {
  const userId = sanitizePublishAdString(body.user_id || body.userId);
  const adType = sanitizePublishAdString(body.ad_type || body.adType).toLowerCase();
  const title = sanitizePublishAdString(body.title);
  const description = sanitizePublishAdString(body.description);
  const mediaUrl = sanitizePublishAdString(body.media_url || body.mediaUrl);
  const country = sanitizePublishAdString(body.country);
  const rawPrice = body.price;
  const price = typeof rawPrice === "number" ? rawPrice : Number.parseFloat(`${rawPrice ?? ""}`);
  const errors = [];

  if (!userId) {
    errors.push("user_id");
  }

  if (!title || title.length > 150) {
    errors.push("title");
  }

  if (!description || description.length > 5000) {
    errors.push("description");
  }

  if (!PUBLISH_AD_TYPES.has(adType)) {
    errors.push("ad_type");
  }

  if ((adType === "image" || adType === "video") && !mediaUrl) {
    errors.push("media_url");
  }

  if (mediaUrl && mediaUrl.length > 2048) {
    errors.push("media_url");
  }

  if (!country || country.length > 120) {
    errors.push("country");
  }

  if (rawPrice === undefined || rawPrice === null || `${rawPrice}`.trim() === "" || !Number.isFinite(price) || price < 0) {
    errors.push("price");
  }

  return {
    isValid: errors.length === 0,
    errors: [...new Set(errors)],
    value: {
      user_id: userId,
      ad_type: adType,
      title,
      description,
      media_url: mediaUrl,
      price: Number.isFinite(price) ? price : 0,
      country,
    },
  };
}

const NOTIFICATION_PRIORITY_ORDER = Object.freeze({
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
});
const MAX_NOTIFICATIONS = 50;

const getValidNotificationDate = (value) => {
  const parsedDate = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const normalizeNotificationType = (type) => {
  const rawType = `${type || "system"}`.trim().toLowerCase();

  if (rawType === "message") {
    return "message";
  }

  if (["reply", "ad_comment", "review"].includes(rawType)) {
    return "reply";
  }

  if (rawType === "referral" || rawType.startsWith("referral_")) {
    return "referral";
  }

  return "system";
};

const getNotificationPriority = (type, metadata = {}) => {
  const normalizedType = normalizeNotificationType(type);
  const priorityHint = `${metadata.priorityHint || metadata.priority || ""}`.toUpperCase();

  if (priorityHint && NOTIFICATION_PRIORITY_ORDER[priorityHint]) {
    return priorityHint;
  }

  if (normalizedType === "message" || normalizedType === "reply") {
    return "HIGH";
  }

  if (normalizedType === "referral" || metadata.category === "ad_engagement") {
    return "MEDIUM";
  }

  return "LOW";
};

const formatNotificationTimeAgo = (dateValue) => {
  const createdAt = getValidNotificationDate(dateValue);
  const seconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  if (seconds < 172800) return "Yesterday";
  return `${Math.floor(seconds / 86400)} days ago`;
};

const getNotificationRedirectUrl = (notification = {}) => {
  const metadata = notification.metadata || {};
  const normalizedType = normalizeNotificationType(notification.type);

  if (normalizedType === "message") {
    return metadata.chat_id ? `/chat/${metadata.chat_id}` : (notification.link || "/chat");
  }

  if (normalizedType === "reply") {
    return metadata.ad_id ? `/ad/${metadata.ad_id}` : (notification.link || "/ads");
  }

  if (normalizedType === "referral") {
    return "/referrals";
  }

  return notification.link || "/updates";
};

const getNotificationIcon = (notification = {}) => {
  const priority = `${notification.priority || "LOW"}`.toUpperCase();
  const normalizedType = normalizeNotificationType(notification.type);

  if (normalizedType === "message" || normalizedType === "reply" || priority === "HIGH") {
    return "🔴";
  }

  if (normalizedType === "referral" || priority === "MEDIUM") {
    return "🟡";
  }

  return "⚪";
};

const serializeNotification = (notification) => {
  const createdAt = getValidNotificationDate(notification.createdAt || notification.created_at);
  const metadata = {
    ...(notification.metadata || {}),
  };
  const type = normalizeNotificationType(notification.type || metadata.source_type);
  const priority = getNotificationPriority(type, metadata);
  const isRead = Boolean(notification.isRead ?? notification.is_read);
  const redirectUrl = getNotificationRedirectUrl({
    ...notification,
    type,
    metadata,
  });
  const icon = getNotificationIcon({ type, priority });

  return {
    ...notification,
    type,
    priority,
    isRead,
    is_read: isRead,
    metadata,
    icon,
    uiClass: priority.toLowerCase(),
    redirectUrl,
    createdAt: createdAt.toISOString(),
    created_at: createdAt.toISOString(),
    timeAgo: formatNotificationTimeAgo(createdAt),
    preview: `${icon} ${notification.title || notification.message || "Notification"}`,
  };
};

const getUserNotificationsPayload = (userId) => {
  const normalizedNotifications = database.notifications
    .filter((notification) => notification.userId === userId)
    .map(serializeNotification)
    .sort((a, b) => {
      if (NOTIFICATION_PRIORITY_ORDER[a.priority] !== NOTIFICATION_PRIORITY_ORDER[b.priority]) {
        return NOTIFICATION_PRIORITY_ORDER[a.priority] - NOTIFICATION_PRIORITY_ORDER[b.priority];
      }

      return new Date(b.created_at) - new Date(a.created_at);
    });

  const visibleNotifications = normalizedNotifications.slice(0, MAX_NOTIFICATIONS);
  const unreadCount = normalizedNotifications.filter(
    (notification) => !notification.isRead && notification.priority !== "LOW"
  ).length;

  return {
    notifications: visibleNotifications,
    unreadCount,
    totalCount: normalizedNotifications.length,
    hiddenCount: Math.max(0, normalizedNotifications.length - visibleNotifications.length),
    maxVisible: MAX_NOTIFICATIONS,
    priorityOrder: NOTIFICATION_PRIORITY_ORDER,
  };
};

const createNotification = ({
  id = uuidv4(),
  userId,
  type = "system",
  title,
  message,
  metadata = {},
  link = null,
  isRead = false,
  createdAt = new Date(),
}) => {
  const normalizedType = normalizeNotificationType(type);
  const createdAtDate = getValidNotificationDate(createdAt);
  const notification = {
    id,
    userId,
    type: normalizedType,
    priority: getNotificationPriority(normalizedType, metadata),
    title,
    message,
    metadata: {
      ...metadata,
      source_type: type,
    },
    link: link || getNotificationRedirectUrl({ type: normalizedType, metadata }),
    isRead,
    createdAt: createdAtDate,
  };

  database.notifications.push(notification);
  return serializeNotification(notification);
};

const createNotifications = (...notifications) => notifications.flat().map(createNotification);

// Simple in-memory locks to prevent race conditions per-user
const userLocks = new Map();

// Initialize with sample data
const initializeDatabase = () => {
  // Create sample workspace first
  const workspaceId = uuidv4();
  const sampleWorkspace = {
    id: workspaceId,
    name: "Demo Company",
    ownerId: null, // Will be set after user creation
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Sample user with El Hannora auth schema
  const hashedPassword = bcrypt.hashSync("Password123", 10);
  const userId = uuidv4();
  const sampleUser = {
    id: userId,
    fullName: "Demo User",
    email: "demo@gmail.com",
    password: hashedPassword,
    companyName: "Demo Company",
    workspaceId: workspaceId,
    
    // Account status
    status: "active",
    role: "user",
    is_admin: false,
    phone: "+1-555-0100",
    
    // Terms acceptance
    termsAccepted: true,
    termsAcceptedAt: new Date(),
    termsVersion: "1.0",
    
    // Security
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    
    // Subscription
    subscriptionPlan: "free",
    subscriptionExpiresAt: null,
    
    // Legacy fields for backward compatibility
    age: 25,
    location: "New York",
    coins: 5000,
    coin_balance: 5000,
    current_streak: 0,
    total_streak_days: 0,
    last_streak_claimed_at: null,
    isPremium: false,
    premiumExpiresAt: null,
    
    // Trust Score System
    trust_score: 55, // Started at 30 + 10 (email verified) + 15 (365+ days account age)
    email_verified: true,
    email_verification_rewarded: true,
    age_bonus_30_days_rewarded: true,
    age_bonus_180_days_rewarded: true,
    age_bonus_365_days_rewarded: true,
    
    // Timestamps
    createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days old account
    updatedAt: new Date()
  };
  
  const adminId = uuidv4();
  const sampleAdmin = {
    id: adminId,
    fullName: "Enterprise Admin",
    email: "admin@elh.com",
    password: hashedPassword,
    companyName: "EL HANNORA",
    workspaceId,
    status: "active",
    role: "admin",
    is_admin: true,
    phone: "+1-555-0199",
    termsAccepted: true,
    termsAcceptedAt: new Date(),
    termsVersion: "1.0",
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    subscriptionPlan: "enterprise",
    subscriptionExpiresAt: null,
    age: 32,
    location: "New York",
    coins: 0,
    coin_balance: 0,
    current_streak: 0,
    total_streak_days: 0,
    last_streak_claimed_at: null,
    isPremium: true,
    premiumExpiresAt: null,
    trust_score: 100,
    email_verified: true,
    email_verification_rewarded: true,
    age_bonus_30_days_rewarded: true,
    age_bonus_180_days_rewarded: true,
    age_bonus_365_days_rewarded: true,
    createdAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  };

  // Update workspace owner
  sampleWorkspace.ownerId = userId;
  
  database.workspaces.push(sampleWorkspace);
  database.users.push(sampleUser, sampleAdmin);

  // Sample ads with complete search schema
  const sampleAds = [
    {
      id: uuidv4(),
      title: "iPhone 15 Pro Max 256GB",
      description: "Brand new sealed iPhone 15 Pro Max with Apple warranty. Natural Titanium color.",
      category: "electronics",
      price: 1199.99,
      currency: "USD",
      location_country: "USA",
      location_city: "New York",
      latitude: 40.7128,
      longitude: -74.0060,
      condition: "new",
      seller_id: userId,
      seller_type: "verified_business",
      trust_score: 95,
      is_verified: true,
      ai_approved: true,
      views: 4500,
      clicks: 890,
      likes: 234,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "MacBook Pro 14\" M3 Pro",
      description: "Latest MacBook Pro with M3 Pro chip, 18GB RAM, 512GB SSD. Space Black.",
      category: "electronics",
      price: 1999.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Los Angeles",
      latitude: 34.0522,
      longitude: -118.2437,
      condition: "new",
      seller_id: userId,
      seller_type: "business",
      trust_score: 88,
      is_verified: true,
      ai_approved: false,
      views: 3200,
      clicks: 567,
      likes: 189,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Toyota Camry 2023",
      description: "Low mileage Toyota Camry, excellent condition, single owner, full service history.",
      category: "vehicles",
      price: 28500.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Chicago",
      latitude: 41.8781,
      longitude: -87.6298,
      condition: "used",
      seller_id: userId,
      seller_type: "individual",
      trust_score: 72,
      is_verified: false,
      ai_approved: true,
      views: 2100,
      clicks: 345,
      likes: 67,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Nike Air Jordan 1 Retro High",
      description: "Brand new Air Jordan 1 Retro High OG, size 10, Chicago colorway. Deadstock.",
      category: "fashion",
      price: 180.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Miami",
      latitude: 25.7617,
      longitude: -80.1918,
      condition: "new",
      seller_id: userId,
      seller_type: "business",
      trust_score: 82,
      is_verified: true,
      ai_approved: true,
      views: 1800,
      clicks: 290,
      likes: 156,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Samsung 65\" QLED 4K Smart TV",
      description: "Samsung QN65Q80C QLED TV, like new condition, barely used, with original box.",
      category: "electronics",
      price: 899.99,
      currency: "USD",
      location_country: "USA",
      location_city: "Houston",
      latitude: 29.7604,
      longitude: -95.3698,
      condition: "refurbished",
      seller_id: userId,
      seller_type: "verified_business",
      trust_score: 91,
      is_verified: true,
      ai_approved: true,
      views: 2800,
      clicks: 410,
      likes: 98,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Professional Web Development Services",
      description: "Full-stack web development services. React, Node.js, Python. 5+ years experience.",
      category: "services",
      price: 75.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Austin",
      latitude: 30.2672,
      longitude: -97.7431,
      condition: "new",
      seller_id: userId,
      seller_type: "individual",
      trust_score: 85,
      is_verified: true,
      ai_approved: true,
      views: 1200,
      clicks: 180,
      likes: 45,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "3BR Apartment Downtown Dallas",
      description: "Luxury 3-bedroom apartment in downtown Dallas. Modern finishes, great views, parking included.",
      category: "real_estate",
      price: 2500.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Dallas",
      latitude: 32.7767,
      longitude: -96.7970,
      condition: "new",
      seller_id: userId,
      seller_type: "business",
      trust_score: 78,
      is_verified: true,
      ai_approved: false,
      views: 3500,
      clicks: 520,
      likes: 89,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Sony PlayStation 5 Console",
      description: "PS5 Disc Edition, excellent condition, comes with 2 controllers and 3 games.",
      category: "electronics",
      price: 450.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Phoenix",
      latitude: 33.4484,
      longitude: -112.0740,
      condition: "used",
      seller_id: userId,
      seller_type: "individual",
      trust_score: 65,
      is_verified: false,
      ai_approved: true,
      views: 2200,
      clicks: 380,
      likes: 124,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Online Math Tutoring",
      description: "Expert math tutoring for all levels. SAT, ACT, Calculus, Statistics. Certified teacher.",
      category: "education",
      price: 45.00,
      currency: "USD",
      location_country: "USA",
      location_city: "Boston",
      latitude: 42.3601,
      longitude: -71.0589,
      condition: "new",
      seller_id: userId,
      seller_type: "individual",
      trust_score: 90,
      is_verified: true,
      ai_approved: true,
      views: 980,
      clicks: 145,
      likes: 67,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      title: "Senior Software Engineer Position",
      description: "Hiring Senior Software Engineer. Remote friendly. Competitive salary. Full benefits.",
      category: "jobs",
      price: 0,
      currency: "USD",
      location_country: "USA",
      location_city: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      condition: "new",
      seller_id: userId,
      seller_type: "verified_business",
      trust_score: 96,
      is_verified: true,
      ai_approved: true,
      views: 5200,
      clicks: 890,
      likes: 234,
      status: "active",
      media: [],
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
      updated_at: new Date()
    }
  ];
  
  // Add all sample ads to database
  sampleAds.forEach(ad => storeAdRecord(ad));
  rebuildAdIndexes();

  // Sample notification
  createNotification({
    userId: sampleUser.id,
    type: "system",
    title: "Welcome to EL HANNORA!",
    message: "Start exploring amazing ads and earn coins!",
    metadata: {
      event: "welcome",
      screen: "updates",
    },
  });

  console.log("✅ Database initialized with sample data");
  console.log("   Demo profiles are ready for phone + OTP authentication");
  console.log(`   Sample ads: ${sampleAds.length} ads loaded`);
};

try {
  initializeDatabase();
  database.users.forEach(ensureUserProfileDefaults);
  startupReadiness.databaseConnected = Array.isArray(database.transactions);
  console.log("Database connected successfully");
} catch (error) {
  startupReadiness.databaseConnected = false;
  console.error("❌ Database bootstrap failed. Server will continue with an empty in-memory dataset.", error);
}
console.warn(
  "\n⚠️  WARNING: All application data (users, ads, messages, notifications, follows) is stored\n" +
  "   IN MEMORY and will be LOST when the server restarts. This is not suitable for production.\n" +
  "   Integrate a persistent database (PostgreSQL, MongoDB, etc.) before going live.\n"
);

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: "Access token required" 
    });
  }

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      error: "Session has been logged out. Please sign in again"
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        error: "Invalid or expired token" 
      });
    }

    const resolvedUserId = user.userId || user.id;
    const currentUser = database.users.find((existingUser) => existingUser.id === resolvedUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    ensureUserProfileDefaults(currentUser);
    touchUserDailyActivity(currentUser);

    req.user = {
      id: resolvedUserId,
      userId: resolvedUserId,
      fullName: currentUser.fullName || currentUser.name || null,
      phoneNumber: user.phoneNumber || currentUser.phone_number || currentUser.phoneNumber || null,
    };
    req.currentUser = currentUser;
    req.token = token;
    next();
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const sanitizeUser = (user) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

function sanitizeUsernameCandidate(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 20);
}

function generateUniqueUsername(user) {
  const emailSeed = user?.email ? `${user.email}`.split("@")[0] : "";
  const nameSeed = user?.username || user?.name || user?.fullName || emailSeed || "user";
  const base = sanitizeUsernameCandidate(nameSeed) || `user${`${user?.id || ""}`.replace(/-/g, "").slice(0, 6)}`;
  let candidate = base;
  let suffix = 1;

  while (database.users.some((existingUser) => existingUser.id !== user.id && `${existingUser.username || ""}`.toLowerCase() === candidate.toLowerCase())) {
    candidate = `${base}${suffix}`.slice(0, 24);
    suffix += 1;
  }

  return candidate;
}

function generateUniqueReferralCode(user) {
  const seed = `${user?.username || user?.fullName || user?.email || "ELH"}`
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 6) || "ELH";

  let attempts = 0;
  let code = `${seed}1000`;

  do {
    code = `${seed}${Math.floor(1000 + Math.random() * 9000)}`;
    attempts += 1;
  } while (
    database.users.some((existingUser) => existingUser.id !== user.id && `${existingUser.referral_code || ""}`.toUpperCase() === code) &&
    attempts < 100
  );

  return code;
}

function buildReferralLink(referralCode) {
  return `${APP_BASE_URL}/register?ref=${encodeURIComponent(referralCode)}`;
}

function normalizeDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getUtcDayDifference(previousDate, nextDate = new Date()) {
  if (!previousDate) return null;
  const previous = new Date(previousDate);
  const next = new Date(nextDate);

  if (Number.isNaN(previous.getTime()) || Number.isNaN(next.getTime())) {
    return null;
  }

  const previousUtc = Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth(), previous.getUTCDate());
  const nextUtc = Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate());

  return Math.floor((nextUtc - previousUtc) / (24 * 60 * 60 * 1000));
}

function ensureUserProfileDefaults(user) {
  if (!user) return null;

  if (!user.fullName && user.name) user.fullName = user.name;
  if (!user.name && user.fullName) user.name = user.fullName;
  if (!user.username) user.username = generateUniqueUsername(user);

  if (user.profile_picture == null) {
    user.profile_picture = user.profilePhoto || null;
  }
  if (user.profilePhoto == null) {
    user.profilePhoto = user.profile_picture || null;
  }

  const computedCoinBalance = Number.isFinite(Number(user.coin_balance))
    ? Number(user.coin_balance)
    : Number.isFinite(Number(user.coins))
      ? Number(user.coins)
      : 0;

  user.coin_balance = computedCoinBalance;
  user.coins = computedCoinBalance;

  const resolvedDailyStreak = Math.max(
    Number(user.daily_streak) || 0,
    Number(user.current_streak) || 0,
    Number(user.streak_count) || 0,
  );

  user.daily_streak = resolvedDailyStreak;
  user.current_streak = resolvedDailyStreak;
  user.streak_count = resolvedDailyStreak;
  user.last_active_date = user.last_active_date || user.lastLoginAt || user.createdAt || new Date().toISOString();

  if (!Number.isFinite(Number(user.trust_score))) {
    user.trust_score = Number.isFinite(Number(user.trustScore)) ? Number(user.trustScore) : 50;
  }
  if (!Number.isFinite(Number(user.total_referrals))) user.total_referrals = 0;
  if (!Number.isFinite(Number(user.referral_coins_earned))) user.referral_coins_earned = 0;
  if (!user.referral_code) user.referral_code = generateUniqueReferralCode(user);
  user.referral_link = buildReferralLink(user.referral_code);

  return user;
}

function touchUserDailyActivity(user) {
  if (!user) return null;

  ensureUserProfileDefaults(user);

  const now = new Date();
  const dayDifference = getUtcDayDifference(user.last_active_date, now);

  if (dayDifference == null) {
    user.daily_streak = Math.max(1, Number(user.daily_streak) || 0);
    user.current_streak = user.daily_streak;
    user.streak_count = user.daily_streak;
    user.last_active_date = now.toISOString();
    user.updatedAt = now;
    invalidateProfileCache(user.id);
    return user;
  }

  if (dayDifference >= 2) {
    user.daily_streak = 1;
    user.current_streak = 1;
    user.streak_count = 1;
    user.last_active_date = now.toISOString();
    user.updatedAt = now;
    invalidateProfileCache(user.id);
  } else if (dayDifference === 1) {
    const nextStreak = Math.max(1, Number(user.daily_streak) || 0) + 1;
    user.daily_streak = nextStreak;
    user.current_streak = nextStreak;
    user.streak_count = nextStreak;
    user.last_active_date = now.toISOString();
    user.updatedAt = now;
    invalidateProfileCache(user.id);
  } else if (dayDifference === 0 && !(Number(user.daily_streak) > 0)) {
    user.daily_streak = 1;
    user.current_streak = 1;
    user.streak_count = 1;
    user.last_active_date = now.toISOString();
    user.updatedAt = now;
    invalidateProfileCache(user.id);
  }

  return user;
}

function invalidateProfileCache(userId) {
  if (userId) {
    profileCache.delete(userId);
  }
}

function buildProfileOverview(user) {
  ensureUserProfileDefaults(user);

  const currentUpdatedAt = new Date(user.updatedAt || user.last_active_date || 0).getTime();
  const cachedEntry = profileCache.get(user.id);
  if (cachedEntry && cachedEntry.expiresAt > Date.now() && cachedEntry.updatedAt === currentUpdatedAt) {
    return cachedEntry.data;
  }

  const profile = {
    user_id: user.id,
    username: user.username,
    email: user.email || null,
    profile_picture: user.profile_picture || null,
    daily_streak: Math.max(Number(user.daily_streak) || 0, Number(user.current_streak) || 0),
    coin_balance: Number(user.coin_balance) || 0,
    trust_score: Number(user.trust_score) || 0,
    last_active_date: normalizeDateOnly(user.last_active_date),
  };

  profileCache.set(user.id, {
    data: profile,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
    updatedAt: currentUpdatedAt,
  });

  return profile;
}

function detectPostTypeFromMedia(ad) {
  const explicitType = `${ad?.type || ad?.adType || ad?.ad_type || ""}`.trim().toLowerCase();
  if (["text", "video", "image"].includes(explicitType)) {
    return explicitType;
  }

  const media = extractFeedMedia(ad);
  if (media.video_url) {
    return "video";
  }

  if (media.image_url) {
    return "image";
  }

  const hasTextContent = Boolean(`${ad?.title || ad?.description || ad?.caption || ""}`.trim());
  return hasTextContent ? "text" : "image";
}

function normalizeProfilePostQuery(query = {}) {
  const requestedFilter = `${query.filter || "recent"}`.trim().toLowerCase();
  const filter = PROFILE_POST_FILTERS.has(requestedFilter) ? requestedFilter : "recent";

  const parsedPage = Number.parseInt(query.page, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit = Number.parseInt(query.limit, 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : PROFILE_POSTS_DEFAULT_LIMIT;
  const limit = Math.min(safeLimit, PROFILE_POSTS_MAX_LIMIT);

  return {
    filter,
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function buildUserProfilePost(ad) {
  const media = extractFeedMedia(ad);
  const views = Math.max(Number(ad?.views ?? ad?.view_count ?? 0), 0);
  const scrollStops = Math.max(Number(ad?.scroll_stops ?? ad?.scrollStops ?? 0), 0);
  const repeatedViews = Math.max(Number(ad?.repeated_views ?? ad?.repeat_views ?? ad?.repeats ?? 0), 0);
  const computedAttentionScore = views + scrollStops + (repeatedViews * 2);
  const storedAttentionScore = Math.max(Number(ad?.attention_score ?? ad?.attentionScore ?? 0), 0);
  const createdAt = new Date(ad?.created_at || ad?.createdAt || new Date());

  return {
    post_id: `${ad?.post_id || ad?.id || ""}`,
    type: detectPostTypeFromMedia(ad),
    title: `${ad?.title || ad?.caption || "Untitled post"}`,
    description: `${ad?.description || ad?.caption || ""}`,
    media: {
      image_url: media.image_url || "",
      video_url: media.video_url || "",
    },
    media_url: media.image_url || media.video_url || null,
    price: Number(ad?.price ?? 0),
    attention_score: computedAttentionScore > 0 ? computedAttentionScore : storedAttentionScore,
    views,
    scroll_stops: scrollStops,
    repeated_views: repeatedViews,
    created_at: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
    caption: ad?.caption || ad?.description || null,
  };
}

function getUserProfilePosts(userId, options = {}) {
  const { filter = "recent" } = options;

  let posts = database.ads
    .filter((ad) => [ad?.userId, ad?.user_id, ad?.seller_id, ad?.authorId].some((ownerId) => ownerId === userId))
    .map(buildUserProfilePost);

  if (filter === "text") {
    posts = posts.filter((post) => post.type === "text");
  }

  if (filter === "popular") {
    posts.sort((left, right) => {
      if (right.attention_score !== left.attention_score) {
        return right.attention_score - left.attention_score;
      }

      return new Date(right.created_at) - new Date(left.created_at);
    });
  } else {
    posts.sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
  }

  return posts;
}

function getUserProfilePostHistory(userId, query = {}) {
  const { filter, page, limit, offset } = normalizeProfilePostQuery(query);
  const allPosts = getUserProfilePosts(userId, { filter });

  return {
    posts: allPosts.slice(offset, offset + limit),
    total: allPosts.length,
    page,
    limit,
    filter,
  };
}

function buildPostSummary(posts) {
  const totalPosts = posts.length;
  const totalVideos = posts.filter((post) => post.type === "video").length;
  const totalImages = posts.filter((post) => post.type === "image").length;
  const totalText = posts.filter((post) => post.type === "text").length;
  const averageAttentionScore = totalPosts > 0
    ? Math.round(posts.reduce((sum, post) => sum + (Number(post.attention_score) || 0), 0) / totalPosts)
    : 0;

  return {
    total_posts: totalPosts,
    total_videos: totalVideos,
    total_images: totalImages,
    total_text: totalText,
    videos: totalVideos,
    images: totalImages,
    text: totalText,
    avg_attention_score: averageAttentionScore,
    average_attention_score: averageAttentionScore,
  };
}

function buildReferralSnapshot(user) {
  ensureUserProfileDefaults(user);

  return {
    referral_code: user.referral_code,
    referral_link: user.referral_link,
    total_referrals: Number(user.total_referrals) || 0,
    referral_coins_earned: Number(user.referral_coins_earned) || 0,
  };
}

function isTokenBlacklisted(token) {
  if (!Array.isArray(database.tokenBlacklist)) {
    database.tokenBlacklist = [];
    return false;
  }

  const now = Date.now();
  database.tokenBlacklist = database.tokenBlacklist.filter((entry) => {
    // Purge entries with no expiry (they would otherwise live forever) and expired entries.
    if (!entry?.expiresAt) return false;
    return new Date(entry.expiresAt).getTime() > now;
  });

  return database.tokenBlacklist.some((entry) => entry.token === token);
}

function blacklistToken(token, userId = null) {
  if (!token) return;
  if (!Array.isArray(database.tokenBlacklist)) {
    database.tokenBlacklist = [];
  }
  if (database.tokenBlacklist.some((entry) => entry.token === token)) {
    return;
  }

  const decoded = jwt.decode(token);
  database.tokenBlacklist.push({
    token,
    userId,
    invalidatedAt: new Date().toISOString(),
    expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
  });
}

// ============================================
// AI STRATEGY GENERATION
// ============================================

async function generateEnterpriseAIReport({
  campaign_objective,
  target_market,
  target_audience,
  brand_tone,
  existing_ad_text
}) {
  async function withExternalTimeout(taskFn, timeoutMs, label) {
    let timeoutHandle;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const taskPromise = Promise.resolve().then(() => taskFn());
      return await Promise.race([taskPromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  if (!openai) {
    throw new Error("AI service unavailable. Configure OPENAI_API_KEY and retry.");
  }

  const prompt = `
You are an expert enterprise advertising strategist for global brands.

Business Objective: ${campaign_objective}
Target Market: ${target_market}
Target Audience: ${target_audience}
Brand Tone: ${brand_tone}
Existing Ad Text: ${existing_ad_text || "None"}

Generate a professional, executive-level advertising strategy in JSON format ONLY.
The JSON must include:

{
  "generated_ad_copy": "An improved, professional ad copy tailored to the brand and target audience, usable worldwide",
  "positioning_strategy": "Advice on positioning to outperform competitors across all relevant markets",
  "ab_test_suggestions": {
    "variant_A": "Description of first A/B test ad variant",
    "variant_B": "Description of second A/B test ad variant"
  },
  "improvement_suggestions": "Actionable suggestions to improve ad performance globally"
}

Requirements:
- Do NOT include any text outside the JSON.
- Be concise, professional, and executive-level.
- Ensure ad copy and strategy are suitable for multiple countries and cultures.
- Tailor recommendations to the brand tone and target audience.
- Include actionable, realistic A/B test suggestions.
- Avoid filler or explanations; the output must be ready for frontend display.
`;

  let aiResponse;
  try {
    aiResponse = await withExternalTimeout(
      () => openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
      EXTERNAL_CALL_TIMEOUT_MS,
      "OpenAI API call"
    );
  } catch (error) {
    console.error("🔥 External AI call failed:", error);
    throw new Error("AI service unavailable. External request failed or timed out.");
  }

  try {
    const aiOutput = JSON.parse(aiResponse.choices[0].message.content);
    return aiOutput;
  } catch (error) {
    console.error("Error parsing AI JSON output:", error);
    throw new Error("AI returned invalid JSON. Try again.");
  }
}

// ============================================
// ROUTES
// ============================================

// Feature routes are registered centrally in ./backend/routes/index.js

// Admin Dashboard (MVP, future DB-ready)
const adminDataSource = createAdminDataSource(database);
const adminRoutes = createAdminRouter({
  requireAdmin: createRequireAdmin({
    jwtSecret: JWT_SECRET,
    getUserById: (userId) => database.users.find((user) => user.id === userId),
  }),
  getDashboard: createGetAdminDashboardHandler(adminDataSource),
});
app.use("/admin", adminRoutes);

// ============================================
// AI STRATEGY ENDPOINTS
// ============================================

// POST /ai/enterprise-report
app.post("/ai/enterprise-report", async (req, res) => {
  return res.status(410).json({
    success: false,
    error: "Legacy standalone AI endpoint is disabled",
    migration: "Use deterministic AI endpoints registered under backend/modules/ai",
  });
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================
// Registered centrally by the Auth module in `backend/modules/auth`.

// ============================================
// USER ENDPOINTS
// ============================================

// GET /user/profile
app.get("/user/profile", authenticateToken, (req, res) => {
  try {
    const user = database.users.find((existingUser) => existingUser.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    ensureUserProfileDefaults(user);
    const sanitized = sanitizeUser(user);
    const profile = buildProfileOverview(user);
    const posts = getUserProfilePosts(user.id);
    const postSummary = buildPostSummary(posts);
    const referral = buildReferralSnapshot(user);

    res.json({
      success: true,
      ...sanitized,
      ...profile,
      current_streak: profile.daily_streak,
      total_streak_days: user.total_streak_days || 0,
      last_streak_claimed_at: user.last_streak_claimed_at || null,
      isPremium: user.isPremium,
      post_summary: postSummary,
      referral_data: referral,
      profile,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile"
    });
  }
});

// GET /api/user/profile (frontend compatibility alias)
app.get("/api/user/profile", authenticateToken, (req, res) => {
  try {
    const user = database.users.find((existingUser) => existingUser.id === req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    return res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch profile"
    });
  }
});

// POST /user/profile/picture
// Registered centrally by the Upload module in `backend/modules/upload`.

// GET /user/profile/posts/summary/:id
app.get("/user/profile/posts/summary/:id", authenticateToken, (req, res) => {
  try {
    const isAdmin = Boolean(req.currentUser?.is_admin === true || `${req.currentUser?.role || ""}`.toLowerCase() === "admin");
    if (req.user.id !== req.params.id && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Access denied"
      });
    }

    const user = database.users.find((existingUser) => existingUser.id === req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const summary = buildPostSummary(getUserProfilePosts(user.id));
    res.json({
      success: true,
      ...summary
    });
  } catch (error) {
    console.error("Profile posts summary error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch post summary"
    });
  }
});

// GET /profile/posts/:user_id
app.get(["/user/profile/posts/:id", "/profile/posts/:user_id", "/api/profile/posts/:user_id"], authenticateToken, (req, res) => {
  try {
    const requestedUserId = req.params.user_id || req.params.id;
    const user = database.users.find((existingUser) => existingUser.id === requestedUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const history = getUserProfilePostHistory(user.id, req.query);
    const isOwnerView = req.user.id === user.id;
    const posts = isOwnerView
      ? history.posts
      : history.posts.map((post) => ({
        post_id: post.post_id,
        type: post.type,
        title: post.title,
        media: post.media,
        price: post.price,
        attention_score: post.attention_score,
        views: post.views,
        created_at: post.created_at,
      }));

    res.json({
      success: true,
      posts,
      page: history.page,
      limit: history.limit,
      filter: history.filter,
      total: history.total,
      count: posts.length,
      access_scope: isOwnerView ? "full" : "limited",
      ...(posts.length === 0 ? { message: "No posts found" } : {}),
    });
  } catch (error) {
    console.error("Profile posts error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile posts"
    });
  }
});

// GET /user/profile/:id
app.get("/user/profile/:id", authenticateToken, (req, res) => {
  try {
    const isAdmin = Boolean(req.currentUser?.is_admin === true || `${req.currentUser?.role || ""}`.toLowerCase() === "admin");
    if (req.user.id !== req.params.id && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Access denied"
      });
    }

    const user = database.users.find((existingUser) => existingUser.id === req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    ensureUserProfileDefaults(user);
    const profile = buildProfileOverview(user);
    const posts = getUserProfilePosts(user.id);
    const postSummary = buildPostSummary(posts);
    const referral = buildReferralSnapshot(user);

    res.json({
      success: true,
      ...profile,
      post_summary: postSummary,
      referral_data: referral,
      profile,
    });
  } catch (error) {
    console.error("Profile by id error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile"
    });
  }
});

// PUT /user/profile
app.put("/user/profile", authenticateToken, (req, res) => {
  try {
    const userIndex = database.users.findIndex((user) => user.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const { fullName, username, age, location, bio } = req.body;
    const user = database.users[userIndex];

    if (fullName) user.fullName = `${fullName}`.trim();
    if (age !== undefined && age !== null && age !== "") user.age = parseInt(age, 10);
    if (location) user.location = `${location}`.trim();
    if (bio !== undefined) user.bio = `${bio}`.trim();

    if (username !== undefined) {
      const normalizedUsername = sanitizeUsernameCandidate(username);
      if (!normalizedUsername || normalizedUsername.length < 3) {
        return res.status(400).json({
          success: false,
          error: "Username must be at least 3 characters and contain only letters, numbers, dots, dashes, or underscores"
        });
      }

      const usernameTaken = database.users.some(
        (existingUser) => existingUser.id !== user.id && `${existingUser.username || ""}`.toLowerCase() === normalizedUsername.toLowerCase(),
      );

      const uniqueState = database.userConstraintState;
      const indexedOwner = uniqueState?.usernames?.get(normalizedUsername);
      if (usernameTaken || (indexedOwner && indexedOwner !== user.id)) {
        return res.status(409).json({
          success: false,
          error: "Username already in use"
        });
      }

      const previousUsername = sanitizeUsernameCandidate(user.username);
      if (uniqueState?.usernames && previousUsername && uniqueState.usernames.get(previousUsername) === user.id) {
        uniqueState.usernames.delete(previousUsername);
      }
      if (uniqueState?.usernames) {
        uniqueState.usernames.set(normalizedUsername, user.id);
      }

      user.username = normalizedUsername;
    }

    ensureUserProfileDefaults(user);
    user.updatedAt = new Date();
    database.users[userIndex] = user;
    invalidateProfileCache(user.id);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(user),
      profile: buildProfileOverview(user)
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile"
    });
  }
});

// ============================================
// PREMIUM ENDPOINTS
// ============================================
// Registered centrally by the Subscription module in `backend/modules/subscription`.

// ============================================
// ADS ENDPOINTS
// ============================================

function normalizeLocationPart(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildLocationDetails({ location, locality, city, country }) {
  const rawLocation = normalizeLocationPart(location);
  let resolvedLocality = normalizeLocationPart(locality);
  let resolvedCity = normalizeLocationPart(city);
  let resolvedCountry = normalizeLocationPart(country);

  if (rawLocation && (!resolvedCity || !resolvedCountry)) {
    const parts = rawLocation.split(",").map(part => part.trim()).filter(Boolean);

    if (parts.length === 1) {
      if (!resolvedCountry) resolvedCountry = parts[0];
    } else if (parts.length === 2) {
      if (!resolvedCity) resolvedCity = parts[0];
      if (!resolvedCountry) resolvedCountry = parts[1];
    } else if (parts.length >= 3) {
      if (!resolvedLocality) resolvedLocality = parts[0];
      if (!resolvedCity) resolvedCity = parts[parts.length - 2];
      if (!resolvedCountry) resolvedCountry = parts[parts.length - 1];
    }
  }

  const displayLocation = rawLocation || [resolvedLocality, resolvedCity, resolvedCountry]
    .filter(Boolean)
    .join(", ");

  return {
    displayLocation,
    locality: resolvedLocality || null,
    city: resolvedCity || null,
    country: resolvedCountry || null,
  };
}

function resolveUserAdPlan(user) {
  const normalizedPlan = (user?.subscriptionPlan || "").toLowerCase();
  if (["premium", "pro", "hot", "enterprise"].includes(normalizedPlan)) {
    return normalizedPlan;
  }

  return user?.isPremium ? "premium" : "normal";
}

const FEED_DEFAULT_LIMIT = 20;
const FEED_MAX_LIMIT = 30;

function parseFeedLimit(value) {
  const parsedLimit = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return FEED_DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, FEED_MAX_LIMIT);
}

function parseFeedPage(value) {
  const parsedPage = Number.parseInt(value, 10);
  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function resolveFeedRequestUser(req) {
  // Feed personalisation must ONLY use the verified JWT token.
  // The x-user-id header and user_id query param were removed to prevent impersonation.
  const token = req.headers.authorization?.split(" ")[1];

  if (!token || isTokenBlacklisted(token)) {
    return null;
  }

  try {
    const decodedUser = jwt.verify(token, JWT_SECRET);
    const resolvedUserId = decodedUser.userId || decodedUser.id;
    const currentUser = database.users.find((user) => user.id === resolvedUserId);

    if (!currentUser) {
      return null;
    }

    ensureUserProfileDefaults(currentUser);
    return currentUser;
  } catch (_error) {
    return null;
  }
}

function isFeedAdActive(ad) {
  if (!ad) {
    return false;
  }

  if (ad.active === false || ad.isActive === false) {
    return false;
  }

  if (ad.status && !["active", "published"].includes(`${ad.status}`.toLowerCase())) {
    return false;
  }

  return true;
}

function normalizeFeedTimestamp(value) {
  const parsedDate = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
}

function resolveLastSeenTime(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function countNewAdsSince(ads, lastSeenTime) {
  const parsedLastSeen = resolveLastSeenTime(lastSeenTime);

  if (!parsedLastSeen) {
    return 0;
  }

  return ads.filter((ad) => {
    if (!isFeedAdActive(ad)) {
      return false;
    }

    const createdAt = new Date(ad?.created_at || ad?.createdAt || 0);
    return !Number.isNaN(createdAt.getTime()) && createdAt > parsedLastSeen;
  }).length;
}

function isHomepageNewAd(ad, lastSeenTime = null) {
  const createdAt = new Date(ad?.created_at || ad?.createdAt || 0);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const parsedLastSeen = resolveLastSeenTime(lastSeenTime);
  if (parsedLastSeen) {
    return createdAt > parsedLastSeen;
  }

  return followSellerService.isNewAd(createdAt.toISOString());
}

function extractFeedMedia(ad) {
  const mediaItems = [];

  if (Array.isArray(ad?.media)) {
    mediaItems.push(...ad.media.filter(Boolean));
  }

  if (Array.isArray(ad?.mediaUrls)) {
    mediaItems.push(...ad.mediaUrls.filter(Boolean));
  }

  if (ad?.media_url) {
    mediaItems.push(ad.media_url);
  }

  const isVideoUrl = (url) => /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(`${url || ""}`) || `${ad?.adType || ad?.type || ""}`.toLowerCase() === "video";
  const imageUrl = mediaItems.find((item) => !isVideoUrl(item)) || "";
  const videoUrl = mediaItems.find((item) => isVideoUrl(item)) || "";

  return {
    image_url: imageUrl,
    video_url: videoUrl,
    has_watch_reward: Boolean(
      ad?.has_watch_reward ||
      ad?.watch_reward_enabled ||
      ad?.rewardCoins ||
      ad?.reward_coins
    ),
  };
}

function buildFeedSellerName(user, sellerId) {
  if (user?.username) return user.username;
  if (user?.companyName) return user.companyName;
  if (user?.fullName) return user.fullName;
  if (user?.name) return user.name;
  if (user?.email) return `${user.email}`.split("@")[0];
  return sellerId ? `seller_${sellerId}` : "unknown";
}

function buildHomepageFeedItem(ad, options = {}) {
  const {
    currentUserId = null,
    followedSellerIds = new Set(),
    attentionScoreLookup = new Map(),
    userLookup = new Map(),
    lastSeenTime = null,
  } = options;

  const adId = `${ad?.id || ad?.ad_id || ad?.post_id || ""}`;
  const sellerId = `${ad?.seller_id || ad?.userId || ad?.user_id || ""}`;
  const seller = userLookup.get(sellerId) || database.users.find((user) => user.id === sellerId) || null;
  const attentionData = attentionScoreLookup.get(adId) || attentionScoreService.getAttentionScore(adId);

  const views = Math.max(
    Number(ad?.views ?? ad?.view_count ?? 0),
    Number(attentionData?.seen_count ?? 0),
  );
  const scrollStops = Number(ad?.scroll_stops ?? ad?.scrollStops ?? attentionData?.scroll_stop_count ?? 0);
  const repeats = Number(ad?.repeats ?? ad?.repeat_views ?? ad?.repeated_views ?? attentionData?.repeated_view_count ?? 0);
  const fallbackAttentionScore = views + (scrollStops * 3) + (repeats * 5);
  const attentionScore = Number(ad?.attention_score ?? attentionData?.attention_score ?? fallbackAttentionScore);

  return {
    ad_id: adId,
    title: `${ad?.title || ""}`,
    description: `${ad?.description || ad?.caption || ""}`,
    media: extractFeedMedia(ad),
    price: Number(ad?.price ?? 0),
    user: {
      user_id: sellerId,
      username: buildFeedSellerName(seller, sellerId),
      country: `${seller?.location_country || seller?.country || ad?.location_country || seller?.location || ""}`,
      is_following: currentUserId ? followedSellerIds.has(sellerId) : false,
    },
    stats: {
      attention_score: attentionScore,
      views,
      scroll_stops: scrollStops,
      repeats,
    },
    is_new: isHomepageNewAd(ad, lastSeenTime),
    created_at: normalizeFeedTimestamp(ad?.created_at || ad?.createdAt),
  };
}

// GET /api/categories
app.get(["/api/categories", "/categories"], (_req, res) => {
  res.json(getAllAdCategories());
});

// POST /ads/create and /api/ads/create
// Registered centrally by the Upload module in `backend/modules/upload`.

// POST /ads/publish  (requires auth — user_id always comes from the verified token)
app.post("/ads/publish", authenticateToken, (req, res) => {
  try {
    // Always bind user_id from the authenticated token; never trust the request body.
    const bodyWithAuthUser = { ...req.body, user_id: req.user.id };
    const validation = validatePublishAdPayload(bodyWithAuthUser);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: validation.errors,
      });
    }

    if (isPublishRequestRateLimited(req.user.id, req.ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many publish attempts. Please wait before trying again.",
      });
    }

    const createdAt = new Date().toISOString();
    const adId = uuidv4();
    const publishedAd = {
      ad_id: adId,
      id: adId,
      user_id: validation.value.user_id,
      userId: validation.value.user_id,
      seller_id: validation.value.user_id,
      ad_type: validation.value.ad_type,
      adType: validation.value.ad_type,
      type: validation.value.ad_type,
      title: validation.value.title,
      description: validation.value.description,
      media_url: validation.value.media_url || "",
      media: validation.value.media_url ? [validation.value.media_url] : [],
      price: validation.value.price,
      country: validation.value.country,
      location_country: validation.value.country,
      status: "active",
      isActive: true,
      views: 0,
      scroll_stop: 0,
      repeat_views: 0,
      attention_score: 0,
      created_at: createdAt,
      createdAt,
    };

    storeAdRecord(publishedAd);

    return res.status(201).json({
      success: true,
      message: "Ad published successfully",
      ad: normalizePublishedAd(publishedAd),
    });
  } catch (error) {
    console.error("Publish ad error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to publish ad",
    });
  }
});

// GET /ads
app.get("/ads", (_req, res) => {
  try {
    const activeAds = (adIndexes.byCreatedAt.length ? adIndexes.byCreatedAt : sortAdsNewestFirst(database.ads))
      .filter(isAdActive)
      .map((ad) => normalizePublishedAd(ad));

    return res.json({
      success: true,
      ads: activeAds,
      total: activeAds.length,
    });
  } catch (error) {
    console.error("Fetch ads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ads",
    });
  }
});

// GET /ads/user/:user_id
app.get("/ads/user/:user_id", (req, res) => {
  try {
    const userId = sanitizePublishAdString(req.params.user_id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    const userAds = (adIndexes.byUserId.get(userId) || database.ads.filter((ad) => getStoredAdUserId(ad) === userId))
      .map((ad) => normalizePublishedAd(ad));

    return res.json({
      success: true,
      user_id: userId,
      ads: userAds,
      total: userAds.length,
    });
  } catch (error) {
    console.error("Fetch user ads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user ads",
    });
  }
});

// GET /ads/list
app.get("/ads/list", (req, res) => {
  try {
    const { category, search, country, city, locality, limit = 20, offset = 0 } = req.query;

    let ads = [...database.ads].filter(ad => ad.status === "active" || ad.isActive !== false);
    const requestedCountry = typeof country === "string" ? country.trim().toLowerCase() : "";
    const requestedCity = typeof city === "string" ? city.trim().toLowerCase() : "";
    const requestedLocality = typeof locality === "string" ? locality.trim().toLowerCase() : "";

    const matchesCountryReach = (ad) => {
      const locationDetails = buildLocationDetails({
        location: ad.location,
        locality: ad.location_locality,
        city: ad.location_city,
        country: ad.location_country,
      });
      const adCountry = (locationDetails.country || "").toLowerCase();
      const targetCountries = Array.isArray(ad.targetCountries)
        ? ad.targetCountries.map(item => `${item}`.toLowerCase())
        : [];
      return !!requestedCountry && (adCountry === requestedCountry || targetCountries.includes(requestedCountry));
    };

    if (category && category !== "All") {
      ads = ads.filter(ad => ad.category === category);
    }

    if (requestedCountry) {
      ads = ads.filter(ad => matchesCountryReach(ad));
    }

    if (requestedCity) {
      ads = ads.filter(ad => {
        const locationDetails = buildLocationDetails({
          location: ad.location,
          locality: ad.location_locality,
          city: ad.location_city,
          country: ad.location_country,
        });
        const adCity = (locationDetails.city || "").toLowerCase();
        return adCity === requestedCity || matchesCountryReach(ad);
      });
    }

    if (requestedLocality) {
      ads = ads.filter(ad => {
        const locationDetails = buildLocationDetails({
          location: ad.location,
          locality: ad.location_locality,
          city: ad.location_city,
          country: ad.location_country,
        });
        const adLocality = (locationDetails.locality || "").toLowerCase();
        return adLocality === requestedLocality || matchesCountryReach(ad);
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      ads = ads.filter(ad => 
        ad.title.toLowerCase().includes(searchLower) ||
        ad.description.toLowerCase().includes(searchLower) ||
        (ad.location || "").toLowerCase().includes(searchLower) ||
        (ad.location_city || "").toLowerCase().includes(searchLower) ||
        (ad.location_country || "").toLowerCase().includes(searchLower)
      );
    }

    const total = ads.length;
    const paginatedAds = sortAdsNewestFirst(ads)
      .slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10))
      .map((ad) => normalizePublishedAd(ad));

    res.json({
      success: true,
      ads: paginatedAds,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (error) {
    console.error("List ads error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch ads" 
    });
  }
});

// GET /ads/:id
app.get("/ads/:id", (req, res) => {
  try {
    const ad = database.ads.find(a => a.id === req.params.id);
    if (!ad) {
      return res.status(404).json({ 
        success: false,
        error: "Ad not found" 
      });
    }

    // Increment views
    ad.views = (ad.views || 0) + 1;

    res.json({
      success: true,
      ad
    });
  } catch (error) {
    console.error("Get ad error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch ad" 
    });
  }
});

// DELETE /ads/:id
app.delete("/ads/:id", authenticateToken, (req, res) => {
  try {
    const adIndex = database.ads.findIndex(a => a.id === req.params.id);
    if (adIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: "Ad not found" 
      });
    }

    const ad = database.ads[adIndex];
    if (ad.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        error: "Unauthorized to delete this ad" 
      });
    }

    database.ads.splice(adIndex, 1);
    rebuildAdIndexes();

    res.json({
      success: true,
      message: "Ad deleted successfully"
    });
  } catch (error) {
    console.error("Delete ad error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete ad" 
    });
  }
});

// ============================================
// HOMEPAGE FEED ENDPOINTS
// ============================================

// GET /feed and /api/feed
app.get(["/feed", "/api/feed"], (req, res) => {
  try {
    const type = `${req.query.type || "main"}`.trim().toLowerCase();
    const limit = parseFeedLimit(req.query.limit);
    const page = parseFeedPage(req.query.page);
    const offset = (page - 1) * limit;

    if (!["main", "follow"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feed type. Use "main" or "follow".',
      });
    }

    const currentUser = resolveFeedRequestUser(req);
    const followedSellerIds = currentUser
      ? new Set(followSellerService.getFollowedSellerIds(currentUser.id))
      : new Set();

    let selectedAds = [];
    let total = 0;
    let followingCount = followedSellerIds.size;
    let newAdsCount = 0;
    let lastSeenTime = req.query.last_seen_time || req.headers["x-last-seen-time"] || null;

    if (type === "follow") {
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          error: "Authentication required for follow feed",
          suggestion: "Browse main feed or provide a valid access token",
        });
      }

      lastSeenTime = lastSeenTime || currentUser.last_follow_feed_seen_at || null;
      newAdsCount = followSellerService.countNewAdsFromFollowedSellers(currentUser.id, database.ads, lastSeenTime);

      const followFeedResult = followSellerService.getFollowedFeed(currentUser.id, database.ads, {
        limit,
        offset,
        sortBy: "created_at",
        sortOrder: "DESC",
      });
      const followFeedData = followFeedResult?.data || { ads: [], total: 0, following_count: 0 };

      selectedAds = Array.isArray(followFeedData.ads) ? followFeedData.ads : [];
      total = Number(followFeedData.total || 0);
      followingCount = Number(followFeedData.following_count || followedSellerIds.size || 0);

      currentUser.last_follow_feed_seen_at = new Date().toISOString();
      currentUser.updatedAt = new Date();

      if (followingCount === 0) {
        return res.json({
          success: true,
          type,
          message: "No followed sellers yet",
          suggestion: "Browse main feed",
          ads: [],
          page,
          limit,
          total: 0,
          following_count: 0,
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0,
            has_more: false,
          },
        });
      }
    } else {
      const activeAds = [...database.ads]
        .filter(isFeedAdActive)
        .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

      lastSeenTime = lastSeenTime || currentUser?.last_main_feed_seen_at || null;
      newAdsCount = countNewAdsSince(activeAds, lastSeenTime);
      total = activeAds.length;
      selectedAds = activeAds.slice(offset, offset + limit);

      if (currentUser) {
        currentUser.last_main_feed_seen_at = new Date().toISOString();
        currentUser.updatedAt = new Date();
      }
    }

    const userLookup = new Map(database.users.map((user) => [user.id, user]));
    const attentionScores = attentionScoreService.getAttentionScoresBatch(
      selectedAds.map((ad) => `${ad?.id || ad?.ad_id || ad?.post_id || ""}`)
    );
    const attentionScoreLookup = new Map(
      attentionScores.map((scoreData) => [`${scoreData.ad_id}`, scoreData])
    );

    const ads = selectedAds.map((ad) => buildHomepageFeedItem(ad, {
      currentUserId: currentUser?.id || null,
      followedSellerIds,
      attentionScoreLookup,
      userLookup,
      lastSeenTime,
    }));

    res.json({
      success: true,
      type,
      ads,
      page,
      limit,
      total,
      new_ads_count: newAdsCount,
      refreshed_at: new Date().toISOString(),
      following_count: type === "follow" ? followingCount : undefined,
      pagination: {
        page,
        limit,
        total,
        total_pages: total > 0 ? Math.ceil(total / limit) : 0,
        has_more: offset + ads.length < total,
      },
    });
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch homepage feed",
    });
  }
});

// GET /feed/follow/new-count and /api/feed/follow/new-count
app.get(["/feed/follow/new-count", "/api/feed/follow/new-count"], (req, res) => {
  try {
    const currentUser = resolveFeedRequestUser(req);

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const requestedLastSeenTime = req.query.last_seen_time || req.headers["x-last-seen-time"] || currentUser.last_follow_feed_seen_at || null;

    if (req.query.last_seen_time && Number.isNaN(new Date(req.query.last_seen_time).getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid last_seen_time timestamp",
      });
    }

    const newAdsCount = followSellerService.countNewAdsFromFollowedSellers(
      currentUser.id,
      database.ads,
      requestedLastSeenTime,
    );

    res.json({
      success: true,
      new_ads_count: newAdsCount,
    });
  } catch (error) {
    console.error("Follow feed new count error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch new ads count",
    });
  }
});

// GET /user/following/count/:user_id and /api/user/following/count/:user_id
app.get(["/user/following/count/:user_id", "/api/user/following/count/:user_id"], (req, res) => {
  try {
    const { user_id: userId } = req.params;
    const user = database.users.find((existingUser) => existingUser.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      following_count: followSellerService.getFollowingCount(userId),
    });
  } catch (error) {
    console.error("Following count error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch following count",
    });
  }
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

// GET /notifications
app.get("/notifications", authenticateToken, (req, res) => {
  try {
    const notificationPayload = getUserNotificationsPayload(req.user.id);

    res.json({
      success: true,
      ...notificationPayload,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch notifications" 
    });
  }
});

// PUT /notifications/:id/read
app.put("/notifications/:id/read", authenticateToken, (req, res) => {
  try {
    const notificationIndex = database.notifications.findIndex(
      n => n.id === req.params.id && n.userId === req.user.id
    );

    if (notificationIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: "Notification not found" 
      });
    }

    database.notifications[notificationIndex].isRead = true;

    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to mark notification as read" 
    });
  }
});

// ============================================
// MESSAGES ENDPOINTS
// ============================================

// POST /messages/send
app.post("/messages/send", authenticateToken, (req, res) => {
  try {
    const { recipientId, message } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({ 
        success: false,
        error: "Recipient ID and message are required" 
      });
    }

    // Check if recipient exists
    const recipient = database.users.find(u => u.id === recipientId);
    if (!recipient) {
      return res.status(404).json({ 
        success: false,
        error: "Recipient not found" 
      });
    }

    const newMessage = {
      id: uuidv4(),
      senderId: req.user.id,
      recipientId,
      message,
      isRead: false,
      createdAt: new Date()
    };

    database.messages.push(newMessage);

    // Create notification for recipient
    createNotification({
      userId: recipientId,
      type: "message",
      title: `New message from ${req.user.fullName}`,
      message: message.length > 80 ? `${message.slice(0, 77)}...` : message,
      metadata: {
        chat_id: req.user.id,
        sender_id: req.user.id,
        sender_name: req.user.fullName,
      },
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to send message" 
    });
  }
});

// GET /messages/conversations
app.get("/messages/conversations", authenticateToken, (req, res) => {
  try {
    const userMessages = database.messages.filter(
      m => m.senderId === req.user.id || m.recipientId === req.user.id
    );

    // Group by conversation
    const conversations = {};
    userMessages.forEach(msg => {
      const otherUserId = msg.senderId === req.user.id ? msg.recipientId : msg.senderId;
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = [];
      }
      conversations[otherUserId].push(msg);
    });

    // Format response
    const formattedConversations = Object.keys(conversations).map(userId => {
      const messages = conversations[userId];
      const lastMessage = messages[messages.length - 1];
      const otherUser = database.users.find(u => u.id === userId);
      
      return {
        userId,
        userName: otherUser ? otherUser.fullName : "Unknown User",
        lastMessage: lastMessage.message,
        lastMessageTime: lastMessage.createdAt,
        unreadCount: messages.filter(m => m.recipientId === req.user.id && !m.isRead).length
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    console.error("Conversations error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch conversations" 
    });
  }
});

// GET /messages/:userId
app.get("/messages/:userId", authenticateToken, (req, res) => {
  try {
    const otherUserId = req.params.userId;
    
    const conversation = database.messages.filter(
      m => (m.senderId === req.user.id && m.recipientId === otherUserId) ||
           (m.senderId === otherUserId && m.recipientId === req.user.id)
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      success: true,
      messages: conversation
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch messages" 
    });
  }
});

// ============================================
// COINS ENDPOINTS
// ============================================

// Coin routes are registered centrally by the Coin module in `backend/modules/coin`.

// ============================================
// STREAK ENDPOINTS
// ============================================

// Helper lock functions
const acquireLock = (userId) => {
  if (userLocks.get(userId)) return false;
  userLocks.set(userId, true);
  return true;
};

const releaseLock = (userId) => {
  userLocks.delete(userId);
};

// POST /api/streak/claim
app.post("/api/streak/claim", authenticateToken, (req, res) => {
  const userId = req.user.id;

  // Acquire lock to prevent race conditions
  if (!acquireLock(userId)) {
    return res.status(429).json({ success: false, message: "Please retry claim" });
  }

  try {
    const userIndex = database.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = database.users[userIndex];
    const now = new Date();
    const last = user.last_streak_claimed_at ? new Date(user.last_streak_claimed_at) : null;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const reward = 50;
    const applyStreakReward = () => {
      ensureUserLedger(database, user);
      const ledgerResult = appendLedgerTransaction(database, {
        userId,
        amount: reward,
        type: "reward",
        reason: "streak_claim",
        description: `Daily streak claim (${user.current_streak || 0} day streak)`,
        idempotencyKey: `streak:${userId}:${now.toISOString().slice(0, 10)}`,
        metadata: {
          streak: user.current_streak || 0,
        },
      });

      if (!ledgerResult.success) {
        throw new Error(ledgerResult.error || "Failed to record streak reward");
      }

      user.coins = ledgerResult.balance;
      user.coin_balance = ledgerResult.balance;
    };

    // If never claimed
    if (!last) {
      user.current_streak = 1;
      user.total_streak_days = (user.total_streak_days || 0) + 1;
      user.last_streak_claimed_at = now.toISOString();
      applyStreakReward();
      user.daily_streak = user.current_streak;
      user.streak_count = user.current_streak;
      user.last_active_date = now.toISOString();
      user.updatedAt = now;
      invalidateProfileCache(user.id);

      database.users[userIndex] = user;

      return res.json({
        success: true,
        coins_added: reward,
        current_streak: user.current_streak,
        total_streak_days: user.total_streak_days,
        coin_balance: user.coin_balance,
        next_claim_time: new Date(now.getTime() + ONE_DAY).toISOString()
      });
    }

    const elapsed = now.getTime() - last.getTime();

    // If already claimed within last 24 hours
    if (elapsed < ONE_DAY) {
      return res.status(400).json({ success: false, message: "Streak already claimed today" });
    }

    // Between 24 - 48 hours -> continue streak
    if (elapsed >= ONE_DAY && elapsed <= 2 * ONE_DAY) {
      user.current_streak = (user.current_streak || 0) + 1;
      user.total_streak_days = (user.total_streak_days || 0) + 1;
      user.last_streak_claimed_at = now.toISOString();
      applyStreakReward();
      user.daily_streak = user.current_streak;
      user.streak_count = user.current_streak;
      user.last_active_date = now.toISOString();
      user.updatedAt = now;
      invalidateProfileCache(user.id);

      database.users[userIndex] = user;

      return res.json({
        success: true,
        coins_added: reward,
        current_streak: user.current_streak,
        total_streak_days: user.total_streak_days,
        coin_balance: user.coin_balance,
        next_claim_time: new Date(now.getTime() + ONE_DAY).toISOString()
      });
    }

    // More than 48 hours -> reset streak
    if (elapsed > 2 * ONE_DAY) {
      user.current_streak = 1;
      user.total_streak_days = (user.total_streak_days || 0) + 1;
      user.last_streak_claimed_at = now.toISOString();
      applyStreakReward();
      user.daily_streak = user.current_streak;
      user.streak_count = user.current_streak;
      user.last_active_date = now.toISOString();
      user.updatedAt = now;
      invalidateProfileCache(user.id);

      database.users[userIndex] = user;

      return res.json({
        success: true,
        coins_added: reward,
        current_streak: user.current_streak,
        total_streak_days: user.total_streak_days,
        coin_balance: user.coin_balance,
        next_claim_time: new Date(now.getTime() + ONE_DAY).toISOString()
      });
    }

    // Fallback
    return res.status(400).json({ success: false, message: "Cannot claim streak now" });
  } catch (err) {
    console.error("Streak claim error:", err);
    return res.status(500).json({ success: false, message: "Failed to claim streak" });
  } finally {
    releaseLock(userId);
  }
});

// GET /api/streak/status
app.get("/api/streak/status", authenticateToken, (req, res) => {
  try {
    const user = database.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const now = new Date();
    const last = user.last_streak_claimed_at ? new Date(user.last_streak_claimed_at) : null;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    let can_claim_today = true;
    let hours_remaining = 0;

    if (!last) {
      can_claim_today = true;
      hours_remaining = 0;
    } else {
      const elapsed = now.getTime() - last.getTime();
      if (elapsed < ONE_DAY) {
        can_claim_today = false;
        hours_remaining = Math.ceil((ONE_DAY - elapsed) / (1000 * 60 * 60));
      } else {
        can_claim_today = true;
        hours_remaining = 0;
      }
    }

    res.json({
      success: true,
      current_streak: user.current_streak || 0,
      total_streak_days: user.total_streak_days || 0,
      coin_balance: user.coin_balance || user.coins,
      can_claim_today,
      hours_remaining
    });
  } catch (err) {
    console.error("Streak status error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch streak status" });
  }
});

// ============================================
// REFERRAL ENDPOINTS
// ============================================
// Registered centrally by the Referral module in `backend/modules/referral`.

// ============================================
// CENTRAL FEATURE ROUTE REGISTRATION
// ============================================

console.log("📡 LOADING ROUTES");
let routesReady = false;
let routeRegistrationError = null;
try {
  registerAppRoutes(app, {
    database,
    jwtSecret: JWT_SECRET,
    authenticateToken,
    createNotification,
    createNotifications,
    generateToken,
    validateEmail,
    generateUniqueUsername,
    ensureUserProfileDefaults,
    touchUserDailyActivity,
    buildProfileOverview,
    buildReferralSnapshot,
    sanitizeUser,
    blacklistToken,
    invalidateProfileCache,
    getUtcDayDifference,
    acquireLock,
    releaseLock,
    profilePictureUpload,
    profileImageUpload,
    mediaUpload,
    validateAdCreateRequest,
    buildLocationDetails,
    resolveUserAdPlan,
    convertToUsd,
    normalizeCurrencyCode,
    generateAdTargeting,
    storeAdRecord,
  });
  routesReady = true;
  console.log("ROUTES REGISTERED SUCCESSFULLY");
  console.log("ROUTES LOADED");
} catch (error) {
  console.error("❌ ROUTE REGISTRATION FAILED:", error);
  routeRegistrationError = error;
} finally {
  // Keep a deterministic startup milestone even if route registration fails.
  console.log("✅ ROUTES READY");
  console.log("ROUTES READY");
}

// ============================================
// ERROR HANDLING
// ============================================

// ============================================
// PAYSTACK WEBHOOK
// ============================================
// Must be mounted before the body parser middleware so req.body is a raw Buffer.
// express.raw() is used here specifically for this route.
app.post(
  "/paystack/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY not set. Cannot verify webhook.");
      return res.sendStatus(500);
    }

    const signature = req.headers["x-paystack-signature"];
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    if (hash !== signature) {
      return res.sendStatus(401);
    }

    let event;
    try {
      event = JSON.parse(req.body);
    } catch {
      return res.sendStatus(400);
    }

    if (event.event === "charge.success") {
      const meta = event.data?.metadata || {};
      const email = event.data?.customer?.email;
      const userId = meta.userId || meta.user_id;

      const user = database.users.find(
        (u) => u.id === userId || (email && u.email === email)
      );

      if (user) {
        user.isPremium = true;
        user.subscriptionPlan = meta.plan || "premium";
        user.premiumExpiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        );
        database.transactions.push({
          id: uuidv4(),
          userId: user.id,
          type: "paystack_charge",
          reference: event.data?.reference,
          amount: event.data?.amount,
          currency: event.data?.currency,
          plan: meta.plan || "premium",
          createdAt: new Date(),
        });
        console.log(`[Paystack webhook] Premium activated for user ${user.id}`);
      } else {
        console.warn(
          `[Paystack webhook] charge.success: user not found (userId=${userId}, email=${email})`
        );
      }
    }

    res.sendStatus(200);
  }
);

// 404 Handler (must be after all route registrations)
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR:", err);

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error: "Payload too large. Reduce the request body size and try again.",
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
    });
  }

  const statusCode = err.status || 500;

  if (res.headersSent || res.writableEnded) {
    if (!res.writableEnded) {
      res.end();
    }
    return next(err);
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : (err.message || "Request failed"),
    retryable: statusCode >= 500,
  });
});

// ============================================
// START SERVER
// ============================================

let server;
let isServerStarting = false;

function configureServerSocketGuards(activeServer) {
  activeServer.requestTimeout = REQUEST_TIMEOUT_MS;
  activeServer.headersTimeout = REQUEST_TIMEOUT_MS + 5000;
  activeServer.keepAliveTimeout = Math.min(REQUEST_TIMEOUT_MS, 15000);
  activeServer.setTimeout(REQUEST_TIMEOUT_MS, (socket) => {
    console.error("⏱ SOCKET TIMEOUT: closing stalled socket to protect availability");
    socket.destroy();
  });
}

function scheduleServerRestart(reason) {
  if (isManualShutdownRequested) {
    console.warn("⚠ Recovery skipped because graceful shutdown is active.");
    return;
  }

  if (restartTimer) {
    return;
  }

  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error("🔥 MAX AUTO-RECOVERY ATTEMPTS REACHED. Manual intervention required.");
    return;
  }

  restartAttempts += 1;
  const waitMs = RESTART_DELAY_MS * restartAttempts;
  console.warn(`⚠ Scheduling auto-recovery attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS} in ${waitMs}ms. Reason: ${reason}`);

  restartTimer = setTimeout(() => {
    restartTimer = null;
    void startServer();
  }, waitMs);
}

function isNonRecoverableStartupError(error) {
  const message = `${error?.message || ""}`;
  return (
    message.includes("Missing required environment variables") ||
    message.includes("Invalid PORT value") ||
    message.includes("PAYSTACK_SECRET_KEY format is invalid") ||
    message.includes("Route registration failed before startup")
  );
}

function checkPortAvailability(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      resolve({ available: false, error });
    });

    probe.once("listening", () => {
      probe.close(() => {
        resolve({ available: true });
      });
    });

    probe.listen(port, host);
  });
}

async function resolveStartupPort(preferredPort) {
  const numericPreferredPort = Number(preferredPort);
  if (!Number.isInteger(numericPreferredPort) || numericPreferredPort < 1 || numericPreferredPort > 65535) {
    throw new Error(`Invalid PORT value: ${preferredPort}`);
  }

  const preferred = await checkPortAvailability(numericPreferredPort);
  if (preferred.available) {
    return numericPreferredPort;
  }

  if (preferred.error && preferred.error.code !== "EADDRINUSE") {
    throw preferred.error;
  }

  console.warn(`⚠ Port ${numericPreferredPort} is in use.`);
  console.warn(`⚠️ Port ${numericPreferredPort} already in use`);
  throw new Error(`Port ${numericPreferredPort} is already in use. Stop the existing process or change PORT.`);
}

async function startServer() {
  if (server && server.listening) {
    console.warn(`⚠ Server is already running on port ${PORT}. Duplicate startup call ignored.`);
    return;
  }

  if (isServerStarting) {
    console.warn("⚠ Server startup is already in progress. Duplicate startup call ignored.");
    return;
  }

  isServerStarting = true;

  try {
    console.log("🚀 SERVER STARTING...");
    console.log("🧩 Startup stage: validating environment");
    validateStartupEnvironment();
    console.log("ENV LOADED");
    if (routeRegistrationError) {
      startupReadiness.degradedMode = true;
      startupReadiness.degradedReasons.push(`Route registration failed: ${routeRegistrationError.message || routeRegistrationError}`);
      console.warn("⚠ Continuing startup in degraded mode because route registration failed.");
    }
    console.log("🧩 Startup stage: loading critical modules");
    try {
      verifyPaymentModuleLoading();
    } catch (moduleError) {
      startupReadiness.degradedMode = true;
      startupReadiness.degradedReasons.push(`Payment module load failed: ${moduleError.message || moduleError}`);
      console.warn("⚠ Continuing startup in degraded mode because payment module loading failed.");
    }
    console.log("🧩 Startup stage: preparing network listener");
    let resolvedPort = 4010;
    try {
      resolvedPort = await resolveStartupPort(PORT);
    } catch (portError) {
      startupReadiness.degradedMode = true;
      startupReadiness.degradedReasons.push(`Preferred port unavailable: ${portError.message || portError}`);
      console.warn("⚠ Preferred port unavailable. Falling back to 4010.");
      resolvedPort = 4010;
    }

    const lanIP = getLocalIP();

    const activeServer = app.listen(resolvedPort, "0.0.0.0", () => {
      restartAttempts = 0;
      const externalUrl = BASE_URL || `http://${HOST}:${resolvedPort}`;
      console.log("SERVER STARTED");
      console.log("🧩 Startup stage: middleware initialized");
      console.log("🧩 Startup stage: routes registered");
      console.log("🧩 Startup stage: server listening");
      console.log("✅ Server listening on port", resolvedPort);
      console.log(`SERVER STARTED ON PORT ${resolvedPort}`);
      console.log(`SERVER RUNNING ON PORT ${resolvedPort}`);
      console.log("🌐 Base URL:", externalUrl);
      console.log("💚 Health check:", `${externalUrl}/api/health`);
      setTimeout(() => {
        runStartupHealthCheck(resolvedPort);
      }, 2500);
      console.log("📡 Bind host:", HOST);
      console.log("🛰 Network candidate:", `http://${lanIP}:${resolvedPort}`);
      if (startupReadiness.degradedMode) {
        console.warn("⚠ Server running in degraded mode.");
        console.warn("⚠ Degraded reasons:", startupReadiness.degradedReasons);
      }
      console.log("✅ Startup complete");
    });

    server = activeServer;
    configureServerSocketGuards(activeServer);

    server.on("close", () => {
      console.error("❌ SERVER CLOSED");
      server = null;
      if (!isManualShutdownRequested) {
        scheduleServerRestart("server close event");
      }
    });

    server.on("error", (err) => {
      console.error("❌ SERVER ERROR:", err);
      if (err && err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Stop the existing process or change PORT.`);
        process.exitCode = 1;
        return;
      }

      scheduleServerRestart("server error event");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    startupReadiness.degradedMode = true;
    startupReadiness.degradedReasons.push(`Startup error: ${error.message || error}`);
    console.warn("⚠ Startup failed. Scheduling retry without terminating process.");
    scheduleServerRestart("startup failure");
  } finally {
    isServerStarting = false;
  }
}

startServer();

function gracefulShutdown(signalName) {
  if (isManualShutdownRequested) {
    return;
  }

  isManualShutdownRequested = true;
  console.log(`🛑 ${signalName} received. Starting graceful shutdown...`);

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  if (!server || !server.listening) {
    console.log("🛑 No active HTTP server. Exiting.");
    process.exit(0);
    return;
  }

  const hardStopTimer = setTimeout(() => {
    console.error("🔥 Graceful shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 10000);

  if (typeof hardStopTimer.unref === "function") {
    hardStopTimer.unref();
  }

  server.close((error) => {
    clearTimeout(hardStopTimer);

    if (error) {
      console.error("🔥 Error while closing server during shutdown:", error);
      process.exit(1);
      return;
    }

    console.log("✅ Graceful shutdown complete");
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
