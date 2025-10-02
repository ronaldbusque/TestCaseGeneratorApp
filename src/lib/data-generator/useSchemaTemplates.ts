import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FieldDefinition } from '@/lib/data-generator/types';
import type { StoredSchema } from '@/lib/data-generator/schemaStorage';
import {
  type SchemaTemplatesStore,
  createLocalSchemaStore,
} from '@/lib/data-generator/schemaTemplateStore';

interface UseSchemaTemplatesOptions {
  initialSchemas?: StoredSchema[];
  store?: SchemaTemplatesStore;
}

export const useSchemaTemplates = (options?: UseSchemaTemplatesOptions) => {
  const store = useMemo(
    () => options?.store ?? createLocalSchemaStore(),
    [options?.store]
  );
  const [schemas, setSchemas] = useState<StoredSchema[]>(options?.initialSchemas ?? []);
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(
    options?.initialSchemas && options.initialSchemas.length > 0
      ? options.initialSchemas[0].id
      : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!options?.initialSchemas);
  const [error, setError] = useState<string | null>(null);
  const refreshRequestRef = useRef(0);
  const stateVersionRef = useRef(0);

  const activeSchema = useMemo(
    () => schemas.find((schema) => schema.id === activeSchemaId) ?? null,
    [activeSchemaId, schemas]
  );

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    const stateVersionAtStart = stateVersionRef.current;
    setIsLoading(true);
    try {
      const result = await store.list();
      if (refreshRequestRef.current !== requestId) {
        return;
      }
      if (stateVersionRef.current !== stateVersionAtStart) {
        setError(null);
        return;
      }
      setSchemas(result);
      setError(null);
      if (result.length === 0) {
        setActiveSchemaId(null);
      } else if (activeSchemaId && !result.some((schema) => schema.id === activeSchemaId)) {
        setActiveSchemaId(result[0].id);
      }
    } catch (err) {
      console.warn('[useSchemaTemplates] Failed to list templates', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      if (refreshRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [activeSchemaId, store]);

  useEffect(() => {
    if (options?.initialSchemas) {
      return;
    }
    refresh();
  }, [options?.initialSchemas, refresh]);

  const persistSchema = useCallback(
    async (payload: { id?: string; name: string; fields: FieldDefinition[] }) => {
      try {
        const entry = await store.save(payload);
        setSchemas((previous) => {
          const exists = previous.some((schema) => schema.id === entry.id);
          return exists
            ? previous.map((schema) => (schema.id === entry.id ? entry : schema))
            : [entry, ...previous];
        });
        setActiveSchemaId(entry.id);
        stateVersionRef.current += 1;
        return entry;
      } catch (err) {
        console.warn('[useSchemaTemplates] Failed to save template', err);
        setError(err instanceof Error ? err.message : 'Failed to save template');
        throw err;
      }
    },
    [store]
  );

  const removeSchema = useCallback(
    async (id: string) => {
      try {
        await store.delete(id);
        setSchemas((previous) => previous.filter((schema) => schema.id !== id));
        setActiveSchemaId((previous) => (previous === id ? null : previous));
        stateVersionRef.current += 1;
      } catch (err) {
        console.warn('[useSchemaTemplates] Failed to delete template', err);
        setError(err instanceof Error ? err.message : 'Failed to delete template');
        throw err;
      }
    },
    [store]
  );

  const clearAll = useCallback(async () => {
      try {
        await store.clear();
        setSchemas([]);
        setActiveSchemaId(null);
        stateVersionRef.current += 1;
      } catch (err) {
        console.warn('[useSchemaTemplates] Failed to clear templates', err);
        setError(err instanceof Error ? err.message : 'Failed to clear templates');
        throw err;
      }
  }, [store]);

  return {
    schemas,
    activeSchema,
    activeSchemaId,
    setActiveSchemaId,
    isLoading,
    error,
    saveTemplate: persistSchema,
    deleteTemplate: removeSchema,
    clearTemplates: clearAll,
    refreshTemplates: refresh,
  };
};

export type UseSchemaTemplatesReturn = ReturnType<typeof useSchemaTemplates>;
