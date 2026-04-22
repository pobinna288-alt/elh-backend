function createSubscriptionController(subscriptionService) {
  return {
    unlock: (req, res) => {
      try {
        const { paymentMethod, duration, amountPaid } = req.body || {};
        const result = subscriptionService.unlockPremium({
          userId: req.user.id,
          paymentMethod,
          duration,
          amountPaid,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Premium unlock error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to activate premium",
        });
      }
    },

    status: (req, res) => {
      try {
        const result = subscriptionService.getPremiumStatus(req.user.id);
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Premium status error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch premium status",
        });
      }
    },
  };
}

module.exports = {
  createSubscriptionController,
};
