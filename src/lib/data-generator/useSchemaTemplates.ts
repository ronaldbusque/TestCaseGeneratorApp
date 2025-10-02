import { useCallback, useMemo, useState } from 'react';

import type { FieldDefinition } from '@/lib/data-generator/types';
import {
  StoredSchema,
  clearSchemas,
  deleteSchema,
  listSchemas,
  saveSchema,
} from '@/lib/data-generator/schemaStorage';

interface UseSchemaTemplatesOptions {
  initialSchemas?: StoredSchema[];
}

export const useSchemaTemplates = (options?: UseSchemaTemplatesOptions) => {
  const [schemas, setSchemas] = useState<StoredSchema[]>(() =>
    options?.initialSchemas ?? listSchemas()
  );
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);

  const activeSchema = useMemo(
    () => schemas.find((schema) => schema.id === activeSchemaId) ?? null,
    [activeSchemaId, schemas]
  );

  const refresh = useCallback(() => {
    setSchemas(listSchemas());
  }, []);

  const persistSchema = useCallback(
    (payload: { id?: string; name: string; fields: FieldDefinition[] }) => {
      const entry = saveSchema(payload);
      setSchemas((previous) => {
        const exists = previous.some((schema) => schema.id === entry.id);
        return exists
          ? previous.map((schema) => (schema.id === entry.id ? entry : schema))
          : [entry, ...previous];
      });
      setActiveSchemaId(entry.id);
      return entry;
    },
    []
  );

  const removeSchema = useCallback((id: string) => {
    deleteSchema(id);
    setSchemas((previous) => previous.filter((schema) => schema.id !== id));
    setActiveSchemaId((previous) => (previous === id ? null : previous));
  }, []);

  const clearAll = useCallback(() => {
    clearSchemas();
    setSchemas([]);
    setActiveSchemaId(null);
  }, []);

  return {
    schemas,
    activeSchema,
    activeSchemaId,
    setActiveSchemaId,
    saveTemplate: persistSchema,
    deleteTemplate: removeSchema,
    clearTemplates: clearAll,
    refreshTemplates: refresh,
  };
};

export type UseSchemaTemplatesReturn = ReturnType<typeof useSchemaTemplates>;
