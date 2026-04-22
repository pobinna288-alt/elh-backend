require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    success: true,
    message: "Backend is running 🚀"
  });
});

// Paystack initialize payment
app.post("/api/payments/initialize", async (req, res) => {
  try {
    const { email, amount } = req.body;

    // validation
    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount are required"
      });
    }

    // get secret key
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "Payment service not configured"
      });
    }

    // PAYSTACK expects KOBO (₦1 = 100 kobo)
    const amountInKobo = Math.round(amount * 100);

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amountInKobo
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    return res.json({
      success: true,
      data: response.data.data
    });

  } catch (error) {
    console.error("Paystack error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Payment initialization failed"
    });
  }
});

const PORT = process.env.PORT || 4010;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

