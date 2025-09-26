const activeWin = require('active-win');
const { exec } = require('child_process');
const { db } = require('./db');

async function getChromeActiveTab() {
  return new Promise((resolve) => {
    const script = `
      tell application "Google Chrome"
        if (count of windows) > 0 then
          tell front window
            set tabURL to URL of active tab
            set tabTitle to title of active tab
            set tabDescription to ""
            try
              set tabDescription to execute active tab javascript "
                var metaDesc = document.querySelector('meta[name=\"description\"]');
                if (metaDesc) {
                  metaDesc.getAttribute('content') || '';
                } else {
                  var ogDesc = document.querySelector('meta[property=\"og:description\"]');
                  if (ogDesc) {
                    ogDesc.getAttribute('content') || '';
                  } else {
                    '';
                  }
                }
              "
            end try
            return tabURL & "|||" & tabTitle & "|||" & tabDescription
          end tell
        end if
      end tell
    `;
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) return resolve(null);
      const result = stdout.trim();
      if (result && result.includes('|||')) {
        const parts = result.split('|||');
        const url = parts[0] ? parts[0].trim() : '';
        const title = parts[1] ? parts[1].trim() : '';
        const description = parts[2] ? parts[2].trim() : '';
        return resolve({ url, title, description });
      }
      return resolve(null);
    });
  });
}

let current = null;
let lastRecordTime = null;

async function pollActivity() {
  try {
    const win = await activeWin();
    if (!win) return;
    
    let activity;
    if (win.owner.name === 'Google Chrome') {
      const tabInfo = await getChromeActiveTab();
      if (!tabInfo) return;
      
      // Extract base URL (protocol + hostname)
      let baseUrl = tabInfo.url;
      try {
        const url = new URL(tabInfo.url);
        baseUrl = `${url.protocol}//${url.hostname}`;
      } catch (e) {
        // If URL parsing fails, use the full URL
        baseUrl = tabInfo.url;
      }
      
      activity = { 
        type: 'website', 
        identifier: baseUrl,
        title: tabInfo.title,
        description: tabInfo.description,
        full_url: tabInfo.url
      };
    } else {
      const identifier = win.owner.bundleId || win.owner.name;
      activity = { type: 'app', identifier };
    }
    
    const now = Date.now();
    
    // Always record a 5-second entry for the current activity
    // Calculate the start time as 5 seconds ago (or from last record time)
    const startTime = lastRecordTime || (now - 5000);
    const endTime = now;
    
    // Round to 10-second granularity as specified in the original code
    const start = Math.round(startTime / 10000) * 10000;
    const end = Math.round(endTime / 10000) * 10000;
    
    // Only insert if we have a meaningful time duration (avoid duplicate entries)
    if (end > start) {
      db.run('INSERT INTO activities (type, identifier, title, description, full_url, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [activity.type, activity.identifier, activity.title || null, activity.description || null, activity.full_url || null, start, end], (err) => {
          if (err) console.error('Error inserting activity:', err);
        });
    }
    
    // Update tracking variables
    current = { ...activity, startTime: now };
    lastRecordTime = now;
    
  } catch (e) {
    // ignore errors to keep polling
    console.error('Error in pollActivity:', e);
  }
}

function startTracking() {
  setInterval(pollActivity, 5000);
}

module.exports = { startTracking };
