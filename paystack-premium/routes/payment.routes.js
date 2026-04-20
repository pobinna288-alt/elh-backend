/**
 * PAYMENT ROUTES MODULE
 * 
 * This module defines all payment-related API endpoints.
 * Routes are organized and mapped to controller functions.
 * 
 * @module PaymentRoutes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// ============================================================================
// ADMIN KEY MIDDLEWARE
// ============================================================================

/**
 * Internal admin protection: requires the x-admin-key header to match the
 * PAYSTACK_ADMIN_KEY environment variable. Use this for any route that
 * exposes all users or allows user creation — never expose these publicly.
 */
function requireAdminKey(req, res, next) {
  const adminKey = process.env.PAYSTACK_ADMIN_KEY;
  if (!adminKey) {
    return res.status(503).json({
      success: false,
      error: 'Admin access is not configured on this server.',
    });
  }
  if (req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: invalid or missing admin key.',
    });
  }
  next();
}

// ============================================================================
// PAYMENT VERIFICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment and update user premium status
 * @access  Public
 * @body    { reference: string, userId: string }
 * @returns { success: boolean, message: string, data: object }
 * 
 * @example
 * POST /api/payments/verify
 * {
 *   "reference": "ref_abc123xyz",
 *   "userId": "user_001"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Payment verified successfully",
 *   "data": {
 *     "userId": "user_001",
 *     "isPremium": true,
 *     "amount": 5000,
 *     "reference": "ref_abc123xyz"
 *   }
 * }
 */
router.post('/verify', paymentController.verifyPayment);

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize a new payment transaction
 * @access  Public
 * @body    { email: string, amount: number, userId: string, plan?: string }
 * @returns { success: boolean, data: { authorizationUrl: string, reference: string } }
 * 
 * @example
 * POST /api/payments/initialize
 * {
 *   "email": "user@example.com",
 *   "amount": 5000,
 *   "userId": "user_001",
 *   "plan": "premium"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "authorizationUrl": "https://checkout.paystack.com/...",
 *     "reference": "ref_abc123xyz"
 *   }
 * }
 */
router.post('/initialize', paymentController.initializePayment);

// ============================================================================
// USER STATUS ROUTES
// ============================================================================

/**
 * @route   GET /api/payments/user/:userId
 * @desc    Get user payment status and subscription details
 * @access  Public
 * @params  userId (URL parameter)
 * @returns { success: boolean, data: object }
 * 
 * @example
 * GET /api/payments/user/user_001
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "user_001",
 *     "email": "user@example.com",
 *     "isPremium": true,
 *     "premiumExpiry": "2026-02-15T10:00:00.000Z",
 *     "totalPaid": 5000,
 *     "paymentHistory": [...]
 *   }
 * }
 */
router.get('/user/:userId', paymentController.getUserStatus);

/**
 * @route   GET /api/payments/users
 * @desc    Get all users (for testing/debugging)
 * @access  Public
 * @returns { success: boolean, count: number, data: array }
 * 
 * @example
 * GET /api/payments/users
 * 
 * Response:
 * {
 *   "success": true,
 *   "count": 3,
 *   "data": [...]
 * }
 */
router.get('/users', requireAdminKey, paymentController.getAllUsers);

/**
 * @route   POST /api/payments/users
 * @desc    Create a new user (for testing)
 * @access  Public
 * @body    { id: string, email: string, name: string }
 * @returns { success: boolean, data: object }
 * 
 * @example
 * POST /api/payments/users
 * {
 *   "id": "user_004",
 *   "email": "newuser@example.com",
 *   "name": "New User"
 * }
 */
router.post('/users', requireAdminKey, paymentController.createUser);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

module.exports = router;
