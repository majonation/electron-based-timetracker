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
      title TEXT,
      description TEXT,
      full_url TEXT,
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
  
  // Add new columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE activities ADD COLUMN title TEXT`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE activities ADD COLUMN description TEXT`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE activities ADD COLUMN full_url TEXT`, (err) => {
    // Ignore error if column already exists
  });
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

function getAggregatedAppData() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        type,
        identifier,
        title,
        description,
        full_url,
        category,
        productivity,
        SUM(end_time - start_time) as total_duration,
        COUNT(*) as session_count,
        MAX(end_time) as last_used
      FROM activities 
      GROUP BY type, identifier
      ORDER BY total_duration DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const formattedRows = rows.map(row => {
          const totalSeconds = Math.round(row.total_duration / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          
          let durationFormatted;
          if (hours > 0) {
            durationFormatted = `${hours}h ${minutes}m`;
          } else if (minutes > 0) {
            durationFormatted = `${minutes}m ${seconds}s`;
          } else {
            durationFormatted = `${seconds}s`;
          }
          
          const lastUsedDate = new Date(row.last_used);
          
          // For websites, extract domain and format display
          let display_name = row.identifier;
          let domain = '';
          let full_url = '';
          let site_description = '';
          
          if (row.type === 'website') {
            try {
              const url = new URL(row.identifier);
              domain = url.hostname.replace('www.', '');
              full_url = row.full_url || row.identifier;
              
              // Use title if available, otherwise use domain
              if (row.title && row.title.trim()) {
                display_name = row.title.trim();
                // Add description after title if available
                if (row.description && row.description.trim()) {
                  site_description = row.description.trim();
                  // Limit description length
                  if (site_description.length > 100) {
                    site_description = site_description.substring(0, 100) + '...';
                  }
                }
              } else {
                display_name = domain;
              }
            } catch (e) {
              // If URL parsing fails, use the identifier as is
              display_name = row.identifier.length > 60 ? row.identifier.substring(0, 60) + '...' : row.identifier;
            }
          }
          
          return {
            ...row,
            total_duration_seconds: totalSeconds,
            duration_formatted: durationFormatted,
            last_used_formatted: lastUsedDate.toLocaleString(),
            display_name,
            domain,
            full_url,
            site_description
          };
        });
        resolve(formattedRows);
      }
    });
  });
}

function resetAllData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM activities', (err) => {
        if (err) {
          reject(err);
        } else {
          db.run('DELETE FROM categories', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  });
}

module.exports = { db, getAllActivities, getFormattedTrackingLog, getAggregatedAppData, resetAllData };
