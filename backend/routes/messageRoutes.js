const express = require("express");
const router = express.Router();

// MVP in-memory storage
const messages = [];

/**
 * SEND MESSAGE
 */
router.post("/send", (req, res) => {
  try {
    const { chatId, sender, text } = req.body;

    if (!chatId || !sender || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const newMessage = {
      chatId,
      sender,
      text,
      timestamp: Date.now()
    };

    messages.push(newMessage);

    res.json({
      success: true,
      message: newMessage
    });

  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET MESSAGES
 */
router.get("/:chatId", (req, res) => {
  try {
    const { chatId } = req.params;

    const chatMessages = messages.filter(m => m.chatId === chatId);

    res.json({
      messages: chatMessages
    });

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;