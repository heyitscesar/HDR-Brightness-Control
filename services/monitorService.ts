import { Monitor, MonitorSettings } from '../types';

let activeApiUrl: string | null = null;
let serverReadyPromise: Promise<string>;

// This check is important because in a non-electron environment (like tests or a future web version),
// window.electronAPI might not exist.
if (window.electronAPI) {
    serverReadyPromise = new Promise((resolve, reject) => {
        // Resolve the promise with the correct URL when the main process signals readiness
        window.electronAPI.onServerReady(({ port }) => {
            console.log(`API Service: Received server-ready event for port ${port}`);
            const url = `http://localhost:${port}/api`;
            activeApiUrl = url;
            resolve(url);
        });
    });
} else {
    // Fallback for non-Electron environments or if the preload script fails
    console.warn("Electron API not found. Service will not function correctly.");
    serverReadyPromise = Promise.reject(new Error("Electron API not available"));
}


const getActiveApiUrl = (): Promise<string> => {
    // This promise will now wait until the `onServerReady` event is fired.
    return serverReadyPromise;
};

/**
 * A resilient fetch wrapper that waits for the backend to be ready.
 */
const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
    // This will wait until the server-ready event has been received and the promise has resolved.
    const apiUrl = await getActiveApiUrl();
    
    const response = await fetch(`${apiUrl}${endpoint}`, options);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Request to ${endpoint} failed with status ${response.status}: ${errorBody}`);
    }
    return response;
};


export const getMonitors = async (): Promise<Monitor[]> => {
    const response = await apiFetch('/monitors');
    return await response.json();
};

export const getDDCIDevices = async (): Promise<{tool: string, devices: string[]}> => {
    try {
        const response = await apiFetch('/ddci-devices');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch DDC/CI devices:', error);
        return { tool: 'error', devices: [] };
    }
};

export const updateMonitorSettings = async (monitorId: string, settings: MonitorSettings, deviceId: string): Promise<void> => {
    await apiFetch(`/monitors/${monitorId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, deviceId }),
    });
};

export const toggleAutoBrightness = async (monitorId: string, isActive: boolean): Promise<void> => {
    await apiFetch(`/monitors/${monitorId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
    });
};