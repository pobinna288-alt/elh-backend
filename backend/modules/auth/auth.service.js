const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const baseAuthService = require("../../services/authService");

function createLegacyAuthService({
  database,
  validateEmail,
  generateUniqueUsername,
  ensureUserProfileDefaults,
  createNotification,
  generateToken,
  sanitizeUser,
  touchUserDailyActivity,
  buildProfileOverview,
  blacklistToken,
  invalidateProfileCache,
}) {
  return {
    ...baseAuthService,

    async signupLegacyUser(_payload = {}) {
      return {
        status: 410,
        body: {
          success: false,
          error: "Email/password signup has been removed. Use phone OTP authentication.",
          auth_mode: "otp_only",
        },
      };

      const { name, fullName, email, password, age, location } = _payload;
      const userName = name || fullName;

      if (!userName || !email || !password) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Name, email and password are required",
          },
        };
      }

      if (!validateEmail(email)) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Invalid email format",
          },
        };
      }

      if (password.length < 6) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Password must be at least 6 characters",
          },
        };
      }

      const existingUser = database.users.find((user) => user.email === email);
      if (existingUser) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Email already registered",
          },
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: uuidv4(),
        fullName: `${userName}`.trim(),
        name: `${userName}`.trim(),
        username: generateUniqueUsername({ fullName: userName, email }),
        email,
        password: hashedPassword,
        age: age ? parseInt(age, 10) : 18,
        location: location || "Not specified",
        profile_picture: null,
        profilePhoto: null,
        coins: 1000,
        coin_balance: 1000,
        daily_streak: 0,
        streak_count: 0,
        current_streak: 0,
        total_streak_days: 0,
        last_active_date: new Date().toISOString(),
        last_streak_claimed_at: null,
        trust_score: 50,
        total_referrals: 0,
        referral_coins_earned: 0,
        referral_code: null,
        referral_link: null,
        referred_by: null,
        isPremium: false,
        premiumExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      ensureUserProfileDefaults(newUser);
      database.users.push(newUser);

      createNotification({
        userId: newUser.id,
        type: "system",
        title: "Welcome to EL HANNORA!",
        message: "You received 1000 welcome coins!",
        metadata: {
          event: "welcome_bonus",
          screen: "updates",
        },
      });

      const token = generateToken(newUser);

      return {
        status: 201,
        body: {
          success: true,
          message: "Registration successful",
          token,
          user: sanitizeUser(newUser),
        },
      };
    },

    async loginLegacyUser(_payload = {}) {
      return {
        status: 410,
        body: {
          success: false,
          error: "Email/password login has been removed. Use phone OTP authentication.",
          auth_mode: "otp_only",
        },
      };

      const { email, password } = _payload;

      if (!email || !password) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Email and password are required",
          },
        };
      }

      const user = database.users.find((existingUser) => existingUser.email === email);
      if (!user) {
        return {
          status: 401,
          body: {
            success: false,
            error: "Invalid email or password",
          },
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return {
          status: 401,
          body: {
            success: false,
            error: "Invalid email or password",
          },
        };
      }

      ensureUserProfileDefaults(user);
      touchUserDailyActivity(user);

      const token = generateToken(user);
      const profile = buildProfileOverview(user);

      return {
        status: 200,
        body: {
          success: true,
          message: "Login successful",
          token,
          user: sanitizeUser(user),
          ...profile,
          coin_balance: profile.coin_balance,
          daily_streak: profile.daily_streak,
          trust_score: profile.trust_score,
          isPremium: user.isPremium,
        },
      };
    },

    logoutLegacyUser({ userId, token }) {
      blacklistToken(token, userId);

      const userIndex = database.users.findIndex((user) => user.id === userId);
      if (userIndex !== -1) {
        database.users[userIndex].rememberToken = null;
        database.users[userIndex].rememberTokenExpiresAt = null;
        database.users[userIndex].updatedAt = new Date();
        invalidateProfileCache(userId);
      }

      return {
        status: 200,
        body: {
          success: true,
          message: "Logout successful",
        },
      };
    },
  };
}

module.exports = {
  ...baseAuthService,
  createLegacyAuthService,
};
