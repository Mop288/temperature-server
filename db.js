const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./temperature.db");

// Tạo bảng nếu chưa có
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS temperatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station TEXT,
      value REAL,
      timestamp TEXT
    )
  `);
});

module.exports = db;
