/**
 * El Hannora Authentication Routes
 * Create Account, Login, Forgot Password, Reset Password, Terms & Conditions
 * Production-ready, secure, and scalable
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

const {
  AUTH_CONFIG,
  TERMS_AND_CONDITIONS,
  validateEmail,
  validatePassword,
  validateFullName,
  validateCompanyName,
  sanitizeInput,
  hashPassword,
  verifyPassword,
  generateResetToken,
  verifyResetToken,
  generateRememberToken,
  isAccountLocked,
  calculateLockoutTime,
  getRemainingLockoutTime,
  sanitizeUser,
  createWorkspace
} = require("../services/authService");
const { getAuthSecurityStore } = require("../services/authSecurityStore");

// ============================================
// INITIALIZATION
// ============================================

// These will be set by the main server file
let database = null;
let JWT_SECRET = null;
let emailService = null; // Optional email service for password reset
let authSecurityStore = null;

const getAuthStore = () => {
  if (!authSecurityStore) {
    authSecurityStore = getAuthSecurityStore();
  }

  return authSecurityStore;
};

const hydratePersistedPhoneUsers = () => {
  if (!database || !Array.isArray(database.users)) {
    return 0;
  }

  const store = getAuthStore();
  if (!store?.enabled) {
    return 0;
  }

  let hydratedCount = 0;

  for (const persistedUser of store.listUsers()) {
    if (!persistedUser?.id) {
      continue;
    }

    const existingIndex = database.users.findIndex((entry) => entry.id === persistedUser.id);
    if (existingIndex >= 0) {
      database.users[existingIndex] = {
        ...persistedUser,
        ...database.users[existingIndex],
      };
      continue;
    }

    database.users.push(persistedUser);
    hydratedCount += 1;
  }

  return hydratedCount;
};

/**
 * Initialize auth routes with database and config
 */
const initAuthRoutes = (db, jwtSecret, emailSvc = null) => {
  database = db;
  JWT_SECRET = jwtSecret;
  emailService = emailSvc;
  authSecurityStore = getAuthSecurityStore();
  hydratePersistedPhoneUsers();
  rebuildUserConstraintState();
  return router;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate JWT token
 */
const generateToken = (user, rememberMe = false) => {
  const payload = {
    userId: user.id,
    phoneNumber: user.phone_number || user.phoneNumber || null,
  };

  const expiresIn = rememberMe ? "30d" : "7d";

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Storage-layer uniqueness state for the active runtime.
 * This acts like a database UNIQUE constraint for the current backend process.
 */
const normalizeEmailKey = (email) => sanitizeInput(email || "").trim().toLowerCase();
const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

const sanitizePhoneComponent = (value, { allowLeadingPlus = true } = {}) => {
  let sanitized = `${value || ""}`.trim();
  if (!sanitized) {
    return "";
  }

  sanitized = sanitized.replace(/[\s\-().]/g, "");
  sanitized = sanitized.replace(/[^\d+]/g, "");
  sanitized = sanitized.replace(/(?!^)\+/g, "");

  if (!allowLeadingPlus) {
    sanitized = sanitized.replace(/\+/g, "");
  }

  if (sanitized.startsWith("00")) {
    sanitized = `+${sanitized.slice(2)}`;
  }

  return sanitized;
};

const normalizeCountryDialCode = (countryCode = "") => {
  const digits = sanitizePhoneComponent(countryCode, { allowLeadingPlus: false }).replace(/^0+/, "");
  return digits ? `+${digits}` : "";
};

const toE164Phone = (candidate) => {
  const sanitized = sanitizePhoneComponent(candidate);
  if (!sanitized) {
    return null;
  }

  const digitsOnly = sanitized.replace(/[^\d]/g, "");
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null;
  }

  const normalized = `+${digitsOnly}`;
  return PHONE_E164_REGEX.test(normalized) ? normalized : null;
};

const normalizePhoneKey = (phoneInput, countryCode = "", fullPhone = "") => {
  const normalized = normalizePhoneNumber(phoneInput, countryCode, fullPhone);
  if (normalized) {
    return normalized;
  }

  if (phoneInput && typeof phoneInput === "object") {
    return `${phoneInput.phoneNumber || phoneInput.phone_number || phoneInput.fullPhone || phoneInput.full_phone || ""}`.trim();
  }

  return `${phoneInput || ""}`.trim();
};

const syncUserPhoneFields = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  const normalizedPhone = normalizePhoneNumber({
    phoneNumber: user.normalizedPhone || user.normalized_phone || user.phone_number || user.phoneNumber || user.phone || "",
    countryCode: user.countryCode || user.country_code || "",
    fullPhone: user.fullPhone || user.full_phone || user.normalizedPhone || user.normalized_phone || "",
  });

  if (!normalizedPhone) {
    return null;
  }

  user.normalizedPhone = normalizedPhone;
  user.normalized_phone = normalizedPhone;
  user.phone_number = normalizedPhone;
  user.phoneNumber = normalizedPhone;
  user.phone = normalizedPhone;

  return normalizedPhone;
};

const ensureUserConstraintState = () => {
  if (!database.userConstraintState) {
    database.userConstraintState = {
      emails: new Map(),
      phones: new Map(),
      usernames: new Map(),
      referralCodes: new Map(),
      reservedEmails: new Set(),
      reservedPhones: new Set(),
      reservedUsernames: new Set(),
      reservedReferralCodes: new Set(),
    };
  }

  return database.userConstraintState;
};

const ensureAuthRuntimeLocks = () => {
  if (!database.authRuntimeLocks) {
    database.authRuntimeLocks = {
      otpVerifications: new Set(),
      phoneUsers: new Set(),
    };
  }

  if (!(database.authRuntimeLocks.otpVerifications instanceof Set)) {
    database.authRuntimeLocks.otpVerifications = new Set(database.authRuntimeLocks.otpVerifications || []);
  }

  if (!(database.authRuntimeLocks.phoneUsers instanceof Set)) {
    database.authRuntimeLocks.phoneUsers = new Set(database.authRuntimeLocks.phoneUsers || []);
  }

  return database.authRuntimeLocks;
};

const acquireAuthLock = (scope, key) => {
  if (!key) {
    return true;
  }

  const lockState = ensureAuthRuntimeLocks();
  const lockBucket = lockState[scope];
  if (!(lockBucket instanceof Set)) {
    throw new Error(`Unknown auth lock scope: ${scope}`);
  }

  if (lockBucket.has(key)) {
    return false;
  }

  lockBucket.add(key);
  return true;
};

const releaseAuthLock = (scope, key) => {
  if (!key) {
    return;
  }

  const lockState = ensureAuthRuntimeLocks();
  const lockBucket = lockState[scope];
  if (lockBucket instanceof Set) {
    lockBucket.delete(key);
  }
};

const rebuildUserConstraintState = () => {
  if (!database) {
    return null;
  }

  hydratePersistedPhoneUsers();

  const state = ensureUserConstraintState();
  const store = getAuthStore();
  state.emails.clear();
  state.phones.clear();
  state.usernames.clear();
  state.referralCodes.clear();
  state.reservedEmails.clear();
  state.reservedPhones.clear();
  state.reservedUsernames.clear();
  state.reservedReferralCodes.clear();

  for (const user of Array.isArray(database.users) ? database.users : []) {
    syncUserPhoneFields(user);

    const emailKey = normalizeEmailKey(user.email);
    const phoneKey = normalizePhoneKey(
      user.normalizedPhone || user.normalized_phone || user.phone_number || user.phoneNumber || user.phone,
    );
    const usernameKey = sanitizeUsername(user.username);
    const referralKey = `${user.referral_code || ""}`.trim().toUpperCase();

    if (emailKey && !state.emails.has(emailKey)) {
      state.emails.set(emailKey, user.id);
    }

    if (phoneKey && !state.phones.has(phoneKey)) {
      state.phones.set(phoneKey, user.id);
    }

    if (phoneKey && store?.enabled) {
      try {
        store.syncUser(user);
      } catch (error) {
        console.warn("Auth store user sync warning:", error.message);
      }
    }

    if (usernameKey && !state.usernames.has(usernameKey)) {
      state.usernames.set(usernameKey, user.id);
    }

    if (referralKey && !state.referralCodes.has(referralKey)) {
      state.referralCodes.set(referralKey, user.id);
    }
  }

  return state;
};

/**
 * Find user by email
 */
const findUserByEmail = (email) => {
  const emailKey = normalizeEmailKey(email);
  if (!emailKey) {
    return null;
  }

  const state = ensureUserConstraintState();
  const indexedUserId = state.emails.get(emailKey);
  if (indexedUserId) {
    return database.users.find((user) => user.id === indexedUserId) || null;
  }

  const user = database.users.find((entry) => normalizeEmailKey(entry.email) === emailKey) || null;
  if (user) {
    state.emails.set(emailKey, user.id);
  }

  return user;
};

/**
 * Find user by ID
 */
const findUserById = (id) => {
  return database.users.find(u => u.id === id);
};

const sanitizeUsername = (value) => {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 24);
};

const generateUniqueUsername = (fullName, email) => {
  const state = ensureUserConstraintState();
  const emailSeed = email ? `${email}`.split("@")[0] : "user";
  const base = sanitizeUsername(fullName || emailSeed) || `user${Math.floor(Math.random() * 10000)}`;
  let candidate = base;
  let suffix = 1;

  while (state.usernames.has(candidate) || state.reservedUsernames.has(candidate)) {
    candidate = `${base}${suffix}`.slice(0, 24);
    suffix += 1;
  }

  return candidate;
};

const reserveUserIdentity = ({ email, phoneNumber, usernameSeed }) => {
  const state = ensureUserConstraintState();
  const emailKey = normalizeEmailKey(email);
  const phoneKey = normalizePhoneKey(phoneNumber);

  if (!emailKey && !phoneKey) {
    return {
      ok: false,
      conflict: "identity",
      message: "A unique phone number is required",
    };
  }

  if (phoneKey && (state.phones.has(phoneKey) || state.reservedPhones.has(phoneKey))) {
    return {
      ok: false,
      conflict: "phoneNumber",
      message: "Phone number already exists",
    };
  }

  if (emailKey && (state.emails.has(emailKey) || state.reservedEmails.has(emailKey))) {
    return {
      ok: false,
      conflict: "email",
      message: "Email already exists",
    };
  }

  const usernameKey = generateUniqueUsername(usernameSeed, emailKey || phoneKey || "user");

  if (emailKey) {
    state.reservedEmails.add(emailKey);
  }
  if (phoneKey) {
    state.reservedPhones.add(phoneKey);
  }
  state.reservedUsernames.add(usernameKey);

  return {
    ok: true,
    emailKey: emailKey || null,
    phoneKey: phoneKey || null,
    usernameKey,
  };
};

const releaseUserReservation = (reservation = {}) => {
  const state = ensureUserConstraintState();

  if (reservation.emailKey) {
    state.reservedEmails.delete(reservation.emailKey);
  }

  if (reservation.phoneKey) {
    state.reservedPhones.delete(reservation.phoneKey);
  }

  if (reservation.usernameKey) {
    state.reservedUsernames.delete(reservation.usernameKey);
  }

  if (reservation.referralCodeKey) {
    state.reservedReferralCodes.delete(reservation.referralCodeKey);
  }
};

const generateUniqueReferralCode = (seed, { reserve = false } = {}) => {
  const state = ensureUserConstraintState();
  const prefix = `${seed || "ELH"}`
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 6) || "ELH";

  let attempts = 0;
  let referralCode = `${prefix}1000`;

  do {
    referralCode = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
    attempts += 1;
  } while (
    (state.referralCodes.has(referralCode) || state.reservedReferralCodes.has(referralCode)) &&
    attempts < 1000
  );

  if (reserve) {
    state.reservedReferralCodes.add(referralCode);
  }

  return referralCode;
};

const commitUserRecord = (user, reservation = {}) => {
  const state = ensureUserConstraintState();
  syncUserPhoneFields(user);

  const emailKey = reservation.emailKey || normalizeEmailKey(user.email);
  const phoneKey = reservation.phoneKey || normalizePhoneKey(
    user.normalizedPhone || user.normalized_phone || user.phone_number || user.phoneNumber || user.phone,
  );
  const usernameKey = reservation.usernameKey || sanitizeUsername(user.username);
  const referralKey = reservation.referralCodeKey || `${user.referral_code || ""}`.trim().toUpperCase();

  const conflictMessage = (() => {
    if (phoneKey) {
      const indexedPhoneOwner = state.phones.get(phoneKey);
      if (indexedPhoneOwner && indexedPhoneOwner !== user.id) {
        return "Phone number already exists";
      }
    }

    if (emailKey) {
      const indexedEmailOwner = state.emails.get(emailKey);
      if (indexedEmailOwner && indexedEmailOwner !== user.id) {
        return "Email already exists";
      }
    }

    if (usernameKey) {
      const indexedUsernameOwner = state.usernames.get(usernameKey);
      if (indexedUsernameOwner && indexedUsernameOwner !== user.id) {
        return "Username already exists";
      }
    }

    if (referralKey) {
      const indexedReferralOwner = state.referralCodes.get(referralKey);
      if (indexedReferralOwner && indexedReferralOwner !== user.id) {
        return "Referral code already exists";
      }
    }

    const conflictingStoredUser = database.users.find((existingUser) => {
      if (existingUser.id === user.id) {
        return false;
      }

      const existingPhoneKey = normalizePhoneKey(
        existingUser.normalizedPhone || existingUser.normalized_phone || existingUser.phone_number || existingUser.phoneNumber || existingUser.phone,
      );
      if (phoneKey && existingPhoneKey === phoneKey) {
        return true;
      }

      const existingEmailKey = normalizeEmailKey(existingUser.email);
      if (emailKey && existingEmailKey === emailKey) {
        return true;
      }

      const existingUsernameKey = sanitizeUsername(existingUser.username);
      if (usernameKey && existingUsernameKey === usernameKey) {
        return true;
      }

      const existingReferralKey = `${existingUser.referral_code || ""}`.trim().toUpperCase();
      if (referralKey && existingReferralKey === referralKey) {
        return true;
      }

      return false;
    });

    if (!conflictingStoredUser) {
      return null;
    }

    if (
      phoneKey &&
      normalizePhoneKey(
        conflictingStoredUser.normalizedPhone || conflictingStoredUser.normalized_phone || conflictingStoredUser.phone_number || conflictingStoredUser.phoneNumber || conflictingStoredUser.phone,
      ) === phoneKey
    ) {
      return "Phone number already exists";
    }

    if (emailKey && normalizeEmailKey(conflictingStoredUser.email) === emailKey) {
      return "Email already exists";
    }

    if (usernameKey && sanitizeUsername(conflictingStoredUser.username) === usernameKey) {
      return "Username already exists";
    }

    return "Referral code already exists";
  })();

  if (conflictMessage) {
    throw new Error(conflictMessage);
  }

  if (phoneKey) {
    const store = getAuthStore();
    if (store?.enabled) {
      const persistenceResult = store.insertUserIfAbsent(user);
      if (!persistenceResult.inserted) {
        const existingPersistedUser = store.findUserByNormalizedPhone(phoneKey);
        if (existingPersistedUser && existingPersistedUser.userId !== user.id) {
          throw new Error("Phone number already exists");
        }
      }
    }
  }

  database.users.push(user);

  if (emailKey) {
    state.reservedEmails.delete(emailKey);
    state.emails.set(emailKey, user.id);
  }

  if (phoneKey) {
    state.reservedPhones.delete(phoneKey);
    state.phones.set(phoneKey, user.id);
  }

  if (usernameKey) {
    state.reservedUsernames.delete(usernameKey);
    state.usernames.set(usernameKey, user.id);
  }

  if (referralKey) {
    state.reservedReferralCodes.delete(referralKey);
    state.referralCodes.set(referralKey, user.id);
  }

  const store = getAuthStore();
  if (store?.enabled) {
    store.syncUser(user);
  }

  return user;
};

const buildReferralLink = (referralCode) => {
  const baseUrl = (process.env.BASE_URL || process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  return `${baseUrl}/register?ref=${encodeURIComponent(referralCode)}`;
};

const touchDailyActivity = (user) => {
  if (!user) return user;

  const now = new Date();
  const previousDate = user.last_active_date ? new Date(user.last_active_date) : null;

  user.coin_balance = Number.isFinite(Number(user.coin_balance))
    ? Number(user.coin_balance)
    : Number.isFinite(Number(user.coins))
      ? Number(user.coins)
      : 0;
  user.coins = user.coin_balance;

  if (!Number.isFinite(Number(user.trust_score))) {
    user.trust_score = 50;
  }

  if (!previousDate || Number.isNaN(previousDate.getTime())) {
    user.daily_streak = Math.max(1, Number(user.daily_streak) || 0);
  } else {
    const previousUtc = Date.UTC(previousDate.getUTCFullYear(), previousDate.getUTCMonth(), previousDate.getUTCDate());
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dayDifference = Math.floor((nowUtc - previousUtc) / (24 * 60 * 60 * 1000));

    if (dayDifference >= 2) {
      user.daily_streak = 1;
    } else if (dayDifference === 1) {
      user.daily_streak = Math.max(1, Number(user.daily_streak) || 0) + 1;
    } else if (!(Number(user.daily_streak) > 0)) {
      user.daily_streak = 1;
    }
  }

  user.current_streak = Math.max(Number(user.current_streak) || 0, Number(user.daily_streak) || 0);
  user.streak_count = Number(user.daily_streak) || 0;
  user.last_active_date = now.toISOString();
  return user;
};

/**
 * Log login attempt for rate limiting
 */
const logLoginAttempt = (email, ip, success) => {
  if (!database.loginAttempts) {
    database.loginAttempts = [];
  }
  
  database.loginAttempts.push({
    id: uuidv4(),
    email: email.toLowerCase(),
    ipAddress: ip,
    success,
    attemptAt: new Date()
  });
  
  // Clean up old attempts (older than 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  database.loginAttempts = database.loginAttempts.filter(
    a => new Date(a.attemptAt) > oneDayAgo
  );
};

/**
 * Get recent failed login attempts count
 */
const getRecentFailedAttempts = (email, minutes = 30) => {
  if (!database.loginAttempts) return 0;
  
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return database.loginAttempts.filter(
    a => a.email.toLowerCase() === email.toLowerCase() &&
         !a.success &&
         new Date(a.attemptAt) > cutoff
  ).length;
};

const PHONE_EMAIL_DOMAIN = "phone.elh.local";

const ensureOtpCollections = () => {
  if (!Array.isArray(database.otpRequests)) {
    database.otpRequests = [];
  }
  if (!Array.isArray(database.authBlocks)) {
    database.authBlocks = [];
  }
  if (!Array.isArray(database.deviceFingerprints)) {
    database.deviceFingerprints = [];
  }
  if (!Array.isArray(database.trustedDevices)) {
    database.trustedDevices = [];
  }
  if (!Array.isArray(database.authFraudSignals)) {
    database.authFraudSignals = [];
  }
  ensureAuthRuntimeLocks();
};

const cleanupOtpCollections = () => {
  ensureOtpCollections();
  const store = getAuthStore();
  if (store?.enabled) {
    store.cleanupOtpData();
  }

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  database.otpRequests = database.otpRequests.filter((entry) => {
    const createdAt = new Date(entry.createdAt || Date.now()).getTime();
    const expiresAt = new Date(entry.expiresAt || Date.now()).getTime();
    return createdAt >= oneDayAgo || expiresAt >= now;
  });

  database.authBlocks = database.authBlocks.filter(
    (entry) => new Date(entry.blockedUntil || 0).getTime() > now,
  );

  database.trustedDevices = database.trustedDevices.filter((entry) => {
    if (entry.revokedAt) {
      return false;
    }
    return new Date(entry.expiresAt || 0).getTime() > now;
  });
};

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown";
};

const getRequestCountry = (req) => {
  return `${
    req.headers["cf-ipcountry"] ||
    req.headers["x-vercel-ip-country"] ||
    req.headers["x-country-code"] ||
    "unknown"
  }`
    .trim()
    .toUpperCase();
};

const normalizeDeviceId = (deviceId) => {
  return sanitizeInput(deviceId || "")
    .replace(/[^a-zA-Z0-9_.:-]/g, "")
    .slice(0, 128);
};

const normalizePhoneNumber = (phoneInput, countryCode = "", fullPhone = "") => {
  const payload = phoneInput && typeof phoneInput === "object"
    ? phoneInput
    : { phoneNumber: phoneInput, countryCode, fullPhone };

  const rawPhoneNumber = payload.phone_number ?? payload.phoneNumber ?? payload.phone ?? "";
  const rawCountryCode = payload.country_code ?? payload.countryCode ?? countryCode ?? "";
  const rawFullPhone = payload.full_phone ?? payload.fullPhone ?? fullPhone ?? "";

  const sanitizedPhoneNumber = sanitizePhoneComponent(rawPhoneNumber);
  const sanitizedFullPhone = sanitizePhoneComponent(rawFullPhone);
  const normalizedCountryCode = normalizeCountryDialCode(rawCountryCode);
  const candidates = [];

  if (sanitizedFullPhone) {
    candidates.push(sanitizedFullPhone);
  }

  if (sanitizedPhoneNumber) {
    if (sanitizedPhoneNumber.startsWith("+")) {
      candidates.push(sanitizedPhoneNumber);
    }

    if (normalizedCountryCode) {
      const localDigits = sanitizedPhoneNumber.replace(/[^\d]/g, "");
      const countryDigits = normalizedCountryCode.slice(1);

      if (localDigits.startsWith(countryDigits) && localDigits.length > countryDigits.length + 6) {
        candidates.push(`+${localDigits}`);
      }

      const nationalNumber = localDigits.startsWith(countryDigits)
        ? localDigits.slice(countryDigits.length)
        : localDigits;
      const trimmedNationalNumber = nationalNumber.replace(/^0+/, "");

      if (trimmedNationalNumber) {
        candidates.push(`${normalizedCountryCode}${trimmedNationalNumber}`);
      }
    }
  }

  for (const candidate of candidates) {
    const normalized = toE164Phone(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const sendInvalidPhoneResponse = (res) => {
  return res.status(400).json({
    success: false,
    error: "Invalid phone number format",
    message: "Invalid phone number format",
    error_code: "INVALID_PHONE_NUMBER",
  });
};

const shouldExposeTestOtp = () => {
  const testOtpFlag = `${process.env.RETURN_TEST_OTP || ""}`.trim().toLowerCase();
  return process.env.NODE_ENV !== "production" || testOtpFlag === "true" || testOtpFlag === "1";
};

const generateOtpCode = () => {
  const configuredLength = Number(process.env.OTP_LENGTH || AUTH_CONFIG.OTP_LENGTH || 6);
  const otpLength = Number.isFinite(configuredLength) ? Math.min(6, Math.max(4, configuredLength)) : 6;
  const min = 10 ** (otpLength - 1);
  const max = 10 ** otpLength;
  return `${crypto.randomInt(min, max)}`;
};

const hashTokenValue = (value) => {
  return crypto.createHash("sha256").update(`${value || ""}`).digest("hex");
};

const createTemporaryBlock = (scope, key, reason, minutes = AUTH_CONFIG.LOCKOUT_DURATION_MINUTES) => {
  ensureOtpCollections();
  const blockedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  database.authBlocks = database.authBlocks.filter(
    (entry) => !(entry.scope === scope && entry.key === key),
  );

  const block = {
    id: uuidv4(),
    scope,
    key,
    reason,
    createdAt: new Date().toISOString(),
    blockedUntil,
  };

  database.authBlocks.push(block);
  return block;
};

const getActiveBlock = (scope, key) => {
  ensureOtpCollections();
  const now = Date.now();
  return database.authBlocks.find(
    (entry) => entry.scope === scope && entry.key === key && new Date(entry.blockedUntil || 0).getTime() > now,
  );
};

const countRecentOtpRequests = ({ phoneNumber, ipAddress, minutes = 60 }) => {
  ensureOtpCollections();

  const store = getAuthStore();
  if (store?.enabled) {
    return store.countRecentOtpRequests({
      normalizedPhone: phoneNumber || null,
      ipAddress: ipAddress || null,
      minutes,
    });
  }

  const cutoff = Date.now() - minutes * 60 * 1000;

  return database.otpRequests.filter((entry) => {
    const createdAt = new Date(entry.createdAt || 0).getTime();
    if (createdAt < cutoff) {
      return false;
    }

    if (phoneNumber && entry.phoneNumber === phoneNumber) {
      return true;
    }

    if (ipAddress && entry.ipAddress === ipAddress) {
      return true;
    }

    return false;
  }).length;
};

const findLatestOtpRequest = ({ phoneNumber, deviceId }) => {
  const store = getAuthStore();
  if (store?.enabled) {
    return store.getLatestOtpRequest({
      normalizedPhone: phoneNumber,
      deviceId,
    });
  }

  return database.otpRequests
    .filter((entry) => entry.phoneNumber === phoneNumber && entry.deviceId === deviceId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
};

const applyTrustScoreDelta = (user, delta, reason) => {
  if (!user) {
    return 50;
  }

  const currentScore = Number.isFinite(Number(user.trust_score))
    ? Number(user.trust_score)
    : Number.isFinite(Number(user.trustScore))
      ? Number(user.trustScore)
      : 50;

  const nextScore = Math.max(0, Math.min(100, currentScore + Number(delta || 0)));
  user.trust_score = nextScore;
  user.trustScore = nextScore;
  user.updatedAt = new Date();

  if (!Array.isArray(user.trust_score_events)) {
    user.trust_score_events = [];
  }

  user.trust_score_events.unshift({
    delta: Number(delta || 0),
    reason,
    at: new Date().toISOString(),
  });
  user.trust_score_events = user.trust_score_events.slice(0, 20);

  return nextScore;
};

const recordFraudSignal = ({ type, phoneNumber, deviceId, ipAddress, userId = null, severity = "medium", scoreDelta = 0, metadata = {} }) => {
  ensureOtpCollections();

  database.authFraudSignals.push({
    id: uuidv4(),
    type,
    phoneNumber,
    deviceId,
    ipAddress,
    userId,
    severity,
    scoreDelta,
    metadata,
    createdAt: new Date().toISOString(),
  });

  if (userId) {
    const user = findUserById(userId);
    if (user && scoreDelta) {
      applyTrustScoreDelta(user, scoreDelta, type);
    }
  }
};

const getOrCreateDeviceFingerprint = (deviceId) => {
  ensureOtpCollections();

  let profile = database.deviceFingerprints.find((entry) => entry.deviceId === deviceId);
  if (!profile) {
    profile = {
      id: uuidv4(),
      deviceId,
      userIds: [],
      phoneNumbers: [],
      ipHistory: [],
      loginHistory: [],
      riskFlags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    database.deviceFingerprints.push(profile);
  }

  return profile;
};

const registerDeviceUsage = ({ deviceId, userId, phoneNumber, ipAddress, country, userAgent, loginStatus = "otp_verified" }) => {
  const profile = getOrCreateDeviceFingerprint(deviceId);
  const now = new Date().toISOString();

  if (userId && !profile.userIds.includes(userId)) {
    profile.userIds.push(userId);
  }

  if (phoneNumber && !profile.phoneNumbers.includes(phoneNumber)) {
    profile.phoneNumbers.push(phoneNumber);
  }

  if (ipAddress && !profile.ipHistory.includes(ipAddress)) {
    profile.ipHistory.push(ipAddress);
    profile.ipHistory = profile.ipHistory.slice(-10);
  }

  profile.loginHistory.unshift({
    at: now,
    ipAddress,
    country,
    userAgent,
    status: loginStatus,
  });
  profile.loginHistory = profile.loginHistory.slice(0, 30);
  profile.updatedAt = now;

  const distinctAccountCount = new Set(profile.userIds.filter(Boolean)).size;
  let riskLevel = "low";
  let cooldownMinutes = 0;

  if (distinctAccountCount >= Math.max(2, Number(AUTH_CONFIG.MAX_ACCOUNTS_PER_DEVICE) || 3)) {
    riskLevel = "medium";
  }

  if (distinctAccountCount > (Number(AUTH_CONFIG.MAX_ACCOUNTS_PER_DEVICE) || 3)) {
    riskLevel = "high";
    cooldownMinutes = 30;
    if (!profile.riskFlags.includes("multi_account_abuse")) {
      profile.riskFlags.push("multi_account_abuse");
    }
    createTemporaryBlock("device", deviceId, "multi_account_abuse", cooldownMinutes);
  }

  return {
    profile,
    riskLevel,
    distinctAccountCount,
    cooldownMinutes,
  };
};

const findUserByPhoneNumber = (phoneNumber, countryCode = "", fullPhone = "") => {
  const phoneKey = normalizePhoneKey(phoneNumber, countryCode, fullPhone);
  if (!phoneKey) {
    return null;
  }

  const state = ensureUserConstraintState();
  const indexedUserId = state.phones.get(phoneKey);
  if (indexedUserId) {
    return database.users.find((user) => user.id === indexedUserId) || null;
  }

  const user = database.users.find((entry) => normalizePhoneKey(
    entry.normalizedPhone || entry.normalized_phone || entry.phone_number || entry.phoneNumber || entry.phone,
  ) === phoneKey) || null;
  if (user) {
    syncUserPhoneFields(user);
    state.phones.set(phoneKey, user.id);
    return user;
  }

  const store = getAuthStore();
  const persistedUserRef = store?.enabled ? store.findUserByNormalizedPhone(phoneKey) : null;
  if (persistedUserRef?.user) {
    const hydratedUser = {
      ...persistedUserRef.user,
      id: persistedUserRef.user.id || persistedUserRef.userId,
    };
    syncUserPhoneFields(hydratedUser);
    database.users.push(hydratedUser);
    state.phones.set(phoneKey, hydratedUser.id);
    return hydratedUser;
  }

  return null;
};

const resolveRequestDeviceId = (req, rawDeviceId) => {
  const normalizedProvidedDeviceId = normalizeDeviceId(rawDeviceId);
  if (normalizedProvidedDeviceId) {
    return normalizedProvidedDeviceId;
  }

  const fingerprintSeed = `${getClientIp(req)}:${req.headers["user-agent"] || "unknown-device"}`;
  const fallbackDeviceId = crypto.createHash("sha256").update(fingerprintSeed).digest("hex").slice(0, 24);
  return `device-${fallbackDeviceId}`;
};

const buildPhoneAuthProfile = (user) => {
  const createdAt = user.createdAt || user.created_at || new Date();
  const lastLogin = user.lastLoginAt || user.last_login || new Date();
  const trustScore = Number(user.trust_score ?? user.trustScore ?? 50);
  const coins = Number(user.coin_balance ?? user.coins ?? 0);
  const normalizedPhone = user.normalizedPhone || user.normalized_phone || user.phone_number || user.phoneNumber || user.phone || null;

  return {
    user_id: user.id,
    id: user.id,
    phoneNumber: normalizedPhone,
    phone_number: normalizedPhone,
    normalizedPhone,
    normalized_phone: normalizedPhone,
    device_id: user.device_id || user.current_device_id || null,
    trust_score: trustScore,
    coins,
    coinBalance: coins,
    coin_balance: coins,
    followers: Number(user.followers || 0),
    referralCode: user.referral_code || null,
    referralData: {
      referral_code: user.referral_code || null,
      referred_by: user.referred_by || null,
      total_referrals: Number(user.total_referrals || 0),
      referral_coins_earned: Number(user.referral_coins_earned || 0),
    },
    createdAt: new Date(createdAt).toISOString(),
    created_at: new Date(createdAt).toISOString(),
    last_login: new Date(lastLogin).toISOString(),
    is_verified: Boolean(user.is_verified ?? user.isVerified ?? true),
    status: user.status || "active",
  };
};

const createPhoneAuthUser = async ({ phoneNumber, deviceId, ipAddress, country, userAgent }) => {
  const now = new Date();
  const fallbackName = `User ${phoneNumber.slice(-4)}`;
  const reservation = reserveUserIdentity({
    phoneNumber,
    usernameSeed: fallbackName,
  });

  if (!reservation.ok) {
    throw new Error(reservation.message || "Phone auth account already exists");
  }

  const referralCode = generateUniqueReferralCode(phoneNumber.slice(-6), { reserve: true });

  try {
    const newUser = {
      id: uuidv4(),
      fullName: fallbackName,
      name: fallbackName,
      username: reservation.usernameKey,
      status: "active",
      role: "user",
      normalizedPhone: phoneNumber,
      normalized_phone: phoneNumber,
      phone_number: phoneNumber,
      phoneNumber: phoneNumber,
      phone: phoneNumber,
      device_id: deviceId,
      current_device_id: deviceId,
      otp_auth_enabled: true,
      is_verified: true,
      isVerified: true,
      phone_verified: true,
      last_login_ip: ipAddress,
      last_login_country: country,
      last_user_agent: userAgent || null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      last_login: now.toISOString(),
      last_active_date: now.toISOString(),
      profile_picture: null,
      profilePhoto: null,
      daily_streak: 0,
      streak_count: 0,
      current_streak: 0,
      coins: 0,
      coin_balance: 0,
      trust_score: 50,
      followers: 0,
      total_referrals: 0,
      referral_coins_earned: 0,
      referral_code: referralCode,
      referral_link: buildReferralLink(referralCode),
      referred_by: null,
      referral_reward_status: "pending_activity_validation",
      createdAt: now,
      updatedAt: now,
    };

    touchDailyActivity(newUser);
    commitUserRecord(newUser, { ...reservation, referralCodeKey: referralCode });
    return newUser;
  } catch (error) {
    releaseUserReservation({ ...reservation, referralCodeKey: referralCode });
    throw error;
  }
};

const findOrCreatePhoneAuthUserAtomic = async ({ phoneNumber, deviceId, ipAddress, country, userAgent }) => {
  const existingUser = findUserByPhoneNumber(phoneNumber);
  if (existingUser) {
    return { user: existingUser, created: false, busy: false };
  }

  const phoneLockKey = normalizePhoneKey(phoneNumber);
  if (!acquireAuthLock("phoneUsers", phoneLockKey)) {
    const concurrentUser = findUserByPhoneNumber(phoneNumber);
    if (concurrentUser) {
      return { user: concurrentUser, created: false, busy: false };
    }
  }

  try {
    const lockedExistingUser = findUserByPhoneNumber(phoneNumber);
    if (lockedExistingUser) {
      return { user: lockedExistingUser, created: false, busy: false };
    }

    const createdUser = await createPhoneAuthUser({
      phoneNumber,
      deviceId,
      ipAddress,
      country,
      userAgent,
    });

    return { user: createdUser, created: true, busy: false };
  } catch (error) {
    if (/already exists/i.test(error.message || "")) {
      const concurrentUser = findUserByPhoneNumber(phoneNumber);
      if (concurrentUser) {
        return { user: concurrentUser, created: false, busy: false };
      }

      return { user: null, created: false, busy: true };
    }

    throw error;
  } finally {
    releaseAuthLock("phoneUsers", phoneLockKey);
  }
};

const verifyOtpRecordAtomically = async ({ otpRecordId, otp, phoneNumber, deviceId, ipAddress }) => {
  const verificationLockKey = `${otpRecordId}`;
  if (!acquireAuthLock("otpVerifications", verificationLockKey)) {
    return {
      status: 409,
      body: {
        success: false,
        message: "OTP verification is already in progress or the code has already been used.",
        error_code: "OTP_ALREADY_USED",
      },
    };
  }

  try {
    const store = getAuthStore();
    const otpRecord = store?.enabled
      ? store.getOtpRequestById(otpRecordId)
      : database.otpRequests.find((entry) => entry.id === otpRecordId);

    if (!otpRecord || otpRecord.phoneNumber !== phoneNumber || otpRecord.deviceId !== deviceId) {
      return {
        status: 400,
        body: {
          success: false,
          message: "OTP not found. Please request a new code.",
          error_code: "OTP_NOT_FOUND",
        },
      };
    }

    if (otpRecord.otpUsed || otpRecord.usedAt || otpRecord.invalidatedAt) {
      return {
        status: 400,
        body: {
          success: false,
          message: "This OTP is no longer valid. Please request a new one.",
          error_code: "OTP_ALREADY_USED",
        },
      };
    }

    const otpExpiresAt = otpRecord.otpExpiresAt || otpRecord.expiresAt;
    if (new Date(otpExpiresAt).getTime() <= Date.now()) {
      if (store?.enabled) {
        store.invalidateOtp(otpRecordId);
      }

      return {
        status: 400,
        body: {
          success: false,
          message: "OTP has expired. Please request a new one.",
          error_code: "OTP_EXPIRED",
        },
      };
    }

    const isValidOtp = await verifyPassword(otp, otpRecord.otpHash);

    if (!isValidOtp) {
      const updatedOtpRecord = store?.enabled
        ? (store.incrementOtpAttempts({ otpRecordId }) || otpRecord)
        : {
            ...otpRecord,
            verificationAttempts: Number(otpRecord.verificationAttempts || 0) + 1,
          };

      if (!store?.enabled) {
        const otpRecordIndex = database.otpRequests.findIndex((entry) => entry.id === otpRecordId);
        if (otpRecordIndex >= 0) {
          database.otpRequests[otpRecordIndex] = updatedOtpRecord;
        }
      }

      const verifyAttemptLimit = Number(process.env.OTP_VERIFY_MAX_ATTEMPTS || AUTH_CONFIG.OTP_VERIFY_MAX_ATTEMPTS || 5);
      const attemptsRemaining = Math.max(0, verifyAttemptLimit - Number(updatedOtpRecord.verificationAttempts || 0));

      recordFraudSignal({
        type: "invalid_otp_attempt",
        phoneNumber: phoneNumber,
        deviceId: deviceId,
        ipAddress,
        severity: attemptsRemaining === 0 ? "high" : "medium",
      });

      if (attemptsRemaining === 0) {
        createTemporaryBlock("phone", phoneNumber, "too_many_invalid_otp_attempts", 15);
        createTemporaryBlock("device", deviceId, "too_many_invalid_otp_attempts", 15);
      }

      return {
        status: 401,
        body: {
          success: false,
          message: "Invalid OTP",
          error_code: "INVALID_OTP",
          attempts_remaining: attemptsRemaining,
        },
      };
    }

    const verificationTimestamp = new Date().toISOString();

    if (store?.enabled) {
      const markResult = store.markOtpUsed({
        otpRecordId,
        normalizedPhone: phoneNumber,
        deviceId,
        ipAddress,
      });

      if (!markResult.updated) {
        return {
          status: 409,
          body: {
            success: false,
            message: "This OTP is no longer valid. Please request a new one.",
            error_code: "OTP_ALREADY_USED",
          },
        };
      }
    }

    database.otpRequests = database.otpRequests.map((entry) => {
      if (entry.id === otpRecordId) {
        return {
          ...entry,
          otpUsed: true,
          usedAt: verificationTimestamp,
          verifiedAt: verificationTimestamp,
          verifiedIpAddress: ipAddress,
        };
      }

      if (entry.phoneNumber === phoneNumber && entry.id !== otpRecordId && !entry.usedAt && !entry.invalidatedAt) {
        return {
          ...entry,
          invalidatedAt: verificationTimestamp,
        };
      }

      return entry;
    });

    return {
      status: 200,
      otpRecord: store?.enabled ? store.getOtpRequestById(otpRecordId) : {
        ...otpRecord,
        otpUsed: true,
        usedAt: verificationTimestamp,
        verifiedAt: verificationTimestamp,
        verifiedIpAddress: ipAddress,
      },
    };
  } finally {
    releaseAuthLock("otpVerifications", verificationLockKey);
  }
};

const issueTrustedDeviceToken = ({ user, deviceId, phoneNumber, ipAddress, country, userAgent }) => {
  ensureOtpCollections();

  const expiresInDays = Number(process.env.TRUST_DEVICE_EXPIRY_DAYS || AUTH_CONFIG.TRUST_DEVICE_EXPIRY_DAYS || 30);
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashTokenValue(plainToken);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const existingRecord = database.trustedDevices.find(
    (entry) => entry.userId === user.id && entry.deviceId === deviceId,
  );

  if (existingRecord) {
    existingRecord.tokenHash = tokenHash;
    existingRecord.phoneNumber = phoneNumber;
    existingRecord.ipAddress = ipAddress;
    existingRecord.country = country;
    existingRecord.userAgent = userAgent;
    existingRecord.expiresAt = expiresAt.toISOString();
    existingRecord.lastUsedAt = new Date().toISOString();
    existingRecord.revokedAt = null;
  } else {
    database.trustedDevices.push({
      id: uuidv4(),
      userId: user.id,
      phoneNumber,
      deviceId,
      tokenHash,
      ipAddress,
      country,
      userAgent,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
    });
  }

  return {
    plainToken,
    expiresAt,
  };
};

const resolveTrustedDeviceRecord = ({ trustedDeviceToken, deviceId, phoneNumber }) => {
  ensureOtpCollections();
  const tokenHash = hashTokenValue(trustedDeviceToken);

  return database.trustedDevices.find((entry) => {
    const notExpired = new Date(entry.expiresAt || 0).getTime() > Date.now();
    const phoneMatches = !phoneNumber || entry.phoneNumber === phoneNumber;
    return (
      entry.tokenHash === tokenHash &&
      entry.deviceId === deviceId &&
      phoneMatches &&
      !entry.revokedAt &&
      notExpired
    );
  });
};

const dispatchOtpMessage = async ({ phoneNumber, otp }) => {
  const senderName = process.env.OTP_SENDER_NAME || "ELH";
  const expiresInMinutes = Number(process.env.OTP_EXPIRY_MINUTES || AUTH_CONFIG.OTP_EXPIRY_MINUTES || 5);
  const smsMessage = `Your ELH verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share this code.`;

  if (process.env.TERMII_API_KEY) {
    const response = await fetch(process.env.TERMII_BASE_URL || "https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        to: phoneNumber,
        from: senderName,
        sms: smsMessage,
        type: "plain",
        channel: "generic",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS delivery failed: ${errorText}`);
    }

    return { provider: "termii" };
  }

  console.log(`[OTP:${process.env.NODE_ENV || "development"}] ${phoneNumber} -> ${otp}`);
  return { provider: "console" };
};

// ============================================
// PHONE OTP AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /auth/send-otp
 * Send a secure phone OTP with rate limiting and fraud checks
 */
router.post(["/request-otp", "/send-otp"], async (req, res) => {
  try {
    ensureOtpCollections();
    cleanupOtpCollections();

    const {
      phone_number,
      phoneNumber,
      full_phone,
      fullPhone,
      device_id,
      deviceId,
      country_code,
      countryCode,
    } = req.body || {};
    const normalizedPhoneNumber = normalizePhoneNumber({
      phone_number,
      phoneNumber,
      full_phone,
      fullPhone,
      country_code,
      countryCode,
    });
    const normalizedDeviceId = resolveRequestDeviceId(req, device_id || deviceId);
    const ipAddress = getClientIp(req);
    const country = getRequestCountry(req);

    if (!normalizedPhoneNumber) {
      return sendInvalidPhoneResponse(res);
    }

    const phoneBlock = getActiveBlock("phone", normalizedPhoneNumber);
    const ipBlock = getActiveBlock("ip", ipAddress);
    const deviceBlock = getActiveBlock("device", normalizedDeviceId);

    if (phoneBlock || ipBlock || deviceBlock) {
      const activeBlock = phoneBlock || ipBlock || deviceBlock;
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please try again later.",
        error_code: "RATE_LIMIT_EXCEEDED",
        blocked_until: activeBlock.blockedUntil,
      });
    }

    const otpRequestWindowMinutes = Number(process.env.OTP_REQUEST_WINDOW_MINUTES || AUTH_CONFIG.OTP_REQUEST_WINDOW_MINUTES || 10);
    const maxPerPhoneWindow = Number(process.env.OTP_MAX_PER_PHONE_PER_WINDOW || AUTH_CONFIG.OTP_MAX_PER_PHONE_PER_WINDOW || 5);
    const maxPerIpWindow = Number(process.env.OTP_MAX_PER_IP_PER_WINDOW || AUTH_CONFIG.OTP_MAX_PER_IP_PER_WINDOW || 5);
    const phoneOtpCount = countRecentOtpRequests({ phoneNumber: normalizedPhoneNumber, minutes: otpRequestWindowMinutes });
    const ipOtpCount = countRecentOtpRequests({ ipAddress, minutes: otpRequestWindowMinutes });

    if (phoneOtpCount >= maxPerPhoneWindow) {
      createTemporaryBlock("phone", normalizedPhoneNumber, "otp_phone_limit_exceeded", otpRequestWindowMinutes);
      recordFraudSignal({
        type: "otp_phone_limit_exceeded",
        phoneNumber: normalizedPhoneNumber,
        deviceId: normalizedDeviceId,
        ipAddress,
        severity: "high",
      });

      return res.status(429).json({
        success: false,
        message: `Too many OTP requests for this phone number. Max ${maxPerPhoneWindow} per ${otpRequestWindowMinutes} minutes.`,
        error_code: "PHONE_RATE_LIMIT_EXCEEDED",
      });
    }

    if (ipOtpCount >= maxPerIpWindow) {
      createTemporaryBlock("ip", ipAddress, "otp_ip_limit_exceeded", otpRequestWindowMinutes);
      recordFraudSignal({
        type: "otp_ip_limit_exceeded",
        phoneNumber: normalizedPhoneNumber,
        deviceId: normalizedDeviceId,
        ipAddress,
        severity: "high",
      });

      return res.status(429).json({
        success: false,
        message: `Too many OTP requests from this IP address. Max ${maxPerIpWindow} per ${otpRequestWindowMinutes} minutes.`,
        error_code: "IP_RATE_LIMIT_EXCEEDED",
      });
    }

    const otp = generateOtpCode();
    const expiresInMinutes = Number(process.env.OTP_EXPIRY_MINUTES || AUTH_CONFIG.OTP_EXPIRY_MINUTES || 5);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const otpHash = await hashPassword(otp);

    const otpRecord = {
      id: uuidv4(),
      phoneNumber: normalizedPhoneNumber,
      normalizedPhone: normalizedPhoneNumber,
      deviceId: normalizedDeviceId,
      countryCode: normalizeCountryDialCode(country_code || countryCode) || null,
      ipAddress,
      country,
      otpHash,
      otpExpiresAt: expiresAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      otpUsed: false,
      createdAt: new Date().toISOString(),
      usedAt: null,
      invalidatedAt: null,
      verificationAttempts: 0,
    };

    const store = getAuthStore();
    if (store?.enabled) {
      const reservation = store.reserveOtpRequest({
        otpRecord: {
          id: otpRecord.id,
          normalizedPhone: otpRecord.phoneNumber,
          deviceId: otpRecord.deviceId,
          countryCode: otpRecord.countryCode,
          ipAddress: otpRecord.ipAddress,
          country: otpRecord.country,
          otpHash: otpRecord.otpHash,
          otpExpiresAt: otpRecord.otpExpiresAt,
          otpUsed: otpRecord.otpUsed,
          createdAt: otpRecord.createdAt,
          verificationAttempts: otpRecord.verificationAttempts,
        },
        phoneLimit: maxPerPhoneWindow,
        ipLimit: maxPerIpWindow,
        windowMinutes: otpRequestWindowMinutes,
      });

      if (!reservation.allowed) {
        const errorCode = reservation.reason === "phone" ? "PHONE_RATE_LIMIT_EXCEEDED" : "IP_RATE_LIMIT_EXCEEDED";
        const errorType = reservation.reason === "phone" ? "otp_phone_limit_exceeded" : "otp_ip_limit_exceeded";
        const errorMessage = reservation.reason === "phone"
          ? `Too many OTP requests for this phone number. Max ${maxPerPhoneWindow} per ${otpRequestWindowMinutes} minutes.`
          : `Too many OTP requests from this IP address. Max ${maxPerIpWindow} per ${otpRequestWindowMinutes} minutes.`;

        createTemporaryBlock(reservation.reason === "phone" ? "phone" : "ip", reservation.reason === "phone" ? normalizedPhoneNumber : ipAddress, errorType, otpRequestWindowMinutes);
        recordFraudSignal({
          type: errorType,
          phoneNumber: normalizedPhoneNumber,
          deviceId: normalizedDeviceId,
          ipAddress,
          severity: "high",
        });

        return res.status(429).json({
          success: false,
          message: errorMessage,
          error_code: errorCode,
        });
      }
    }

    database.otpRequests = database.otpRequests.map((entry) => {
      if (entry.phoneNumber === normalizedPhoneNumber && !entry.usedAt && !entry.invalidatedAt) {
        return {
          ...entry,
          invalidatedAt: new Date().toISOString(),
        };
      }

      return entry;
    });

    database.otpRequests.push(otpRecord);

    try {
      await dispatchOtpMessage({
        phoneNumber: normalizedPhoneNumber,
        otp,
      });
    } catch (dispatchError) {
      otpRecord.invalidatedAt = new Date().toISOString();
      if (store?.enabled) {
        store.invalidateOtp(otpRecord.id, otpRecord.invalidatedAt);
      }
      throw dispatchError;
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      expires_in_seconds: expiresInMinutes * 60,
      ...(shouldExposeTestOtp() ? { debug_otp: otp } : {}),
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send OTP right now",
      error_code: "OTP_SEND_FAILED",
    });
  }
});

/**
 * POST /auth/verify-otp
 * Verify OTP, create account if needed, and issue JWT session token
 */
router.post("/verify-otp", async (req, res) => {
  try {
    ensureOtpCollections();
    cleanupOtpCollections();

    const {
      phone_number,
      phoneNumber,
      full_phone,
      fullPhone,
      country_code,
      countryCode,
      otp,
      device_id,
      deviceId,
      trust_device,
      remember_device,
      rememberDevice,
    } = req.body || {};
    const normalizedPhoneNumber = normalizePhoneNumber({
      phone_number,
      phoneNumber,
      full_phone,
      fullPhone,
      country_code,
      countryCode,
    });
    const normalizedDeviceId = resolveRequestDeviceId(req, device_id || deviceId);
    const sanitizedOtp = `${otp || ""}`.trim();
    const ipAddress = getClientIp(req);
    const country = getRequestCountry(req);

    if (!normalizedPhoneNumber) {
      return sendInvalidPhoneResponse(res);
    }

    if (!/^\d{4,6}$/.test(sanitizedOtp)) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber and otp are required",
        error_code: "INVALID_VERIFY_REQUEST",
      });
    }

    const phoneBlock = getActiveBlock("phone", normalizedPhoneNumber);
    const deviceBlock = getActiveBlock("device", normalizedDeviceId);
    if (phoneBlock || deviceBlock) {
      const activeBlock = phoneBlock || deviceBlock;
      return res.status(429).json({
        success: false,
        message: "Suspicious login detected. Please try again later.",
        error_code: "SUSPICIOUS_LOGIN_DETECTED",
        blocked_until: activeBlock.blockedUntil,
      });
    }

    const otpCandidate = findLatestOtpRequest({
      phoneNumber: normalizedPhoneNumber,
      deviceId: normalizedDeviceId,
    });

    if (!otpCandidate) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new code.",
        error_code: "OTP_NOT_FOUND",
      });
    }

    const otpVerificationResult = await verifyOtpRecordAtomically({
      otpRecordId: otpCandidate.id,
      otp: sanitizedOtp,
      phoneNumber: normalizedPhoneNumber,
      deviceId: normalizedDeviceId,
      ipAddress,
    });

    if (otpVerificationResult.status !== 200) {
      return res.status(otpVerificationResult.status).json(otpVerificationResult.body);
    }

    const otpRecord = otpVerificationResult.otpRecord;

    const userResolution = await findOrCreatePhoneAuthUserAtomic({
      phoneNumber: normalizedPhoneNumber,
      deviceId: normalizedDeviceId,
      ipAddress,
      country,
      userAgent: req.headers["user-agent"] || null,
    });

    if (userResolution.busy) {
      return res.status(409).json({
        success: false,
        message: "Account creation is already in progress for this phone number. Please retry.",
        error_code: "PHONE_AUTH_CREATION_IN_PROGRESS",
      });
    }

    let user = userResolution.user;
    const isNewUser = userResolution.created;

    user.normalizedPhone = normalizedPhoneNumber;
    user.normalized_phone = normalizedPhoneNumber;
    user.phone_number = normalizedPhoneNumber;
    user.phoneNumber = normalizedPhoneNumber;
    user.phone = normalizedPhoneNumber;
    user.device_id = normalizedDeviceId;
    user.current_device_id = normalizedDeviceId;
    user.lastLoginAt = new Date();
    user.last_login = user.lastLoginAt.toISOString();
    user.last_login_ip = ipAddress;
    user.last_login_country = country;
    user.last_user_agent = req.headers["user-agent"] || null;
    user.is_verified = true;
    user.isVerified = true;
    user.otp_auth_enabled = true;
    user.updatedAt = new Date();

    touchDailyActivity(user);
    applyTrustScoreDelta(user, isNewUser ? 0 : 2, "successful_phone_otp_login");

    if (otpRecord.ipAddress && otpRecord.ipAddress !== ipAddress) {
      recordFraudSignal({
        type: "otp_ip_mismatch",
        phoneNumber: normalizedPhoneNumber,
        deviceId: normalizedDeviceId,
        ipAddress,
        userId: user.id,
        severity: "medium",
        scoreDelta: -5,
      });
    }

    const deviceRisk = registerDeviceUsage({
      deviceId: normalizedDeviceId,
      userId: user.id,
      phoneNumber: normalizedPhoneNumber,
      ipAddress,
      country,
      userAgent: req.headers["user-agent"] || null,
      loginStatus: isNewUser ? "account_created_via_otp" : "otp_login",
    });

    user.account_flagged = deviceRisk.riskLevel !== "low";

    if (deviceRisk.riskLevel === "medium") {
      applyTrustScoreDelta(user, -10, "multi_account_device_warning");
    }

    if (deviceRisk.riskLevel === "high") {
      applyTrustScoreDelta(user, -20, "multi_account_device_abuse");
      user.cooldown_until = new Date(Date.now() + deviceRisk.cooldownMinutes * 60 * 1000).toISOString();

      return res.status(403).json({
        success: false,
        message: "Suspicious login detected. This device has created too many accounts.",
        error_code: "SUSPICIOUS_LOGIN_DETECTED",
        cooldown_minutes: deviceRisk.cooldownMinutes,
        user: buildPhoneAuthProfile(user),
      });
    }

    const shouldTrustDevice = Boolean(trust_device || remember_device || rememberDevice);
    const trustedDevice = shouldTrustDevice
      ? issueTrustedDeviceToken({
          user,
          deviceId: normalizedDeviceId,
          phoneNumber: normalizedPhoneNumber,
          ipAddress,
          country,
          userAgent: req.headers["user-agent"] || null,
        })
      : null;

    const token = generateToken(user, true);

    return res.status(200).json({
      success: true,
      message: isNewUser ? "OTP verified and account created successfully" : "OTP verified and login successful",
      token,
      user: buildPhoneAuthProfile(user),
      trusted_device: trustedDevice
        ? {
            enabled: true,
            device_id: normalizedDeviceId,
            expires_at: trustedDevice.expiresAt.toISOString(),
            token: trustedDevice.plainToken,
          }
        : { enabled: false },
      fraud_checks: {
        risk_level: deviceRisk.riskLevel,
        accounts_on_device: deviceRisk.distinctAccountCount,
        flagged: Boolean(user.account_flagged),
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP right now",
      error_code: "OTP_VERIFY_FAILED",
    });
  }
});

/**
 * POST /auth/device-login
 * Auto-login from a previously trusted device without a new OTP
 */
router.post("/device-login", (req, res) => {
  try {
    ensureOtpCollections();
    cleanupOtpCollections();

    const {
      trusted_device_token,
      device_id,
      deviceId,
      phone_number,
      phoneNumber,
      full_phone,
      fullPhone,
      country_code,
      countryCode,
    } = req.body || {};
    const normalizedDeviceId = resolveRequestDeviceId(req, device_id || deviceId);
    const hasPhoneInput = Boolean(phone_number || phoneNumber || full_phone || fullPhone);
    const normalizedPhoneNumber = hasPhoneInput
      ? normalizePhoneNumber({
          phone_number,
          phoneNumber,
          full_phone,
          fullPhone,
          country_code,
          countryCode,
        })
      : null;

    if (hasPhoneInput && !normalizedPhoneNumber) {
      return sendInvalidPhoneResponse(res);
    }

    if (!trusted_device_token || !normalizedDeviceId) {
      return res.status(400).json({
        success: false,
        message: "trusted_device_token and device_id are required",
        error_code: "INVALID_TRUSTED_DEVICE_REQUEST",
      });
    }

    const deviceBlock = getActiveBlock("device", normalizedDeviceId);
    if (deviceBlock) {
      return res.status(429).json({
        success: false,
        message: "Suspicious login detected. Please verify with OTP again.",
        error_code: "TRUSTED_DEVICE_BLOCKED",
        blocked_until: deviceBlock.blockedUntil,
      });
    }

    const trustedDeviceRecord = resolveTrustedDeviceRecord({
      trustedDeviceToken: trusted_device_token,
      deviceId: normalizedDeviceId,
      phoneNumber: normalizedPhoneNumber,
    });

    if (!trustedDeviceRecord) {
      return res.status(401).json({
        success: false,
        message: "Trusted device session not found. Please verify with OTP.",
        error_code: "TRUSTED_DEVICE_NOT_FOUND",
      });
    }

    const user = findUserById(trustedDeviceRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found for trusted device session",
        error_code: "USER_NOT_FOUND",
      });
    }

    const ipAddress = getClientIp(req);
    const country = getRequestCountry(req);
    const deviceRisk = registerDeviceUsage({
      deviceId: normalizedDeviceId,
      userId: user.id,
      phoneNumber: user.phone_number || user.phoneNumber || null,
      ipAddress,
      country,
      userAgent: req.headers["user-agent"] || null,
      loginStatus: "trusted_device_auto_login",
    });

    if (deviceRisk.riskLevel === "high") {
      return res.status(403).json({
        success: false,
        message: "Suspicious login detected. OTP verification is required.",
        error_code: "TRUSTED_DEVICE_REQUIRES_OTP",
      });
    }

    user.lastLoginAt = new Date();
    user.last_login = user.lastLoginAt.toISOString();
    user.last_login_ip = ipAddress;
    user.last_login_country = country;
    user.last_user_agent = req.headers["user-agent"] || null;
    user.updatedAt = new Date();
    trustedDeviceRecord.lastUsedAt = new Date().toISOString();

    touchDailyActivity(user);
    applyTrustScoreDelta(user, 1, "trusted_device_auto_login");

    const token = generateToken(user, true);

    return res.status(200).json({
      success: true,
      message: "Trusted device auto-login successful",
      token,
      user: buildPhoneAuthProfile(user),
      trusted_device: {
        enabled: true,
        device_id: normalizedDeviceId,
        expires_at: trustedDeviceRecord.expiresAt,
      },
    });
  } catch (error) {
    console.error("Device login error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to login from trusted device right now",
      error_code: "TRUSTED_DEVICE_LOGIN_FAILED",
    });
  }
});

// ============================================
// CREATE ACCOUNT ENDPOINT
// ============================================

/**
 * POST /auth/signup
 * Create a new user account
 */
router.post("/signup", async (req, res) => {
  let identityReservation = null;
  let reservedReferralCode = null;

  try {
    return res.status(410).json({
      success: false,
      message: "Email/password signup has been removed. Use /auth/request-otp and /auth/verify-otp.",
      auth_mode: "otp_only",
    });
    console.log("[AUTH][REGISTER] Register endpoint hit");
    const { fullName, email, password, confirmPassword, companyName, acceptTerms } = req.body;
    console.log("[AUTH][REGISTER] Request received", {
      email: `${email || ""}`.toLowerCase(),
      hasFullName: Boolean(fullName),
      hasCompanyName: Boolean(companyName),
      acceptTerms: Boolean(acceptTerms),
    });
    
    // ---- Input Validation ----
    const errors = [];
    
    // Validate full name
    const nameValidation = validateFullName(fullName);
    if (!nameValidation.valid) {
      errors.push(nameValidation.error);
    }
    
    // Validate email
    if (!email) {
      errors.push("Email address is required");
    } else if (!validateEmail(email)) {
      errors.push("Invalid email format");
    }
    
    // Validate password
    if (!password) {
      errors.push("Password is required");
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      errors.push("Please confirm your password");
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    
    // Validate company name
    const companyValidation = validateCompanyName(companyName);
    if (!companyValidation.valid) {
      errors.push(companyValidation.error);
    }
    
    // Validate terms acceptance
    if (!acceptTerms) {
      errors.push("You must accept the Terms and Conditions to create an account");
    }
    
    // Return errors if validation failed
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }
    
    // ---- Sanitize inputs ----
    const sanitizedFullName = sanitizeInput(fullName);
    const sanitizedEmail = normalizeEmailKey(email);
    const sanitizedCompanyName = sanitizeInput(companyName);

    identityReservation = reserveUserIdentity({
      email: sanitizedEmail,
      usernameSeed: sanitizedFullName,
    });

    console.log("[AUTH][REGISTER] User found in DB:", !identityReservation.ok);
    if (!identityReservation.ok) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
        errors: ["Email already registered"]
      });
    }

    reservedReferralCode = generateUniqueReferralCode(identityReservation.usernameKey, { reserve: true });
    
    // ---- Hash password ----
    const passwordHash = await hashPassword(password);
    console.log("[AUTH][REGISTER] Password hashed:", Boolean(passwordHash));
    
    // ---- Create user ----
    const userId = uuidv4();
    
    // Create workspace linked to company name
    const workspace = createWorkspace(sanitizedCompanyName, userId);
    if (!database.workspaces) {
      database.workspaces = [];
    }
    database.workspaces.push(workspace);
    
    const username = identityReservation.usernameKey;
    const referralCode = reservedReferralCode;

    // Create user object
    const newUser = {
      id: userId,
      fullName: sanitizedFullName,
      name: sanitizedFullName,
      username,
      email: sanitizedEmail,
      password: passwordHash,
      companyName: sanitizedCompanyName,
      workspaceId: workspace.id,
      
      // Account status
      status: "active",
      role: "user",
      
      // Terms acceptance
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: AUTH_CONFIG.CURRENT_TERMS_VERSION,
      
      // Security
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      last_active_date: null,
      
      // Profile + rewards
      profile_picture: null,
      profilePhoto: null,
      daily_streak: 0,
      streak_count: 0,
      current_streak: 0,
      coins: 1000,
      coin_balance: 1000,
      trust_score: 50,
      referral_code: referralCode,
      referral_link: buildReferralLink(referralCode),
      total_referrals: 0,
      referral_coins_earned: 0,
      referred_by: null,
      
      // Subscription (future-ready)
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
      
      // Email verification (future-ready)
      emailVerified: false,
      emailVerificationToken: null,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    commitUserRecord(newUser, { ...identityReservation, referralCodeKey: reservedReferralCode });
    identityReservation = null;
    reservedReferralCode = null;
    console.log("[AUTH][REGISTER] User data:", {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      createdAt: newUser.createdAt,
    });
    
    // ---- Generate JWT token ----
    const token = generateToken(newUser);
    console.log("[AUTH][REGISTER] Token generated:", Boolean(token));
    
    // ---- Create welcome notification ----
    if (!database.notifications) {
      database.notifications = [];
    }
    database.notifications.push({
      id: uuidv4(),
      userId: newUser.id,
      type: "welcome",
      title: "Welcome to El Hannora!",
      message: `Welcome ${sanitizedFullName}! Your workspace "${sanitizedCompanyName}" is ready. Start creating AI-powered ad predictions!`,
      isRead: false,
      createdAt: new Date()
    });
    
    // ---- Return success response ----
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: sanitizeUser(newUser),
      workspace: {
        id: workspace.id,
        name: workspace.name
      },
      token
    });
    
  } catch (error) {
    releaseUserReservation({
      ...(identityReservation || {}),
      ...(reservedReferralCode ? { referralCodeKey: reservedReferralCode } : {}),
    });
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating your account. Please try again.",
      errors: ["Internal server error"]
    });
  }
});

// ============================================
// LOGIN ENDPOINT
// ============================================

/**
 * POST /auth/login
 * Authenticate user and return session token
 */
router.post("/login", async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      message: "Email/password login has been removed. Use /auth/request-otp and /auth/verify-otp.",
      auth_mode: "otp_only",
    });
    console.log("[AUTH][LOGIN] Login endpoint hit");
    const { email, password, rememberMe = false } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    console.log("[AUTH][LOGIN] Request received", {
      email: `${email || ""}`.toLowerCase(),
      rememberMe: Boolean(rememberMe),
      clientIP,
    });
    
    // ---- Input Validation ----
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        errors: ["Missing credentials"]
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        errors: ["Invalid email format"]
      });
    }
    
    // ---- Find user ----
    const user = findUserByEmail(email);
    console.log("[AUTH][LOGIN] User found in DB:", Boolean(user));
    
    // ---- Check rate limiting (before revealing if user exists) ----
    const recentFailedAttempts = getRecentFailedAttempts(email);
    if (recentFailedAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Please try again in ${AUTH_CONFIG.LOCKOUT_DURATION_MINUTES} minutes.`,
        errors: ["Account temporarily locked"],
        retryAfterMinutes: AUTH_CONFIG.LOCKOUT_DURATION_MINUTES
      });
    }
    
    // ---- User not found (generic error for security) ----
    if (!user) {
      logLoginAttempt(email, clientIP, false);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        errors: ["Invalid credentials"]
      });
    }
    
    // ---- Check account status ----
    if (user.status === "banned") {
      logLoginAttempt(email, clientIP, false);
      return res.status(403).json({
        success: false,
        message: "Your account has been banned. Please contact support for assistance.",
        errors: ["Account banned"]
      });
    }
    
    if (user.status === "suspended") {
      logLoginAttempt(email, clientIP, false);
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support for assistance.",
        errors: ["Account suspended"]
      });
    }
    
    if (user.status === "inactive") {
      logLoginAttempt(email, clientIP, false);
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support to reactivate.",
        errors: ["Account inactive"]
      });
    }
    
    // ---- Check if account is locked ----
    if (isAccountLocked(user)) {
      const remainingMinutes = getRemainingLockoutTime(user.lockedUntil);
      logLoginAttempt(email, clientIP, false);
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
        errors: ["Account locked"],
        retryAfterMinutes: remainingMinutes
      });
    }
    
    // ---- Verify password ----
    const isValidPassword = await verifyPassword(password, user.password);
    console.log("[AUTH][LOGIN] Password valid:", isValidPassword);
    
    if (!isValidPassword) {
      // Increment failed attempts
      const userIndex = database.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        database.users[userIndex].failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Lock account if max attempts reached
        if (database.users[userIndex].failedLoginAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
          database.users[userIndex].lockedUntil = calculateLockoutTime();
        }
        
        database.users[userIndex].updatedAt = new Date();
      }
      
      logLoginAttempt(email, clientIP, false);
      
      const attemptsRemaining = AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - (user.failedLoginAttempts || 0) - 1;
      
      return res.status(401).json({
        success: false,
        message: attemptsRemaining > 0 
          ? `Invalid email or password. ${attemptsRemaining} attempt(s) remaining.`
          : "Invalid email or password. Account has been temporarily locked.",
        errors: ["Invalid credentials"]
      });
    }
    
    // ---- Successful login ----
    // Reset failed attempts and update last login
    const userIndex = database.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      database.users[userIndex].failedLoginAttempts = 0;
      database.users[userIndex].lockedUntil = null;
      database.users[userIndex].lastLoginAt = new Date();
      database.users[userIndex].lastLoginIP = clientIP;
      database.users[userIndex].updatedAt = new Date();
      touchDailyActivity(database.users[userIndex]);
      
      // Handle remember me
      if (rememberMe) {
        const { token: rememberToken, expiresAt } = generateRememberToken();
        database.users[userIndex].rememberToken = rememberToken;
        database.users[userIndex].rememberTokenExpiresAt = expiresAt;
      }
    }
    
    logLoginAttempt(email, clientIP, true);
    
    // Generate JWT
    const token = generateToken(database.users[userIndex], rememberMe);
    console.log("[AUTH][LOGIN] Token generated:", Boolean(token));
    
    // Get workspace info
    const workspace = database.workspaces?.find(w => w.id === user.workspaceId);
    
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: sanitizeUser(database.users[userIndex]),
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.name
      } : null,
      token,
      coin_balance: database.users[userIndex].coin_balance,
      daily_streak: database.users[userIndex].daily_streak,
      trust_score: database.users[userIndex].trust_score
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login. Please try again.",
      errors: ["Internal server error"]
    });
  }
});

// ============================================
// FORGOT PASSWORD ENDPOINT
// ============================================

/**
 * POST /auth/forgot-password
 * Request password reset link
 */
router.post("/forgot-password", async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      message: "Password reset is unavailable because authentication is now OTP-only.",
      auth_mode: "otp_only",
    });
    const { email } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    
    // Rate limiting for forgot password
    if (!database.passwordResetAttempts) {
      database.passwordResetAttempts = [];
    }
    
    // Check rate limit (max 3 requests per hour per email/IP)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = database.passwordResetAttempts.filter(
      a => (a.email === email?.toLowerCase() || a.ip === clientIP) && 
           new Date(a.attemptAt) > oneHourAgo
    ).length;
    
    if (recentAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many password reset requests. Please try again later.",
        errors: ["Rate limit exceeded"]
      });
    }
    
    // Log the attempt
    database.passwordResetAttempts.push({
      email: email?.toLowerCase(),
      ip: clientIP,
      attemptAt: new Date()
    });
    
    // Validate email format
    if (!email || !validateEmail(email)) {
      // Return same response to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: "If an account with this email exists, a password reset link has been sent."
      });
    }
    
    // Find user (but don't reveal if found or not)
    const user = findUserByEmail(email);
    
    if (user && user.status === "active") {
      // Generate reset token
      const { plainToken, tokenHash, expiresAt } = generateResetToken();
      
      // Store token
      const userIndex = database.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        database.users[userIndex].resetToken = tokenHash;
        database.users[userIndex].resetTokenExpiresAt = expiresAt;
        database.users[userIndex].updatedAt = new Date();
      }
      
      // Generate reset link
      const resetBaseUrl = `${process.env.BASE_URL || process.env.FRONTEND_URL || ""}`.replace(/\/+$/, "");
      const resetLink = `${resetBaseUrl}/reset-password?token=${plainToken}&email=${encodeURIComponent(email)}`;
      
      // Send email (if email service is configured)
      if (emailService && typeof emailService.sendPasswordResetEmail === "function") {
        try {
          await emailService.sendPasswordResetEmail(email, user.fullName, resetLink);
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
        }
      } else {
        // Log for development/testing
        console.log("========================================");
        console.log("PASSWORD RESET LINK (Development):");
        console.log(`Email: ${email}`);
        console.log(`Token: ${plainToken}`);
        console.log(`Link: ${resetLink}`);
        console.log(`Expires: ${expiresAt}`);
        console.log("========================================");
      }
    }
    
    // Always return same response (prevent email enumeration)
    return res.status(200).json({
      success: true,
      message: "If an account with this email exists, a password reset link has been sent."
    });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
      errors: ["Internal server error"]
    });
  }
});

// ============================================
// RESET PASSWORD ENDPOINT
// ============================================

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      message: "Password reset is unavailable because authentication is now OTP-only.",
      auth_mode: "otp_only",
    });
    const { token, email, newPassword, confirmPassword } = req.body;
    
    // ---- Input Validation ----
    const errors = [];
    
    if (!token) {
      errors.push("Reset token is required");
    }
    
    if (!email || !validateEmail(email)) {
      errors.push("Valid email is required");
    }
    
    if (!newPassword) {
      errors.push("New password is required");
    } else {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
    }
    
    if (!confirmPassword) {
      errors.push("Please confirm your new password");
    } else if (newPassword !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }
    
    // ---- Find user ----
    const user = findUserByEmail(email);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
        errors: ["Invalid reset request"]
      });
    }
    
    // ---- Verify token ----
    if (!user.resetToken || !user.resetTokenExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
        errors: ["No active reset request"]
      });
    }
    
    const verification = verifyResetToken(token, user.resetToken, user.resetTokenExpiresAt);
    
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.reason === "Token expired" 
          ? "Reset link has expired. Please request a new one."
          : "Invalid reset link. Please request a new one.",
        errors: [verification.reason || "Invalid token"]
      });
    }
    
    // ---- Update password ----
    const passwordHash = await hashPassword(newPassword);
    
    const userIndex = database.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      database.users[userIndex].password = passwordHash;
      database.users[userIndex].resetToken = null;
      database.users[userIndex].resetTokenExpiresAt = null;
      database.users[userIndex].failedLoginAttempts = 0;
      database.users[userIndex].lockedUntil = null;
      database.users[userIndex].updatedAt = new Date();
    }
    
    // ---- Send confirmation notification ----
    if (!database.notifications) {
      database.notifications = [];
    }
    database.notifications.push({
      id: uuidv4(),
      userId: user.id,
      type: "security",
      title: "Password Reset Successful",
      message: "Your password has been successfully reset. If you did not make this change, please contact support immediately.",
      isRead: false,
      createdAt: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password."
    });
    
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
      errors: ["Internal server error"]
    });
  }
});

// ============================================
// VERIFY RESET TOKEN ENDPOINT
// ============================================

/**
 * GET /auth/verify-reset-token
 * Verify if a reset token is valid (for frontend validation)
 */
router.get("/verify-reset-token", async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      message: "Password reset verification is unavailable because authentication is now OTP-only.",
      auth_mode: "otp_only",
    });
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Token and email are required"
      });
    }
    
    const user = findUserByEmail(email);
    
    if (!user || !user.resetToken || !user.resetTokenExpiresAt) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: "Invalid or expired reset link"
      });
    }
    
    const verification = verifyResetToken(token, user.resetToken, user.resetTokenExpiresAt);
    
    return res.status(200).json({
      success: true,
      valid: verification.valid,
      message: verification.valid ? "Token is valid" : verification.reason
    });
    
  } catch (error) {
    console.error("Verify reset token error:", error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: "An error occurred"
    });
  }
});

// ============================================
// TERMS AND CONDITIONS ENDPOINTS
// ============================================

/**
 * GET /auth/terms
 * Get current Terms and Conditions
 */
router.get("/terms", (req, res) => {
  return res.status(200).json({
    success: true,
    terms: TERMS_AND_CONDITIONS
  });
});

/**
 * GET /auth/terms/text
 * Get Terms and Conditions as plain text
 */
router.get("/terms/text", (req, res) => {
  return res.status(200).json({
    success: true,
    version: TERMS_AND_CONDITIONS.version,
    effectiveDate: TERMS_AND_CONDITIONS.effectiveDate,
    content: TERMS_AND_CONDITIONS.content
  });
});

/**
 * GET /auth/terms/sections
 * Get Terms and Conditions as structured sections
 */
router.get("/terms/sections", (req, res) => {
  return res.status(200).json({
    success: true,
    version: TERMS_AND_CONDITIONS.version,
    effectiveDate: TERMS_AND_CONDITIONS.effectiveDate,
    sections: TERMS_AND_CONDITIONS.sections
  });
});

// ============================================
// LOGOUT ENDPOINT
// ============================================

/**
 * POST /auth/logout
 * Logout user (invalidate remember token)
 */
router.post("/logout", (req, res) => {
  try {
    ensureOtpCollections();

    const { trusted_device_token: trustedDeviceToken, device_id: deviceId } = req.body || {};
    if (trustedDeviceToken) {
      const tokenHash = hashTokenValue(trustedDeviceToken);
      database.trustedDevices = database.trustedDevices.map((entry) => (
        entry.tokenHash === tokenHash
          ? { ...entry, revokedAt: new Date().toISOString() }
          : entry
      ));
    } else if (deviceId) {
      const normalizedDeviceId = normalizeDeviceId(deviceId);
      database.trustedDevices = database.trustedDevices.map((entry) => (
        entry.deviceId === normalizedDeviceId
          ? { ...entry, revokedAt: new Date().toISOString() }
          : entry
      ));
    }

    // If user is authenticated, clear remember token
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (!Array.isArray(database.tokenBlacklist)) {
            database.tokenBlacklist = [];
          }
          if (!database.tokenBlacklist.some(entry => entry.token === token)) {
            database.tokenBlacklist.push({
              token,
              userId: decoded.userId || decoded.id,
              invalidatedAt: new Date().toISOString(),
              expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null
            });
          }
          const decodedUserId = decoded.userId || decoded.id;
          const userIndex = database.users.findIndex(u => u.id === decodedUserId);
          if (userIndex !== -1) {
            database.users[userIndex].rememberToken = null;
            database.users[userIndex].rememberTokenExpiresAt = null;
            database.users[userIndex].updatedAt = new Date();
          }
        } catch (err) {
          // Token invalid, continue with logout
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
    
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during logout"
    });
  }
});

// ============================================
// CHECK EMAIL AVAILABILITY ENDPOINT
// ============================================

/**
 * POST /auth/check-email
 * Check if email is available for registration
 */
router.post("/check-email", (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      message: "Email availability checks are unavailable because authentication is now OTP-only.",
      auth_mode: "otp_only",
    });
    const { email } = req.body;
    
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Invalid email format"
      });
    }
    
    const existingUser = findUserByEmail(email);
    
    return res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser ? "Email is already registered" : "Email is available"
    });
    
  } catch (error) {
    console.error("Check email error:", error);
    return res.status(500).json({
      success: false,
      available: false,
      message: "An error occurred"
    });
  }
});

// ============================================
// EXPORTS
// ============================================

module.exports = { 
  authRouter: router, 
  initAuthRoutes 
};
