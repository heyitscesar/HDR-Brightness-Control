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
  id: string;
  name: string;
  monitorianName: string; // The name/ID used by Monitorian.exe
  isActive: boolean;
  currentScreenBrightness: number;
  targetMonitorBrightness: number;
  settings: MonitorSettings;
  error?: string | null;
}
