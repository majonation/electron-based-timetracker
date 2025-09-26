const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getTrackingLog: () => ipcRenderer.invoke('get-tracking-log'),
  getAggregatedApps: () => ipcRenderer.invoke('get-aggregated-apps'),
  resetAllData: () => ipcRenderer.invoke('reset-all-data'),
  // New daily tracking APIs
  getTodayString: () => ipcRenderer.invoke('get-today-string'),
  getDailyApps: (dateString) => ipcRenderer.invoke('get-daily-apps', dateString),
  getDailyStats: (dateString) => ipcRenderer.invoke('get-daily-stats', dateString),
  getAvailableDates: () => ipcRenderer.invoke('get-available-dates')
});

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
