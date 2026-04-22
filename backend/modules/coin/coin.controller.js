function createCoinController(coinService) {
  return {
    getBalance: (req, res) => {
      try {
        const result = coinService.getCoinBalance(req.user.id);
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Coins balance error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch coins balance",
        });
      }
    },

    earn: (req, res) => {
      try {
        const { action, request_id: requestId, action_id: actionId, metadata } = req.body || {};
        const result = coinService.earnCoins({
          userId: req.user.id,
          action,
          requestId: requestId || actionId,
          metadata,
        });
        return res.status(result.status).json(result.body);
      } catch (error) {
        console.error("Earn coins error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to earn coins",
        });
      }
    },
  };
}

module.exports = {
  createCoinController,
};
