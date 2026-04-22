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

// 🔥 PAYSTACK INITIALIZE ROUTE (THIS WAS MISSING)
app.post("/api/payments/initialize", async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount are required"
      });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "PAYSTACK_SECRET_KEY is not configured"
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100 // Paystack uses kobo
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
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
