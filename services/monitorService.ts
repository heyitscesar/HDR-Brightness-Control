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
            // Use a short timeout to fail fast
            const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(300) });
            if (response.ok) {
                console.log(`Backend found on port ${port}`);
                activeApiUrl = `${url}/api`;
                return activeApiUrl;
            }
        } catch (error) {
            console.log(`Port ${port} is not available, trying next...`);
        }
    }

    console.warn('Could not connect to the backend server. Entering Demo Mode.');
    return null; // Return null to indicate failure
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
      return getDemoData(); // Return demo data if backend is not found
  }
  
  console.log('Fetching monitors from backend...');
  const response = await fetch(`${apiUrl}/monitors`);
  if (!response.ok) {
    console.error('Failed to fetch monitors from the backend. Is the server running?');
    // Fallback to demo data on fetch failure as well
    return getDemoData();
  }
  const data = await response.json();
  return data;
};

export const getMonitorianDevices = async (): Promise<string[]> => {
    const apiUrl = await getActiveApiUrl();
    if (!apiUrl) {
        console.warn('Demo Mode: Suppressing fetch for Monitorian devices.');
        return ['1', '2', '3']; // Return sample devices for demo
    }
    console.log('Fetching Monitorian devices...');
    try {
        const response = await fetch(`${apiUrl}/monitorian-devices`);
        if (!response.ok) {
            throw new Error('Failed to fetch Monitorian devices');
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return []; // Return empty array on error
    }
};

export const updateMonitorSettings = async (monitorId: string, settings: MonitorSettings, monitorianName: string): Promise<boolean> => {
    const apiUrl = await getActiveApiUrl();
    if (!apiUrl) {
        console.warn(`Demo Mode: Suppressing settings update for monitor ${monitorId}`);
        return true;
    }
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
    if (!apiUrl) {
        console.warn(`Demo Mode: Suppressing toggle for monitor ${monitorId}`);
        return true;
    }
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
