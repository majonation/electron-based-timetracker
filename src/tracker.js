const activeWin = require('active-win');
const { exec } = require('child_process');
const db = require('./db');

async function getChromeActiveTab() {
  return new Promise((resolve) => {
    const script = 'tell application "Google Chrome" to if (count of windows) > 0 then tell front window to get URL of active tab';
    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

let current = null;

async function pollActivity() {
  try {
    const win = await activeWin();
    if (!win) return;
    let activity;
    if (win.owner.name === 'Google Chrome') {
      const url = await getChromeActiveTab();
      if (!url) return;
      activity = { type: 'website', identifier: url };
    } else {
      const identifier = win.owner.bundleId || win.owner.name;
      activity = { type: 'app', identifier };
    }
    const now = Date.now();
    if (current && current.identifier === activity.identifier && current.type === activity.type) {
      return;
    }
    if (current) {
      const start = Math.round(current.startTime / 10000) * 10000;
      const end = Math.round(now / 10000) * 10000;
      db.prepare('INSERT INTO activities (type, identifier, start_time, end_time) VALUES (?, ?, ?, ?)')
        .run(current.type, current.identifier, start, end);
    }
    current = { ...activity, startTime: now };
  } catch (e) {
    // ignore errors to keep polling
  }
}

function startTracking() {
  setInterval(pollActivity, 5000);
}

module.exports = { startTracking };
