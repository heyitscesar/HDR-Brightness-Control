import React, { useState, useCallback } from 'react';
import { Monitor, MonitorSettings } from '../../types';
import { getDDCIDevices } from '../../services/monitorService';
import Slider from '../ui/Slider';
import Toggle from '../ui/Toggle';

interface SettingsModalProps {
  monitor: Monitor;
  onClose: () => void;
  onSave: (monitorId: string, settings: MonitorSettings, deviceId: string) => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ monitor, onClose, onSave }) => {
  const [settings, setSettings] = useState<MonitorSettings>(monitor.settings);
  const [deviceId, setDeviceId] = useState<string>(monitor.deviceId);
  const [detectedDevices, setDetectedDevices] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleDetectDevices = async () => {
      setIsDetecting(true);
      setDetectionError(null);
      try {
          const { tool, devices } = await getDDCIDevices();
          if (tool === 'error') throw new Error('Backend failed to fetch devices.');
          setDetectedDevices(devices);
          setActiveTool(tool);
      } catch (error) {
          console.error(error);
          setDetectionError('Failed to detect devices. Is the DDC/CI utility running correctly on the server?');
      } finally {
          setIsDetecting(false);
      }
  };

  const handleSettingChange = useCallback((key: keyof MonitorSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(monitor.id, settings, deviceId);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          <div>
            <label className="font-medium text-gray-200">DDC/CI Device ID</label>
            <p className="text-sm text-gray-400 mb-3">The ID used by the backend DDC/CI tool to control this monitor. Use 'Detect' if unsure.</p>
            <div className="flex gap-2">
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSaving}
              >
                <option value={deviceId}>{deviceId}</option>
                {detectedDevices.filter(d => d !== deviceId).map(device => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
              <button
                onClick={handleDetectDevices}
                disabled={isDetecting || isSaving}
                className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {isDetecting ? 'Detecting...' : 'Detect'}
              </button>
            </div>
            {activeTool && <p className="text-xs text-green-400 mt-2">Detection using: <strong>{activeTool}</strong></p>}
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
            disabled={isSaving}
          />
          <Slider
            label="Brightness Threshold (%)"
            description="Minimum change in brightness required to trigger an adjustment."
            value={settings.brightnessThreshold}
            min={0}
            max={10}
            step={0.5}
            onChange={(val) => handleSettingChange('brightnessThreshold', val)}
            disabled={isSaving}
          />
          <Slider
            label="Minimum Brightness (%)"
            description="The lowest brightness level the monitor will be set to."
            value={settings.minBrightness}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('minBrightness', val)}
            disabled={isSaving}
          />
          <Slider
            label="Maximum Brightness (%)"
            description="The highest brightness level the monitor will be set to."
            value={settings.maxBrightness}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('maxBrightness', val)}
            disabled={isSaving}
          />
          <Slider
            label="Algorithm Min Threshold"
            description="Base value for the brightness calculation."
            value={settings.minThreshold}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('minThreshold', val)}
            disabled={isSaving}
          />
          <Slider
            label="Algorithm Multiplier"
            description="Multiplier for the brightness calculation. Adjusts sensitivity."
            value={settings.thresholdMultiplier}
            min={0.1}
            max={2.0}
            step={0.01}
            onChange={(val) => handleSettingChange('thresholdMultiplier', val)}
            disabled={isSaving}
          />
          <div className="flex items-center justify-between">
              <div>
                  <label className="font-medium text-gray-200">Debug Mode</label>
                  <p className="text-sm text-gray-400">Save debug images of screen captures.</p>
              </div>
              <Toggle enabled={settings.debug} onChange={(val) => handleSettingChange('debug', val)} disabled={isSaving} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 p-6 border-t border-gray-700 bg-gray-800">
            {saveError && <p className="w-full text-center text-sm text-red-400">{saveError}</p>}
            <div className="flex justify-end gap-4">
                <button
                    onClick={onClose}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;