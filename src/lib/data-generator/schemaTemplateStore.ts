import { fetchApi } from '@/lib/utils/apiClient';
import type { FieldDefinition } from '@/lib/data-generator/types';
import type { StoredSchema } from '@/lib/data-generator/schemaStorage';
import { clearSchemas, deleteSchema, listSchemas, saveSchema } from '@/lib/data-generator/schemaStorage';

type FetchError = Error & {
  status?: number;
};

export interface SchemaTemplatesStore {
  list(): Promise<StoredSchema[]>;
  save(payload: { id?: string; name: string; fields: FieldDefinition[] }): Promise<StoredSchema>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const createLocalSchemaStore = (): SchemaTemplatesStore => ({
  list: async () => listSchemas(),
  save: async (payload) => saveSchema(payload),
  delete: async (id: string) => {
    deleteSchema(id);
  },
  clear: async () => {
    clearSchemas();
  },
});

export const createHttpSchemaStore = (basePath = '/api/data-generator/templates'): SchemaTemplatesStore => ({
  list: async () => {
    const response = await fetchApi<{ schemas: StoredSchema[] }>(basePath);
    return response.schemas ?? [];
  },
  save: async (payload) => {
    const response = await fetchApi<{ schema: StoredSchema }>(basePath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.schema;
  },
  delete: async (id: string) => {
    await fetchApi<{ success: boolean }>(`${basePath}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  clear: async () => {
    await fetchApi<{ success: boolean }>(basePath, {
      method: 'DELETE',
    });
  },
});

const shouldFallback = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const typed = error as FetchError;
  if (typed.status && [401, 403, 404, 500, 501].includes(typed.status)) {
    return true;
  }
  if ('message' in typed && typeof typed.message === 'string') {
    return /supabase/i.test(typed.message) || /not configured/i.test(typed.message);
  }
  return false;
};

export interface HybridStoreOptions {
  enableRemote?: boolean;
  basePath?: string;
  onFallback?: (error: unknown) => void;
  remoteStore?: SchemaTemplatesStore;
  localStore?: SchemaTemplatesStore;
}

export const createHybridSchemaStore = ({
  enableRemote = false,
  basePath,
  onFallback,
  remoteStore,
  localStore,
}: HybridStoreOptions = {}): SchemaTemplatesStore => {
  const local = localStore ?? createLocalSchemaStore();
  if (!enableRemote) {
    return local;
  }

  const remote = remoteStore ?? createHttpSchemaStore(basePath);
  let remoteDisabled = false;

  const withFallback = async <T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
    if (remoteDisabled) {
      return fallback();
    }
    try {
      const result = await primary();
      return result;
    } catch (error) {
      if (!shouldFallback(error)) {
        throw error;
      }
      remoteDisabled = true;
      if (onFallback) {
        onFallback(error);
      } else {
        console.warn('[schemaTemplateStore] Remote store failed, falling back to local store', error);
      }
      return fallback();
    }
  };

  return {
    list: () => withFallback(() => remote.list(), () => local.list()),
    save: (payload) => withFallback(() => remote.save(payload), () => local.save(payload)),
    delete: (id) => withFallback(() => remote.delete(id), () => local.delete(id)),
    clear: () => withFallback(() => remote.clear(), () => local.clear()),
  };
};
