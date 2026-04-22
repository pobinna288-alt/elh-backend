"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigForEnvironment = exports.RISK_SCORE_WEIGHTS = exports.FRAUD_CONFIG = void 0;
exports.FRAUD_CONFIG = {
    REWARD_AMOUNT_COINS: 10,
    MAX_ADS_PER_HOUR: 5,
    MAX_ADS_PER_DAY: 30,
    MAX_DAILY_EARNINGS_COINS: 100,
    MAX_WEEKLY_EARNINGS_COINS: 500,
    MAX_MONTHLY_EARNINGS_COINS: 1500,
    NEW_ACCOUNT_MAX_DAILY_ADS: 20,
    NEW_ACCOUNT_VERIFICATION_THRESHOLD_COINS: 50,
    NEW_ACCOUNT_RESTRICTION_DAYS: 30,
    MIN_ACCOUNT_AGE_FOR_WITHDRAWAL_DAYS: 7,
    MAX_WITHDRAWAL_PER_DAY_COINS: 50,
    MIN_WITHDRAWAL_AMOUNT_COINS: 10,
    MAX_WITHDRAWAL_AMOUNT_COINS: 500,
    WITHDRAWAL_PROCESSING_DAYS: 3,
    STANDARD_HOLDING_PERIOD_MS: 24 * 60 * 60 * 1000,
    EXTENDED_HOLDING_PERIOD_MS: 48 * 60 * 60 * 1000,
    MANUAL_REVIEW_HOLDING_PERIOD_MS: 72 * 60 * 60 * 1000,
    SESSION_TIMEOUT_MS: 10 * 60 * 1000,
    RECOVERY_WINDOW_MS: 5 * 60 * 1000,
    MAX_ADS_PER_IP_PER_DAY: 100,
    MAX_USERS_PER_IP: 5,
    MAX_USERS_PER_DEVICE: 3,
    MIN_AD_INTERVAL_MS: 2 * 60 * 1000,
    MAX_ADS_IN_5_MIN_WINDOW: 2,
    WATCH_INTERVAL_VARIANCE_THRESHOLD_MS: 10000,
    MIN_WATCH_DURATION_PERCENT: 0.95,
    GRACE_PERIOD_PERCENT: 0.05,
    FRAUD_SCORE: {
        APPROVE_THRESHOLD: 0.3,
        EXTENDED_HOLD_THRESHOLD: 0.5,
        MANUAL_REVIEW_THRESHOLD: 0.7,
        HIGH_RISK_THRESHOLD: 0.85,
        BLOCK_THRESHOLD: 0.9,
    },
    DEVICE_FINGERPRINT_ALGO: 'SHA256',
    TRACK_DEVICE_CHANGES: true,
    MAX_DEVICE_CHANGES_PER_WEEK: 5,
    CHECK_VPN_USAGE: true,
    CHECK_PROXY_USAGE: true,
    CHECK_DATACENTER_IP: true,
    VPN_PENALTY_POINTS: 15,
    PROXY_PENALTY_POINTS: 20,
    DATACENTER_PENALTY_POINTS: 30,
    ANALYZE_WATCH_PATTERNS: true,
    MIN_SAMPLES_FOR_VARIANCE: 5,
    PERFECT_CONSISTENCY_PENALTY: 25,
    BOT_INTERVAL_THRESHOLD_MS: 30000,
    CIRCUIT_BREAKER_ENABLED: true,
    SUSPICIOUS_ACTIVITIES_THRESHOLD: 50,
    CIRCUIT_BREAKER_WINDOW_MS: 60000,
    CIRCUIT_BREAKER_RESET_MS: 300000,
    ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://python-fraud-service:8000',
    ML_PREDICTION_TIMEOUT_MS: 5000,
    ML_MODEL_RETRAINING_INTERVAL_DAYS: 7,
    RETRAIN_WITH_MIN_SAMPLES: 1000,
    DAILY_RECONCILIATION_ENABLED: true,
    RECONCILIATION_TIME_UTC: '02:00',
    DISCREPANCY_ALERT_THRESHOLD_PERCENT: 5.0,
    LOG_ALL_VALIDATION_FAILURES: true,
    LOG_ALL_FRAUD_EVENTS: true,
    RETENTION_DAYS_FRAUD_EVENTS: 90,
    RETENTION_DAYS_VIDEO_SESSIONS: 180,
    FEATURES: {
        REQUIRE_EMAIL_VERIFICATION: true,
        REQUIRE_PHONE_VERIFICATION_OVER_THRESHOLD: true,
        REQUIRE_KYC_OVER_AMOUNT: 100,
        AUTO_REVERSE_FLAGGED_REWARDS: true,
        AUTO_BAN_ON_CRITICAL_FRAUD: true,
        ENABLE_HONEYPOT_DETECTION: true,
    },
    VERIFY_WITH_PROVIDER: true,
    AD_PROVIDER_API_TIMEOUT_MS: 5000,
    REQUIRE_PROVIDER_VERIFICATION: true,
    ALLOW_REWARD_APPEALS: true,
    APPEAL_PROCESSING_DAYS: 5,
    APPEAL_REVERSAL_THRESHOLD: 0.3,
    ADD_SECURITY_HEADERS: true,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['https://example.com'],
    RATE_LIMIT_API_CALLS: true,
    MAX_API_CALLS_PER_MINUTE: 60,
};
exports.RISK_SCORE_WEIGHTS = {
    account_age_hours: 0.08,
    total_ads_watched: 0.07,
    unique_devices: 0.10,
    unique_ips: 0.12,
    avg_watch_interval_ms: 0.09,
    watch_interval_variance: 0.11,
    vpn_usage_ratio: 0.10,
    same_device_accounts: 0.12,
    withdrawal_attempts: 0.08,
    email_verified: 0.05,
    phone_verified: 0.03,
    social_engagement_score: 0.06,
    time_since_last_ad_minutes: 0.05,
    ads_last_hour: 0.09,
    ads_last_24h: 0.10,
    earnings_to_activity_ratio: 0.10,
};
const getConfigForEnvironment = (env) => {
    const baseConfig = { ...exports.FRAUD_CONFIG };
    switch (env) {
        case 'development':
            return {
                ...baseConfig,
                FRAUD_SCORE: {
                    ...baseConfig.FRAUD_SCORE,
                    BLOCK_THRESHOLD: 0.95,
                },
                CIRCUIT_BREAKER_ENABLED: false,
            };
        case 'staging':
            return {
                ...baseConfig,
                FRAUD_SCORE: {
                    ...baseConfig.FRAUD_SCORE,
                    MANUAL_REVIEW_THRESHOLD: 0.65,
                },
            };
        case 'production':
            return {
                ...baseConfig,
                FEATURES: {
                    ...baseConfig.FEATURES,
                    AUTO_BAN_ON_CRITICAL_FRAUD: true,
                    REQUIRE_KYC_OVER_AMOUNT: 50,
                },
                MAX_DAILY_EARNINGS_COINS: 50,
            };
        default:
            return baseConfig;
    }
};
exports.getConfigForEnvironment = getConfigForEnvironment;
exports.default = exports.FRAUD_CONFIG;
//# sourceMappingURL=fraud.config.js.map