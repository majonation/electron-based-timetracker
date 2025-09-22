const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const { startTracking } = require('./tracker');
const { getFormattedTrackingLog, getAggregatedAppData, resetAllData } = require('./db');

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

app.whenReady().then(() => {
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
