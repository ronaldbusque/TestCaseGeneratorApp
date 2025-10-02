import { act, renderHook, waitFor } from '@testing-library/react';

import type { StoredSchema } from '@/lib/data-generator/schemaStorage';
import { useSchemaTemplates, type SchemaTemplatesStore } from '@/lib/data-generator/useSchemaTemplates';
import { createHybridSchemaStore } from '@/lib/data-generator/schemaTemplateStore';

const mockSchemas: StoredSchema[] = [
  {
    id: 'schema-1',
    name: 'People',
    updatedAt: '2025-10-01T00:00:00.000Z',
    fields: [],
  },
  {
    id: 'schema-2',
    name: 'Orders',
    updatedAt: '2025-10-01T00:00:01.000Z',
    fields: [],
  },
];

const createMemoryStore = (initial: StoredSchema[] = []): SchemaTemplatesStore => {
  let items = [...initial];
  return {
    list: async () => [...items],
    save: async (payload) => {
      const id = payload.id ?? `memory-${Math.random().toString(36).slice(2, 8)}`;
      const entry: StoredSchema = {
        id,
        name: payload.name,
        updatedAt: new Date().toISOString(),
        fields: payload.fields,
      };
      const index = items.findIndex((schema) => schema.id === id);
      if (index >= 0) {
        items[index] = entry;
      } else {
        items = [entry, ...items];
      }
      return entry;
    },
    delete: async (id) => {
      items = items.filter((schema) => schema.id !== id);
    },
    clear: async () => {
      items = [];
    },
  };
};

describe('useSchemaTemplates', () => {
  it('initialises from provided store', async () => {
    const store = createMemoryStore(mockSchemas);
    const { result } = renderHook(() => useSchemaTemplates({ store }));

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(2);
    });
  });

  it('stores newly saved template', async () => {
    const store = createMemoryStore();
    const { result } = renderHook(() => useSchemaTemplates({ store }));

    await act(async () => {
      await result.current.saveTemplate({ name: 'Users', fields: [] });
    });

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(1);
    });
    expect(result.current.activeSchema?.name).toBe('Users');
  });

  it('updates existing template in place', async () => {
    const store = createMemoryStore(mockSchemas);
    const { result } = renderHook(() => useSchemaTemplates({ store }));

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(2);
    });

    await act(async () => {
      await result.current.saveTemplate({ id: 'schema-1', name: 'People Updated', fields: [] });
    });

    await waitFor(() => {
      expect(result.current.schemas.find((schema) => schema.id === 'schema-1')?.name).toBe('People Updated');
    });
  });

  it('deletes templates and clears active id', async () => {
    const store = createMemoryStore(mockSchemas);
    const { result } = renderHook(() => useSchemaTemplates({ store }));

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(2);
    });

    act(() => {
      result.current.setActiveSchemaId('schema-1');
    });

    await act(async () => {
      await result.current.deleteTemplate('schema-1');
    });

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(1);
    });
    expect(result.current.activeSchema).toBeNull();
  });

  it('clears all templates', async () => {
    const store = createMemoryStore(mockSchemas);
    const { result } = renderHook(() => useSchemaTemplates({ store }));

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(2);
    });

    await act(async () => {
      await result.current.clearTemplates();
    });

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(0);
    });
    expect(result.current.activeSchema).toBeNull();
  });

  it('falls back to local store when remote throws', async () => {
    const failingRemote: SchemaTemplatesStore = {
      list: async () => {
        throw new Error('Supabase not configured');
      },
      save: async () => {
        throw new Error('Supabase not configured');
      },
      delete: async () => {
        throw new Error('Supabase not configured');
      },
      clear: async () => {
        throw new Error('Supabase not configured');
      },
    };

    const hybridStore = createHybridSchemaStore({
      enableRemote: true,
      remoteStore: failingRemote,
      localStore: createMemoryStore(),
    });

    const { result } = renderHook(() => useSchemaTemplates({ store: hybridStore }));

    await waitFor(() => {
      expect(result.current.schemas).toEqual([]);
    });

    await act(async () => {
      await result.current.saveTemplate({ name: 'Local Only', fields: [] });
    });

    await waitFor(() => {
      expect(result.current.schemas).toHaveLength(1);
    });
  });
});
