import { Monitor } from '../types';

/**
 * Provides a set of mock monitors to display when the backend is unavailable.
 * This showcases the UI's functionality in "Demo Mode".
 */
export const getDemoData = (): Monitor[] => {
  const defaultSettings = {
    brightnessThreshold: 1,
    minBrightness: 10,
    maxBrightness: 90,
    pollInterval: 1000,
    minThreshold: 33,
    thresholdMultiplier: 0.33,
    debug: false,
  };

  return [
    {
      id: 'demo-display-1',
      name: 'Demo Monitor 1 (LG UltraFine)',
      deviceId: '1',
      isActive: true,
      currentScreenBrightness: 68,
      targetMonitorBrightness: 75,
      settings: { ...defaultSettings },
      isDemo: true,
    },
    {
      id: 'demo-display-2',
      name: 'Demo Monitor 2 (Dell)',
      deviceId: '2',
      isActive: false,
      currentScreenBrightness: 45,
      targetMonitorBrightness: 0,
      settings: { ...defaultSettings, pollInterval: 1500, minBrightness: 20 },
      isDemo: true,
    },
     {
      id: 'demo-display-3',
      name: 'Demo Monitor 3 (Error State)',
      deviceId: '3',
      isActive: false,
      currentScreenBrightness: 0,
      targetMonitorBrightness: 0,
      settings: { ...defaultSettings },
      error: 'This is an example error message displayed on the card.',
      isDemo: true,
    }
  ];
};