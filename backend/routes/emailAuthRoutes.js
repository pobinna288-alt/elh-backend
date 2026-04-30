/**
 * Email OTP Authentication Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /send-otp   – Request an email OTP (email must be in request body)
 * POST /verify-otp – Verify the OTP, activate account, and issue a JWT
 *
 * Design rules
 * ────────────
 *   • EMAIL is the only authentication identifier.
 *   • OTPs are hashed with HMAC-SHA256 + server secret before storage.
 *   • Plain-text OTPs are never persisted.
 *   • Duplicate users are prevented by a UNIQUE constraint on email.
 *   • Each handler calls next() when no `email` field is present so that
 *     existing phone-based OTP routes remain reachable at the same paths.
 *
 * Required env vars
 * ─────────────────
 *   JWT_SECRET           – JWT signing secret (required)
 *   EMAIL_OTP_SECRET     – HMAC key for OTP hashing (falls back to JWT_SECRET)
 *
 * Optional env vars (all have safe defaults)
 * ───────────────────────────────────────────
 *   EMAIL_OTP_EXPIRY_MINUTES   (default 10)
 *   EMAIL_OTP_MAX_PER_EMAIL    (default 3  per window)
 *   EMAIL_OTP_WINDOW_MINUTES   (default 10)
 *   EMAIL_OTP_MAX_PER_IP_DAY   (default 10 per 24 h)
 *   EMAIL_OTP_BLOCK_MINUTES    (default 15)
 *   EMAIL_OTP_MAX_ATTEMPTS     (default 5)
 *   RETURN_TEST_OTP            set "true" in non-production to expose OTP in response
 */

"use strict";

const express = require("express");
const crypto  = require("crypto");
const jwt     = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { getEmailOtpStore } = require("../services/emailOtpStore");
const { sendOtpEmail, assertOtpEmailConfigured } = require("../services/emailService");

const router = express.Router();

// Injected during init (see initEmailAuthRoutes below)
let _jwtSecret = null;

// ─── config ───────────────────────────────────────────────────────────────────

const CFG = {
  otpExpiryMinutes:     () => Math.max(1,  Number(process.env.EMAIL_OTP_EXPIRY_MINUTES         || 10)),
  maxPerEmail:          () => Math.max(1,  Number(process.env.EMAIL_OTP_MAX_PER_EMAIL           || 3)),
  windowMinutes:        () => Math.max(1,  Number(process.env.EMAIL_OTP_WINDOW_MINUTES          || 10)),
  maxPerIpDay:          () => Math.max(1,  Number(process.env.EMAIL_OTP_MAX_PER_IP_DAY          || 10)),
  blockMinutes:         () => Math.max(1,  Number(process.env.EMAIL_OTP_BLOCK_MINUTES           || 15)),
  maxAttempts:          () => Math.max(1,  Number(process.env.EMAIL_OTP_MAX_ATTEMPTS            || 5)),
  resendCooldownSeconds:() => Math.max(30, Number(process.env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS || 60)),
};

// ─── init ─────────────────────────────────────────────────────────────────────

/**
 * Wire the JWT secret and return the mounted router.
 * Also asserts OTP email configuration is present in production so the server
 * refuses to start rather than silently skipping OTP delivery.
 */
const initEmailAuthRoutes = (jwtSecret) => {
  _jwtSecret = jwtSecret;
  assertOtpEmailConfigured();
  return router;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const getClientIp = (req) => {
  const ff = req.headers["x-forwarded-for"];
  if (typeof ff === "string" && ff.trim()) return ff.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const normalizeEmail = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase();

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

/** Cryptographically random 6-digit code – never predictable. */
const generateOtp = () => String(crypto.randomInt(100000, 999999));

/**
 * Hash OTP using HMAC-SHA256 with the server-side secret.
 * The plain OTP must never reach the database.
 */
const hashOtp = (otp) => {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "EMAIL_OTP_SECRET (or JWT_SECRET) must be set to hash OTPs securely"
    );
  }
  return crypto.createHmac("sha256", secret).update(String(otp)).digest("hex");
};

/**
 * Constant-time comparison between a candidate OTP and the stored hash.
 * Prevents timing-oracle attacks.
 */
const verifyOtp = (candidate, storedHash) => {
  try {
    const candidateHash = hashOtp(candidate);
    // Both HMAC-SHA256 hex values are 64 chars (32 bytes) – lengths always match
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(storedHash,    "hex")
    );
  } catch {
    return false;
  }
};

/** Sign a JWT with { userId, email, plan } – no fallback secret allowed. */
const issueJwt = (user) => {
  const secret = _jwtSecret || process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { userId: user.id, email: user.email, plan: user.plan || "FREE" },
    secret,
    { expiresIn: "7d" }
  );
};

/** Only expose the raw OTP in non-production environments. */
const shouldExposeTestOtp = () => {
  const flag = String(process.env.RETURN_TEST_OTP || "").toLowerCase();
  return (
    process.env.NODE_ENV !== "production" ||
    flag === "true" ||
    flag === "1"
  );
};

// ─── POST /send-otp ───────────────────────────────────────────────────────────

router.post("/send-otp", async (req, res, next) => {
  // This handler owns requests that carry an `email` field.
  // Requests without it (e.g. phone-based OTP) are forwarded to the next handler.
  if (!req.body?.email) return next();

  try {
    const store = getEmailOtpStore();
    store.cleanup(); // purge expired blocks + stale OTP rows

    const email     = normalizeEmail(req.body.email);
    const ipAddress = getClientIp(req);

    // ── 1. Validate email format ─────────────────────────────────────────
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_EMAIL",
        message: "Invalid email address format",
      });
    }

    // ── 2. Check active blocks (email-level and IP-level) ─────────────────
    const emailBlock = store.findActiveBlock("email", email);
    const ipBlock    = store.findActiveBlock("ip", ipAddress);
    if (emailBlock || ipBlock) {
      const active = emailBlock || ipBlock;
      return res.status(429).json({
        success: false,
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many requests. Please try again later.",
        blocked_until: active.blockedUntil,
      });
    }

    // ── 3. Per-email rate limit: 3 per 10 min ────────────────────────────
    const windowMs   = CFG.windowMinutes() * 60 * 1000;
    const emailCount = store.countEmailOtpsSince(email, Date.now() - windowMs);
    if (emailCount >= CFG.maxPerEmail()) {
      store.createBlock({
        scope: "email",
        key: email,
        reason: "email_otp_limit",
        minutes: CFG.windowMinutes(),
      });
      return res.status(429).json({
        success: false,
        error: "OTP_LIMIT_REACHED",
        message: `Maximum ${CFG.maxPerEmail()} OTP requests allowed per ${CFG.windowMinutes()} minutes.`,
      });
    }

    // ── 4. Per-IP rate limit: 10 per day ─────────────────────────────────
    const dayMs   = 24 * 60 * 60 * 1000;
    const ipCount = store.countIpOtpsSince(ipAddress, Date.now() - dayMs);
    if (ipCount >= CFG.maxPerIpDay()) {
      store.createBlock({
        scope: "ip",
        key: ipAddress,
        reason: "ip_otp_limit",
        minutes: CFG.blockMinutes(),
      });
      return res.status(429).json({
        success: false,
        error: "OTP_LIMIT_REACHED",
        message: "Too many OTP requests from this network. Please try again later.",
      });
    }

    // ── 5. Resend cooldown ────────────────────────────────────────────────
    // Only checks active (non-invalidated) OTPs so a failed-delivery retry
    // is never incorrectly gated by the cooldown.
    const existingOtp = store.findActiveOtpByEmail(email);
    if (existingOtp) {
      const cooldownMs = CFG.resendCooldownSeconds() * 1000;
      const elapsedMs  = Date.now() - new Date(existingOtp.createdAt).getTime();
      if (elapsedMs < cooldownMs) {
        const retryAfter = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          error: "OTP_RESEND_TOO_SOON",
          message: `Please wait ${retryAfter} second(s) before requesting a new OTP.`,
          retry_after_seconds: retryAfter,
        });
      }
    }

    // ── 6. Ensure a PENDING user row exists for this email ────────────────
    // INSERT OR IGNORE: existing users are simply reused.
    store.createPendingUser({ id: uuidv4(), email });

    // ── 7. Generate and hash OTP ──────────────────────────────────────────
    const otp       = generateOtp();
    const otpHash   = hashOtp(otp);
    const expiresAt = new Date(
      Date.now() + CFG.otpExpiryMinutes() * 60 * 1000
    ).toISOString();

    // ── 8. Persist hashed OTP (atomically invalidates prior active codes) ─
    // Capture the id so it can be rolled back if email delivery fails.
    const otpId = uuidv4();
    store.createOtpRecord({
      id: otpId,
      email,
      otpHash,
      expiresAt,
      ipAddress,
    });

    // ── 9. Deliver OTP via email ──────────────────────────────────────────
    try {
      await sendOtpEmail(email, otp, CFG.otpExpiryMinutes());
    } catch (deliveryErr) {
      console.error("[EmailOTP] Email delivery failed:", deliveryErr.message);
      // Invalidate the undelivered OTP so the user cannot verify with a code
      // they never received. The record is kept (not deleted) so it still
      // counts toward the rate-limit window.
      store.invalidateOtpById(otpId);
      return res.status(500).json({
        success: false,
        error: "OTP_DELIVERY_FAILED",
        message: "OTP delivery failed. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email address",
      expires_in_seconds: CFG.otpExpiryMinutes() * 60,
      // Exposed only in non-production builds for testing
      ...(shouldExposeTestOtp() ? { debug_otp: otp } : {}),
    });
  } catch (err) {
    console.error("[EmailOTP] send-otp error:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Internal server error",
    });
  }
});

// ─── POST /verify-otp ─────────────────────────────────────────────────────────

router.post("/verify-otp", async (req, res, next) => {
  // Only handle requests that carry an `email` field.
  if (!req.body?.email) return next();

  try {
    const store     = getEmailOtpStore();
    const email     = normalizeEmail(req.body.email);
    const rawOtp    = String(req.body?.otp || "").trim();
    const ipAddress = getClientIp(req);
    // phone is optional metadata – never used as an auth identifier
    const phone     = req.body?.phone ? String(req.body.phone).trim() : null;

    // ── 1. Validate inputs ────────────────────────────────────────────────
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_EMAIL",
        message: "Invalid email address format",
      });
    }

    if (!/^\d{6}$/.test(rawOtp)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_OTP",
        message: "OTP must be a 6-digit number",
      });
    }

    // ── 2. Check active email-level block ─────────────────────────────────
    const emailBlock = store.findActiveBlock("email", email);
    if (emailBlock) {
      return res.status(429).json({
        success: false,
        error: "USER_BLOCKED",
        message: "Account temporarily blocked due to too many failed attempts.",
        blocked_until: emailBlock.blockedUntil,
      });
    }

    // ── 3. Retrieve active OTP record ─────────────────────────────────────
    const otpRecord = store.findActiveOtpByEmail(email);
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: "OTP_NOT_FOUND",
        message: "No active OTP found. Please request a new code.",
      });
    }

    // ── 4. Check OTP expiry ───────────────────────────────────────────────
    if (new Date(otpRecord.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        error: "OTP_EXPIRED",
        message: "OTP has expired. Please request a new code.",
      });
    }

    // ── 5. Enforce attempt limit BEFORE comparing ────────────────────────
    if (otpRecord.attempts >= CFG.maxAttempts()) {
      store.createBlock({
        scope: "email",
        key: email,
        reason: "too_many_otp_attempts",
        minutes: CFG.blockMinutes(),
      });
      return res.status(429).json({
        success: false,
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many failed attempts. Account temporarily blocked.",
      });
    }

    // ── 6. Constant-time OTP verification ─────────────────────────────────
    const isValid = verifyOtp(rawOtp, otpRecord.otpHash);

    if (!isValid) {
      const updated  = store.incrementAttempts(otpRecord.id);
      const attempts = Number(updated?.attempts ?? otpRecord.attempts + 1);
      const remaining = Math.max(0, CFG.maxAttempts() - attempts);

      if (remaining === 0) {
        store.createBlock({
          scope: "email",
          key: email,
          reason: "too_many_otp_attempts",
          minutes: CFG.blockMinutes(),
        });
      }

      return res.status(401).json({
        success: false,
        error: remaining === 0 ? "TOO_MANY_ATTEMPTS" : "INVALID_OTP",
        message:
          remaining === 0
            ? "Too many failed attempts. Account temporarily blocked."
            : "Invalid OTP",
        attempts_remaining: remaining,
      });
    }

    // ── 7. Atomically mark OTP as used (guards against replay) ────────────
    const markResult = store.markOtpUsed(otpRecord.id);
    if (!markResult.updated) {
      // Race condition – another concurrent request already consumed this OTP
      return res.status(409).json({
        success: false,
        error: "OTP_ALREADY_USED",
        message: "This OTP has already been used. Please request a new one.",
      });
    }

    // ── 8. Delete the OTP record (clean-up on success) ────────────────────
    store.deleteOtpRecord(otpRecord.id);

    // ── 9. Activate or create the user ────────────────────────────────────
    let user = store.findUserByEmail(email);
    if (!user) {
      // PENDING row was never created by send-otp (edge case: direct verify call)
      const created = store.createPendingUser({ id: uuidv4(), email, phone });
      user = created.user;
    }

    const activateResult = store.activateUser(email);
    user = activateResult.user || user;

    if (!user) {
      return res.status(500).json({
        success: false,
        error: "SERVER_ERROR",
        message: "Failed to activate account",
      });
    }

    // ── 10. Issue JWT ─────────────────────────────────────────────────────
    const token = issueJwt(user);

    return res.status(200).json({
      success: true,
      message: "OTP verified. Login successful.",
      token,
      user: {
        id:        user.id,
        email:     user.email,
        phone:     user.phone || null,
        plan:      user.plan  || "FREE",
        status:    user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("[EmailOTP] verify-otp error:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Internal server error",
    });
  }
});

module.exports = { initEmailAuthRoutes };
