const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const db = require("../db");

// Prepared statements for performance
const insertMessage = db.prepare(
  `INSERT INTO messages (conversationId, senderId, text) VALUES (?, ?, ?)`
);

const getMessagesByConversation = db.prepare(
  `SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC`
);

const findConversation = db.prepare(
  `SELECT * FROM conversations WHERE id = ?`
);

const upsertConversation = db.prepare(
  `INSERT INTO conversations (id, user1, user2, updatedAt)
   VALUES (?, ?, ?, CURRENT_TIMESTAMP)
   ON CONFLICT(id) DO UPDATE SET updatedAt = CURRENT_TIMESTAMP`
);

const touchConversation = db.prepare(
  `UPDATE conversations SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?`
);

const getConversationsByUser = db.prepare(
  `SELECT * FROM conversations
   WHERE user1 = ? OR user2 = ?
   ORDER BY updatedAt DESC`
);

/**
 * SEND MESSAGE
 */
router.post("/send", (req, res) => {
  try {
    const { chatId, sender, text, receiverId } = req.body;

    if (!chatId || !sender || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Auto-create conversation if it doesn't exist
    const existing = findConversation.get(chatId);
    if (!existing) {
      const otherUser = receiverId || "unknown";
      upsertConversation.run(chatId, sender, otherUser);
    } else {
      touchConversation.run(chatId);
    }

    // Save message to SQLite
    const result = insertMessage.run(chatId, sender, text);

    const newMessage = {
      id: result.lastInsertRowid,
      chatId,
      sender,
      text,
      timestamp: Date.now()
    };

    res.json({
      success: true,
      message: newMessage,
      messageId: result.lastInsertRowid
    });

  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET CONVERSATIONS for a user
 * Must be defined BEFORE /:chatId to avoid "conversations" matching as a chatId
 */
router.get("/conversations/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    const rows = getConversationsByUser.all(userId, userId);

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error("Conversations fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET MESSAGES
 */
router.get("/:chatId", (req, res) => {
  try {
    const { chatId } = req.params;

    const rows = getMessagesByConversation.all(chatId);

    res.json({
      success: true,
      messages: rows
    });

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;