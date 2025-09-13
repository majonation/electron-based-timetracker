const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'data', 'timetracker.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      category TEXT,
      productivity INTEGER,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      productivity INTEGER NOT NULL
    );
  `);
});

module.exports = db;
