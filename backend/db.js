const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "chat.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create tables (safe, runs once)
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversationId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    text TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversationId) REFERENCES conversations(id)
  )
`);

// Create indexes for fast lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversationId, createdAt)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_conversations_user1
    ON conversations(user1)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_conversations_user2
    ON conversations(user2)
`);

module.exports = db;
