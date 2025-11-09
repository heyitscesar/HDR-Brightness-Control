import React, { useState, useCallback, useEffect } from 'react';
import { Monitor, MonitorSettings } from '../types';
import { getMonitorianDevices } from '../services/monitorService';
import Slider from './Slider';
import Toggle from './Toggle';

interface SettingsModalProps {
  monitor: Monitor;
  onClose: () => void;
  onSave: (monitorId: string, settings: MonitorSettings, monitorianName: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ monitor, onClose, onSave }) => {
  const [settings, setSettings] = useState<MonitorSettings>(monitor.settings);
  const [monitorianName, setMonitorianName] = useState<string>(monitor.monitorianName);
  const [detectedDevices, setDetectedDevices] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const handleDetectDevices = async () => {
      setIsDetecting(true);
      setDetectionError(null);
      try {
          const devices = await getMonitorianDevices();
          setDetectedDevices(devices);
      } catch (error) {
          console.error(error);
          setDetectionError('Failed to detect devices. Is Monitorian.exe running correctly on the server?');
      } finally {
          setIsDetecting(false);
      }
  };

  const handleSettingChange = useCallback((key: keyof MonitorSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    onSave(monitor.id, settings, monitorianName);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={stopPropagation}
      >
        <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Fine-Tune Settings</h2>
            <p className="text-sm text-gray-400 mt-1 truncate">{monitor.name}</p>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Monitorian Device ID Selector */}
          <div>
            <label className="font-medium text-gray-200">Monitorian Device ID</label>
            <p className="text-sm text-gray-400 mb-3">The ID used by Monitorian.exe to control this monitor. Use 'Detect' if unsure.</p>
            <div className="flex gap-2">
              <select
                value={monitorianName}
                onChange={(e) => setMonitorianName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={monitorianName}>{monitorianName}</option>
                {detectedDevices.filter(d => d !== monitorianName).map(device => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
              <button
                onClick={handleDetectDevices}
                disabled={isDetecting}
                className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {isDetecting ? 'Detecting...' : 'Detect'}
              </button>
            </div>
            {detectionError && <p className="text-xs text-red-400 mt-2">{detectionError}</p>}
          </div>

          <Slider
            label="Polling Interval (ms)"
            description="How often to check screen brightness. Lower is more responsive but uses more CPU."
            value={settings.pollInterval}
            min={50}
            max={5000}
            step={50}
            onChange={(val) => handleSettingChange('pollInterval', val)}
          />
          <Slider
            label="Brightness Threshold (%)"
            description="Minimum change in brightness required to trigger an adjustment."
            value={settings.brightnessThreshold}
            min={0}
            max={10}
            step={0.5}
            onChange={(val) => handleSettingChange('brightnessThreshold', val)}
          />
          <Slider
            label="Minimum Brightness (%)"
            description="The lowest brightness level the monitor will be set to."
            value={settings.minBrightness}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('minBrightness', val)}
          />
          <Slider
            label="Maximum Brightness (%)"
            description="The highest brightness level the monitor will be set to."
            value={settings.maxBrightness}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('maxBrightness', val)}
          />
          <Slider
            label="Algorithm Min Threshold"
            description="Base value for the brightness calculation."
            value={settings.minThreshold}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('minThreshold', val)}
          />
          <Slider
            label="Algorithm Multiplier"
            description="Multiplier for the brightness calculation. Adjusts sensitivity."
            value={settings.thresholdMultiplier}
            min={0.1}
            max={2.0}
            step={0.01}
            onChange={(val) => handleSettingChange('thresholdMultiplier', val)}
          />
          <div className="flex items-center justify-between">
              <div>
                  <label className="font-medium text-gray-200">Debug Mode</label>
                  <p className="text-sm text-gray-400">Save debug images of screen captures.</p>
              </div>
              <Toggle enabled={settings.debug} onChange={(val) => handleSettingChange('debug', val)} />
          </div>
        </div>

        <div className="flex justify-end gap-4 p-6 border-t border-gray-700 bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;