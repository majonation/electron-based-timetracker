const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app } = require('electron');
const fs = require('fs');

// Use app.getPath('userData') for packaged apps, fallback to local data folder for development
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'data');

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'timetracker.db');
console.log('Database path:', dbPath);

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

// Date utility functions
function getDateString(timestamp) {
  const date = new Date(timestamp);
  // Use local date components instead of ISO string to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // Returns YYYY-MM-DD format in local time
}

function getDayBoundaries(dateString) {
  // dateString should be in YYYY-MM-DD format
  // Parse the date in local timezone to get correct boundaries
  const [year, month, day] = dateString.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  return { 
    startOfDay: startDate.getTime(), 
    endOfDay: endDate.getTime() 
  };
}

function getTodayString() {
  return getDateString(Date.now());
}

// Get activities for a specific date
function getActivitiesForDate(dateString) {
  return new Promise((resolve, reject) => {
    const { startOfDay, endOfDay } = getDayBoundaries(dateString);
    
    db.all(`
      SELECT * FROM activities 
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time DESC
    `, [startOfDay, endOfDay], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get aggregated app data for a specific date
function getAggregatedAppDataForDate(dateString) {
  return new Promise((resolve, reject) => {
    const { startOfDay, endOfDay } = getDayBoundaries(dateString);
    
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
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY type, identifier
      ORDER BY total_duration DESC
    `, [startOfDay, endOfDay], (err, rows) => {
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

// Get daily statistics for a specific date
function getDailyStats(dateString) {
  return new Promise((resolve, reject) => {
    const { startOfDay, endOfDay } = getDayBoundaries(dateString);
    
    db.all(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT identifier) as unique_apps,
        SUM(end_time - start_time) as total_duration,
        MIN(start_time) as first_activity,
        MAX(end_time) as last_activity
      FROM activities 
      WHERE start_time >= ? AND start_time <= ?
    `, [startOfDay, endOfDay], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const stats = rows[0];
        const totalSeconds = Math.round((stats.total_duration || 0) / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        let totalTimeFormatted;
        if (hours > 0) {
          totalTimeFormatted = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          totalTimeFormatted = `${minutes}m ${totalSeconds % 60}s`;
        } else {
          totalTimeFormatted = `${totalSeconds}s`;
        }
        
        resolve({
          date: dateString,
          total_sessions: stats.total_sessions || 0,
          unique_apps: stats.unique_apps || 0,
          total_duration_seconds: totalSeconds,
          total_time_formatted: totalTimeFormatted,
          first_activity: stats.first_activity ? new Date(stats.first_activity).toLocaleTimeString() : null,
          last_activity: stats.last_activity ? new Date(stats.last_activity).toLocaleTimeString() : null
        });
      }
    });
  });
}

// Get list of dates that have activity data
function getAvailableDates() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT DISTINCT date(start_time/1000, 'unixepoch', 'localtime') as activity_date
      FROM activities 
      ORDER BY activity_date DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => row.activity_date));
      }
    });
  });
}

module.exports = { 
  db, 
  getAllActivities, 
  getFormattedTrackingLog, 
  getAggregatedAppData, 
  resetAllData,
  // New daily functions
  getDateString,
  getDayBoundaries,
  getTodayString,
  getActivitiesForDate,
  getAggregatedAppDataForDate,
  getDailyStats,
  getAvailableDates
};
