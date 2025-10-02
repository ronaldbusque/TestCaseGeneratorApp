import { act, renderHook } from '@testing-library/react';

import { createDefaultField } from '@/lib/data-generator/constants';
import { useSchemaBuilder } from '@/lib/hooks/data-generator/useSchemaBuilder';

describe('useSchemaBuilder', () => {
  it('initialises with a default field', () => {
    const { result } = renderHook(() => useSchemaBuilder());

    expect(result.current.fields).toHaveLength(1);
    expect(result.current.fields[0].type).toBe('Number');
  });

  it('validates empty schema', () => {
    const { result } = renderHook(() => useSchemaBuilder({ initialFields: [] }));

    const validation = result.current.validateSchema();
    expect(validation.ok).toBe(false);
    expect(validation.error).toEqual({ type: 'empty' });
  });

  it('detects missing field types', () => {
    const fieldWithoutType = { ...createDefaultField(), type: '' };
    const { result } = renderHook(() => useSchemaBuilder({ initialFields: [fieldWithoutType] }));

    const validation = result.current.validateSchema();
    expect(validation.ok).toBe(false);
    expect(validation.error).toEqual({ type: 'missingType', fields: [fieldWithoutType.name] });
  });

  it('reports AI generated field presence', () => {
    const aiField = { ...createDefaultField(), type: 'AI-Generated' };
    const { result } = renderHook(() => useSchemaBuilder({ initialFields: [aiField] }));

    expect(result.current.hasAIGeneratedFields).toBe(true);
  });

  it('maps fields to API payload shape', () => {
    const field = createDefaultField();
    const { result } = renderHook(() => useSchemaBuilder({ initialFields: [field] }));

    const mapped = result.current.mapFieldsToApi();
    expect(mapped).toEqual([
      {
        name: field.name,
        type: field.type,
        options: field.options,
      },
    ]);
  });

  it('resets to default field', () => {
    const { result } = renderHook(() => useSchemaBuilder({ initialFields: [] }));

    act(() => {
      result.current.resetFields();
    });

    expect(result.current.fields).toHaveLength(1);
  });

  it('marks duplicate names as invalid', () => {
    const fields = [
      { ...createDefaultField(), id: '1', name: 'email', type: 'Email' },
      { ...createDefaultField(), id: '2', name: 'email', type: 'First Name' },
    ];

    const { result } = renderHook(() => useSchemaBuilder({ initialFields: fields }));

    const validation = result.current.validateSchema();
    expect(validation.ok).toBe(false);
    expect(validation.error).toEqual({ type: 'invalid', fields: ['email', 'email'] });
  });

  it('marks missing name as invalid', () => {
    const fields = [{ ...createDefaultField(), id: '1', name: '', type: 'Email' }];
    const { result } = renderHook(() => useSchemaBuilder({ initialFields: fields }));

    const validation = result.current.validateSchema();
    expect(validation.ok).toBe(false);
    expect(validation.error).toEqual({ type: 'invalid', fields: [''] });
  });
});
