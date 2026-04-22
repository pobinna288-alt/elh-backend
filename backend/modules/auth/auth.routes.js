const express = require("express");
const { initAuthRoutes } = require("../../routes/authRoutes");
const { initEmailAuthRoutes } = require("../../routes/emailAuthRoutes");
const { createLegacyAuthService } = require("./auth.service");
const { createAuthController } = require("./auth.controller");

function createAuthRouters(context) {
  const authService = createLegacyAuthService(context);
  const controller = createAuthController(authService);
  const legacyRouter = express.Router();
  const apiRouter = initAuthRoutes(context.database, context.jwtSecret, null);
  // Email OTP router – handles requests that carry an `email` body field.
  // Mounted BEFORE the phone OTP router so email-based requests are resolved
  // first; phone-only requests fall through via next().
  const emailApiRouter = initEmailAuthRoutes(context.jwtSecret);

  legacyRouter.post("/signup", controller.signup);
  legacyRouter.post("/login", controller.login);
  legacyRouter.post("/logout", context.authenticateToken, controller.logout);

  return {
    legacyRouter,
    apiRouter,
    emailApiRouter,
  };
}

function registerAuthModule(app, context) {
  const { legacyRouter, apiRouter, emailApiRouter } = createAuthRouters(context);

  // Email OTP routes first (fall through to phone routes when no `email` field)
  app.use("/api/v1/auth", emailApiRouter);
  app.use("/api/v1/auth", apiRouter);
  app.use("/api/auth", emailApiRouter);
  app.use("/api/auth", apiRouter);
  app.use("/auth", emailApiRouter);
  app.use("/auth", legacyRouter);
  app.use("/auth", apiRouter);

  return {
    legacyRouter,
    apiRouter,
    emailApiRouter,
  };
}

module.exports = {
  createAuthRouters,
  registerAuthModule,
};
