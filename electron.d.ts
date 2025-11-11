// This file provides TypeScript definitions for the APIs exposed via preload.js.
// It allows for type-safe access and IntelliSense in the renderer process (App.tsx, services, etc.).

// FIX: Aligned this interface with the one in src/electron.d.ts to resolve global type conflicts.
// The modern API exposed in preload.js uses `requestServerInfo`.
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
