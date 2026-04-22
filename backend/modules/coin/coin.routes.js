const express = require("express");
const { createCoinService } = require("./coin.service");
const { createCoinController } = require("./coin.controller");

function createCoinRoutes(context) {
  const router = express.Router();
  const coinService = createCoinService(context);
  const controller = createCoinController(coinService);

  router.get("/balance", context.authenticateToken, controller.getBalance);
  router.post("/earn", context.authenticateToken, controller.earn);

  return router;
}

function registerCoinModule(app, context) {
  const router = createCoinRoutes(context);
  app.use("/coins", router);
  return router;
}

module.exports = {
  createCoinRoutes,
  registerCoinModule,
};
