import { collectReferenceIssues } from '@/lib/data-generator/referenceValidation';
import type { FieldDefinition } from '@/lib/data-generator/types';

describe('referenceValidation', () => {
  const makeField = (overrides: Partial<FieldDefinition>): FieldDefinition => ({
    id: overrides.id ?? 'id',
    name: overrides.name ?? 'field',
    type: overrides.type ?? 'Number',
    options: overrides.options ?? {},
  });

  it('returns empty array when all references are valid', () => {
    const fields: FieldDefinition[] = [
      makeField({ id: '1', name: 'id', type: 'Number' }),
      makeField({ id: '2', name: 'copy', type: 'Reference', options: { sourceField: 'id' } }),
    ];

    expect(collectReferenceIssues(fields)).toEqual([]);
  });

  it('lists references with missing source fields', () => {
    const fields: FieldDefinition[] = [
      makeField({ id: '1', name: 'copy', type: 'Reference', options: { sourceField: 'missing' } }),
    ];

    expect(collectReferenceIssues(fields)).toEqual([
      {
        fieldId: '1',
        fieldName: 'copy',
        missing: ['missing'],
      },
    ]);
  });

  it('ignores references without a sourceField', () => {
    const fields: FieldDefinition[] = [
      makeField({ id: '1', name: 'copy', type: 'Reference', options: {} }),
    ];

    expect(collectReferenceIssues(fields)).toEqual([]);
  });
});
