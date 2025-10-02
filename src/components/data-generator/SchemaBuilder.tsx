'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon, DocumentDuplicateIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { TypeSelectionDialog } from './TypeSelectionDialog';
import { TemplateSelectionDialog } from './TemplateSelectionDialog';
import { TypeOptionHint } from './TypeOptionHint';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';
import { TypeOption } from '@/lib/types/testData';
import type { FieldDefinition, FieldOptionValue, FieldOptions } from '@/lib/data-generator/types';
import { validateFieldDefinition } from '@/lib/data-generator/fieldValidation';
import {
  addBlankField,
  duplicateFieldAt,
  makeUniqueFieldName,
  moveField as moveFieldAction,
  removeFieldAt,
  withFreshIds,
} from '@/lib/data-generator/schemaActions';
import { collectReferenceIssues } from '@/lib/data-generator/referenceValidation';
import { useSchemaTemplates } from '@/lib/data-generator/useSchemaTemplates';
import { createHybridSchemaStore } from '@/lib/data-generator/schemaTemplateStore';
import type { SchemaTemplate } from '@/lib/data-generator/templates';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SchemaBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  onAddField?: () => void;
  onRemoveField?: (index: number) => void;
  onDuplicateField?: (index: number) => void;
  onMoveField?: (fromIndex: number, toIndex: number) => void;
  onFieldUpdate?: (index: number, patch: Partial<FieldDefinition>) => void;
  onFieldOptionsUpdate?: (index: number, optionsPatch: FieldOptions) => void;
  onReplaceAll?: (fields: FieldDefinition[]) => void;
}

export function SchemaBuilder({
  fields,
  onChange,
  onAddField,
  onRemoveField,
  onDuplicateField,
  onMoveField,
  onFieldUpdate,
  onFieldOptionsUpdate,
  onReplaceAll,
}: SchemaBuilderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [schemaName, setSchemaName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const enableRemoteTemplates = process.env.NEXT_PUBLIC_ENABLE_SCHEMA_SYNC === 'true';
  type SyncStatus = 'local' | 'remote' | 'fallback';
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(enableRemoteTemplates ? 'remote' : 'local');

  const handleRemoteFallback = useCallback(() => {
    setSyncStatus('fallback');
    console.info('[SchemaBuilder] Remote schema sync unavailable, using local storage.');
  }, []);

  useEffect(() => {
    if (enableRemoteTemplates) {
      setSyncStatus((previous) => (previous === 'fallback' ? previous : 'remote'));
    } else {
      setSyncStatus('local');
    }
  }, [enableRemoteTemplates]);

  const schemaStore = useMemo(
    () =>
      createHybridSchemaStore({
        enableRemote: enableRemoteTemplates,
        onFallback: handleRemoteFallback,
      }),
    [enableRemoteTemplates, handleRemoteFallback]
  );

  const {
    schemas,
    activeSchemaId,
    setActiveSchemaId,
    saveTemplate,
    deleteTemplate,
    clearTemplates,
    refreshTemplates,
    isLoading: templatesLoading,
    error: templatesError,
    activeSchema,
  } = useSchemaTemplates({ store: schemaStore });
  const referenceIssues = useMemo(() => collectReferenceIssues(fields), [fields]);

  useEffect(() => {
    if (activeSchema) {
      setSchemaName(activeSchema.name);
    }
  }, [activeSchema]);

  useEffect(() => {
    const errors: Record<string, string[]> = {};
    fields.forEach((field, index) => {
      const validation = validateFieldDefinition(field, index, fields);
      if (validation.length > 0) {
        errors[field.id] = validation;
      }
    });
    setFieldErrors(errors);
  }, [fields]);


  const handleAddField = () => {
    if (onAddField) {
      onAddField();
      return;
    }
    onChange(addBlankField(fields));
  };
  
  const handleRemoveField = (index: number) => {
    if (onRemoveField) {
      onRemoveField(index);
      return;
    }
    onChange(removeFieldAt(fields, index));
  };
  
  const handleFieldNameChange = (index: number, name: string) => {
    if (onFieldUpdate) {
      onFieldUpdate(index, { name });
      return;
    }
    const next = [...fields];
    next[index] = { ...next[index], name };
    onChange(next);
  };

  const handleDuplicateField = (index: number) => {
    if (onDuplicateField) {
      onDuplicateField(index);
      return;
    }
    onChange(duplicateFieldAt(fields, index));
  };

  const handleReorderFields = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= fields.length) {
      return;
    }
    if (onMoveField) {
      onMoveField(fromIndex, toIndex);
      return;
    }
    onChange(moveFieldAction(fields, fromIndex, toIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    handleReorderFields(oldIndex, newIndex);
  };

  const handleSaveSchema = async () => {
    if (!schemaName.trim()) {
      setSaveError('Please provide a name before saving.');
      return;
    }
    const payloadName = schemaName.trim();
    const existing = schemas.find((schema) => schema.name === payloadName);
    try {
      await saveTemplate({
        id: existing?.id,
        name: payloadName,
        fields,
      });
      setSchemaName(payloadName);
      setSaveError(null);
    } catch (error) {
      setSaveError('Failed to save schema. Please try again.');
    }
  };

  const handleLoadSchema = (schemaId: string) => {
    setActiveSchemaId(schemaId);
    const schema = schemas.find((entry) => entry.id === schemaId);
    if (!schema) return;
    const restored = withFreshIds(schema.fields);
    if (onReplaceAll) {
      onReplaceAll(restored);
    } else {
      onChange(restored);
    }
    setSchemaName(schema.name);
  };

  const handleDeleteSchema = async (schemaId: string) => {
    try {
      await deleteTemplate(schemaId);
      if (activeSchemaId === schemaId) {
        setSchemaName('');
      }
    } catch (error) {
      setSaveError('Failed to delete schema.');
    }
  };

  const handleClearSchemas = async () => {
    try {
      await clearTemplates();
      setSchemaName('');
    } catch (error) {
      setSaveError('Failed to clear schemas.');
    }
  };

  const getFieldErrors = (fieldId: string) => fieldErrors[fieldId] ?? [];

  const renderReferenceOptions = (field: FieldDefinition, index: number) => {
    const availableFields = fields.filter((candidate, candidateIndex) => candidateIndex !== index && candidate.name);
    const sourceField = typeof field.options.sourceField === 'string' ? field.options.sourceField : '';
    const errors = getFieldErrors(field.id);

    return (
      <div className="flex flex-col space-y-1 py-1">
        {availableFields.length === 0 ? (
          <TypeOptionHint title="No available fields" tone="warning">
            Add another field first, then select it as a reference.
          </TypeOptionHint>
        ) : (
          <>
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
          </>
        )}
      </div>
    );
  };

  const hasSchemas = useMemo(() => schemas.length > 0, [schemas.length]);

  const handleApplyTemplate = (template: SchemaTemplate) => {
    const accumulated: FieldDefinition[] = [];
    const templateFields: FieldDefinition[] = withFreshIds(template.fields).map((templateField) => {
      const uniqueName = makeUniqueFieldName(
        templateField.name || `field_${fields.length + accumulated.length + 1}`,
        [...fields, ...accumulated]
      );
      const nextField: FieldDefinition = {
        ...templateField,
        name: uniqueName,
      };
      accumulated.push(nextField);
      return nextField;
    });

    const nextFields = [...fields, ...templateFields];
    if (onReplaceAll) {
      onReplaceAll(nextFields);
    } else {
      onChange(nextFields);
    }
  };
  
  const handleTypeSelect = (index: number) => {
    setActiveFieldIndex(index);
    setIsDialogOpen(true);
  };
  
  const handleTypeChange = (typeName: string) => {
    if (activeFieldIndex === null) return;

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
    
    if (onFieldUpdate) {
      onFieldUpdate(activeFieldIndex, {
        type: typeName,
        options: defaultOptions,
      });
      return;
    }

    const next = [...fields];
    next[activeFieldIndex] = {
      ...next[activeFieldIndex],
      type: typeName,
      options: defaultOptions,
    };
    onChange(next);
  };
  
  const handleOptionChange = (index: number, optionName: string, value: FieldOptionValue) => {
    if (onFieldOptionsUpdate) {
      const patch = { [optionName]: value } as FieldOptions;
      onFieldOptionsUpdate(index, patch);
      return;
    }
    const next = [...fields];
    next[index] = {
      ...next[index],
      options: {
        ...next[index].options,
        [optionName]: value,
      },
    };
    onChange(next);
  };

  const renderTypeHint = (type: string, errors: string[]) => {
    if (type === 'Number' || type === 'Decimal Number' || type === 'Car Model Year') {
      return (
        <TypeOptionHint title="Number tips" tone={errors.length ? 'warning' : 'info'}>
          Ensure Min is less than or equal to Max. Leave fields blank to use defaults. <br />
          {type === 'Decimal Number' && 'Use Multiple Of to control precision (e.g., 0.01).'}
        </TypeOptionHint>
      );
    }

    if (type === 'Date' || type === 'Future Date' || type === 'Past Date' || type === 'Date of Birth') {
      return (
        <TypeOptionHint title="Date tips" tone={errors.length ? 'warning' : 'info'}>
          Dates accept ISO strings like 2024-06-01. When using ranges, From must be before To.
        </TypeOptionHint>
      );
    }

    if (type === 'Custom List') {
      return (
        <TypeOptionHint title="Custom list" tone={errors.length ? 'warning' : 'info'}>
          Provide comma-separated values. Empty values are ignored.
        </TypeOptionHint>
      );
    }

    if (type === 'Phone Number') {
      return (
        <TypeOptionHint title="Phone format" tone={errors.length ? 'warning' : 'info'}>
          Use # characters as digit placeholders (e.g., +1-###-###-####).
        </TypeOptionHint>
      );
    }

    return null;
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
    const hint = renderTypeHint(type, errors);

    return (
      <div className="flex flex-col space-y-2 py-1">
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
        {hint}
      </div>
    );
  };
  
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
            <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {fields.map((field, index) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    index={index}
                    renderOptions={renderOptions}
                    onFieldNameChange={handleFieldNameChange}
                    onTypeSelect={handleTypeSelect}
                    onDuplicateField={handleDuplicateField}
                    onRemoveField={handleRemoveField}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </div>
      </DndContext>
      
      <div className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddField}
            className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Another Field
          </button>
          <button
            onClick={() => setIsTemplateDialogOpen(true)}
            className="flex items-center px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-600/30 transition-colors"
          >
            Browse Templates
          </button>
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
          {templatesError && <span className="text-xs text-red-400">{templatesError}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-300" htmlFor="saved-schema-select">
              Saved Schemas
            </label>
            {enableRemoteTemplates && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  syncStatus === 'remote'
                    ? 'border-green-500 text-green-300'
                    : syncStatus === 'fallback'
                      ? 'border-amber-500 text-amber-300'
                      : 'border-slate-500 text-slate-300'
                }`}
              >
                {syncStatus === 'remote'
                  ? 'Cloud sync active'
                  : syncStatus === 'fallback'
                    ? 'Offline – using local copies'
                    : 'Local only'}
              </span>
            )}
          </div>
          <select
            id="saved-schema-select"
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
            value={activeSchemaId ?? ''}
            onChange={(e) => handleLoadSchema(e.target.value)}
            disabled={!hasSchemas || templatesLoading}
          >
            <option value="" disabled={!hasSchemas}>
              {templatesLoading
                ? 'Loading schemas...'
                : hasSchemas
                  ? 'Select schema to load'
                  : 'No schemas saved yet'}
            </option>
            {schemas.map((schema) => (
              <option key={schema.id} value={schema.id}>
                {schema.name}
              </option>
            ))}
          </select>
          {activeSchemaId && (
            <button
              onClick={() => handleDeleteSchema(activeSchemaId)}
              className="px-2 py-1 rounded-lg text-xs text-red-300 border border-red-500 hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          )}
          {hasSchemas && (
            <button
              onClick={handleClearSchemas}
              className="px-2 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:bg-slate-600/40 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => {
              void refreshTemplates();
            }}
            className="px-2 py-1 rounded-lg text-xs border border-slate-600 text-slate-300 hover:bg-slate-600/40 transition-colors"
          >
            Refresh
          </button>
          {templatesLoading && (
            <span className="text-xs text-slate-400">Refreshing…</span>
          )}
        </div>
        {referenceIssues.length > 0 && (
          <div className="flex flex-col gap-2 p-3 border border-amber-500/40 bg-amber-500/5 rounded-lg">
            <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
              Reference issues
            </span>
            <ul className="text-xs text-amber-100 space-y-1">
              {referenceIssues.map((issue) => (
                <li key={issue.fieldId}>
                  Field <span className="font-semibold">{issue.fieldName || 'Unnamed'}</span> references missing source
                  <span className="font-semibold"> {issue.missing.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <TypeSelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelectType={handleTypeChange}
      />
      <TemplateSelectionDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onApply={handleApplyTemplate}
      />
    </div>
  );
}

interface SortableFieldRowProps {
  field: FieldDefinition;
  index: number;
  renderOptions: (field: FieldDefinition, index: number) => React.ReactNode;
  onFieldNameChange: (index: number, value: string) => void;
  onTypeSelect: (index: number) => void;
  onDuplicateField: (index: number) => void;
  onRemoveField: (index: number) => void;
}

const SortableFieldRow = ({
  field,
  index,
  renderOptions,
  onFieldNameChange,
  onTypeSelect,
  onDuplicateField,
  onRemoveField,
}: SortableFieldRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-700/50 ${isDragging ? 'bg-slate-800/80 shadow-lg' : ''}`}
    >
      <td className="px-3 py-2 flex items-center">
        <input
          type="text"
          value={field.name}
          onChange={(event) => onFieldNameChange(index, event.target.value)}
          className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
          placeholder="Field name"
        />
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => onTypeSelect(index)}
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
        <div className="flex flex-col items-center space-y-2">
          <button
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-600 transition-colors cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...listeners}
            {...attributes}
          >
            <Bars3Icon className="h-4 w-4" />
          </button>
          <div className="flex space-x-1">
            <button
              onClick={() => onDuplicateField(index)}
              className="p-1 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
              aria-label="Duplicate field"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRemoveField(index)}
              className="p-1 rounded-lg hover:bg-slate-600 text-red-400 hover:text-red-300 transition-colors"
              aria-label="Remove field"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
