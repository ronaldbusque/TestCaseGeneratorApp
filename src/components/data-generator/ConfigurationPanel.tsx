import { useState, useEffect, ChangeEvent } from 'react';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';
import { TypeOption } from '@/lib/types/testData';

// Simple UI components for the configuration panel
interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const Slider = ({ min, max, value, onChange, className }: SliderProps) => (
  <input
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={(e) => onChange(parseInt(e.target.value))}
    className={`w-full ${className || ''}`}
  />
);

interface InputProps {
  type: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: number;
  max?: number;
}

const Input = ({ type, value, onChange, className, min, max }: InputProps) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    className={`px-3 py-1.5 rounded-lg ${className || ''}`}
    min={min}
    max={max}
  />
);

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch = ({ label, checked, onChange }: ToggleSwitchProps) => (
  <div className="flex items-center">
    <label className="inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      <span className="ms-3 text-sm font-medium text-gray-300">{label}</span>
    </label>
  </div>
);

interface ConfigurationPanelProps {
  selectedTypes: string[];
  configOptions: {
    rowCount: number;
    typeConfigs: Record<string, any>;
  };
  onUpdateConfig: (config: any) => void;
}

export function ConfigurationPanel({ 
  selectedTypes, 
  configOptions, 
  onUpdateConfig 
}: ConfigurationPanelProps) {
  const [rowCount, setRowCount] = useState(configOptions.rowCount || 10);
  
  // Update row count when external configOptions change
  useEffect(() => {
    setRowCount(configOptions.rowCount || 10);
  }, [configOptions.rowCount]);
  
  // Handle row count change
  const handleRowCountChange = (value: number) => {
    setRowCount(value);
    onUpdateConfig({
      ...configOptions,
      rowCount: value
    });
  };
  
  // Update type-specific configuration
  const updateTypeConfig = (typeName: string, config: any) => {
    onUpdateConfig({
      ...configOptions,
      typeConfigs: {
        ...configOptions.typeConfigs,
        [typeName]: {
          ...configOptions.typeConfigs?.[typeName],
          ...config
        }
      }
    });
  };
  
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Configuration</h2>
      
      {/* Row Count Configuration */}
      <div className="mb-6">
        <label className="block text-blue-100 mb-2">Number of rows to generate</label>
        <div className="flex items-center space-x-4">
          <Slider
            min={1}
            max={1000}
            value={rowCount}
            onChange={handleRowCountChange}
            className="flex-grow"
          />
          <Input
            type="number"
            value={rowCount}
            onChange={(e) => handleRowCountChange(parseInt(e.target.value) || 1)}
            className="w-20 bg-slate-900/80 border border-white/10 text-white"
            min={1}
            max={1000}
          />
        </div>
      </div>
      
      {/* Type-specific configurations */}
      {selectedTypes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Type Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedTypes.map(typeName => {
              const typeDefinition = fakerTypeDefinitions[typeName];
              if (!typeDefinition || !typeDefinition.options || typeDefinition.options.length === 0) {
                return null;
              }
              
              const typeConfig = configOptions.typeConfigs?.[typeName] || {};
              
              return (
                <div key={typeName} className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-100 mb-2">{typeName}</h4>
                  
                  {typeDefinition.options.map((option: TypeOption) => {
                    // Render different input types based on option type
                    switch(option.type) {
                      case 'boolean':
                        return (
                          <div key={option.name} className="mb-2">
                            <ToggleSwitch
                              label={option.label}
                              checked={typeConfig[option.name] ?? option.default ?? false}
                              onChange={(checked) => updateTypeConfig(typeName, {[option.name]: checked})}
                            />
                          </div>
                        );
                      case 'number':
                        return (
                          <div key={option.name} className="mb-2">
                            <label className="block text-sm text-gray-300 mb-1">{option.label}</label>
                            <Input
                              type="number"
                              value={typeConfig[option.name] ?? option.default ?? ''}
                              min={option.min}
                              max={option.max}
                              onChange={(e) => updateTypeConfig(typeName, {
                                [option.name]: e.target.value === '' ? null : Number(e.target.value)
                              })}
                              className="w-full bg-slate-900/60 border border-white/10 text-white"
                            />
                          </div>
                        );
                      case 'text':
                        return (
                          <div key={option.name} className="mb-2">
                            <label className="block text-sm text-gray-300 mb-1">{option.label}</label>
                            <Input
                              type="text"
                              value={typeConfig[option.name] ?? option.default ?? ''}
                              onChange={(e) => updateTypeConfig(typeName, {[option.name]: e.target.value})}
                              className="w-full bg-slate-900/60 border border-white/10 text-white"
                            />
                          </div>
                        );
                      case 'select':
                        return (
                          <div key={option.name} className="mb-2">
                            <label className="block text-sm text-gray-300 mb-1">{option.label}</label>
                            <select
                              value={typeConfig[option.name] ?? option.default ?? ''}
                              onChange={(e) => updateTypeConfig(typeName, {[option.name]: e.target.value})}
                              className="w-full bg-slate-900/60 border border-white/10 text-white rounded-lg px-3 py-2"
                            >
                              {option.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 