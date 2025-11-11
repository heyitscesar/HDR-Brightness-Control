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
  const hasConnectedOnce = useRef(false);
  
  const connectWebSocket = useCallback((port: number) => {
    if (!port || isUnmounted.current) return;

    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    ws.current = new WebSocket(`ws://localhost:${port}`);
    setWsStatus('connecting');

    ws.current.onopen = async () => {
      setWsStatus('connected');
      reconnectAttempts.current = 0; // Reset on successful connection

      if (hasConnectedOnce.current) {
        // This is a RECONNECTION. Re-fetch the full monitor state to ensure consistency.
        console.log("WebSocket reconnected. Re-fetching monitor state.");
        try {
          const data = await getMonitors();
          if (!isUnmounted.current) {
            setMonitors(data);
            setIsDemoMode(false); // Ensure we are out of demo mode
          }
        } catch (err) {
          console.error("Failed to re-fetch monitors after reconnect:", err);
          if (!isUnmounted.current) {
            setIsDemoMode(true);
            setMonitors(getDemoData());
          }
        }
      } else {
        hasConnectedOnce.current = true;
      }
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
        hasConnectedOnce.current = true; // Any close after the first attempt is a disconnect
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

  const initializeConnection = useCallback(async (isManualRetry = false) => {
    if (isUnmounted.current) return;

    setLoading(true);
    setIsDemoMode(false);
    // Clear any pending automatic reconnects since we're starting a new handshake.
    if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
    }
    reconnectAttempts.current = 0;
    hasConnectedOnce.current = false;


    try {
      const serverInfo = await getServerInfo(isManualRetry);
      setServerPort(serverInfo.wsPort);
      
      const data = await getMonitors();
      if (isUnmounted.current) return;
      
      setMonitors(data);
      connectWebSocket(serverInfo.wsPort);

    } catch (err) {
      if (isUnmounted.current) return;
      console.warn("Failed to initialize connection:", err);
      setIsDemoMode(true);
      setMonitors(getDemoData());
    } finally {
      if (!isUnmounted.current) {
        setLoading(false);
      }
    }
  }, [connectWebSocket]);

  // Effect to handle the initial connection
  useEffect(() => {
    isUnmounted.current = false;
    initializeConnection();

    return () => {
      isUnmounted.current = true;
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnection logic on deliberate close
        ws.current.close();
      }
    };
  }, [initializeConnection]);
  
  const handleManualReconnect = useCallback(() => {
    // If we're disconnected, a manual trigger should always attempt a full handshake.
    // This correctly handles switching from Demo Mode to Live Mode and ensures data is fresh.
    if (wsStatus === 'disconnected') {
      console.log("Manual reconnect triggered: starting full connection handshake.");
      initializeConnection(true);
    }
  }, [wsStatus, initializeConnection]);

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
    setMonitors(monitors.map(m => m.id === monitorId ? { ...m, settings, deviceId, error: null } : m));
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