const express = require("express");
const { createPaymentsService } = require("./payments.service");
const { createPaymentsController } = require("./payments.controller");

function createPaymentsRoutes(context) {
  const router = express.Router();
  const paymentsService = createPaymentsService(context);
  const controller = createPaymentsController(paymentsService);

  router.post("/initialize", controller.initialize);
  router.get("/verify/:reference", controller.verify);

  return router;
}

function registerPaymentModule(app, context) {
  const router = createPaymentsRoutes(context);
  app.use("/api/payments", router);
  return router;
}

module.exports = {
  createPaymentsRoutes,
  registerPaymentModule,
};
