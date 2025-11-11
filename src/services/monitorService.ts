import { Monitor, MonitorSettings } from '../types';

interface ServerInfo {
    apiUrl: string;
    wsPort: number;
}

// A single promise that resolves with the server connection details.
const serverInfoPromise: Promise<ServerInfo> = new Promise((resolve) => {
    if (window.electronAPI) {
        // Electron context: Get port from main process via IPC for dynamic port handling.
        window.electronAPI.onServerReady(({ port }) => {
            console.log(`API Service (Electron): Received server-ready event for port ${port}`);
            resolve({
                apiUrl: `http://localhost:${port}/api`,
                wsPort: port,
            });
        });
    } else {
        // Non-Electron context: Fallback for web deployment or testing.
        // Assume the server is running on a fixed, hardcoded localhost port.
        console.warn("Electron API not found. Assuming web deployment and using hardcoded localhost:3001.");
        const hardcodedPort = 3001; // This matches the dev server port.
        resolve({
            apiUrl: `http://localhost:${hardcodedPort}/api`,
            wsPort: hardcodedPort,
        });
    }
});


/**
 * A resilient fetch wrapper that waits for the backend to be ready.
 */
const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
    const { apiUrl } = await serverInfoPromise;
    
    const response = await fetch(`${apiUrl}${endpoint}`, options);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Request to ${endpoint} failed with status ${response.status}: ${errorBody}`);
    }
    return response;
};

/**
 * Gets the server connection info. This is the new centralized way for the UI
 * to know where to connect.
 */
export const getServerInfo = (): Promise<ServerInfo> => {
    return serverInfoPromise;
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