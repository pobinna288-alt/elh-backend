/**
 * Fraud Detection Configuration
 * These thresholds determine how the system balances fraud prevention with user experience
 */

export const FRAUD_CONFIG = {
  // ===== REWARD LIMITS =====
  REWARD_AMOUNT_COINS: 10,
  
  // ===== RATE LIMITS (Per User) =====
  MAX_ADS_PER_HOUR: 5,
  MAX_ADS_PER_DAY: 30,
  MAX_DAILY_EARNINGS_COINS: 100,
  MAX_WEEKLY_EARNINGS_COINS: 500,
  MAX_MONTHLY_EARNINGS_COINS: 1500,
  
  // ===== NEW ACCOUNT RESTRICTIONS =====
  NEW_ACCOUNT_MAX_DAILY_ADS: 20,
  NEW_ACCOUNT_VERIFICATION_THRESHOLD_COINS: 50, // Require verification to earn this much
  NEW_ACCOUNT_RESTRICTION_DAYS: 30,
  MIN_ACCOUNT_AGE_FOR_WITHDRAWAL_DAYS: 7,
  
  // ===== WITHDRAWAL LIMITS =====
  MAX_WITHDRAWAL_PER_DAY_COINS: 50,
  MIN_WITHDRAWAL_AMOUNT_COINS: 10,
  MAX_WITHDRAWAL_AMOUNT_COINS: 500,
  WITHDRAWAL_PROCESSING_DAYS: 3,
  
  // ===== HOLDING PERIODS =====
  STANDARD_HOLDING_PERIOD_MS: 24 * 60 * 60 * 1000, // 24 hours
  EXTENDED_HOLDING_PERIOD_MS: 48 * 60 * 60 * 1000, // 48 hours
  MANUAL_REVIEW_HOLDING_PERIOD_MS: 72 * 60 * 60 * 1000, // 72 hours
  SESSION_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes
  RECOVERY_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  
  // ===== RATE LIMITS (Per IP) =====
  MAX_ADS_PER_IP_PER_DAY: 100,
  MAX_USERS_PER_IP: 5, // Max accounts from same IP
  
  // ===== RATE LIMITS (Per Device) =====
  MAX_USERS_PER_DEVICE: 3, // Max accounts from same device
  
  // ===== VELOCITY LIMITS =====
  MIN_AD_INTERVAL_MS: 2 * 60 * 1000, // 2 minutes between ads
  MAX_ADS_IN_5_MIN_WINDOW: 2,
  WATCH_INTERVAL_VARIANCE_THRESHOLD_MS: 10000, // ms - bot if too consistent
  
  // ===== WATCH COMPLETION =====
  MIN_WATCH_DURATION_PERCENT: 0.95, // Must watch 95% of video
  GRACE_PERIOD_PERCENT: 0.05, // 5% grace
  
  // ===== FRAUD SCORING THRESHOLDS (3-level MVP) =====
  FRAUD_SCORE: {
    ALLOW_THRESHOLD: 40,   // score < 40  → ALLOW (normal processing)
    REVIEW_THRESHOLD: 70,  // 40-69       → REVIEW (manual queue + extended hold)
    BLOCK_THRESHOLD: 70,   // score >= 70 → BLOCK (suspend + mandatory review)
  },

  // ===== DEVICE FINGERPRINTING =====
  DEVICE_FINGERPRINT_ALGO: 'SHA256',
  TRACK_DEVICE_CHANGES: true,
  MAX_DEVICE_CHANGES_PER_WEEK: 5,

  // ===== IP REPUTATION =====
  CHECK_VPN_USAGE: true,
  CHECK_PROXY_USAGE: true,
  CHECK_DATACENTER_IP: true,
  VPN_PENALTY_POINTS: 15,
  PROXY_PENALTY_POINTS: 20,
  DATACENTER_PENALTY_POINTS: 30,

  // ===== BEHAVIOR ANALYSIS =====
  ANALYZE_WATCH_PATTERNS: true,
  MIN_SAMPLES_FOR_VARIANCE: 5,
  PERFECT_CONSISTENCY_PENALTY: 25,
  BOT_INTERVAL_THRESHOLD_MS: 30000, // If all ads within 30s intervals = bot

  // ===== CIRCUIT BREAKER =====
  CIRCUIT_BREAKER_ENABLED: true,
  SUSPICIOUS_ACTIVITIES_THRESHOLD: 50, // Per minute
  CIRCUIT_BREAKER_WINDOW_MS: 60000, // 1 minute
  CIRCUIT_BREAKER_RESET_MS: 300000, // 5 minutes

  // ===== ML MODEL =====
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://python-fraud-service:8000',
  ML_PREDICTION_TIMEOUT_MS: 5000,
  ML_MODEL_RETRAINING_INTERVAL_DAYS: 7,
  RETRAIN_WITH_MIN_SAMPLES: 1000,

  // ===== RECONCILIATION =====
  DAILY_RECONCILIATION_ENABLED: true,
  RECONCILIATION_TIME_UTC: '02:00', // 2 AM UTC
  DISCREPANCY_ALERT_THRESHOLD_PERCENT: 5.0,

  // ===== LOGGING & MONITORING =====
  LOG_ALL_VALIDATION_FAILURES: true,
  LOG_ALL_FRAUD_EVENTS: true,
  RETENTION_DAYS_FRAUD_EVENTS: 90,
  RETENTION_DAYS_VIDEO_SESSIONS: 180,

  // ===== FEATURE FLAGS =====
  FEATURES: {
    REQUIRE_EMAIL_VERIFICATION: true,
    REQUIRE_PHONE_VERIFICATION_OVER_THRESHOLD: true, // Over $10
    REQUIRE_KYC_OVER_AMOUNT: 100, // Require identity verification over 100 coins
    AUTO_REVERSE_FLAGGED_REWARDS: true,
    AUTO_BAN_ON_CRITICAL_FRAUD: true,
    ENABLE_HONEYPOT_DETECTION: true,
  },

  // ===== AD PROVIDER VERIFICATION =====
  VERIFY_WITH_PROVIDER: true,
  AD_PROVIDER_API_TIMEOUT_MS: 5000,
  REQUIRE_PROVIDER_VERIFICATION: true,

  // ===== SUPPORT & APPEALS =====
  ALLOW_REWARD_APPEALS: true,
  APPEAL_PROCESSING_DAYS: 5,
  APPEAL_REVERSAL_THRESHOLD: 0.3, // If score drops below 0.3 on review, reverse ban

  // ===== SECURITY HEADERS =====
  ADD_SECURITY_HEADERS: true,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['https://example.com'],
  RATE_LIMIT_API_CALLS: true,
  MAX_API_CALLS_PER_MINUTE: 60,
};

/**
 * Risk Score Signal Weights (MVP – 6 strongest signals only)
 * Simple additive scoring: score = sum(signal_score * weight / 100), capped at 100
 */
export const RISK_SCORE_WEIGHTS = {
  account_age:       15,  // New account bonus
  device_count:      20,  // Multi-device / bot farm
  ip_rate:           15,  // IP rate limit / excessive IP changes
  velocity_24h:      20,  // Session frequency in last 24 h
  report_count:      30,  // Community reports
  duplicate_content: 25,  // Duplicate descriptions + images
  previous_bans:     40,  // Enforcement history
};

/**
 * Environment-specific overrides
 */
export const getConfigForEnvironment = (env: string) => {
  const baseConfig = { ...FRAUD_CONFIG };

  switch (env) {
    case 'development':
      // Relaxed for testing
      return {
        ...baseConfig,
        FRAUD_SCORE: {
          ...baseConfig.FRAUD_SCORE,
          BLOCK_THRESHOLD: 0.95, // Harder to block in dev
        },
        CIRCUIT_BREAKER_ENABLED: false,
      };

    case 'staging':
      // Moderate security
      return {
        ...baseConfig,
        FRAUD_SCORE: {
          ...baseConfig.FRAUD_SCORE,
          MANUAL_REVIEW_THRESHOLD: 0.65, // Lower threshold for review
        },
      };

    case 'production':
      // Maximum security
      return {
        ...baseConfig,
        FEATURES: {
          ...baseConfig.FEATURES,
          AUTO_BAN_ON_CRITICAL_FRAUD: true,
          REQUIRE_KYC_OVER_AMOUNT: 50, // Stricter KYC
        },
        MAX_DAILY_EARNINGS_COINS: 50, // Tighter limits
      };

    default:
      return baseConfig;
  }
};

export default FRAUD_CONFIG;
