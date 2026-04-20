const { v4: uuidv4 } = require("uuid");

function createReferralService({
  database,
  ensureUserProfileDefaults,
  buildReferralSnapshot,
  getUtcDayDifference,
  createNotifications,
  invalidateProfileCache,
  acquireLock,
  releaseLock,
}) {
  const wouldCreateReferralCycle = ({ refereeId, referrerId }) => {
    if (!refereeId || !referrerId) {
      return false;
    }

    const visited = new Set();
    let currentUserId = referrerId;

    while (currentUserId) {
      if (currentUserId === refereeId) {
        return true;
      }

      if (visited.has(currentUserId)) {
        return true;
      }

      visited.add(currentUserId);
      const currentUser = database.users.find((user) => user.id === currentUserId);
      currentUserId = currentUser?.referred_by || null;
    }

    return false;
  };

  return {
    getReferralSnapshotByUserId(userId) {
      const user = database.users.find((entry) => entry.id === userId);
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: "User not found",
          },
        };
      }

      ensureUserProfileDefaults(user);
      return {
        status: 200,
        body: {
          success: true,
          ...buildReferralSnapshot(user),
        },
      };
    },

    applyReferralCode({ currentUserId, requestedCode }) {
      if (!requestedCode) {
        return {
          status: 400,
          body: {
            success: false,
            error: "Referral code is required",
          },
        };
      }

      const userIdsToLock = [currentUserId];
      if (!userIdsToLock.every((userId) => acquireLock(userId))) {
        userIdsToLock.forEach((userId) => releaseLock(userId));
        return {
          status: 429,
          body: {
            success: false,
            error: "Referral processing is busy. Please retry.",
          },
        };
      }

      try {
        const referee = database.users.find((user) => user.id === currentUserId);
        if (!referee) {
          return {
            status: 404,
            body: {
              success: false,
              error: "User not found",
            },
          };
        }

        ensureUserProfileDefaults(referee);

        const referrer = database.users.find(
          (user) => `${user.referral_code || ""}`.trim().toUpperCase() === requestedCode,
        );

        if (!referrer) {
          return {
            status: 404,
            body: {
              success: false,
              error: "Invalid referral code",
            },
          };
        }

        if (referrer.id === referee.id) {
          return {
            status: 400,
            body: {
              success: false,
              error: "You cannot apply your own referral code",
            },
          };
        }

        if (wouldCreateReferralCycle({ refereeId: referee.id, referrerId: referrer.id })) {
          return {
            status: 400,
            body: {
              success: false,
              error: "Circular referral not allowed",
            },
          };
        }

        if (!userIdsToLock.includes(referrer.id)) {
          if (!acquireLock(referrer.id)) {
            return {
              status: 429,
              body: {
                success: false,
                error: "Referral processing is busy. Please retry.",
              },
            };
          }
          userIdsToLock.push(referrer.id);
        }

        if (referee.referred_by) {
          return {
            status: 400,
            body: {
              success: false,
              error: "Referral code has already been used for this account",
            },
          };
        }

        const accountAgeInDays = getUtcDayDifference(referee.createdAt || new Date(), new Date()) ?? 0;
        if (accountAgeInDays > 7) {
          return {
            status: 400,
            body: {
              success: false,
              error: "Referral codes can only be applied by new users",
            },
          };
        }

        const rewardAmount = 50;
        const now = new Date();
        const rewardStatus = (referee.is_verified || referee.isVerified || referee.phone_verified)
          ? "pending_activity_validation"
          : "pending_otp_verification";

        ensureUserProfileDefaults(referrer);
        referrer.updatedAt = now;

        referee.referred_by = referrer.id;
        referee.referral_root = referrer.referral_root || referrer.id;
        referee.applied_referral_code = requestedCode;
        referee.referral_applied_at = now.toISOString();
        referee.referral_reward_status = rewardStatus;
        referee.referral_pending_reward = rewardAmount;
        referee.updatedAt = now;

        database.referrals.push({
          id: uuidv4(),
          referrer_id: referrer.id,
          referee_id: referee.id,
          referral_code: requestedCode,
          reward_amount: rewardAmount,
          status: rewardStatus,
          requires_real_activity: true,
          otp_verified: Boolean(referee.is_verified || referee.isVerified || referee.phone_verified),
          createdAt: now,
        });

        createNotifications(
          {
            userId: referrer.id,
            type: "referral",
            title: "Referral pending review",
            message: "A referral was linked to your account. Coins will unlock after verified engagement.",
            metadata: {
              reward_amount: rewardAmount,
              reward_status: rewardStatus,
              screen: "referrals",
            },
            createdAt: now,
          },
          {
            userId: referee.id,
            type: "referral",
            title: "Referral saved",
            message: "Your referral code was linked successfully. Rewards unlock after OTP verification and real activity.",
            metadata: {
              reward_amount: rewardAmount,
              reward_status: rewardStatus,
              screen: "referrals",
            },
            createdAt: now,
          },
        );

        invalidateProfileCache(referrer.id);
        invalidateProfileCache(referee.id);

        return {
          status: 200,
          body: {
            success: true,
            message: "Referral linked successfully. Reward remains pending until verified activity.",
            reward_awarded: 0,
            pending_reward_amount: rewardAmount,
            reward_status: rewardStatus,
            coin_balance: referee.coin_balance || referee.coins || 0,
            total_referrals: referrer.total_referrals || 0,
            referral_coins_earned: referrer.referral_coins_earned,
          },
        };
      } finally {
        userIdsToLock.forEach((userId) => releaseLock(userId));
      }
    },
  };
}

module.exports = {
  createReferralService,
};
