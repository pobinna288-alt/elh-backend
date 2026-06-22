function createReferralController(referralService) {
  const isAdminUser = (user) => Boolean(user?.is_admin === true || `${user?.role || ""}`.toLowerCase() === "admin");

  return {
    getReferral: (req, res) => {
      try {
        const requestedUserId = req.params.id;

        if (!requestedUserId) {
          return res.status(400).json({
            success: false,
            error: "Missing userId",
          });
        }

        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const requesterId = req.user.id;
        const canView = requesterId === requestedUserId || isAdminUser(req.currentUser || req.user);

        if (!canView) {
          return res.status(403).json({
            success: false,
            error: "Access denied",
          });
        }

        const result = referralService.getReferralSnapshotByUserId(requestedUserId);
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Referral fetch error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch referral data",
        });
      }
    },

    applyReferral: (req, res) => {
      try {
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const requestedCode = `${req.body?.referral_code || req.body?.code || ""}`.trim().toUpperCase();
        const result = referralService.applyReferralCode({
          currentUserId: req.user.id,
          requestedCode,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Referral apply error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to apply referral code",
        });
      }
    },
  };
}

module.exports = {
  createReferralController,
};
