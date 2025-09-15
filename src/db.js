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

function getAllActivities() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM activities ORDER BY start_time DESC', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getFormattedTrackingLog() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        type,
        identifier,
        category,
        productivity,
        start_time,
        end_time,
        (end_time - start_time) as duration
      FROM activities 
      ORDER BY start_time DESC 
      LIMIT 100
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const formattedRows = rows.map(row => {
          const startDate = new Date(row.start_time);
          const endDate = new Date(row.end_time);
          const duration = Math.round(row.duration / 1000); // Convert to seconds
          
          return {
            ...row,
            start_time_formatted: startDate.toLocaleString(),
            end_time_formatted: endDate.toLocaleString(),
            duration_formatted: `${Math.floor(duration / 60)}m ${duration % 60}s`
          };
        });
        resolve(formattedRows);
      }
    });
  });
}

module.exports = { db, getAllActivities, getFormattedTrackingLog };
