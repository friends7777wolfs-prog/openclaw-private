const Database = require('better-sqlite3');
const db = new Database('openclaw_memory.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, title TEXT, cost REAL, price REAL, sold INTEGER DEFAULT 0, created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, input TEXT, output TEXT, result TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prices (
    product_id TEXT, price REAL, date TEXT
  );
`);

module.exports = {
  saveProduct: (id, title, cost, price) =>
    db.prepare(`INSERT OR REPLACE INTO products VALUES (?,?,?,?,0,datetime('now'))`).run(id, title, cost, price),
  getProducts: () => db.prepare(`SELECT * FROM products`).all(),
  logDecision: (type, input, output, result) =>
    db.prepare(`INSERT INTO decisions (type,input,output,result) VALUES (?,?,?,?)`).run(type, JSON.stringify(input), JSON.stringify(output), result),
  getHistory: (type, limit = 10) =>
    db.prepare(`SELECT * FROM decisions WHERE type=? ORDER BY created_at DESC LIMIT ?`).all(type, limit),
  logPrice: (productId, price) =>
    db.prepare(`INSERT INTO prices VALUES (?,?,date('now'))`).run(productId, price),
  getPriceHistory: (productId) =>
    db.prepare(`SELECT * FROM prices WHERE product_id=? ORDER BY date DESC LIMIT 30`).all(productId),
};
