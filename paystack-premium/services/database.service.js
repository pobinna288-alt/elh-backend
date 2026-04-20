/**
 * DATABASE SERVICE MODULE
 * 
 * This module handles all database operations for user premium status.
 * It supports both in-memory (mock) database and MongoDB.
 * 
 * Key Features:
 * - Find user by ID
 * - Update user premium status
 * - Track payment history
 * - Support for both mock and MongoDB
 * 
 * @module DatabaseService
 */

const config = require('../config/config');

/**
 * DatabaseService Class
 * Handles all database operations
 */
class DatabaseService {
  constructor() {
    this.useMongoDB = config.useMongoDB;
    this.mockDatabase = null;
    this.mongoClient = null;

    if (this.useMongoDB) {
      this.initializeMongoDB();
    } else {
      this.initializeMockDatabase();
    }
  }

  /**
   * Initialize mock in-memory database
   * Used for development and testing
   */
  initializeMockDatabase() {
    console.log('📦 Initializing mock in-memory database...');

    this.mockDatabase = {
      users: [
        {
          id: 'user_001',
          email: 'user1@example.com',
          name: 'John Doe',
          isPremium: false,
          premiumExpiry: null,
          totalPaid: 0,
          paymentHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'user_002',
          email: 'user2@example.com',
          name: 'Jane Smith',
          isPremium: false,
          premiumExpiry: null,
          totalPaid: 0,
          paymentHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'user_003',
          email: 'test@example.com',
          name: 'Test User',
          isPremium: false,
          premiumExpiry: null,
          totalPaid: 0,
          paymentHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    console.log(`✅ Mock database initialized with ${this.mockDatabase.users.length} users`);
  }

  /**
   * Initialize MongoDB connection
   * Used for production
   */
  async initializeMongoDB() {
    try {
      console.log('🔌 Connecting to MongoDB...');

      const { MongoClient } = require('mongodb');
      
      this.mongoClient = new MongoClient(config.mongodbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      await this.mongoClient.connect();
      this.db = this.mongoClient.db(config.mongodbDatabase);
      this.usersCollection = this.db.collection('users');

      console.log('✅ MongoDB connected successfully');

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('⚠️  Falling back to mock database');
      this.useMongoDB = false;
      this.initializeMockDatabase();
    }
  }

  /**
   * Find a user by their ID
   * 
   * @param {string} userId - User ID to search for
   * @returns {Promise<Object|null>} User object or null if not found
   * 
   * @example
   * const user = await databaseService.findUserById('user_001');
   * console.log(user.email);
   */
  async findUserById(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (this.useMongoDB) {
        // MongoDB query
        const user = await this.usersCollection.findOne({ id: userId });
        return user;
      } else {
        // Mock database query
        const user = this.mockDatabase.users.find(u => u.id === userId);
        return user || null;
      }

    } catch (error) {
      console.error('❌ Error finding user:', error.message);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  /**
   * Update user premium status after successful payment
   * 
   * This method:
   * 1. Sets isPremium to true
   * 2. Sets premium expiry date (1 month from now)
   * 3. Updates total amount paid
   * 4. Adds payment to history
   * 
   * @param {string} userId - User ID to update
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.amount - Amount paid
   * @param {string} paymentData.reference - Payment reference
   * @param {string} [paymentData.plan='premium'] - Subscription plan
   * 
   * @returns {Promise<Object>} Updated user object
   * @throws {Error} If update fails or user not found
   * 
   * @example
   * const updatedUser = await databaseService.updateUserPremiumStatus('user_001', {
   *   amount: 5000,
   *   reference: 'ref_abc123',
   *   plan: 'premium'
   * });
   */
  async updateUserPremiumStatus(userId, paymentData) {
    try {
      const { amount, reference, plan = 'premium' } = paymentData;

      // Find user first
      const user = await this.findUserById(userId);

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      console.log(`💾 Updating premium status for user: ${userId}`);

      // Extend any active premium instead of resetting it, so existing users keep remaining time.
      const now = new Date();
      const currentExpiry = user.premiumExpiry ? new Date(user.premiumExpiry) : null;
      const expiryDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      // Prepare payment history entry
      const paymentEntry = {
        reference: reference,
        amount: amount,
        plan: plan,
        date: new Date().toISOString(),
        status: 'completed'
      };

      if (this.useMongoDB) {
        // MongoDB update
        const updateResult = await this.usersCollection.updateOne(
          { id: userId },
          {
            $set: {
              isPremium: true,
              premiumExpiry: expiryDate.toISOString(),
              updatedAt: new Date().toISOString()
            },
            $inc: {
              totalPaid: amount
            },
            $push: {
              paymentHistory: paymentEntry
            }
          }
        );

        if (updateResult.matchedCount === 0) {
          throw new Error('User not found');
        }

        // Fetch updated user
        const updatedUser = await this.findUserById(userId);
        console.log(`✅ User ${userId} upgraded to ${plan} (MongoDB)`);
        return updatedUser;

      } else {
        // Mock database update
        const userIndex = this.mockDatabase.users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
          throw new Error('User not found');
        }

        // Update user object
        this.mockDatabase.users[userIndex].isPremium = true;
        this.mockDatabase.users[userIndex].premiumExpiry = expiryDate.toISOString();
        this.mockDatabase.users[userIndex].totalPaid += amount;
        this.mockDatabase.users[userIndex].paymentHistory.push(paymentEntry);
        this.mockDatabase.users[userIndex].updatedAt = new Date().toISOString();

        const updatedUser = this.mockDatabase.users[userIndex];
        console.log(`✅ User ${userId} upgraded to ${plan} (Mock DB)`);
        return updatedUser;
      }

    } catch (error) {
      console.error('❌ Error updating user premium status:', error.message);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Get all users (for testing/debugging)
   * 
   * @returns {Promise<Array>} Array of all users
   */
  async getAllUsers() {
    try {
      if (this.useMongoDB) {
        const users = await this.usersCollection.find({}).toArray();
        return users;
      } else {
        return this.mockDatabase.users;
      }
    } catch (error) {
      console.error('❌ Error fetching all users:', error.message);
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Create a new user (for testing)
   * 
   * @param {Object} userData - User data
   * @param {string} userData.id - User ID
   * @param {string} userData.email - User email
   * @param {string} userData.name - User name
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      const newUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        isPremium: false,
        premiumExpiry: null,
        totalPaid: 0,
        paymentHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.useMongoDB) {
        await this.usersCollection.insertOne(newUser);
      } else {
        this.mockDatabase.users.push(newUser);
      }

      console.log(`✅ User created: ${userData.id}`);
      return newUser;

    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Check if user has active premium subscription
   * 
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user has active premium
   */
  async hasActivePremium(userId) {
    try {
      const user = await this.findUserById(userId);

      if (!user || !user.isPremium) {
        return false;
      }

      // Check if premium has expired
      if (user.premiumExpiry) {
        const expiryDate = new Date(user.premiumExpiry);
        const now = new Date();
        return expiryDate > now;
      }

      return user.isPremium;

    } catch (error) {
      console.error('❌ Error checking premium status:', error.message);
      return false;
    }
  }

  /**
   * Close database connection (for MongoDB)
   */
  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();
