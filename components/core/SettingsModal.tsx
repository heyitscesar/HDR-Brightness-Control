import React, { useState, useCallback } from 'react';
import { Monitor, MonitorSettings } from '../../types';
import { getDDCIDevices } from '../../services/monitorService';
import Slider from '../ui/Slider';
import Toggle from '../ui/Toggle';
import { useI18n } from '../../hooks/useI18n';

interface SettingsModalProps {
  monitor: Monitor;
  onClose: () => void;
  onSave: (monitorId: string, settings: MonitorSettings, deviceId: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ monitor, onClose, onSave }) => {
  const [settings, setSettings] = useState<MonitorSettings>(monitor.settings);
  const [deviceId, setDeviceId] = useState<string>(monitor.deviceId);
  const [detectedDevices, setDetectedDevices] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const { t } = useI18n();

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
          setDetectionError(t('settings.deviceId.error'));
      } finally {
          setIsDetecting(false);
      }
  };

  const handleSettingChange = useCallback((key: keyof MonitorSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    onSave(monitor.id, settings, deviceId);
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
            <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
            <p className="text-sm text-gray-400 mt-1 truncate">{monitor.name}</p>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <label className="font-medium text-gray-200">{t('settings.deviceId.label')}</label>
            <p className="text-sm text-gray-400 mb-3">{t('settings.deviceId.description')}</p>
            <div className="flex gap-2">
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={deviceId}>{deviceId}</option>
                {detectedDevices.filter(d => d !== deviceId).map(device => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
              <button
                onClick={handleDetectDevices}
                disabled={isDetecting}
                className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {isDetecting ? t('settings.deviceId.detecting') : t('settings.deviceId.detect')}
              </button>
            </div>
            {activeTool && <p className="text-xs text-green-400 mt-2" dangerouslySetInnerHTML={{ __html: t('settings.deviceId.detectedWith', { tool: activeTool }) }}></p>}
            {detectionError && <p className="text-xs text-red-400 mt-2">{detectionError}</p>}
          </div>

          <Slider
            label={t('settings.pollInterval.label')}
            description={t('settings.pollInterval.description')}
            value={settings.pollInterval}
            min={50}
            max={5000}
            step={50}
            onChange={(val) => handleSettingChange('pollInterval', val)}
          />
          <Slider
            label={t('settings.brightnessThreshold.label')}
            description={t('settings.brightnessThreshold.description')}
            value={settings.brightnessThreshold}
            min={0}
            max={10}
            step={0.5}
            onChange={(val) => handleSettingChange('brightnessThreshold', val)}
          />
          <Slider
            label={t('settings.minBrightness.label')}
            description={t('settings.minBrightness.description')}
            value={settings.minBrightness}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('minBrightness', val)}
          />
          <Slider
            label={t('settings.maxBrightness.label')}
            description={t('settings.maxBrightness.description')}
            value={settings.maxBrightness}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('maxBrightness', val)}
          />
          <Slider
            label={t('settings.minThreshold.label')}
            description={t('settings.minThreshold.description')}
            value={settings.minThreshold}
            min={0}
            max={100}
            step={1}
            onChange={(val) => handleSettingChange('minThreshold', val)}
          />
          <Slider
            label={t('settings.thresholdMultiplier.label')}
            description={t('settings.thresholdMultiplier.description')}
            value={settings.thresholdMultiplier}
            min={0.1}
            max={2.0}
            step={0.01}
            onChange={(val) => handleSettingChange('thresholdMultiplier', val)}
          />
          <div className="flex items-center justify-between">
              <div>
                  <label className="font-medium text-gray-200">{t('settings.debug.label')}</label>
                  <p className="text-sm text-gray-400">{t('settings.debug.description')}</p>
              </div>
              <Toggle enabled={settings.debug} onChange={(val) => handleSettingChange('debug', val)} />
          </div>
        </div>

        <div className="flex justify-end gap-4 p-6 border-t border-gray-700 bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition-colors"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
