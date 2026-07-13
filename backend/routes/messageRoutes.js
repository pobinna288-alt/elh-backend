const express = require("express");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
const { resolveUserFromJwt } = require("../common/resolveUser");

// ─── Auth Middleware (security patch) ─────────────────────────────────────────

const _getJwtSecret = () =>
  String(
    process.env.JWT_SECRET ||
    process.env.AUTH_JWT_SECRET ||
    process.env.PAYSTACK_SECRET_KEY ||
    "dev-secret"
  ).trim();

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, _getJwtSecret());
    const database = req.app?.get("database");
    const persistedUser = database && Array.isArray(database.users)
      ? resolveUserFromJwt(database, decoded)
      : null;

    if (!persistedUser) {
      console.log("[IDENTITY] /messages/* - JWT id:", decoded.id || decoded.userId || decoded.sub || null);
      console.log("[IDENTITY] /messages/* - JWT email:", decoded.email || null);
      console.log("[IDENTITY] /messages/* - resolved record id: NOT_FOUND");
      console.log("[IDENTITY] /messages/* - resolved record email: NOT_FOUND");
      console.log("[DIAG] /messages/* - no persisted record found; rejecting request");
      return res.status(401).json({ success: false, error: "User not found", code: "USER_NOT_FOUND" });
    }

    req.user = { ...decoded, ...persistedUser };
    console.log("[IDENTITY] /messages/* - JWT id:", decoded.id || decoded.userId || decoded.sub || null);
    console.log("[IDENTITY] /messages/* - JWT email:", decoded.email || null);
    console.log("[IDENTITY] /messages/* - resolved record id:", persistedUser.id);
    console.log("[IDENTITY] /messages/* - resolved record email:", persistedUser.email ?? "NOT_FOUND");
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

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
router.post("/send", requireAuth, (req, res) => {
  try {
    const { chatId, sender, text, receiverId } = req.body;

    if (!chatId || !sender || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Security: sender must match authenticated user
    if (sender !== req.user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
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
router.get("/conversations/:userId", requireAuth, (req, res) => {
  try {
    const { userId } = req.params;

    // Security: can only fetch own conversations
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

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
router.get("/:chatId", requireAuth, (req, res) => {
  try {
    const { chatId } = req.params;

    // Security: verify user is a participant in this conversation
    const conversation = findConversation.get(chatId);
    if (conversation && conversation.user1 !== req.user.id && conversation.user2 !== req.user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

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