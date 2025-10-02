import { addBlankField, createBlankField, duplicateFieldAt, makeUniqueFieldName, moveField, removeFieldAt, withFreshIds } from '@/lib/data-generator/schemaActions';
import type { FieldDefinition } from '@/lib/data-generator/types';

describe('schemaActions', () => {
  const baseFields: FieldDefinition[] = [
    { id: 'a', name: 'id', type: 'Number', options: {} },
    { id: 'b', name: 'firstName', type: 'First Name', options: {} },
  ];

  it('creates blank field with unique name', () => {
    const field = createBlankField(baseFields, 'field');
    expect(field.id).not.toBe(baseFields[0].id);
    expect(field.name.startsWith('field_')).toBe(true);
    expect(baseFields.map((f) => f.name)).not.toContain(field.name);
    expect(field.type).toBe('');
  });

  it('adds blank field to the list', () => {
    const next = addBlankField(baseFields);
    expect(next).toHaveLength(3);
    expect(next[2].type).toBe('');
  });

  it('duplicates an existing field with fresh id and name', () => {
    const next = duplicateFieldAt(baseFields, 1);
    expect(next).toHaveLength(3);
    expect(next[2].name).toMatch(/firstName_copy/);
    expect(next[2].id).not.toBe(baseFields[1].id);
    expect(next[2].options).toEqual(baseFields[1].options);
  });

  it('removes field at index', () => {
    const next = removeFieldAt(baseFields, 0);
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('firstName');
  });

  it('ignores remove for out-of-bounds index', () => {
    const next = removeFieldAt(baseFields, 5);
    expect(next).toEqual(baseFields);
  });

  it('moves a field within bounds', () => {
    const next = moveField(baseFields, 0, 1);
    expect(next[0].name).toBe('firstName');
    expect(next[1].name).toBe('id');
  });

  it('skips move when target is invalid', () => {
    const next = moveField(baseFields, 0, 5);
    expect(next).toEqual(baseFields);
  });

  it('generates unique names by appending counter', () => {
    const name = makeUniqueFieldName('firstName', baseFields);
    expect(name).toBe('firstName_1');
  });

  it('clones fields with fresh ids', () => {
    const cloned = withFreshIds(baseFields);
    expect(cloned).toHaveLength(2);
    cloned.forEach((field, index) => {
      expect(field.id).not.toBe(baseFields[index].id);
      expect(field.options).toEqual(baseFields[index].options);
    });
  });
});
