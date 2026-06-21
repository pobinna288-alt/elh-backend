const dotenvResult = require("dotenv").config({ path: "express-server/.env" });
console.log("dotenv loaded:", dotenvResult.error ? `FAILED: ${dotenvResult.error.message}` : "OK");
console.log("PAYSTACK:", !!process.env.PAYSTACK_SECRET_KEY);
console.log("DEEPSEEK:", !!process.env.DEEPSEEK_API_KEY);

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

const generatePaymentReference = () =>
  `elh_pay_${Date.now()}_${randomUUID().replace(/-/g, "")}`;

const app = express();
app.use(
  cors({
    origin: "*"
  })
);
const PORT = Number(process.env.PORT) || 3001;
const PAYSTACK_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize";
const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify";

// Frontend sends amount in USD. Convert to NGN then to kobo before calling Paystack.
// Override with EXCHANGE_RATE_USD_NGN env variable in production.
const getExchangeRate = () => {
  const envRate = Number(process.env.EXCHANGE_RATE_USD_NGN);
  return Number.isFinite(envRate) && envRate > 0 ? envRate : 1500;
};

// Paystack API timeout in ms. Override with PAYSTACK_TIMEOUT_MS env variable.
const PAYSTACK_TIMEOUT_MS = Number(process.env.PAYSTACK_TIMEOUT_MS) || 12000;

const createRuntimeStore = () => ({
  users: [],
  ads: [],
  transactions: [],
  workspaces: [],
  notifications: [],
  enterprise_chats: [],
  enterprise_messages: []
});

// ── Persistent Storage (SQLite-backed, drop-in replacement) ──────────────────
const { createPersistentStore } = require("./backend/storageService");
const persistentStore = createPersistentStore();
app.set("database", persistentStore);
console.log("[DB] SQLite persistent store initialized (data/app.db)");

const users = [
  {
    id: 1,
    name: "Test User",
    coins: 50000,
    unlocked: []
  }
];

const COIN_TIERS = {
  BASIC: 20000,
  PRO: 60000,
  ELITE: 120000
};

const createAuthenticateToken = (jwtSecret) => {
  return (req, res, next) => {
    const publicPaths = new Set([
      "/api/health",
      "/api/ping",
      "/api/search",
      "/api/attention-score",
      "/api/follow/health"
    ]);

    const path = req.path.split("?")[0].replace(/\/$/, "");

    const isPublicFollowPath = () => {
      return (
        path.startsWith("/api/follow/followers/") ||
        (path.startsWith("/api/follow/seller/") && path.endsWith("/stats")) ||
        (path.startsWith("/api/follow/ad/") && path.endsWith("/attention-score")) ||
        path.startsWith("/api/follow/trust-log/")
      );
    };

    // 🔓 Fully public routes (no auth needed at all)
    if (req.method === "GET" && (publicPaths.has(path) || isPublicFollowPath())) {
      return next();
    }

    const authorizationHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authorizationHeader !== "string") {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header"
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.auth = decoded;
      req.user = {
        ...decoded,
        id: decoded.id || decoded.userId || decoded.sub || null
      };
      req.userId = decoded.userId || decoded.id || null;

      console.log("JWT DECODED:", decoded);
      console.log("REQ USER ID:", req.userId);

      return next();
    } catch (_error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  };
};

const attachRestoredRoutes = () => {
  const jwtSecret = String(
    process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || process.env.PAYSTACK_SECRET_KEY || "dev-secret"
  ).trim();

  const authenticateToken = createAuthenticateToken(jwtSecret);
  let hasTrustRoutes = false;
  let hasAttentionRoutes = false;
  let hasPublicAttentionScoreRoutes = false;

  try {
    const { createAttentionScoreRouter } = require("./backend/routes/attentionScoreRoutes");
    const attentionScoreRouter = createAttentionScoreRouter({ authenticateToken });

    app.use("/api/attention-score", (req, res, next) => {
      return attentionScoreRouter(req, res, next);
    });

    hasPublicAttentionScoreRoutes = true;
  } catch (error) {
    console.warn("Attention score routes were not attached", {
      message: error?.message || "unknown error"
    });
  }

  try {
    const { registerAppRoutes } = require("./backend/routes");

    registerAppRoutes(app, {
      app,
      database: persistentStore,
      jwtSecret,
      authenticateToken,
      axios
    });

    hasTrustRoutes = true;
    hasAttentionRoutes = true;
  } catch (error) {
    console.warn("Legacy route aggregator was not attached", {
      message: error?.message || "unknown error"
    });
  }

  if (!hasTrustRoutes) {
    try {
      const trustScoreRoutes = require("./backend/routes/trustScoreRoutes");
      app.use("/api/trust", trustScoreRoutes);
      hasTrustRoutes = true;
    } catch (error) {
      console.warn("Trust score routes were not attached", {
        message: error?.message || "unknown error"
      });
    }
  }

  if (!hasAttentionRoutes) {
    try {
      const { createAttentionScoreRouter } = require("./backend/routes/attentionScoreRoutes");
      app.use("/api/ads", createAttentionScoreRouter({ authenticateToken }));
      hasAttentionRoutes = true;
    } catch (error) {
      console.warn("Attention score routes were not attached", {
        message: error?.message || "unknown error"
      });
    }
  }

  if (hasTrustRoutes) {
    const trustScoreRoutes = require("./backend/routes/trustScoreRoutes");

    // Compatibility aliases expected by earlier frontend builds.
    app.get("/api/trust-score/:userId", (req, res) => {
      return res.redirect(307, `/api/trust/trust-score/${encodeURIComponent(req.params.userId)}`);
    });

    app.use("/api/trust-score", trustScoreRoutes);
  }

  if (hasAttentionRoutes) {
    const { createAttentionScoreRouter } = require("./backend/routes/attentionScoreRoutes");
    if (!hasPublicAttentionScoreRoutes) {
      app.use("/api/attention-score", createAttentionScoreRouter({ authenticateToken }));
    }
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const notificationsRoute = require("./routes/notifications");
app.use("/notifications", notificationsRoute);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  // Handle pre-flight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

try {
  const adsRoute = require("./backend/routes/ads");
  app.use("/api/ads", adsRoute);
} catch (error) {
  console.warn("Ads route was not attached", {
    message: error?.message || "unknown error"
  });
}

// Mount admin routes at /api/admin
try {
  const createAdminRouter = require("./routes/admin");
  const { createRequireAdmin } = require("./middleware/auth");
  const { createGetAdminDashboardHandler } = require("./controllers/adminController");
  const { createAdminDataSource } = require("./models/adminDataSource");

  const jwtSecret = String(
    process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || process.env.PAYSTACK_SECRET_KEY || "dev-secret"
  ).trim();

  const requireAdmin = createRequireAdmin({ jwtSecret });
  const dataSource = createAdminDataSource(persistentStore);
  const getDashboard = createGetAdminDashboardHandler(dataSource);
  const adminRouter = createAdminRouter({ requireAdmin, getDashboard });

  app.use("/api/admin", adminRouter);
  console.log("Admin routes mounted at /api/admin");
} catch (error) {
  console.warn("Admin routes were not attached", {
    message: error?.message || "unknown error"
  });
}

console.log("PAYSTACK KEY LOADED:", !!process.env.PAYSTACK_SECRET_KEY);
console.log("NODE ENV:", process.env.NODE_ENV);

const isValidEmail = (value) => {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const { Resend } = require("resend");

const resend = String(process.env.RESEND_API_KEY || "").trim()
  ? new Resend(String(process.env.RESEND_API_KEY || "").trim())
  : null;

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend is running"
  });
});

app.get("/search", (req, res) => {
  try {
    const q = req.query.q?.toLowerCase() || "";

    const ads = [
      { id: 1, title: "Barber Shop Ad", type: "ad" },
      { id: 2, title: "Football Shoes Ad", type: "ad" },
      { id: 3, title: "Tech Gadget Ad", type: "ad" }
    ];

    const videos = [
      { id: 1, title: "Barber Tutorial", type: "video" },
      { id: 2, title: "Football Skills", type: "video" }
    ];

    return res.json({
      success: true,
      ads: ads.filter((a) => a.title.toLowerCase().includes(q)),
      videos: videos.filter((v) => v.title.toLowerCase().includes(q))
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      message: "Search error"
    });
  }
});

app.post("/unlock", (req, res) => {
  try {
    const { userId, contentId, tier } = req.body;

    const user = users.find((u) => u.id === userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    const cost = COIN_TIERS[tier];

    if (!cost) {
      return res.json({
        success: false,
        message: "Invalid tier"
      });
    }

    if (user.coins < cost) {
      return res.json({
        success: false,
        message: "Not enough coins"
      });
    }

    user.coins -= cost;
    user.unlocked.push(contentId);

    return res.json({
      success: true,
      message: "Unlocked successfully",
      remainingCoins: user.coins,
      unlocked: user.unlocked
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

app.get("/user/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);

  if (!user) {
    return res.json({ success: false });
  }

  return res.json({
    success: true,
    coins: user.coins,
    unlocked: user.unlocked
  });
});

app.post("/api/generate-ad", async (req, res) => {
  try {
    console.log("[generate-ad] Incoming request body:", req.body);

    const rawProduct = req.body?.product;
    const product = typeof rawProduct === "string" ? rawProduct.trim() : "";

    if (!product) {
      return res.status(400).json({ error: "Invalid request: product is required" });
    }

    const deepseekApiKey = String(process.env.DEEPSEEK_API_KEY || "").trim();
    if (!deepseekApiKey) {
      return res.status(500).json({ error: "DeepSeek API key missing" });
    }

    const deepseekBaseUrl = "https://api.deepseek.com";
    const deepseekTimeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 20000;

    const response = await axios.post(
      `${deepseekBaseUrl}/v1/chat/completions`,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: [
              "Create an ad title and ad description.",
              "",
              `Product: ${product}`,
              "",
              "Return format:",
              "Title: ...",
              "Description: ...",
            ].join("\n"),
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: deepseekTimeoutMs,
      }
    );

    const text = String(response?.data?.choices?.[0]?.message?.content || "").trim();

    if (!text) {
      throw new Error("Empty response from DeepSeek");
    }

    const titleMatch = text.match(/\bTitle:\s*(.+)/i);
    const descriptionMatch = text.match(/\bDescription:\s*([\s\S]+)/i);

    let title = String(titleMatch?.[1] || "").trim();
    let description = String(descriptionMatch?.[1] || "").trim();

    if (!title || !description) {
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      if (!title) {
        title = String(lines[0] || "").replace(/^Title:\s*/i, "").trim();
      }
      if (!description) {
        description = lines.slice(1).join(" ").replace(/^Description:\s*/i, "").trim();
      }
    }

    return res.json({
      title,
      description,
    });
  } catch (error) {
    console.error("[generate-ad] Error:", {
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({
      error: "AI request failed",
      details: error?.message || "Unknown error",
    });
  }
});

app.get("/test-email", async (_req, res) => {
  try {
    if (!resend) {
      return res.status(500).json({
        success: false,
        message: "RESEND_API_KEY not configured",
      });
    }

    const to = String(process.env.EMAIL_USER || "").trim();
    if (!to) {
      return res.status(500).json({
        success: false,
        message: "EMAIL_USER not configured",
      });
    }

    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "OTP Test Email",
      html: "<h2>OTP system working ✅</h2>",
    });

    return res.json({
      success: true,
      message: "Email sent successfully",
      id: response?.id,
    });
  } catch (err) {
    console.error("TEST EMAIL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err?.message || "Unknown error",
    });
  }
});

app.post("/api/payments/initialize", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const amount = Number(req.body?.amount);

  if (!isValidEmail(email) || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input: email must be valid and amount must be greater than 0"
    });
  }

  const paystackSecretKey = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!paystackSecretKey) {
    return res.status(500).json({
      success: false,
      message: "Payment service not configured"
    });
  }

  // Convert USD → NGN → kobo (Paystack requires kobo)
  const exchangeRate = getExchangeRate();
  const amountInNGN = amount * exchangeRate;
  const amountInKobo = Math.round(amountInNGN * 100);

  const reference = generatePaymentReference();

  try {
    const response = await axios.post(
      PAYSTACK_INITIALIZE_URL,
      {
        email,
        amount: amountInKobo,
        reference
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json"
        },
        timeout: PAYSTACK_TIMEOUT_MS
      }
    );

    const paystackData = response?.data?.data;
    if (!response?.data?.status || !paystackData?.authorization_url || !paystackData?.reference) {
      return res.status(503).json({
        success: false,
        message: "Payment provider unavailable"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paystackData.authorization_url,
        reference: paystackData.reference
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(503).json({
        success: false,
        message: "Payment provider unavailable"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Compatibility alias used by frontend builds expecting /api/payments/init.
app.post("/api/payments/init", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const amount = Number(req.body?.amount);

  if (!isValidEmail(email) || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input: email must be valid and amount must be greater than 0"
    });
  }

  const paystackSecretKey = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!paystackSecretKey) {
    return res.status(500).json({
      success: false,
      message: "Payment service not configured"
    });
  }

  // Convert USD → NGN → kobo (Paystack requires kobo)
  const exchangeRate = getExchangeRate();
  const amountInNGN = amount * exchangeRate;
  const amountInKobo = Math.round(amountInNGN * 100);

  const reference = generatePaymentReference();

  try {
    const response = await axios.post(
      PAYSTACK_INITIALIZE_URL,
      {
        email,
        amount: amountInKobo,
        reference
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json"
        },
        timeout: PAYSTACK_TIMEOUT_MS
      }
    );

    const paystackData = response?.data?.data;
    if (!response?.data?.status || !paystackData?.authorization_url || !paystackData?.reference) {
      return res.status(503).json({
        success: false,
        message: "Payment provider unavailable"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paystackData.authorization_url,
        reference: paystackData.reference
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(503).json({
        success: false,
        message: "Payment provider unavailable"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

app.get("/api/payments/verify/:reference", async (req, res) => {
  const reference = String(req.params?.reference || "").trim();
  const isValidReference = /^[a-zA-Z0-9_-]{6,120}$/.test(reference);

  if (!isValidReference) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment reference"
    });
  }

  const paystackSecretKey = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
  if (!paystackSecretKey) {
    return res.status(500).json({
      success: false,
      message: "Payment service not configured"
    });
  }

  try {
    const response = await axios.get(`${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json"
      },
      timeout: PAYSTACK_TIMEOUT_MS
    });

    const paystackPayload = response?.data;
    const tx = paystackPayload?.data;
    const normalizedStatus = String(tx?.status || "").toLowerCase();
    const rawAmountKobo = Number(tx?.amount);
    // Paystack always returns amount in kobo; divide by 100 to get NGN
    const amountInNGN = Number.isFinite(rawAmountKobo) ? rawAmountKobo / 100 : null;
    const isSuccessful = Boolean(paystackPayload?.status) && normalizedStatus === "success";

    if (!isSuccessful || !tx || amountInNGN === null) {
      return res.status(200).json({
        success: false,
        message: "Payment not successful"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        reference: tx?.reference || reference,
        amount: amountInNGN,
        currency: tx?.currency || "NGN",
        status: "success"
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Treat all timeout/network errors uniformly so frontend gets a clean message
      const isTimeout = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.code === "ECONNRESET";
      if (isTimeout) {
        return res.status(200).json({
          success: false,
          message: "Payment verification failed"
        });
      }

      if (error.response?.status === 404) {
        return res.status(200).json({
          success: false,
          message: "Invalid payment reference"
        });
      }

      return res.status(200).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    return res.status(200).json({
      success: false,
      message: "Payment verification failed"
    });
  }
});

// Public ping endpoint for frontend/backend connection testing
app.get("/api/ping", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "pong"
  });
});

attachRestoredRoutes();

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error", { message: error?.message || "Unknown error" });

  if (res.headersSent) {
    return;
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// Server start logic with safety checks and optional auto-fallback to next ports
const HOST = "0.0.0.0";
const MAX_FALLBACK_ATTEMPTS = 5; // will try PORT .. PORT+4
const AUTO_FALLBACK = true; // set to false to disable auto-switching

console.log("🚀 Server starting...");
console.log("PORT:", PORT);

const startServer = async (startPort, maxAttempts = MAX_FALLBACK_ATTEMPTS, host = HOST) => {
  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tryPort = startPort + attempt;

    // Attempt to start server and wait for listening or error
    const server = app.listen(tryPort, host);

    // Wrap event handling in a promise
    const result = await new Promise((resolve) => {
      let settled = false;
      const onListening = () => {
        if (settled) return;
        settled = true;
        server.removeListener("error", onError);
        resolve({ success: true, server, port: tryPort });
      };

      const onError = (err) => {
        if (settled) return;
        settled = true;
        server.close?.();
        resolve({ success: false, error: err, port: tryPort });
      };

      server.once("listening", onListening);
      server.once("error", onError);
    });

    if (result.success) {
      const s = result.server;
      const p = result.port;
      console.log(`Server running on http://${host}:${p}`);

      // Attach runtime error handler for EADDRINUSE after startup
      s.on("error", (err) => {
        if (err && err.code === "EADDRINUSE") {
          console.log("❌ Port is already in use. Stop other Node processes or change PORT.");
          process.exit(1);
        }
        console.error("Server error:", err);
      });

      // Graceful shutdown handlers so nodemon restarts cleanly
      const shutdown = (signal) => {
        return async () => {
          try {
            console.log(`\nReceived ${signal}. Closing server...`);
            await new Promise((resolveClose) => s.close(() => resolveClose()));
            process.exit(0);
          } catch (closeErr) {
            console.error("Error during shutdown:", closeErr);
            process.exit(1);
          }
        };
      };

      process.once("SIGINT", shutdown("SIGINT"));
      process.once("SIGTERM", shutdown("SIGTERM"));
      // nodemon uses SIGUSR2 for restart by default
      process.once("SIGUSR2", async () => {
        await new Promise((resolveClose) => s.close(() => resolveClose()));
        process.kill(process.pid, "SIGUSR2");
      });

      return s;
    }

    lastError = result.error;

    if (lastError && lastError.code === "EADDRINUSE") {
      console.warn(`Port ${result.port} in use.`);
      if (!AUTO_FALLBACK) {
        console.log("PORT IN USE - try another port or stop existing process");
        process.exit(1);
      }
      // otherwise continue to next port
    } else if (lastError) {
      console.error(`Failed to start on port ${result.port}:`, lastError);
      // For non EADDRINUSE errors, stop retrying
      break;
    }
  }

  console.error("Failed to start server after trying multiple ports.");
  if (lastError && lastError.code === "EADDRINUSE") {
    console.log("PORT IN USE - try another port or stop existing process");
  }
  process.exit(1);
};

startServer(PORT).catch((err) => {
  console.error("Unexpected error while starting server:", err);
  process.exit(1);
});
