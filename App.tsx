import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, MonitorSettings } from './types';
import { getMonitors, updateMonitorSettings, toggleAutoBrightness } from './services/monitorService';
import Header from './components/Header';
import MonitorCard from './components/MonitorCard';
import SettingsModal from './components/SettingsModal';
import { LoadingIcon } from './components/icons/LoadingIcon';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';
const WS_PORTS_TO_TRY = [3001, 3002, 3003, 3004, 3005, 3006];

const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('connecting');
  const ws = useRef<WebSocket | null>(null);
  const isConnected = useRef<boolean>(false);

  const fetchMonitors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMonitors();
      setMonitors(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitor data. Please ensure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();

    // Setup WebSocket connection with fallback ports
    const connectWebSocket = (portIndex = 0) => {
      if (portIndex >= WS_PORTS_TO_TRY.length) {
        console.error("Could not connect to WebSocket on any of the specified ports.");
        setWsStatus('disconnected');
        return;
      }
      const port = WS_PORTS_TO_TRY[portIndex];
      ws.current = new WebSocket(`ws://localhost:${port}`);
      setWsStatus('connecting');

      ws.current.onopen = () => {
        console.log(`WebSocket connected on port ${port}`);
        setWsStatus('connected');
        isConnected.current = true;
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'monitor-update') {
          const updatedMonitor = message.payload as Monitor;
          setMonitors(currentMonitors =>
            currentMonitors.map(m => m.id === updatedMonitor.id ? updatedMonitor : m)
          );
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected.');
        setWsStatus('disconnected');
        isConnected.current = false;
        // Optional: Implement a more robust reconnection strategy if needed
      };

      ws.current.onerror = (error) => {
        console.error(`WebSocket error on port ${port}:`, error);
        ws.current?.close();
        if (!isConnected.current) {
          // If we never connected, try the next port
          connectWebSocket(portIndex + 1);
        }
      };
    };

    connectWebSocket();

    return () => {
      ws.current?.close();
    };
  }, [fetchMonitors]);

  const handleToggleActive = async (monitorId: string, isActive: boolean) => {
    // Optimistic UI update
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, isActive } : m));
    await toggleAutoBrightness(monitorId, isActive);
    // State will be corrected by WebSocket message if something goes wrong.
  };

  const handleOpenSettings = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
  };

  const handleCloseSettings = () => {
    setSelectedMonitor(null);
  };

  const handleSaveSettings = async (monitorId: string, settings: MonitorSettings) => {
    // Optimistic update
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, settings } : m));
    await updateMonitorSettings(monitorId, settings);
    handleCloseSettings();
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingIcon className="w-12 h-12 text-primary"/>
          <p className="mt-4 text-lg text-gray-400">Loading monitors...</p>
        </div>
      );
    }

    if (error) {
      return <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {monitors.map(monitor => (
          <MonitorCard 
            key={monitor.id} 
            monitor={monitor} 
            onToggleActive={handleToggleActive}
            onOpenSettings={handleOpenSettings}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header wsStatus={wsStatus} />
      <main className="container mx-auto p-4 md:p-6">
        {renderContent()}
      </main>
      {selectedMonitor && (
        <SettingsModal 
          monitor={selectedMonitor} 
          onClose={handleCloseSettings} 
          onSave={handleSaveSettings} 
        />
      )}
    </div>
  );
};

export default App;