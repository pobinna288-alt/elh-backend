const { createModuleContext } = require("../common/moduleContext");
const { registerAuthModule } = require("../modules/auth/auth.routes");
const { registerCoinModule } = require("../modules/coin/coin.routes");
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
const messageRoutes = require("./messageRoutes");

function registerAppRoutes(app, dependencies = {}) {
  const db = dependencies.database;

  // Persist ad to SQLite via the storageService proxy
  const storeAdRecord = (ad) => {
    if (!ad || !ad.id) return;
    db.ads.push(ad);
  };

  const context = createModuleContext({ ...dependencies, app, storeAdRecord });

  registerAuthModule(app, context);
  try {
    registerUploadModule(app, context);
  } catch (uploadError) {
    console.warn("[Routes] Upload module failed to register — skipping:", uploadError.message);
  }
  try { registerSubscriptionModule(app, context); } catch (e) {
    console.warn("[Routes] Subscription module failed to register:", e.message);
  }
  try { registerPaymentModule(app, context); } catch (e) {
    console.warn("[Routes] Payment module failed to register:", e.message);
  }
  try { registerCoinModule(app, context); } catch (e) {
    console.warn("[Routes] Coin module failed to register:", e.message);
  }
  try {
    registerReferralModule(app, context);
    console.log("[Routes] Referral module registered at /user/referral");
  } catch (referralError) {
    console.error("[Routes] Referral module failed to register:", referralError.message);
  }

  app.use("/ads", adTargetingRoutes);
  registerAiModule(app, context);
  
  app.set("database", context.database);
  app.use("/api/search", searchRoutes);
  app.use("/api/trust", trustScoreRoutes);
  app.use("/api/ads", createAttentionScoreRouter({ authenticateToken: context.authenticateToken }));
  app.use("/api/follow", context.authenticateToken, followSellerRoutes);

  const enterpriseChatRoutes = initEnterpriseChatRoutes({
    db: context.database,
    authMiddleware: context.authenticateToken,
    notificationFactory: context.createNotification,
  });
  app.use("/", enterpriseChatRoutes);

  // Buyer-seller messaging (MVP)
  app.use("/api/messages", messageRoutes);

  return context;
}

module.exports = {
  registerAppRoutes,
};
