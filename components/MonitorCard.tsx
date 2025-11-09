import React from 'react';
import { Monitor } from '../types';
import Toggle from './Toggle';
import { SettingsIcon } from './icons/SettingsIcon';
import { MonitorIcon } from './icons/MonitorIcon';

interface MonitorCardProps {
  monitor: Monitor;
  onToggleActive: (monitorId: string, isActive: boolean) => void;
  onOpenSettings: (monitor: Monitor) => void;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ monitor, onToggleActive, onOpenSettings }) => {
  const { id, name, isActive, currentScreenBrightness, targetMonitorBrightness, error } = monitor;
  const cardGlowClass = isActive ? 'shadow-lg shadow-primary/20 ring-2 ring-primary' : 'ring-1 ring-gray-700';

  const BrightnessBar: React.FC<{ value: number, label: string }> = ({ value, label }) => (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-800 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 ${cardGlowClass}`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <MonitorIcon className="w-6 h-6 text-gray-400"/>
             <h2 className="text-lg font-semibold text-white truncate">{name}</h2>
          </div>
          <button 
            onClick={() => onOpenSettings(monitor)} 
            className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-focus transition-colors"
            aria-label={`Settings for ${name}`}
          >
            <SettingsIcon className="w-5 h-5 text-gray-400"/>
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-6 font-mono break-all">{id}</p>
        
        {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-300 text-xs rounded-md p-3 mb-4">
                <p className="font-bold mb-1">An error occurred:</p>
                <p>{error}</p>
            </div>
        )}

        <div className="space-y-4 mb-6">
            <BrightnessBar value={currentScreenBrightness} label="Detected Screen Brightness" />
            <BrightnessBar value={targetMonitorBrightness} label="Applied Monitor Brightness" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 border-t border-gray-700 pt-4">
        <span className="font-medium text-sm">Auto-Brightness</span>
        <Toggle 
          enabled={isActive} 
          onChange={(enabled) => onToggleActive(id, enabled)}
        />
      </div>
    </div>
  );
};

export default MonitorCard;
