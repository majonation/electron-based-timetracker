const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startTracking } = require('./tracker');
const { getFormattedTrackingLog } = require('./db');

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

// IPC handler for getting tracking data
ipcMain.handle('get-tracking-log', async () => {
  try {
    const logData = await getFormattedTrackingLog();
    return { success: true, data: logData };
  } catch (error) {
    console.error('Error fetching tracking log:', error);
    return { success: false, error: error.message };
  }
});
