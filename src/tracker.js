const activeWin = require('active-win');
const { exec } = require('child_process');
const { db } = require('./db');
const { dialog } = require('electron');

let permissionErrorShown = false;
let pollIntervalId = null;

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
let trackingStartTime = null; // Track when we first started tracking

// Helper utilities for date boundaries
function getDateString(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

function startOfNextDay(ts) {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0); // move to midnight of next day
  return d.getTime();
}

async function pollActivity() {
  try {
    const win = await activeWin();
    if (!win) {
      // If no active window, don't record any time but keep tracking
      lastRecordTime = Date.now();
      return;
    }
    
    let activity;
    if (win.owner.name === 'Google Chrome') {
      const tabInfo = await getChromeActiveTab();
      if (!tabInfo) {
        // If Chrome is active but we can't get tab info, still record Chrome usage
        activity = { 
          type: 'app', 
          identifier: 'Google Chrome',
          title: 'Google Chrome',
          description: null,
          full_url: null
        };
      } else {
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
      }
    } else {
      const identifier = win.owner.bundleId || win.owner.name;
      activity = { type: 'app', identifier, title: win.title };
    }
    
    const now = Date.now();
    
    // Initialize tracking start time if this is the first poll
    if (trackingStartTime === null) {
      trackingStartTime = now;
      lastRecordTime = now;
      current = { ...activity, startTime: now };
      return; // Don't record anything on the very first poll, just initialize
    }
    
    // Calculate the time window for this activity
    const segmentStart = lastRecordTime || trackingStartTime;
    const segmentEnd = now;
    
    // Only record if we have a meaningful time duration (at least 1 second)
    if (segmentEnd - segmentStart < 1000) {
      lastRecordTime = now;
      return;
    }

    // Function to insert a single segment without rounding
    function insertSegment(start, end) {
      if (end <= start) return; // skip zero/negative durations
      
      db.run(
        'INSERT INTO activities (type, identifier, title, description, full_url, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          activity.type,
          activity.identifier,
          activity.title || null,
          activity.description || null,
          activity.full_url || null,
          start,
          end,
        ],
        (err) => {
          if (err) console.error('Error inserting activity:', err);
        }
      );
    }

    // Handle day rollover: if the window crosses midnight, split into two segments
    const startDate = getDateString(segmentStart);
    const endDate = getDateString(segmentEnd);
    if (startDate !== endDate) {
      const splitPoint = startOfNextDay(segmentStart); // midnight boundary
      // Segment 1: segmentStart -> splitPoint (previous day)
      if (splitPoint > segmentStart) {
        insertSegment(segmentStart, splitPoint);
      }
      // Segment 2: splitPoint -> segmentEnd (current day)
      if (segmentEnd > splitPoint) {
        insertSegment(splitPoint, segmentEnd);
      }
    } else {
      insertSegment(segmentStart, segmentEnd);
    }
    
    // Update tracking variables
    current = { ...activity, startTime: now };
    lastRecordTime = now;
    
  } catch (e) {
    // Check if this is a permission error
    const errorMessage = e.message || '';
    const isPermissionError = errorMessage.includes('screen recording permission') || 
                              (e.stdout && e.stdout.includes('screen recording permission'));
    
    if (isPermissionError && !permissionErrorShown) {
      permissionErrorShown = true;
      console.error('Screen Recording permission required for active-win');
      
      // Stop polling to prevent continuous errors
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      
      // Show dialog to user
      dialog.showErrorBox(
        'Screen Recording Permission Required',
        'Time Tracker needs Screen Recording permission to track your activity.\n\n' +
        'Please grant permission in:\n' +
        'System Settings › Privacy & Security › Screen Recording\n\n' +
        'Then restart the application.'
      );
      
      return;
    }
    
    // For other errors, log and continue
    console.error('Error in pollActivity:', e);
    lastRecordTime = Date.now();
  }
}

function startTracking() {
  // Poll every 2 seconds for better accuracy
  pollIntervalId = setInterval(pollActivity, 2000);
}

function stopTracking() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

module.exports = { startTracking, stopTracking };
