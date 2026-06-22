const express = require("express");
const { createReferralService } = require("./referral.service");
const { createReferralController } = require("./referral.controller");

function createReferralRoutes(context) {
  const router = express.Router();
  const referralService = createReferralService(context);
  const controller = createReferralController(referralService);

  // Safe auth guard — never blocks silently or crashes
  const safeAuth = (req, res, next) => {
    try {
      if (typeof context.authenticateToken !== "function") {
        return res.status(401).json({ success: false, error: "Auth not configured" });
      }
      return context.authenticateToken(req, res, next);
    } catch (err) {
      console.error("[Referral] Auth middleware error:", err);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
  };

  router.get("/:id", safeAuth, controller.getReferral);
  router.post("/apply", safeAuth, controller.applyReferral);

  return router;
}

function registerReferralModule(app, context) {
  const router = createReferralRoutes(context);
  app.use("/user/referral", router);
  return router;
}

module.exports = {
  createReferralRoutes,
  registerReferralModule,
};
