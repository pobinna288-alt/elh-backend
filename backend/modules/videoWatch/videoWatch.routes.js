const express = require("express");
const watchShortAdRoutes = require("../../routes/watchShortAdRoutes");
const adWatchRoutes = require("../../routes/adWatchRoutes");
const { createVideoWatchService } = require("./videoWatch.service");
const { createVideoWatchController } = require("./videoWatch.controller");

function createVideoWatchRoutes() {
  const videoWatchService = createVideoWatchService();
  const controller = createVideoWatchController(videoWatchService);

  return {
    controller,
    watchShortAdRoutes,
    legacyAdWatchRoutes: adWatchRoutes,
  };
}

function createVideoWatchAliasRouter(routes, context = {}) {
  const router = express.Router();
  const requireAuth = typeof context.authenticateToken === "function"
    ? context.authenticateToken
    : (_req, res) => res.status(500).json({ success: false, error: "Watch auth middleware unavailable" });

  router.post("/watch-video", requireAuth, (req, res, next) => {
    if (req.body?.user_id && req.body.user_id !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: "You can only submit watch progress for your own account",
      });
    }

    req.body = {
      ...(req.body || {}),
      user_id: req.user?.id,
      ad_id: req.body?.ad_id || req.body?.video_id,
      watch_time_seconds: req.body?.watch_time_seconds ?? req.body?.watch_duration,
      watch_percent: req.body?.watch_percent ?? 25,
    };

    req.url = "/ad-progress";
    return routes.legacyAdWatchRoutes(req, res, next);
  });

  return router;
}

function registerVideoWatchModule(app, context = {}) {
  const routes = createVideoWatchRoutes();
  const aliasRouter = createVideoWatchAliasRouter(routes, context);
  const requireAuth = typeof context.authenticateToken === "function"
    ? context.authenticateToken
    : (_req, res) => res.status(500).json({ success: false, error: "Watch auth middleware unavailable" });

  app.use("/watch", requireAuth, routes.watchShortAdRoutes);
  app.use("/api", requireAuth, routes.legacyAdWatchRoutes);
  app.use("/", aliasRouter);

  return {
    ...routes,
    aliasRouter,
  };
}

module.exports = {
  createVideoWatchRoutes,
  registerVideoWatchModule,
};
