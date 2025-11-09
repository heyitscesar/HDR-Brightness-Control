export interface MonitorSettings {
  brightnessThreshold: number;
  minBrightness: number;
  maxBrightness: number;
  pollInterval: number;
  minThreshold: number;
  thresholdMultiplier: number;
  debug: boolean;
}

export interface Monitor {
  id: string; // Internal ID from screenshot-desktop
  name: string;
  deviceId: string; // The ID used by the active DDC/CI tool (Monitorian, ControlMyMonitor, etc.)
  isActive: boolean;
  currentScreenBrightness: number;
  targetMonitorBrightness: number;
  settings: MonitorSettings;
  error?: string | null;
  isDemo?: boolean; // Flag to identify demo data
}