import { v4 as uuidv4 } from 'uuid';

import type { FieldDefinition } from '@/lib/data-generator/types';

export const makeUniqueFieldName = (baseName: string, fields: FieldDefinition[]): string => {
  const existingNames = new Set(fields.map((field) => field.name));
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  let candidate = `${baseName}_${counter}`;
  while (existingNames.has(candidate)) {
    counter += 1;
    candidate = `${baseName}_${counter}`;
  }
  return candidate;
};

export const createBlankField = (fields: FieldDefinition[], baseName = 'field'): FieldDefinition => ({
  id: uuidv4(),
  name: makeUniqueFieldName(`${baseName}_${fields.length + 1}`, fields),
  type: '',
  options: {},
});

export const addBlankField = (fields: FieldDefinition[]): FieldDefinition[] => [
  ...fields,
  createBlankField(fields),
];

export const duplicateFieldAt = (fields: FieldDefinition[], index: number): FieldDefinition[] => {
  if (index < 0 || index >= fields.length) {
    return fields;
  }
  const source = fields[index];
  const duplicate: FieldDefinition = {
    ...source,
    id: uuidv4(),
    name: makeUniqueFieldName(source.name ? `${source.name}_copy` : `field_${fields.length + 1}`, fields),
    options: { ...source.options },
  };
  const next = [...fields];
  next.splice(index + 1, 0, duplicate);
  return next;
};

export const removeFieldAt = (fields: FieldDefinition[], index: number): FieldDefinition[] => {
  if (index < 0 || index >= fields.length) {
    return fields;
  }
  const next = [...fields];
  next.splice(index, 1);
  return next;
};

export const moveField = (fields: FieldDefinition[], fromIndex: number, toIndex: number): FieldDefinition[] => {
  if (
    fromIndex < 0 ||
    fromIndex >= fields.length ||
    toIndex < 0 ||
    toIndex >= fields.length ||
    fromIndex === toIndex
  ) {
    return fields;
  }
  const next = [...fields];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const withFreshIds = (fields: FieldDefinition[]): FieldDefinition[] =>
  fields.map((field) => ({
    ...field,
    id: uuidv4(),
    options: { ...field.options },
  }));
