/**
 * CONFIGURATION MODULE
 * 
 * This module manages all application configuration.
 * It loads environment variables and provides default values.
 * 
 * @module Config
 */

require('dotenv').config();

/**
 * Application Configuration
 * All configuration values are loaded from environment variables
 */
const config = {
  // ============================================================================
  // SERVER CONFIGURATION
  // ============================================================================

  /**
   * Server port
   * Default: 3000
   */
  port: process.env.PORT || 4010,

  /**
   * Node environment (development, production, test)
   * Default: development
   */
  nodeEnv: process.env.NODE_ENV || 'development',

  /**
   * CORS allowed origins
   * In production, set this to your frontend domain
   * Default: Allow all origins (*)
   */
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // ============================================================================
  // PAYSTACK CONFIGURATION
  // ============================================================================

  /**
   * Paystack Secret Key
   * Get this from: https://dashboard.paystack.com/#/settings/developer
   * 
   * IMPORTANT: 
   * - Use test key (sk_test_xxx) for development
   * - Use live key (sk_live_xxx) for production
   * - NEVER commit this to version control
   */
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,

  /**
   * Paystack callback URL
   * URL where users are redirected after payment
    * Default: BASE_URL/payment-callback
   */
  paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL || `${process.env.BASE_URL || ''}/payment-callback`,

  // ============================================================================
  // DATABASE CONFIGURATION
  // ============================================================================

  /**
   * Database type
   * Set to true to use MongoDB, false for mock in-memory database
   * Default: false (mock database)
   */
  useMongoDB: process.env.USE_MONGODB === 'true',

  /**
   * MongoDB connection URI
   * Format: mongodb://username:password@host:port/database
    * Default: from MONGODB_URI environment variable
   */
    mongodbUri: process.env.MONGODB_URI || '',

  /**
   * MongoDB database name
   * Default: paystack-premium
   */
  mongodbDatabase: process.env.MONGODB_DATABASE || 'paystack-premium',

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate required configuration
   * Throws an error if critical configuration is missing
   */
  validate() {
    const errors = [];

    // Check for Paystack secret key
    if (!this.paystackSecretKey) {
      errors.push('PAYSTACK_SECRET_KEY is not set in environment variables');
    }

    // Validate secret key format
    if (this.paystackSecretKey && !this.paystackSecretKey.startsWith('sk_')) {
      errors.push('Invalid PAYSTACK_SECRET_KEY format. Key must start with "sk_"');
    }

    // If using MongoDB, check for connection URI
    if (this.useMongoDB && !this.mongodbUri) {
      errors.push('USE_MONGODB is true but MONGODB_URI is not set');
    }

    // If there are errors, throw
    if (errors.length > 0) {
      const errorMessage = '\n❌ Configuration Errors:\n' + errors.map(e => `   - ${e}`).join('\n');
      throw new Error(errorMessage);
    }

    console.log('✅ Configuration validated successfully');
  }
};

// Validate configuration on load
try {
  config.validate();
} catch (error) {
  console.error(error.message);
  console.error('\n💡 Please check your .env file and ensure all required variables are set.');
  console.error('📖 See .env.example for reference.\n');
  process.exit(1);
}

module.exports = config;
