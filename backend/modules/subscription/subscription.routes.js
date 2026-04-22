const express = require("express");
const { createSubscriptionService } = require("./subscription.service");
const { createSubscriptionController } = require("./subscription.controller");

function createSubscriptionRoutes(context) {
  const router = express.Router();
  const subscriptionService = createSubscriptionService(context);
  const controller = createSubscriptionController(subscriptionService);

  router.post("/unlock", context.authenticateToken, controller.unlock);
  router.get("/status", context.authenticateToken, controller.status);

  return router;
}

function registerSubscriptionModule(app, context) {
  const router = createSubscriptionRoutes(context);
  app.use("/premium", router);
  return router;
}

module.exports = {
  createSubscriptionRoutes,
  registerSubscriptionModule,
};
