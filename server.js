if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = Number(process.env.PORT) || 4010;
const PAYSTACK_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize";

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

  try {
    const response = await axios.post(
      PAYSTACK_INITIALIZE_URL,
      {
        email,
        amount: Math.round(amount * 100)
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
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
