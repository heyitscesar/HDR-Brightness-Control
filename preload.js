const { contextBridge, ipcRenderer } = require('electron');

// Securely expose a custom API to the renderer process (the frontend)
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Sets up a listener for the 'server-ready' event sent from the main process.
   * @param {function} callback - The function to execute when the event is received. 
   *                              It will be passed the data from the main process (e.g., { port: 3001 }).
   */
  onServerReady: (callback) => ipcRenderer.on('server-ready', (_event, value) => callback(value))
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script with electronAPI loaded.');
});