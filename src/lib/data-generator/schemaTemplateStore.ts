import { fetchApi } from '@/lib/utils/apiClient';
import type { FieldDefinition } from '@/lib/data-generator/types';
import type { StoredSchema } from '@/lib/data-generator/schemaStorage';
import { clearSchemas, deleteSchema, listSchemas, saveSchema } from '@/lib/data-generator/schemaStorage';

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
