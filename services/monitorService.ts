import { Monitor, MonitorSettings } from '../types';
import { getDemoData } from './demoData';

const PORTS_TO_TRY = [3001, 3002, 3003, 3004, 3005, 3006];
let activeApiUrl: string | null = null;
let discoveryPromise: Promise<string | null> | null = null;

const discoverActiveApiUrl = async (): Promise<string | null> => {
    if (activeApiUrl) {
        return activeApiUrl;
    }

    for (const port of PORTS_TO_TRY) {
        try {
            const url = `http://localhost:${port}`;
            const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(300) });
            if (response.ok) {
                console.log(`Backend found on port ${port}`);
                activeApiUrl = `${url}/api`;
                return activeApiUrl;
            }
        } catch (error) {
            // This is expected if a port is not open, so we don't log it to reduce console noise.
        }
    }

    console.warn('Could not connect to the backend server. Entering Demo Mode.');
    return null;
};

const getActiveApiUrl = (): Promise<string | null> => {
    if (!discoveryPromise) {
        discoveryPromise = discoverActiveApiUrl();
    }
    return discoveryPromise;
};


export const getMonitors = async (): Promise<Monitor[]> => {
  const apiUrl = await getActiveApiUrl();
  if (!apiUrl) {
      return getDemoData();
  }
  
  const response = await fetch(`${apiUrl}/monitors`);
  if (!response.ok) {
    console.error('Failed to fetch monitors from the backend. Is the server running?');
    return getDemoData();
  }
  return await response.json();
};

export const getDDCIDevices = async (): Promise<{tool: string, devices: string[]}> => {
    const apiUrl = await getActiveApiUrl();
    if (!apiUrl) {
        console.warn('Demo Mode: Suppressing fetch for DDC/CI devices.');
        return { tool: 'demo', devices: ['1', '2', '\\\\.\\DISPLAY1'] };
    }
    try {
        const response = await fetch(`${apiUrl}/ddci-devices`);
        if (!response.ok) {
            throw new Error('Failed to fetch DDC/CI devices');
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return { tool: 'error', devices: [] };
    }
};

export const updateMonitorSettings = async (monitorId: string, settings: MonitorSettings, deviceId: string): Promise<boolean> => {
    const apiUrl = await getActiveApiUrl();
    if (!apiUrl) {
        console.warn(`Demo Mode: Suppressing settings update for monitor ${monitorId}`);
        return true;
    }
    const response = await fetch(`${apiUrl}/monitors/${monitorId}/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings, deviceId }),
    });
    return response.ok;
};

export const toggleAutoBrightness = async (monitorId: string, isActive: boolean): Promise<boolean> => {
    const apiUrl = await getActiveApiUrl();
    if (!apiUrl) {
        console.warn(`Demo Mode: Suppressing toggle for monitor ${monitorId}`);
        return true;
    }
    const response = await fetch(`${apiUrl}/monitors/${monitorId}/toggle`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
    });
    return response.ok;
}