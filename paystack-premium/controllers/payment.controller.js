/**
 * PAYMENT CONTROLLER MODULE
 * 
 * This controller handles all payment-related business logic.
 * It coordinates between the Paystack service and database service.
 * 
 * Key Functions:
 * - Initialize payment
 * - Verify payment and update user status
 * - Get user payment status
 * 
 * @module PaymentController
 */

const paystackService = require('../services/paystack.service');
const databaseService = require('../services/database.service');
const { getBillingConfig } = require('../../backend/config/subscriptionPlans');

const PAYMENT_TIMEOUT_MS = 10000;

/**
 * PaymentController Class
 * Contains all payment-related route handlers
 */
class PaymentController {

  /**
   * Initialize a payment transaction
   * 
   * Endpoint: POST /api/payments/initialize
   * Request Body: { email, amount, userId, plan }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async initializePayment(req, res, next) {
    try {
      const { email, amount, userId, plan } = req.body;

      console.log('🔥 Init request received');

      // Fail fast on invalid input to avoid unnecessary downstream work.
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const numericAmount = Number(amount);
      const hasInvalidInput =
        !email ||
        !emailRegex.test(String(email).trim()) ||
        !userId ||
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0;

      if (hasInvalidInput) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment input'
        });
      }

      console.log(`💳 Payment initialization request from user: ${userId}`);

      // Check if user exists
      const user = await databaseService.findUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const selectedPlan = getBillingConfig(plan || 'premium');
      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription plan'
        });
      }

      if (numericAmount !== selectedPlan.paystackAmount) {
        return res.status(400).json({
          success: false,
          message: `Payment amount mismatch. Required: ₦${selectedPlan.paystackAmount}`
        });
      }

      console.log('🔥 Calling Paystack...');

      const paymentPromise = paystackService.initializePayment({
        email,
        amount: selectedPlan.paystackAmount,
        userId,
        plan: plan || 'premium'
      });

      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          const timeoutError = new Error('Payment service timeout');
          timeoutError.code = 'PAYMENT_TIMEOUT';
          reject(timeoutError);
        }, PAYMENT_TIMEOUT_MS);

        // Prevent keeping event loop open if request already finished.
        timer.unref?.();
      });

      // Initialize payment with Paystack using the server-side configured amount
      const paymentResult = await Promise.race([paymentPromise, timeoutPromise]);

      console.log('🔥 Paystack responded');

      // Return success response with authorization URL
      return res.status(200).json({
        success: true,
        authorization_url: paymentResult.authorizationUrl,
        reference: paymentResult.reference
      });

    } catch (error) {
      console.error('❌ Paystack error:', error.message);
      console.error('❌ Initialize payment error:', error.message);

      if (res.headersSent) {
        return;
      }

      if (error.code === 'PAYMENT_TIMEOUT' || error.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: 'Payment service timeout',
          retryable: true
        });
      }

      return res.status(502).json({
        success: false,
        message: 'Payment initialization failed',
        retryable: true
      });
    }
  }

  /**
   * Verify payment and update user premium status
   * 
   * This is the main endpoint that your frontend should call after payment.
   * It verifies the payment with Paystack and updates the user in the database.
   * 
   * Endpoint: POST /api/payments/verify
   * Request Body: { reference, userId }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * 
   * @returns {Object} JSON response with success status
   * 
   * Success Response:
   * {
   *   success: true,
   *   message: "Payment verified successfully",
   *   data: {
   *     userId: "user_001",
   *     isPremium: true,
   *     amount: 5000,
   *     reference: "ref_abc123"
   *   }
   * }
   * 
   * Failure Response:
   * {
   *   success: false,
   *   message: "Payment verification failed"
   * }
   */
  async verifyPayment(req, res, next) {
    try {
      const { reference, userId } = req.body;

      // Validate required fields
      if (!reference || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Payment reference and userId are required'
        });
      }

      console.log(`🔍 Verifying payment for user ${userId} with reference: ${reference}`);

      // Step 1: Verify payment with Paystack
      const verificationResult = await paystackService.verifyPayment(reference);

      // Step 2: Check if payment was successful
      if (!verificationResult.success) {
        console.log(`⚠️ Payment verification failed for reference: ${reference}`);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed. Payment was not successful.',
          data: {
            status: verificationResult.status,
            reference: reference
          }
        });
      }

      // Step 3: Verify that the userId matches
      const paymentUserId = verificationResult.metadata?.userId || verificationResult.metadata?.user_id;
      
      if (paymentUserId && paymentUserId !== userId) {
        console.error(`⚠️ User ID mismatch! Expected: ${userId}, Got: ${paymentUserId}`);
        return res.status(400).json({
          success: false,
          message: 'User ID mismatch. This payment belongs to a different user.'
        });
      }

      const selectedPlan = getBillingConfig(verificationResult.metadata?.plan || 'premium');
      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription plan in payment metadata'
        });
      }

      if (verificationResult.amount !== selectedPlan.paystackAmount) {
        return res.status(400).json({
          success: false,
          message: `Payment amount mismatch. Required: ₦${selectedPlan.paystackAmount}`,
          data: {
            expected: selectedPlan.paystackAmount,
            received: verificationResult.amount,
            reference: reference,
          }
        });
      }

      // Step 4: Update user premium status in database
      const updatedUser = await databaseService.updateUserPremiumStatus(userId, {
        amount: verificationResult.amount,
        reference: verificationResult.reference,
        plan: verificationResult.metadata?.plan || 'premium'
      });

      console.log(`✅ Payment verified and user ${userId} upgraded to premium`);

      // Step 5: Return success response
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully. User upgraded to premium!',
        data: {
          userId: updatedUser.id,
          email: updatedUser.email,
          isPremium: updatedUser.isPremium,
          premiumExpiry: updatedUser.premiumExpiry,
          amount: verificationResult.amount,
          reference: verificationResult.reference,
          paidAt: verificationResult.paidAt
        }
      });

    } catch (error) {
      console.error('❌ Verify payment error:', error.message);

      // Return appropriate error response
      return res.status(500).json({
        success: false,
        message: error.message || 'Payment verification failed due to server error'
      });
    }
  }

  /**
   * Get user payment status
   * 
   * Endpoint: GET /api/payments/user/:userId
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUserStatus(req, res, next) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      console.log(`📊 Fetching payment status for user: ${userId}`);

      // Find user in database
      const user = await databaseService.findUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if premium is active
      const hasActivePremium = await databaseService.hasActivePremium(userId);

      // Return user payment status
      return res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          isPremium: user.isPremium,
          hasActivePremium: hasActivePremium,
          premiumExpiry: user.premiumExpiry,
          totalPaid: user.totalPaid,
          paymentHistory: user.paymentHistory,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      console.error('❌ Get user status error:', error.message);
      next(error);
    }
  }

  /**
   * Get all users (for testing/debugging)
   * 
   * Endpoint: GET /api/payments/users
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllUsers(req, res, next) {
    try {
      console.log('📋 Fetching all users...');

      const users = await databaseService.getAllUsers();

      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });

    } catch (error) {
      console.error('❌ Get all users error:', error.message);
      next(error);
    }
  }

  /**
   * Create a new user (for testing)
   * 
   * Endpoint: POST /api/payments/users
   * Request Body: { id, email, name }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createUser(req, res, next) {
    try {
      const { id, email, name } = req.body;

      if (!id || !email || !name) {
        return res.status(400).json({
          success: false,
          message: 'id, email, and name are required'
        });
      }

      console.log(`👤 Creating new user: ${id}`);

      const newUser = await databaseService.createUser({ id, email, name });

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
      });

    } catch (error) {
      console.error('❌ Create user error:', error.message);
      next(error);
    }
  }
}

// Export singleton instance
module.exports = new PaymentController();
