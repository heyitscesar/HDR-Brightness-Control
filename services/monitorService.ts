import { Monitor, MonitorSettings } from '../types';

interface ServerInfo {
    apiUrl: string;
    wsPort: number;
}

let serverInfoCache: ServerInfo | null = null;

export const getServerInfo = async (forceRefetch: boolean = false): Promise<ServerInfo> => {
    if (serverInfoCache && !forceRefetch) {
        return serverInfoCache;
    }

    if (window.electronAPI && typeof window.electronAPI.requestServerInfo === 'function') {
        // Electron context: Pull port from main process via IPC.
        // Try for ~10 seconds to get the port.
        for (let i = 0; i < 20; i++) { // 20 attempts * 500ms = 10 seconds
            const { port } = await window.electronAPI.requestServerInfo();
            if (port) {
                console.log(`API Service (Electron): Received server port ${port}`);
                const info = {
                    apiUrl: `http://localhost:${port}/api`,
                    wsPort: port,
                };
                serverInfoCache = info;
                return info;
            }
            await new Promise(res => setTimeout(res, 500));
        }
        throw new Error("Timed out waiting for server port from main process.");
    } else {
        // Non-Electron context: Fallback for web deployment or testing.
        console.warn("Electron API not found. Assuming web deployment and using hardcoded localhost:3001.");
        const hardcodedPort = 3001;
        const info = {
            apiUrl: `http://localhost:${hardcodedPort}/api`,
            wsPort: hardcodedPort,
        };
        serverInfoCache = info;
        return info;
    }
};


/**
 * A resilient fetch wrapper that waits for the backend to be ready.
 */
const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
    // This will get the cached info or fetch it if it's the first time.
    const { apiUrl } = await getServerInfo();
    
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
