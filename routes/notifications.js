const express = require("express");
const router = express.Router();

// MVP in-memory data (NO DB)
const notifications = [
  {
    id: 1,
    message: "Welcome to the app 👋",
    read: false,
    createdAt: new Date()
  },
  {
    id: 2,
    message: "Your account is ready",
    read: false,
    createdAt: new Date()
  }
];

// GET notifications
router.get("/", (_req, res) => {
  return res.json({
    success: true,
    data: notifications
  });
});

module.exports = router;
