import { Monitor, MonitorSettings } from '../types';

const PORTS_TO_TRY = [3001, 3002, 3003, 3004, 3005, 3006];
let activeApiUrl: string | null = null;

const getActiveApiUrl = async (): Promise<string> => {
    if (activeApiUrl) {
        return activeApiUrl;
    }

    for (const port of PORTS_TO_TRY) {
        try {
            const url = `http://localhost:${port}`;
            const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) });
            if (response.ok) {
                console.log(`Backend found on port ${port}`);
                activeApiUrl = `${url}/api`;
                return activeApiUrl;
            }
        } catch (error) {
            console.log(`Port ${port} is not available, trying next...`);
        }
    }

    throw new Error('Could not connect to the backend server on any of the specified ports.');
};

export const getMonitors = async (): Promise<Monitor[]> => {
  const apiUrl = await getActiveApiUrl();
  console.log('Fetching monitors from backend...');
  const response = await fetch(`${apiUrl}/monitors`);
  if (!response.ok) {
    console.error('Failed to fetch monitors from the backend. Is the server running?');
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data;
};

/**
 * Fetches the list of valid device names from Monitorian.exe.
 */
export const getMonitorianDevices = async (): Promise<string[]> => {
    const apiUrl = await getActiveApiUrl();
    console.log('Fetching Monitorian devices...');
    const response = await fetch(`${apiUrl}/monitorian-devices`);
    if (!response.ok) {
        throw new Error('Failed to fetch Monitorian devices');
    }
    return await response.json();
};

/**
 * Sends updated settings and monitorianName for a specific monitor to the backend.
 * @param monitorId - The ID of the monitor to update.
 * @param settings - The new settings object.
 * @param monitorianName - The new name/ID for Monitorian.
 */
export const updateMonitorSettings = async (monitorId: string, settings: MonitorSettings, monitorianName: string): Promise<boolean> => {
    const apiUrl = await getActiveApiUrl();
    console.log(`Updating settings for monitor ${monitorId} via API`, { settings, monitorianName });
    const response = await fetch(`${apiUrl}/monitors/${monitorId}/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings, monitorianName }),
    });
    return response.ok;
};

export const toggleAutoBrightness = async (monitorId: string, isActive: boolean): Promise<boolean> => {
    const apiUrl = await getActiveApiUrl();
    console.log(`Toggling auto-brightness for monitor ${monitorId} to ${isActive} via API`);
    const response = await fetch(`${apiUrl}/monitors/${monitorId}/toggle`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
    });
    return response.ok;
}