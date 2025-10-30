const { app, BrowserWindow, ipcMain, systemPreferences, dialog, shell } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const { startTracking } = require('./tracker');
const { 
  getFormattedTrackingLog, 
  getAggregatedAppData, 
  resetAllData,
  getTodayString,
  getAggregatedAppDataForDate,
  getDailyStats,
  getAvailableDates
} = require('./db');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

async function checkScreenRecordingPermission() {
  // Check if we have screen recording permission (macOS only)
  if (process.platform !== 'darwin') {
    return true; // Not macOS, no permission needed
  }

  // Check screen recording permission status
  let status = systemPreferences.getMediaAccessStatus('screen');
  console.log('Initial screen recording permission status:', status);
  
  // If status is already granted, give system a moment to initialize before testing
  if (status === 'granted') {
    console.log('Permission status is granted, waiting briefly before testing...');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // First, test if active-win actually works (the real test)
  console.log('Testing active-win functionality...');
  const activeWin = require('active-win');
  let activeWinWorks = false;
  let activeWinError = null;
  
  try {
    const win = await activeWin();
    if (win) {
      console.log('active-win test successful, detected window:', win.owner.name);
      activeWinWorks = true;
    } else {
      console.log('active-win returned null (no active window)');
      activeWinWorks = true; // null is valid, means no window is active
    }
  } catch (error) {
    console.error('active-win test failed:', error.message);
    activeWinError = error.message;
    activeWinWorks = false;
  }
  
  // If both status is granted AND active-win works, we're good - skip permission prompt
  if (status === 'granted' && activeWinWorks) {
    console.log('Screen recording permission verified and active-win working!');
    return true;
  }
  
  // Log detailed debug info if permission check failed
  console.log('DEBUG: Permission check failed. Status:', status, '| active-win works:', activeWinWorks, '| Error:', activeWinError);
  
  // Only attempt to trigger the prompt if permission is not yet determined
  if (status === 'not-determined') {
    console.log('Permission not determined, attempting to trigger permission prompt...');
    
    const tempWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false
      }
    });
    
    try {
      // Attempt to get screen sources - this triggers the permission prompt on first run
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      console.log('desktopCapturer.getSources() completed, found', sources.length, 'sources');
    } catch (error) {
      console.log('Screen capture attempt error:', error.message);
    } finally {
      tempWin.close();
    }
    
    // Give macOS time to show the permission dialog and process user's response
    console.log('Waiting for permission dialog response...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check status again after triggering the prompt
    status = systemPreferences.getMediaAccessStatus('screen');
    console.log('Permission status after prompt attempt:', status);
    
    // Re-test active-win after permission prompt
    try {
      const win = await activeWin();
      if (win || win === null) {
        activeWinWorks = true;
      }
    } catch (error) {
      activeWinWorks = false;
    }
    
    // If permission was granted and active-win works now, we're good
    if (status === 'granted' && activeWinWorks) {
      console.log('Screen recording permission granted and active-win working!');
      return true;
    }
  }
  
  // Permission not working properly - show dialog and guide user
  console.log('Permission not working properly. Status:', status, 'active-win works:', activeWinWorks);
  
  let detailMessage = '';
  if (status === 'denied') {
    detailMessage = 'Permission was denied. You must enable it manually in System Settings.\n\n';
  } else if (status === 'not-determined') {
    detailMessage = 'Permission has not been granted yet.\n\n';
  } else if (status === 'granted' && !activeWinWorks) {
    detailMessage = 'Permission shows as granted, but the app cannot access window information.\n' +
                   'This may require restarting your Mac or re-granting permission.\n\n';
  }
  
  const response = await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording Permission Required',
    message: 'Time Tracker needs Screen Recording permission to track your activity.',
    detail: detailMessage +
            'To grant permission:\n' +
            '1. Open System Settings\n' +
            '2. Go to Privacy & Security › Screen Recording\n' +
            '3. Enable the checkbox next to "Time Tracker" or "Electron"\n' +
            '4. Restart this application\n\n' +
            'If the checkbox is already enabled, try:\n' +
            '- Unchecking and re-checking it\n' +
            '- Restarting your Mac\n\n' +
            'Click "Open System Settings" to go there now.',
    buttons: ['Open System Settings', 'Quit'],
    defaultId: 0,
    cancelId: 1
  });
  
  if (response.response === 0) {
    console.log('Opening System Settings...');
    // Open System Settings directly to Screen Recording section
    // Try multiple URL schemes for compatibility with different macOS versions
    try {
      // For macOS Ventura (13.0+)
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    } catch (error) {
      console.error('Failed to open with URL scheme:', error);
      // Fallback for older macOS versions
      try {
        await shell.openPath('/System/Library/PreferencePanes/Security.prefPane');
      } catch (fallbackError) {
        console.error('Failed to open System Settings:', fallbackError);
      }
    }
  }
  
  // Quit the app - user needs to grant permission and restart
  console.log('Quitting app - permission required');
  app.quit();
  return false;
}

app.whenReady().then(async () => {
  // Check for screen recording permission before starting
  const hasPermission = await checkScreenRecordingPermission();
  if (!hasPermission) {
    return; // App will quit
  }
  // Set up IPC handlers
  ipcMain.handle('get-tracking-log', async () => {
    try {
      const logData = await getFormattedTrackingLog();
      return { success: true, data: logData };
    } catch (error) {
      console.error('Error fetching tracking log:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-aggregated-apps', async () => {
    try {
      const appData = await getAggregatedAppData();
      return { success: true, data: appData };
    } catch (error) {
      console.error('Error fetching aggregated app data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reset-all-data', async () => {
    try {
      await resetAllData();
      return { success: true };
    } catch (error) {
      console.error('Error resetting data:', error);
      return { success: false, error: error.message };
    }
  });

  // New daily tracking IPC handlers
  ipcMain.handle('get-today-string', async () => {
    try {
      const today = getTodayString();
      return { success: true, data: today };
    } catch (error) {
      console.error('Error getting today string:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-daily-apps', async (event, dateString) => {
    try {
      const appData = await getAggregatedAppDataForDate(dateString);
      return { success: true, data: appData };
    } catch (error) {
      console.error('Error fetching daily app data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-daily-stats', async (event, dateString) => {
    try {
      const stats = await getDailyStats(dateString);
      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-available-dates', async () => {
    try {
      const dates = await getAvailableDates();
      return { success: true, data: dates };
    } catch (error) {
      console.error('Error fetching available dates:', error);
      return { success: false, error: error.message };
    }
  });

  createWindow();
  startTracking();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
