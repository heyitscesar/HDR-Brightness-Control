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
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  
  // Setup WebSocket connection with fallback ports
  const connectWebSocket = useCallback(() => {
    let portIndex = 0;
    const tryConnect = () => {
      if (portIndex >= WS_PORTS_TO_TRY.length) {
        console.error("Could not connect to WebSocket on any of the specified ports.");
        setWsStatus('disconnected');
        return;
      }
      const port = WS_PORTS_TO_TRY[portIndex];
      // If a connection is already open or connecting, don't try again.
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      
      ws.current = new WebSocket(`ws://localhost:${port}`);
      setWsStatus('connecting');

      ws.current.onopen = () => {
        console.log(`WebSocket connected on port ${port}`);
        setWsStatus('connected');
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
        if (wsStatus !== 'disconnected') {
            console.log('WebSocket disconnected.');
            setWsStatus('disconnected');
        }
      };

      ws.current.onerror = () => {
        ws.current?.close();
        portIndex++;
        tryConnect(); // Try the next port
      };
    };
    tryConnect();
  }, [wsStatus]);


  const fetchMonitors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMonitors();
      
      if (data.length > 0 && data[0].isDemo) {
        setIsDemoMode(true);
        setWsStatus('disconnected');
      } else {
        setIsDemoMode(false);
        connectWebSocket(); // Only attempt WS connection if not in demo mode
      }
      
      setMonitors(data);
    } catch (err: any) {
      console.error(err);
      // Fallback handled in service, but we can set demo mode here too
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [connectWebSocket]);

  useEffect(() => {
    fetchMonitors();
    return () => {
      ws.current?.close();
    };
  }, [fetchMonitors]);

  const handleToggleActive = async (monitorId: string, isActive: boolean) => {
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, isActive } : m));
    await toggleAutoBrightness(monitorId, isActive);
  };

  const handleOpenSettings = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
  };

  const handleCloseSettings = () => {
    setSelectedMonitor(null);
  };

  const handleSaveSettings = async (monitorId: string, settings: MonitorSettings, monitorianName: string) => {
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, settings, monitorianName } : m));
    await updateMonitorSettings(monitorId, settings, monitorianName);
    handleCloseSettings();
  };
  
  const DemoModeBanner = () => (
    <div className="container mx-auto px-4 md:px-6 pt-4">
        <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-200 text-sm rounded-lg p-4 text-center">
            <strong>Demo Mode:</strong> Could not connect to the backend server. You are viewing static demo data to showcase the user experience.
        </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingIcon className="w-12 h-12 text-primary animate-spin"/>
          <p className="mt-4 text-lg text-gray-400">Loading monitors...</p>
        </div>
      );
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
      {isDemoMode && <DemoModeBanner />}
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
