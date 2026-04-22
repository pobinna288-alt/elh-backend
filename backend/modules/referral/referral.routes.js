const express = require("express");
const { createReferralService } = require("./referral.service");
const { createReferralController } = require("./referral.controller");

function createReferralRoutes(context) {
  const router = express.Router();
  const referralService = createReferralService(context);
  const controller = createReferralController(referralService);

  router.get("/:id", context.authenticateToken, controller.getReferral);
  router.post("/apply", context.authenticateToken, controller.applyReferral);

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
