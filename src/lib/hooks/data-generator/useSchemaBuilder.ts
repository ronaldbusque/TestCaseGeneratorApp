import { useCallback, useMemo, useState } from 'react';

import { AI_GENERATED_FIELD_TYPE, createDefaultField } from '@/lib/data-generator/constants';
import type { FieldDefinition, FieldOptionValue, SchemaValidationResult } from '@/lib/data-generator/types';

interface UseSchemaBuilderOptions {
  initialFields?: FieldDefinition[];
}

export const useSchemaBuilder = (options?: UseSchemaBuilderOptions) => {
  const [fields, setFields] = useState<FieldDefinition[]>(() => {
    if (options?.initialFields) {
      return options.initialFields;
    }
    return [createDefaultField()];
  });

  const hasAIGeneratedFields = useMemo(
    () => fields.some((field) => field.type === AI_GENERATED_FIELD_TYPE),
    [fields]
  );

  const missingTypeFields = useMemo(
    () => fields.filter((field) => !field.type),
    [fields]
  );

  const validateSchema = useCallback((): SchemaValidationResult => {
    if (fields.length === 0) {
      return {
        ok: false,
        message: 'Please add at least one field with a type.',
        error: { type: 'empty' },
      };
    }

    if (missingTypeFields.length > 0) {
      return {
        ok: false,
        message: `Please select types for all fields: ${missingTypeFields
          .map((field) => field.name)
          .join(', ')}`,
        error: { type: 'missingType', fields: missingTypeFields.map((field) => field.name) },
      };
    }

    const invalidFields = fields
      .map((field, index) => ({ field, errors: validateField(field, index, fields) }))
      .filter((entry) => entry.errors.length > 0);

    if (invalidFields.length > 0) {
      return {
        ok: false,
        message: `Fix validation errors for: ${invalidFields
          .map((entry) => entry.field.name)
          .join(', ')}`,
        error: { type: 'invalid', fields: invalidFields.map((entry) => entry.field.name) },
      };
    }

    return { ok: true };
  }, [fields, missingTypeFields]);

  const validateField = (
    field: FieldDefinition,
    index: number,
    allFields: FieldDefinition[]
  ): string[] => {
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

  const mapFieldsToApi = useCallback(
    () =>
      fields.map(({ name, type, options }) => ({
        name,
        type,
        options,
      })),
    [fields]
  );

  const resetFields = useCallback(() => {
    setFields([createDefaultField()]);
  }, []);

  return {
    fields,
    setFields,
    resetFields,
    hasAIGeneratedFields,
    missingTypeFields,
    validateSchema,
    mapFieldsToApi,
  };
};

export type UseSchemaBuilderReturn = ReturnType<typeof useSchemaBuilder>;
