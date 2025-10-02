'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { TypeSelectionDialog } from './TypeSelectionDialog';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';
import { TypeOption } from '@/lib/types/testData';
import { v4 as uuidv4 } from 'uuid';
import type { FieldDefinition, FieldOptionValue, FieldOptions } from '@/lib/data-generator/types';
import { listSchemas, saveSchema as persistSchema, deleteSchema as removeSchema } from '@/lib/data-generator/schemaStorage';
import { SCHEMA_TEMPLATES } from '@/lib/data-generator/templates';

interface SchemaBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}

export function SchemaBuilder({ fields, onChange }: SchemaBuilderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [savedSchemas, setSavedSchemas] = useState(() => listSchemas());
  const [schemaName, setSchemaName] = useState('');
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setSavedSchemas(listSchemas());
  }, []);

  useEffect(() => {
    const errors: Record<string, string[]> = {};
    fields.forEach((field, index) => {
      const validation = validateField(field, index, fields);
      if (validation.length > 0) {
        errors[field.id] = validation;
      }
    });
    setFieldErrors(errors);
  }, [fields]);

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

  const makeUniqueFieldName = (baseName: string, existingNames: Set<string>) => {
    let candidate = baseName;
    let counter = 1;
    while (existingNames.has(candidate)) {
      candidate = `${baseName}_${counter++}`;
    }
    existingNames.add(candidate);
    return candidate;
  };

  const handleDuplicateField = (index: number) => {
    const source = fields[index];
    if (!source) return;
    const existingNames = new Set(fields.map((field) => field.name));
    const baseName = source.name ? `${source.name}_copy` : `field_${fields.length + 1}`;
    const duplicateName = makeUniqueFieldName(baseName, existingNames);
    const duplicatedField: FieldDefinition = {
      ...source,
      id: uuidv4(),
      name: duplicateName,
      options: { ...source.options },
    };
    const newFields = [...fields];
    newFields.splice(index + 1, 0, duplicatedField);
    onChange(newFields);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) {
      return;
    }
    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);
    onChange(newFields);
  };

  const handleSaveSchema = () => {
    if (!schemaName.trim()) {
      setSaveError('Please provide a name before saving.');
      return;
    }
    const payloadName = schemaName.trim();
    persistSchema({
      name: payloadName,
      fields,
      id: savedSchemas.find((schema) => schema.name === payloadName)?.id,
    });
    setSavedSchemas(listSchemas());
    setSaveError(null);
  };

  const handleLoadSchema = (schemaId: string) => {
    setSelectedSchemaId(schemaId);
    const schema = savedSchemas.find((entry) => entry.id === schemaId);
    if (!schema) return;
    const restoredFields = schema.fields.map((field) => ({
      ...field,
      id: uuidv4(),
    }));
    onChange(restoredFields);
    setSchemaName(schema.name);
  };

  const handleDeleteSchema = (schemaId: string) => {
    removeSchema(schemaId);
    const next = listSchemas();
    setSavedSchemas(next);
    if (selectedSchemaId === schemaId) {
      setSelectedSchemaId('');
    }
  };

  const getFieldErrors = (fieldId: string) => fieldErrors[fieldId] ?? [];

  const validateField = (field: FieldDefinition, index: number, allFields: FieldDefinition[]): string[] => {
    const errors: string[] = [];
    const { type, options } = field;

    const parseNumber = (value: FieldOptionValue) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    if (type === 'Number' || type === 'Decimal Number' || type === 'Car Model Year') {
      const min = parseNumber(options.min);
      const max = parseNumber(options.max);

      if (options.min !== undefined && min === null) {
        errors.push('Min value must be a number.');
      }
      if (options.max !== undefined && max === null) {
        errors.push('Max value must be a number.');
      }
      if (min !== null && max !== null && min > max) {
        errors.push('Min value cannot exceed Max value.');
      }

      if (type === 'Decimal Number') {
        const multipleOf = parseNumber(options.multipleOf);
        if (multipleOf !== null && multipleOf <= 0) {
          errors.push('Multiple Of must be greater than 0.');
        }
      }
    }

    if (type === 'Character Sequence') {
      const length = parseNumber(options.length);
      if (length !== null && length <= 0) {
        errors.push('Length must be greater than 0.');
      }
    }

    const parseDate = (value: FieldOptionValue) => {
      if (typeof value === 'string' && value.trim() !== '') {
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? null : date;
      }
      return null;
    };

    if (type === 'Date' || type === 'Future Date' || type === 'Past Date') {
      const from = parseDate(options.fromDate);
      const to = parseDate(options.toDate);

      if (options.fromDate && from === null) {
        errors.push('From date is invalid.');
      }
      if (options.toDate && to === null) {
        errors.push('To date is invalid.');
      }
      if (from && to && from > to) {
        errors.push('From date cannot be after To date.');
      }
    }

    if (type === 'Date of Birth') {
      const minAge = parseNumber(options.minAge);
      const maxAge = parseNumber(options.maxAge);

      if (options.minAge !== undefined && minAge === null) {
        errors.push('Min Age must be a number.');
      }
      if (options.maxAge !== undefined && maxAge === null) {
        errors.push('Max Age must be a number.');
      }
      if (minAge !== null && maxAge !== null && minAge > maxAge) {
        errors.push('Min Age cannot exceed Max Age.');
      }
    }

    if (type === 'Custom List') {
      const raw = typeof options.values === 'string' ? options.values.trim() : '';
      if (!raw) {
        errors.push('Provide at least one value.');
      } else {
        const entries = raw.split(',').map((entry) => entry.trim()).filter(Boolean);
        if (entries.length === 0) {
          errors.push('Provide at least one value.');
        }
      }
    }

    if (type === 'Phone Number') {
      const format = typeof options.format === 'string' ? options.format.trim() : '';
      if (format && !format.includes('#')) {
        errors.push('Custom phone formats must include # placeholders.');
      }
    }

    if (type === 'Reference') {
      const sourceField = typeof options.sourceField === 'string' ? options.sourceField : '';
      if (!sourceField) {
        errors.push('Select a source field to reference.');
      } else {
        const sourceExists = allFields.some((candidate, candidateIndex) => candidateIndex !== index && candidate.name === sourceField);
        if (!sourceExists) {
          errors.push(`Source field "${sourceField}" not found.`);
        }
      }
    }

    return errors;
  };

  const renderReferenceOptions = (field: FieldDefinition, index: number) => {
    const availableFields = fields.filter((candidate, candidateIndex) => candidateIndex !== index && candidate.name);
    const sourceField = typeof field.options.sourceField === 'string' ? field.options.sourceField : '';
    const errors = getFieldErrors(field.id);

    if (availableFields.length === 0) {
      return (
        <div className="py-1 text-xs text-slate-400">
          Add another field first, then select it as a reference.
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-1 py-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">Source field:</span>
          <select
            value={sourceField}
            onChange={(e) => handleOptionChange(index, 'sourceField', e.target.value)}
            className={`bg-slate-800 px-2 py-1 text-sm rounded-lg border ${errors.length ? 'border-red-500' : 'border-slate-700'} text-white`}
          >
            <option value="">Select field…</option>
            {availableFields.map((candidate) => (
              <option key={candidate.id} value={candidate.name}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
        {errors.length > 0 && (
          <ul className="text-xs text-red-400 space-y-0.5">
            {errors.map((message, idx) => (
              <li key={`${field.id}-reference-${idx}`}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const hasSchemas = useMemo(() => savedSchemas.length > 0, [savedSchemas.length]);

  const handleApplyTemplate = () => {
    if (!selectedTemplateKey) return;
    const template = SCHEMA_TEMPLATES.find((entry) => entry.key === selectedTemplateKey);
    if (!template) return;

    const existingNames = new Set(fields.map((field) => field.name));
    const templateFields: FieldDefinition[] = template.fields.map((templateField) => ({
      id: uuidv4(),
      name: makeUniqueFieldName(templateField.name, existingNames),
      type: templateField.type,
      options: { ...templateField.options },
    }));

    onChange([...fields, ...templateFields]);
    setSelectedTemplateKey('');
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

    if (typeName === 'Reference') {
      defaultOptions.sourceField = '';
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

    if (type === 'Reference') {
      return renderReferenceOptions(field, index);
    }

    const typeDefinition = fakerTypeDefinitions[type];
    if (!typeDefinition || !typeDefinition.options || typeDefinition.options.length === 0) {
      return null;
    }

    const errors = fieldErrors[field.id] ?? [];
    const hasError = errors.length > 0;
    const baseInputClass = hasError ? 'bg-slate-800 border border-red-500 text-white rounded-lg px-2 py-1 text-sm' : 'bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-sm';

    return (
      <div className="flex flex-col space-y-1 py-1">
        <div className="flex flex-nowrap items-center space-x-2 overflow-x-auto">
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
                        className={`w-16 ${baseInputClass}`}
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
                        className={`w-16 ${baseInputClass}`}
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
                        className={`w-20 ${baseInputClass}`}
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
                      className={`w-28 ${baseInputClass}`}
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
                      className={`bg-slate-800 px-2 py-1 text-sm rounded-lg border ${hasError ? 'border-red-500' : 'border-slate-700'} text-white`}
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

          {(type === 'Datetime' || type.includes('Date')) &&
            (!typeDefinition || !typeDefinition.options.some(opt => opt.name === 'fromDate' || opt.name === 'toDate')) && (
              <>
                <div className="flex items-center shrink-0">
                  <span className="text-xs text-slate-300 mr-1">from:</span>
                  <input
                    type="text"
                    value={options.fromDate ?? '01/01/2022'}
                    onChange={(e) => handleOptionChange(index, 'fromDate', e.target.value)}
                    className={`w-24 ${baseInputClass}`}
                  />
                </div>
                <div className="flex items-center shrink-0">
                  <span className="text-xs text-slate-300 mr-1">to:</span>
                  <input
                    type="text"
                    value={options.toDate ?? '12/31/2022'}
                    onChange={(e) => handleOptionChange(index, 'toDate', e.target.value)}
                    className={`w-24 ${baseInputClass}`}
                  />
                </div>
                <div className="flex items-center shrink-0">
                  <span className="text-xs text-slate-300 mr-1">format:</span>
                  <select
                    value={options.format ?? 'ISO'}
                    onChange={(e) => handleOptionChange(index, 'format', e.target.value)}
                    className={`bg-slate-800 px-2 py-1 text-sm rounded-lg border ${hasError ? 'border-red-500' : 'border-slate-700'} text-white`}
                  >
                    <option value="ISO">ISO 8601 (UTC)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </>
            )}

          {type === 'Custom List' && (
            <div className="flex flex-col space-y-1">
              <div className="flex items-center shrink-0">
                <span className="text-xs text-slate-300 mr-1">values:</span>
                <input
                  type="text"
                  value={options.values ?? ''}
                  onChange={(e) => handleOptionChange(index, 'values', e.target.value)}
                  placeholder="apple, banana, cherry"
                  className={`w-48 ${baseInputClass}`}
                />
              </div>
              {errors.length > 0 && (
                <ul className="text-xs text-red-400 space-y-0.5">
                  {errors.map((message, idx) => (
                    <li key={`${field.id}-custom-${idx}`}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {hasError && type !== 'Custom List' && (
          <ul className="text-xs text-red-400 space-y-0.5">
            {errors.map((message, idx) => (
              <li key={`${field.id}-error-${idx}`}>{message}</li>
            ))}
          </ul>
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
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleMoveField(index, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded-lg transition-colors ${
                          index === 0
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                        }`}
                        aria-label="Move field up"
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        className={`p-1 rounded-lg transition-colors ${
                          index === fields.length - 1
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                        }`}
                        aria-label="Move field down"
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDuplicateField(index)}
                        className="p-1 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                        aria-label="Duplicate field"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveField(index)}
                        className="p-1 rounded-lg hover:bg-slate-600 text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Remove field"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddField}
            className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Another Field
          </button>
          <div className="flex items-center gap-2">
            <select
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
            >
              <option value="">Add Template…</option>
              {SCHEMA_TEMPLATES.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplateKey}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedTemplateKey
                  ? 'border-slate-500 text-slate-200 hover:bg-slate-600/40'
                  : 'border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Apply Template
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              placeholder="Schema name"
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleSaveSchema}
              className="px-3 py-1.5 text-sm rounded-lg border border-blue-500 text-blue-200 hover:bg-blue-600/20 transition-colors"
            >
              Save Schema
            </button>
          </div>
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-300" htmlFor="saved-schema-select">
            Saved Schemas
          </label>
          <select
            id="saved-schema-select"
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
            value={selectedSchemaId}
            onChange={(e) => handleLoadSchema(e.target.value)}
            disabled={!hasSchemas}
          >
            <option value="" disabled={!hasSchemas}>
              {hasSchemas ? 'Select schema to load' : 'No schemas saved yet'}
            </option>
            {savedSchemas.map((schema) => (
              <option key={schema.id} value={schema.id}>
                {schema.name}
              </option>
            ))}
          </select>
          {selectedSchemaId && (
            <button
              onClick={() => handleDeleteSchema(selectedSchemaId)}
              className="px-2 py-1 rounded-lg text-xs text-red-300 border border-red-500 hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      
      <TypeSelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelectType={handleTypeChange}
      />
    </div>
  );
} 
