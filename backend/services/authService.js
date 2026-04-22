/**
 * El Hannora Authentication Service
 * Handles user registration, login, password reset, and Terms & Conditions
 * Production-ready, secure, and scalable
 */

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// ============================================
// CONFIGURATION
// ============================================

const AUTH_CONFIG = {
  // OTP / transient secret hashing
  PASSWORD_HASH_ROUNDS: 12,
  
  // Rate limiting / brute-force protection
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,

  // Phone OTP authentication
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  OTP_REQUEST_WINDOW_MINUTES: 10,
  OTP_MAX_PER_PHONE_PER_WINDOW: 5,
  OTP_MAX_PER_IP_PER_WINDOW: 5,
  OTP_VERIFY_MAX_ATTEMPTS: 5,
  MAX_ACCOUNTS_PER_DEVICE: 3,
  TRUST_DEVICE_EXPIRY_DAYS: 30,
  
  // Password reset
  RESET_TOKEN_EXPIRY_HOURS: 1,
  
  // Remember me
  REMEMBER_ME_EXPIRY_DAYS: 30,
  
  // Terms version
  CURRENT_TERMS_VERSION: "1.0"
};

// ============================================
// TERMS AND CONDITIONS TEXT
// ============================================

const TERMS_AND_CONDITIONS = {
  version: "1.0",
  effectiveDate: "2026-03-01",
  content: `**Account Responsibility**
- You are responsible for keeping your login credentials (email and password) confidential.
- All activity under your account is your responsibility.
- Accounts are personal; do not share your login.

**Platform Use**
- The platform does not require personal user age or location at signup.
- You may provide audience targeting information (age range, location, gender, platform) to improve AI predictions.
- Predictions are estimates and may not be 100% accurate. El Hannora is not liable for financial loss or campaign outcomes.
- You agree to provide truthful information for accurate predictions.

**Prohibited Content & Behavior**
- No sexual content, harmful, illegal, or deceptive ads are allowed.
- Any violation of rules may result in automatic suspension or ban of your account.

**Liability**
- Use of El Hannora is at your own risk.
- The platform provides AI predictions to assist campaigns, but does not guarantee results.

**Modifications**
- El Hannora may update these Terms at any time.
- Continued use of the platform constitutes acceptance of updated Terms.`,
  sections: [
    {
      title: "Account Responsibility",
      items: [
        "You are responsible for keeping your login credentials (email and password) confidential.",
        "All activity under your account is your responsibility.",
        "Accounts are personal; do not share your login."
      ]
    },
    {
      title: "Platform Use",
      items: [
        "The platform does not require personal user age or location at signup.",
        "You may provide audience targeting information (age range, location, gender, platform) to improve AI predictions.",
        "Predictions are estimates and may not be 100% accurate. El Hannora is not liable for financial loss or campaign outcomes.",
        "You agree to provide truthful information for accurate predictions."
      ]
    },
    {
      title: "Prohibited Content & Behavior",
      items: [
        "No sexual content, harmful, illegal, or deceptive ads are allowed.",
        "Any violation of rules may result in automatic suspension or ban of your account."
      ]
    },
    {
      title: "Liability",
      items: [
        "Use of El Hannora is at your own risk.",
        "The platform provides AI predictions to assist campaigns, but does not guarantee results."
      ]
    },
    {
      title: "Modifications",
      items: [
        "El Hannora may update these Terms at any time.",
        "Continued use of the platform constitutes acceptance of updated Terms."
      ]
    }
  ]
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Validate password strength
 */
const validatePassword = () => {
  return {
    valid: false,
    errors: ["Password-based authentication is disabled. Use phone OTP authentication."],
  };
};

/**
 * Validate full name
 */
const validateFullName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Full name is required" };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: "Full name must be at least 2 characters" };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: "Full name cannot exceed 100 characters" };
  }
  
  return { valid: true };
};

/**
 * Validate company/brand name
 */
const validateCompanyName = (company) => {
  if (!company || typeof company !== "string") {
    return { valid: false, error: "Company/Brand name is required" };
  }
  
  const trimmed = company.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: "Company/Brand name must be at least 2 characters" };
  }
  
  if (trimmed.length > 150) {
    return { valid: false, error: "Company/Brand name cannot exceed 150 characters" };
  }
  
  return { valid: true };
};

/**
 * Sanitize input to prevent injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .trim();
};

// ============================================
// SECURITY FUNCTIONS
// ============================================

/**
 * Hash transient secrets like OTP values with bcrypt
 */
const hashPassword = async (value) => {
  return await bcrypt.hash(value, AUTH_CONFIG.PASSWORD_HASH_ROUNDS);
};

/**
 * Compare transient secrets like OTP values with the stored hash
 */
const verifyPassword = async (value, hash) => {
  return await bcrypt.compare(value, hash);
};

/**
 * Generate secure reset token
 */
const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  return {
    plainToken: token,
    tokenHash,
    expiresAt
  };
};

/**
 * Verify reset token
 */
const verifyResetToken = (plainToken, storedHash, expiresAt) => {
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
  const isValid = tokenHash === storedHash && new Date() < new Date(expiresAt);
  
  return {
    valid: isValid,
    reason: !isValid ? (new Date() >= new Date(expiresAt) ? "Token expired" : "Invalid token") : null
  };
};

/**
 * Generate remember me token
 */
const generateRememberToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.REMEMBER_ME_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  return { token, expiresAt };
};

// ============================================
// RATE LIMITING FUNCTIONS
// ============================================

/**
 * Check if account is locked due to failed attempts
 */
const isAccountLocked = (user) => {
  if (!user.lockedUntil) return false;
  return new Date() < new Date(user.lockedUntil);
};

/**
 * Calculate lockout time
 */
const calculateLockoutTime = () => {
  return new Date(Date.now() + AUTH_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
};

/**
 * Get remaining lockout time in minutes
 */
const getRemainingLockoutTime = (lockedUntil) => {
  if (!lockedUntil) return 0;
  const remaining = new Date(lockedUntil) - new Date();
  return Math.max(0, Math.ceil(remaining / (60 * 1000)));
};

// ============================================
// USER HELPER FUNCTIONS
// ============================================

/**
 * Sanitize user object for response (remove sensitive data)
 */
const sanitizeUser = (user) => {
  const {
    email,
    password,
    password_hash,
    reset_token,
    resetToken,
    reset_token_expires_at,
    resetTokenExpiresAt,
    remember_token,
    rememberToken,
    email_verification_token,
    failed_login_attempts,
    failedLoginAttempts,
    ...safeUser
  } = user;
  
  return safeUser;
};

/**
 * Create workspace for user
 */
const createWorkspace = (companyName, userId) => {
  return {
    id: uuidv4(),
    name: companyName,
    ownerId: userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Config
  AUTH_CONFIG,
  TERMS_AND_CONDITIONS,
  
  // Validation
  validateEmail,
  validatePassword,
  validateFullName,
  validateCompanyName,
  sanitizeInput,
  
  // Security
  hashPassword,
  verifyPassword,
  generateResetToken,
  verifyResetToken,
  generateRememberToken,
  
  // Rate Limiting
  isAccountLocked,
  calculateLockoutTime,
  getRemainingLockoutTime,
  
  // User Helpers
  sanitizeUser,
  createWorkspace
};
