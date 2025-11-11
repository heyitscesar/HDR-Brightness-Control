const { contextBridge, ipcRenderer } = require('electron');

// Securely expose a custom API to the renderer process (the frontend)
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Asynchronously requests the server connection information from the main process.
   * @returns {Promise<{ port: number | null }>} A promise that resolves with the server port, or null if not yet available.
   */
  requestServerInfo: () => ipcRenderer.invoke('get-server-info')
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script with electronAPI loaded.');
});
