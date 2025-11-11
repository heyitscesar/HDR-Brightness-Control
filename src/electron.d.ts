// This file provides TypeScript definitions for the APIs exposed via preload.js.
// It allows for type-safe access and IntelliSense in the renderer process (App.tsx, services, etc.).

export interface IElectronAPI {
  /**
   * Asynchronously requests the server connection information from the main process.
   * @returns A promise that resolves with an object containing the server port, or null if not yet available.
   */
  requestServerInfo: () => Promise<{ port: number | null }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
