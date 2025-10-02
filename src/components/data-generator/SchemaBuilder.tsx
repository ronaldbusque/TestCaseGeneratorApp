import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { TypeSelectionDialog } from './TypeSelectionDialog';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';
import { TypeOption } from '@/lib/types/testData';
import { v4 as uuidv4 } from 'uuid';
import type { FieldDefinition, FieldOptionValue, FieldOptions } from '@/lib/data-generator/types';

interface SchemaBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}

export function SchemaBuilder({ fields, onChange }: SchemaBuilderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  
  const handleAddField = () => {
    const newField: FieldDefinition = {
      id: uuidv4(),
      name: `field_${fields.length + 1}`,
      type: '',
      options: {},
    };
    onChange([...fields, newField]);
  };
  
  const handleRemoveField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    onChange(newFields);
  };
  
  const handleFieldNameChange = (index: number, name: string) => {
    const newFields = [...fields];
    newFields[index].name = name;
    onChange(newFields);
  };
  
  const handleTypeSelect = (index: number) => {
    setActiveFieldIndex(index);
    setIsDialogOpen(true);
  };
  
  const handleTypeChange = (typeName: string) => {
    if (activeFieldIndex === null) return;

    const newFields = [...fields];
    newFields[activeFieldIndex].type = typeName;

    // Initialize options with default values from the type definition
    const typeDefinition = fakerTypeDefinitions[typeName];
    const defaultOptions: FieldOptions = {};

    if (typeDefinition && typeDefinition.options) {
      typeDefinition.options.forEach(option => {
        if (option.default !== undefined) {
          defaultOptions[option.name] = option.default;
        }
      });
    }
    
    // Set the options with defaults
    newFields[activeFieldIndex].options = defaultOptions;
    onChange(newFields);
  };
  
  const handleOptionChange = (index: number, optionName: string, value: FieldOptionValue) => {
    const newFields = [...fields];
    newFields[index].options = {
      ...newFields[index].options,
      [optionName]: value,
    };
    onChange(newFields);
  };

  const resolveOptionValue = (value: FieldOptionValue | undefined): string | number => {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    return '';
  };

  // Render type-specific options
  const renderOptions = (field: FieldDefinition, index: number) => {
    const { type, options } = field;

    if (!type) return null;
    
    const typeDefinition = fakerTypeDefinitions[type];
    
    if (!typeDefinition || !typeDefinition.options || typeDefinition.options.length === 0) {
      return null;
    }
    
    return (
      <div className="flex flex-nowrap items-center space-x-2 overflow-x-auto py-1">
        {typeDefinition.options.map((option: TypeOption) => {
          switch (option.type) {
            case 'number':
              if (option.name === 'min' || option.name === 'max') {
                return (
                  <div key={option.name} className="flex items-center shrink-0">
                    <span className="text-xs text-slate-300 mr-1">{option.name}:</span>
                    <input
                      type="number"
                      value={resolveOptionValue(options?.[option.name] ?? option.default)}
                      onChange={(e) =>
                        handleOptionChange(
                          index,
                          option.name,
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-16 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
                      min={option.min}
                      max={option.max}
                    />
                  </div>
                );
              } else if (option.name === 'length') {
                return (
                  <div key={option.name} className="flex items-center shrink-0">
                    <span className="text-xs text-slate-300 mr-1">{option.label}:</span>
                    <input
                      type="number"
                      value={resolveOptionValue(options?.[option.name] ?? option.default)}
                      onChange={(e) =>
                        handleOptionChange(
                          index,
                          option.name,
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-16 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
                      min={option.min}
                      max={option.max}
                    />
                  </div>
                );
              } else if (option.name === 'decimals' || option.name === 'precision' || option.name === 'multipleOf') {
                return (
                  <div key={option.name} className="flex items-center shrink-0">
                    <span className="text-xs text-slate-300 mr-1">{option.label || option.name}:</span>
                    <input
                      type="number"
                      value={resolveOptionValue(options?.[option.name] ?? option.default)}
                      onChange={(e) =>
                        handleOptionChange(
                          index,
                          option.name,
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-20 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
                      min={option.min}
                      max={option.max}
                      step={field.type === 'Number' && option.name === 'multipleOf' ? 1 : option.name === 'multipleOf' ? 0.001 : 1}
                    />
                  </div>
                );
              }
              return null;
              
            case 'text':
              return (
                <div key={option.name} className="flex items-center shrink-0">
                  <span className="text-xs text-slate-300 mr-1">{option.label}:</span>
                  <input
                    type="text"
                    value={resolveOptionValue(options?.[option.name] ?? option.default)}
                    onChange={(e) => handleOptionChange(index, option.name, e.target.value)}
                    className="w-28 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
                  />
                </div>
              );
              
            case 'select':
              return (
                <div key={option.name} className="flex items-center shrink-0">
                  <span className="text-xs text-slate-300 mr-1">{option.label}:</span>
                  <select
                    value={resolveOptionValue(options?.[option.name] ?? option.default)}
                    onChange={(e) => handleOptionChange(index, option.name, e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
                  >
                    {option.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
              
            case 'boolean':
              return (
                <div key={option.name} className="flex items-center shrink-0">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={Boolean(options?.[option.name])}
                      onChange={(e) => handleOptionChange(index, option.name, e.target.checked)}
                      className="form-checkbox h-3 w-3 text-blue-600 bg-slate-800 border-slate-700 rounded"
                    />
                    <span className="ml-1 text-xs text-slate-300">{option.label}</span>
                  </label>
                </div>
              );
              
            default:
              return null;
          }
        })}
        
        {/* Special case for date range - only show if not already defined in type options */}
        {(type === 'Datetime' || type.includes('Date')) && 
         (!typeDefinition || !typeDefinition.options.some(opt => opt.name === 'fromDate' || opt.name === 'toDate')) && (
          <>
            <div className="flex items-center shrink-0">
              <span className="text-xs text-slate-300 mr-1">from:</span>
              <input
                type="text"
                value={options.fromDate ?? '01/01/2022'}
                onChange={(e) => handleOptionChange(index, 'fromDate', e.target.value)}
                className="w-24 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center shrink-0">
              <span className="text-xs text-slate-300 mr-1">to:</span>
              <input
                type="text"
                value={options.toDate ?? '12/31/2022'}
                onChange={(e) => handleOptionChange(index, 'toDate', e.target.value)}
                className="w-24 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center shrink-0">
              <span className="text-xs text-slate-300 mr-1">format:</span>
              <select
                value={options.format ?? 'ISO'}
                onChange={(e) => handleOptionChange(index, 'format', e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
              >
                <option value="ISO">ISO 8601 (UTC)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </>
        )}
        
        {/* Special case for custom list */}
        {type === 'Custom List' && (
          <div className="flex items-center shrink-0">
            <span className="text-xs text-slate-300 mr-1">values:</span>
            <input
              type="text"
              value={options.values ?? ''}
              onChange={(e) => handleOptionChange(index, 'values', e.target.value)}
              placeholder="comma-separated values"
              className="w-40 bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm"
            />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-3 py-2 text-left text-xs font-medium text-white w-1/5">Field Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-white w-1/5">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-white">Options</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b border-slate-700/50">
                <td className="px-3 py-2 flex items-center">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => handleFieldNameChange(index, e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
                    placeholder="Field name"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleTypeSelect(index)}
                    className="w-full flex justify-between items-center bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm transition-colors"
                  >
                    <span>{field.type || 'Select Type'}</span>
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </td>
                <td className="px-3 py-2">
                  {renderOptions(field, index)}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleRemoveField(index)}
                    className="p-1 rounded-lg hover:bg-slate-600 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3">
        <button
          onClick={handleAddField}
          className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Another Field
        </button>
      </div>
      
      <TypeSelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelectType={handleTypeChange}
      />
    </div>
  );
} 
