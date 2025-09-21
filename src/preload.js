const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getTrackingLog: () => ipcRenderer.invoke('get-tracking-log'),
  getAggregatedApps: () => ipcRenderer.invoke('get-aggregated-apps')
});

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
