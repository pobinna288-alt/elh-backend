const { createModuleContext } = require("../common/moduleContext");
const { registerAuthModule } = require("../modules/auth/auth.routes");
const { registerCoinModule } = require("../modules/coin/coin.routes");
const { registerVideoWatchModule } = require("../modules/videoWatch/videoWatch.routes");
const { registerUploadModule } = require("../modules/upload/upload.routes");
const { registerAiModule } = require("../modules/ai/ai.routes");
const { registerReferralModule } = require("../modules/referral/referral.routes");
const { registerSubscriptionModule } = require("../modules/subscription/subscription.routes");
const { registerPaymentModule } = require("../modules/payments/payments.routes");

const adTargetingRoutes = require("./adTargetingRoutes");
const searchRoutes = require("./searchRoutes");
const trustScoreRoutes = require("./trustScoreRoutes");
const { createAttentionScoreRouter } = require("./attentionScoreRoutes");
const followSellerRoutes = require("./followSellerRoutes");
const { initEnterpriseChatRoutes } = require("./enterpriseChatRoutes");

function registerAppRoutes(app, dependencies = {}) {
  const context = createModuleContext({ ...dependencies, app });

  registerAuthModule(app, context);
  registerUploadModule(app, context);
  registerSubscriptionModule(app, context);
  registerPaymentModule(app, context);
  registerCoinModule(app, context);
  registerReferralModule(app, context);

  app.use("/ads", adTargetingRoutes);
  registerAiModule(app, context);
  registerVideoWatchModule(app, context);

  app.set("database", context.database);
  app.use("/api/search", searchRoutes);
  app.use("/api/trust", trustScoreRoutes);
  app.use("/api/ads", createAttentionScoreRouter({ authenticateToken: context.authenticateToken }));
  app.use("/api/follow", followSellerRoutes);

  const enterpriseChatRoutes = initEnterpriseChatRoutes({
    db: context.database,
    authMiddleware: context.authenticateToken,
    notificationFactory: context.createNotification,
  });
  app.use("/", enterpriseChatRoutes);

  return context;
}

module.exports = {
  registerAppRoutes,
};
