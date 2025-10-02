import { copycat } from '@snaplet/copycat';

import type { FieldDefinition } from '@/lib/data-generator/types';

type CopycatGenerator = (params: { rowIndex: number; baseSeed: string }) => unknown;

export type CopycatMapperResult = {
  generate: CopycatGenerator;
  requiresFallback?: boolean;
};

const DEFAULT_SEED = 'test-data-generator';

const makeSeed = (baseSeed: string, fieldId: string, rowIndex: number) =>
  `${baseSeed}:${fieldId}:${rowIndex}`;

const numberGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.int(makeSeed(baseSeed, field.id, rowIndex), {
    min: Number(field.options.min ?? 1),
    max: Number(field.options.max ?? 1000),
  });

const decimalGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.float(makeSeed(baseSeed, field.id, rowIndex), {
    min: Number(field.options.min ?? 0),
    max: Number(field.options.max ?? 100),
    precision: Number(field.options.multipleOf ?? 0.01),
  });

const booleanGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.bool(makeSeed(baseSeed, field.id, rowIndex));

const emailGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.email(makeSeed(baseSeed, field.id, rowIndex));

const phoneGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.phoneNumber(makeSeed(baseSeed, field.id, rowIndex));

const genericStringGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) => {
  if (Array.isArray(field.options.examples) && field.options.examples.length > 0) {
    return copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex), field.options.examples as unknown[]);
  }
  return copycat.words(makeSeed(baseSeed, field.id, rowIndex));
};

const characterSequenceGenerator = (field: FieldDefinition): CopycatGenerator => ({ rowIndex }) => {
  const prefix = typeof field.options.prefix === 'string' ? field.options.prefix : '';
  const startAt = Number(field.options.startAt ?? 1);
  const length = Number(field.options.length ?? 5);
  const padZeros = Boolean(field.options.padZeros);
  const value = startAt + rowIndex;
  const stringValue = padZeros ? String(value).padStart(length, '0') : String(value);
  return `${prefix}${stringValue}`;
};

const FIELD_GENERATORS: Record<string, (field: FieldDefinition) => CopycatGenerator> = {
  Number: numberGenerator,
  'Decimal Number': decimalGenerator,
  Boolean: booleanGenerator,
  'First Name': (field) => ({ baseSeed, rowIndex }) => copycat.firstName(makeSeed(baseSeed, field.id, rowIndex)),
  'Last Name': (field) => ({ baseSeed, rowIndex }) => copycat.lastName(makeSeed(baseSeed, field.id, rowIndex)),
  Email: emailGenerator,
  City: (field) => ({ baseSeed, rowIndex }) => copycat.city(makeSeed(baseSeed, field.id, rowIndex)),
  Country: (field) => ({ baseSeed, rowIndex }) => copycat.country(makeSeed(baseSeed, field.id, rowIndex)),
  'Phone Number': phoneGenerator,
  UUID: (field) => ({ baseSeed, rowIndex }) => copycat.uuid(makeSeed(baseSeed, field.id, rowIndex)),
  'Character Sequence': characterSequenceGenerator,
};

export const mapFieldToCopycat = (field: FieldDefinition): CopycatMapperResult => {
  const generatorFactory = FIELD_GENERATORS[field.type];
  if (generatorFactory) {
    return { generate: generatorFactory(field) };
  }

  if (field.type === 'AI-Generated') {
    return {
      generate: genericStringGenerator(field),
      requiresFallback: true,
    };
  }

  return {
    generate: genericStringGenerator(field),
    requiresFallback: true,
  };
};

export const generateCopycatRows = (
  fields: FieldDefinition[],
  count: number,
  seed?: string | number
): { rows: Array<Record<string, unknown>>; usedFallback: boolean } => {
  const baseSeed = String(seed ?? DEFAULT_SEED);
  let usedFallback = false;

  const rows = Array.from({ length: count }).map((_, rowIndex) => {
    return fields.reduce<Record<string, unknown>>((row, field) => {
      const { generate, requiresFallback } = mapFieldToCopycat(field);
      if (requiresFallback) {
        usedFallback = true;
      }
      row[field.name] = generate({ baseSeed, rowIndex });
      return row;
    }, {});
  });

  return { rows, usedFallback };
};

export const supportsCopycat = (fields: FieldDefinition[]): boolean =>
  fields.every((field) => !mapFieldToCopycat(field).requiresFallback);
