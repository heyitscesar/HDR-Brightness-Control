import React from 'react';

interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, description, value, min, max, step, onChange, disabled = false }) => {
  return (
    <div className={`${disabled ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="font-medium text-gray-200">{label}</label>
        <span className="text-sm font-mono bg-gray-700 text-white px-2 py-1 rounded">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary disabled:cursor-not-allowed"
        disabled={disabled}
      />
    </div>
  );
};

export default Slider;