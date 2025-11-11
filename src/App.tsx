import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, MonitorSettings } from './types';
import { getServerInfo, getMonitors, updateMonitorSettings, toggleAutoBrightness } from './services/monitorService';
import { getDemoData } from './services/demoData';
import Header from './components/core/Header';
import MonitorCard from './components/core/MonitorCard';
import SettingsModal from './components/core/SettingsModal';
import ErrorBoundary from './components/core/ErrorBoundary';
import { LoadingIcon } from './components/icons/LoadingIcon';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('disconnected');
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [updatingMonitorId, setUpdatingMonitorId] = useState<string | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);
  const reconnectTimeoutId = useRef<number | null>(null);
  
  const connectWebSocket = useCallback((port: number) => {
    if (!port || isUnmounted.current) return;

    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    ws.current = new WebSocket(`ws://localhost:${port}`);
    setWsStatus('connecting');

    ws.current.onopen = () => {
      setWsStatus('connected');
      reconnectAttempts.current = 0; // Reset on successful connection
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
      if (!isUnmounted.current) {
        setWsStatus('disconnected');
        const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * Math.pow(2, reconnectAttempts.current));
        reconnectAttempts.current++;
        if (reconnectTimeoutId.current) clearTimeout(reconnectTimeoutId.current);
        reconnectTimeoutId.current = window.setTimeout(() => connectWebSocket(port), delay);
      }
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, []);

  // Effect to handle the initial connection
  useEffect(() => {
    isUnmounted.current = false;

    // Set a timeout to enter demo mode if the server doesn't connect in time
    const connectionTimeout = setTimeout(() => {
        if (isUnmounted.current || serverPort) return;
        console.warn("Server connection timeout. Entering Demo Mode.");
        setLoading(false);
        setIsDemoMode(true);
        setMonitors(getDemoData());
    }, 10000);

    // Get server info from the centralized service. This works in both Electron
    // and web (fallback) contexts.
    getServerInfo().then(serverInfo => {
      if (isUnmounted.current) return;
      clearTimeout(connectionTimeout);
      setServerPort(serverInfo.wsPort);
    });

    return () => {
      isUnmounted.current = true;
      clearTimeout(connectionTimeout);
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnection logic on deliberate close
        ws.current.close();
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount


  // Effect to fetch data and connect WebSocket once we know the server port
  useEffect(() => {
    if (!serverPort) return;

    const fetchAndConnect = async () => {
        try {
            setLoading(true);
            const data = await getMonitors();
            setMonitors(data);
            setIsDemoMode(false); // Success, so ensure we are not in demo mode
            connectWebSocket(serverPort);
        } catch (err: any) {
            console.error("Failed to fetch monitors. Entering demo mode.", err);
            setIsDemoMode(true);
            setMonitors(getDemoData());
        } finally {
            setLoading(false);
        }
    };

    fetchAndConnect();
  }, [serverPort, connectWebSocket]);
  
  const handleManualReconnect = useCallback(() => {
    if (wsStatus === 'disconnected' && serverPort) {
      console.log("Manual reconnect triggered.");
      // Clear any pending automatic reconnect timeout
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
      reconnectAttempts.current = 0; // Reset the backoff delay
      connectWebSocket(serverPort); // Attempt to connect immediately
    }
  }, [wsStatus, serverPort, connectWebSocket]);

  const handleToggleActive = async (monitorId: string, isActive: boolean) => {
    const originalMonitors = [...monitors];
    // Optimistic UI update
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, isActive } : m));
    setUpdatingMonitorId(monitorId);

    try {
      await toggleAutoBrightness(monitorId, isActive);
    } catch (error) {
      console.error(`Failed to toggle monitor ${monitorId}:`, error);
      // Revert on failure
      setMonitors(originalMonitors);
      // Here you might want to show a toast notification
    } finally {
      setUpdatingMonitorId(null);
    }
  };

  const handleOpenSettings = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
  };

  const handleCloseSettings = () => {
    setSelectedMonitor(null);
  };

  const handleSaveSettings = async (monitorId: string, settings: MonitorSettings, deviceId: string) => {
    // This function will now propagate errors to the modal
    await updateMonitorSettings(monitorId, settings, deviceId);

    // Update local state on success
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, settings, deviceId } : m));
    handleCloseSettings();
  };
  
  const DemoModeBanner = () => (
    <div className="container mx-auto px-4 md:px-6 pt-4">
        <div 
          className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-200 text-sm rounded-lg p-4 text-center"
        >
          <strong>Demo Mode:</strong> Could not connect to the backend server. You are viewing static demo data to showcase the user experience.
        </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingIcon className="w-12 h-12 text-primary"/>
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
            isUpdating={updatingMonitorId === monitor.id}
            onToggleActive={handleToggleActive}
            onOpenSettings={handleOpenSettings}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header wsStatus={wsStatus} onReconnectClick={handleManualReconnect} />
      {isDemoMode && <DemoModeBanner />}
      <main className="container mx-auto p-4 md:p-6">
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
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