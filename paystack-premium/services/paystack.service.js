/**
 * PAYSTACK SERVICE MODULE
 * 
 * This module handles all interactions with the Paystack API.
 * It provides methods for initializing and verifying payments.
 * 
 * Key Features:
 * - Initialize payment transactions
 * - Verify payment status
 * - Secure API key management
 * - Comprehensive error handling
 * 
 * @module PaystackService
 */

const axios = require('axios');
const config = require('../config/config');

const PAYSTACK_TIMEOUT_MS = 10000;

/**
 * PaystackService Class
 * Handles all Paystack API interactions
 */
class PaystackService {
  constructor() {
    this.secretKey = config.paystackSecretKey;
    this.baseUrl = 'https://api.paystack.co';

    // Validate that secret key is configured
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured in environment variables');
    }

    // Validate key format
    if (!this.secretKey.startsWith('sk_')) {
      throw new Error('Invalid Paystack secret key format. Key must start with "sk_"');
    }

    console.log('✅ PaystackService initialized successfully');
  }

  /**
   * Initialize a payment transaction
   * 
   * This method creates a new payment transaction with Paystack and returns
   * an authorization URL that the user should be redirected to for payment.
   * 
   * @param {Object} paymentData - Payment initialization data
   * @param {string} paymentData.email - Customer email address
   * @param {number} paymentData.amount - Amount in Naira (will be converted to kobo)
   * @param {string} paymentData.userId - User ID for tracking
   * @param {string} [paymentData.plan] - Subscription plan name (optional)
   * 
   * @returns {Promise<Object>} Payment initialization result
   * @returns {string} return.authorizationUrl - URL to redirect user for payment
   * @returns {string} return.reference - Unique payment reference
   * @returns {string} return.accessCode - Payment access code
   * 
   * @throws {Error} If payment initialization fails
   * 
   * @example
   * const result = await paystackService.initializePayment({
   *   email: 'user@example.com',
   *   amount: 5000,
   *   userId: 'user123',
   *   plan: 'premium'
   * });
   * console.log(result.authorizationUrl); // Redirect user here
   */
  async initializePayment(paymentData) {
    try {
      const { email, amount, userId, plan = 'premium' } = paymentData;

      // Validate required fields
      if (!email || !amount || !userId) {
        throw new Error('Email, amount, and userId are required for payment initialization');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Validate amount (must be positive number)
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      console.log(`🔄 Initializing payment for user ${userId}: ₦${amount}`);

      // Prepare request payload
      const payload = {
        email: email,
        amount: Math.round(amount * 100), // Convert Naira to kobo (smallest unit)
        currency: 'NGN',
        metadata: {
          userId: userId,
          plan: plan,
          custom_fields: [
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: userId
            },
            {
              display_name: 'Plan',
              variable_name: 'plan',
              value: plan
            }
          ]
        },
        callback_url: config.paystackCallbackUrl
      };

      // Make API request to Paystack
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: PAYSTACK_TIMEOUT_MS
        }
      );

      // Check if initialization was successful
      if (!response.data || !response.data.status) {
        throw new Error('Payment initialization failed: Invalid response from Paystack');
      }

      const { authorization_url, reference, access_code } = response.data.data;

      console.log(`✅ Payment initialized successfully. Reference: ${reference}`);

      return {
        authorizationUrl: authorization_url,
        reference: reference,
        accessCode: access_code
      };

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('❌ Paystack initialize timeout after 10s');
        throw new Error('Payment service timeout');
      }

      // Handle Paystack API errors
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Paystack API error';
        console.error(`❌ Paystack API Error (${error.response.status}):`, errorMessage);
        throw new Error(`Payment initialization failed: ${errorMessage}`);
      }

      // Handle other errors (network, validation, etc.)
      console.error('❌ Payment initialization error:', error.message);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  /**
   * Verify a payment transaction
   * 
   * This method verifies the status of a payment transaction using its reference.
   * It should be called after the user completes payment on Paystack.
   * 
   * @param {string} reference - Payment reference to verify
   * 
   * @returns {Promise<Object>} Verification result
   * @returns {boolean} return.success - Whether payment was successful
   * @returns {number} return.amount - Amount paid (in Naira)
   * @returns {string} return.currency - Currency code (NGN)
   * @returns {Object} return.customer - Customer information
   * @returns {string} return.customer.email - Customer email
   * @returns {Object} return.metadata - Transaction metadata (userId, plan)
   * @returns {string} return.paidAt - Payment timestamp
   * @returns {string} return.channel - Payment channel (card, bank, etc.)
   * @returns {string} return.reference - Payment reference
   * 
   * @throws {Error} If verification fails or reference is invalid
   * 
   * @example
   * const result = await paystackService.verifyPayment('ref_abc123xyz');
   * if (result.success) {
   *   console.log('Payment verified!', result.metadata.userId);
   * }
   */
  async verifyPayment(reference) {
    try {
      // Validate reference
      if (!reference || typeof reference !== 'string') {
        throw new Error('Payment reference is required and must be a string');
      }

      console.log(`🔍 Verifying payment with reference: ${reference}`);

      // Make API request to Paystack
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: PAYSTACK_TIMEOUT_MS
        }
      );

      // Check response status
      if (!response.data || !response.data.status) {
        throw new Error('Payment verification failed: Invalid response from Paystack');
      }

      const transaction = response.data.data;

      // Check if payment was successful
      const isSuccessful = transaction.status === 'success';

      if (isSuccessful) {
        console.log(`✅ Payment verified successfully: ₦${transaction.amount / 100}`);
      } else {
        console.log(`⚠️ Payment verification failed. Status: ${transaction.status}`);
      }

      // Return verification result
      return {
        success: isSuccessful,
        amount: transaction.amount / 100, // Convert kobo back to Naira
        currency: transaction.currency,
        customer: {
          email: transaction.customer.email,
          customerId: transaction.customer.id
        },
        metadata: transaction.metadata || {},
        paidAt: transaction.paid_at,
        channel: transaction.channel,
        reference: transaction.reference,
        status: transaction.status
      };

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('❌ Paystack verify timeout after 10s');
        throw new Error('Payment service timeout');
      }

      // Handle Paystack API errors
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || 'Paystack API error';

        console.error(`❌ Paystack Verification Error (${statusCode}):`, errorMessage);

        // Handle specific error codes
        if (statusCode === 404) {
          throw new Error('Payment reference not found. Please check the reference and try again.');
        }

        throw new Error(`Payment verification failed: ${errorMessage}`);
      }

      // Handle other errors
      console.error('❌ Payment verification error:', error.message);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Get transaction details
   * 
   * Retrieves detailed information about a transaction.
   * 
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} Transaction details
   * @throws {Error} If retrieval fails
   */
  async getTransaction(reference) {
    try {
      console.log(`📄 Fetching transaction details for: ${reference}`);

      const response = await axios.get(
        `${this.baseUrl}/transaction/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: PAYSTACK_TIMEOUT_MS
        }
      );

      if (!response.data || !response.data.status) {
        throw new Error('Failed to fetch transaction details');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Error fetching transaction:', error.message);
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new PaystackService();
