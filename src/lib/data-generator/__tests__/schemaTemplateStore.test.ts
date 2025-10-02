import { createHybridSchemaStore } from '@/lib/data-generator/schemaTemplateStore';
import type { SchemaTemplatesStore } from '@/lib/data-generator/useSchemaTemplates';
import type { FieldDefinition } from '@/lib/data-generator/types';
import type { StoredSchema } from '@/lib/data-generator/schemaStorage';

const sampleFields: FieldDefinition[] = [
  { id: 'id', name: 'id', type: 'Number', options: {} },
];

const makeSchema = (overrides: Partial<StoredSchema>): StoredSchema => ({
  id: overrides.id ?? 'schema',
  name: overrides.name ?? 'Schema',
  updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  fields: overrides.fields ?? sampleFields,
});

describe('createHybridSchemaStore', () => {
  const expectFallbackWarning = async (action: Promise<any>) => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await action;
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  };

  it('uses remote store when enabled and succeeds', async () => {
    const remote: SchemaTemplatesStore = {
      list: jest.fn(async () => [makeSchema({ id: 'remote' })]),
      save: jest.fn(async (payload) => makeSchema({ id: payload.id ?? 'remote-new', name: payload.name })),
      delete: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };
    const local: SchemaTemplatesStore = {
      list: jest.fn(async () => []),
      save: jest.fn(async (payload) => makeSchema({ id: payload.id ?? 'local', name: payload.name })),
      delete: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };

    const store = createHybridSchemaStore({ enableRemote: true, remoteStore: remote, localStore: local });
    const schemas = await store.list();

    expect(remote.list).toHaveBeenCalled();
    expect(local.list).not.toHaveBeenCalled();
    expect(schemas[0].id).toBe('remote');

    await store.save({ name: 'Remote Only', fields: sampleFields });
    expect(remote.save).toHaveBeenCalled();
    expect(local.save).not.toHaveBeenCalled();
  });

  it('falls back to local store when remote rejects', async () => {
    const error = Object.assign(new Error('Supabase not configured'), { status: 501 });
    const remote: SchemaTemplatesStore = {
      list: jest.fn(async () => {
        throw error;
      }),
      save: jest.fn(async () => {
        throw error;
      }),
      delete: jest.fn(async () => {
        throw error;
      }),
      clear: jest.fn(async () => {
        throw error;
      }),
    };

    const local: SchemaTemplatesStore = {
      list: jest.fn(async () => [makeSchema({ id: 'local' })]),
      save: jest.fn(async (payload) => makeSchema({ id: payload.id ?? 'local', name: payload.name })),
      delete: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };

    const store = createHybridSchemaStore({ enableRemote: true, remoteStore: remote, localStore: local });

    await expectFallbackWarning(store.list());
    expect(local.list).toHaveBeenCalled();

    await expectFallbackWarning(store.save({ name: 'Local Save', fields: sampleFields }));
    expect(local.save).toHaveBeenCalled();

    await expectFallbackWarning(store.delete('schema')); 
    expect(local.delete).toHaveBeenCalled();

    await expectFallbackWarning(store.clear());
    expect(local.clear).toHaveBeenCalled();
  });

  it('treats non-supabase errors as fatal', async () => {
    const remote: SchemaTemplatesStore = {
      list: jest.fn(async () => {
        throw new Error('Unexpected');
      }),
      save: jest.fn(async () => {
        throw new Error('Unexpected');
      }),
      delete: jest.fn(async () => {
        throw new Error('Unexpected');
      }),
      clear: jest.fn(async () => {
        throw new Error('Unexpected');
      }),
    };

    const local: SchemaTemplatesStore = {
      list: jest.fn(async () => []),
      save: jest.fn(async (payload) => makeSchema({ id: payload.id ?? 'local', name: payload.name })),
      delete: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };

    const store = createHybridSchemaStore({ enableRemote: true, remoteStore: remote, localStore: local });

    await expect(store.list()).rejects.toThrow('Unexpected');
    expect(local.list).not.toHaveBeenCalled();
  });
});
