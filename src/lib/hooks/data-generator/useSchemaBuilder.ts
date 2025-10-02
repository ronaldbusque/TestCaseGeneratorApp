import { useCallback, useMemo, useState } from 'react';

import { AI_GENERATED_FIELD_TYPE, createDefaultField } from '@/lib/data-generator/constants';
import type { FieldDefinition, SchemaValidationResult } from '@/lib/data-generator/types';

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

    return { ok: true };
  }, [fields, missingTypeFields]);

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
