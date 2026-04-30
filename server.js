if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

let OpenAI;
try {
  OpenAI = require("openai");
} catch (_error) {
  OpenAI = null;
}

const generatePaymentReference = () =>
  `elh_pay_${Date.now()}_${randomUUID().replace(/-/g, "")}`;

const app = express();
const PORT = Number(process.env.PORT) || 4010;
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

const runtimeStore = createRuntimeStore();
app.set("database", runtimeStore);

const createAuthenticateToken = (jwtSecret) => {
  return (req, res, next) => {
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
      const payload = jwt.verify(token, jwtSecret);
      req.auth = payload;
      req.user = {
        ...payload,
        id: payload.id || payload.userId || payload.sub || null
      };
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

  try {
    const { registerAppRoutes } = require("./backend/routes");

    registerAppRoutes(app, {
      app,
      database: runtimeStore,
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
    app.use("/api/attention-score", createAttentionScoreRouter({ authenticateToken }));
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("PAYSTACK KEY LOADED:", !!process.env.PAYSTACK_SECRET_KEY);
console.log("NODE ENV:", process.env.NODE_ENV);

const isValidEmail = (value) => {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend is running"
  });
});

app.post("/api/generate-ad", async (req, res) => {
  try {
    const product = String(req.body?.product || "").trim();

    if (!product) {
      return res.status(400).json({ error: "Product is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key missing" });
    }

    if (!OpenAI) {
      return res.status(500).json({ error: "OpenAI SDK not installed" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    });

    const text = String(response?.choices?.[0]?.message?.content || "").trim();

    const titleMatch = text.match(/\bTitle:\s*(.+)/i);
    const descriptionMatch = text.match(/\bDescription:\s*([\s\S]+)/i);

    const title = String(titleMatch?.[1] || "").trim();
    const description = String(descriptionMatch?.[1] || "").trim();

    return res.json({
      title,
      description,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
