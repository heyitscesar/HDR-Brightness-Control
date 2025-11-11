// This file provides TypeScript definitions for the APIs exposed via preload.js.
// It allows for type-safe access and IntelliSense in the renderer process (App.tsx, services, etc.).

export interface IElectronAPI {
  /**
   * Registers a callback function to be invoked when the 'server-ready' IPC event
   * is received from the main process.
   * @param callback The function to call with the event data, which includes the server port.
   */
  onServerReady: (callback: (value: { port: number }) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
