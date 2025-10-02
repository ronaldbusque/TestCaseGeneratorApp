import { act, renderHook } from '@testing-library/react';

import type { StoredSchema } from '@/lib/data-generator/schemaStorage';
import { useSchemaTemplates } from '@/lib/data-generator/useSchemaTemplates';

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

describe('useSchemaTemplates', () => {
  it('initialises from local storage', () => {
    const { result } = renderHook(() => useSchemaTemplates({ initialSchemas: mockSchemas }));
    expect(result.current.schemas).toHaveLength(2);
  });

  it('stores newly saved template', () => {
    const { result } = renderHook(() => useSchemaTemplates({ initialSchemas: [] }));

    act(() => {
      result.current.saveTemplate({ name: 'Users', fields: [] });
    });

    expect(result.current.schemas).toHaveLength(1);
    expect(result.current.activeSchema?.name).toBe('Users');
  });

  it('updates existing template in place', () => {
    const { result } = renderHook(() => useSchemaTemplates({ initialSchemas: mockSchemas }));

    act(() => {
      result.current.saveTemplate({ id: 'schema-1', name: 'People Updated', fields: [] });
    });

    expect(result.current.schemas[0].name).toBe('People Updated');
  });

  it('deletes templates and clears active id', () => {
    const { result } = renderHook(() => useSchemaTemplates({ initialSchemas: mockSchemas }));

    act(() => {
      result.current.setActiveSchemaId('schema-1');
    });

    act(() => {
      result.current.deleteTemplate('schema-1');
    });

    expect(result.current.schemas).toHaveLength(1);
    expect(result.current.activeSchema).toBeNull();
  });

  it('clears all templates', () => {
    const { result } = renderHook(() => useSchemaTemplates({ initialSchemas: mockSchemas }));

    act(() => {
      result.current.clearTemplates();
    });

    expect(result.current.schemas).toHaveLength(0);
    expect(result.current.activeSchema).toBeNull();
  });
});
