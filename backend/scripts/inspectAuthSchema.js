const Database = require("better-sqlite3");

const dbPath = process.argv[2] || "data/auth-security-isolated.sqlite";
const db = new Database(dbPath, { readonly: true });

const rows = db
  .prepare("SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'index') AND name LIKE 'auth_%' ORDER BY type, name")
  .all();

console.log(JSON.stringify({ dbPath, objects: rows }, null, 2));
