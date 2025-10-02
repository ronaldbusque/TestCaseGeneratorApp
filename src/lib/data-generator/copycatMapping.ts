import { copycat } from '@snaplet/copycat';
import { randomUUID } from 'crypto';

import type { FieldDefinition } from '@/lib/data-generator/types';

type CopycatGenerator = (params: { rowIndex: number; baseSeed: string }) => unknown;

export type CopycatMapperResult = {
  generate: CopycatGenerator;
  requiresFallback?: boolean;
};

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

const fullNameGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.fullName(makeSeed(baseSeed, field.id, rowIndex));

const addressGenerator = (field: FieldDefinition): CopycatGenerator => ({ baseSeed, rowIndex }) =>
  copycat.postalAddress(makeSeed(baseSeed, field.id, rowIndex));

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

const parseCustomListOptions = (values: unknown): string[] => {
  if (Array.isArray(values)) {
    return values
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry)))
      .filter((entry) => entry.length > 0);
  }

  if (typeof values === 'string') {
    return values
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const FIELD_GENERATORS: Record<string, (field: FieldDefinition) => CopycatGenerator> = {
  Number: numberGenerator,
  'Decimal Number': decimalGenerator,
  Boolean: booleanGenerator,
  'First Name': (field) => ({ baseSeed, rowIndex }) => copycat.firstName(makeSeed(baseSeed, field.id, rowIndex)),
  'Last Name': (field) => ({ baseSeed, rowIndex }) => copycat.lastName(makeSeed(baseSeed, field.id, rowIndex)),
  'Full Name': fullNameGenerator,
  Email: emailGenerator,
  City: (field) => ({ baseSeed, rowIndex }) => copycat.city(makeSeed(baseSeed, field.id, rowIndex)),
  Country: (field) => ({ baseSeed, rowIndex }) => copycat.country(makeSeed(baseSeed, field.id, rowIndex)),
  'Phone Number': phoneGenerator,
  UUID: (field) => ({ baseSeed, rowIndex }) => copycat.uuid(makeSeed(baseSeed, field.id, rowIndex)),
  'Character Sequence': characterSequenceGenerator,
  Address: addressGenerator,
};

export const mapFieldToCopycat = (field: FieldDefinition): CopycatMapperResult => {
  if (field.type === 'Custom List') {
    const values = parseCustomListOptions(field.options?.values);
    if (values.length === 0) {
      return {
        generate: () => null,
        requiresFallback: true,
      };
    }
    return {
      generate: ({ baseSeed, rowIndex }) =>
        copycat.oneOf(makeSeed(baseSeed, field.id, rowIndex), values),
    };
  }

  const generatorFactory = FIELD_GENERATORS[field.type];
  if (generatorFactory) {
    return { generate: generatorFactory(field) };
  }

  if (field.type === 'Reference') {
    return {
      generate: () => null,
      requiresFallback: false,
    };
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
  const baseSeed = seed !== undefined && seed !== null
    ? String(seed)
    : randomUUID();
  let usedFallback = false;

  const rows = Array.from({ length: count }).map((_, rowIndex) => {
    const row = fields.reduce<Record<string, unknown>>((accumulator, field) => {
      if (field.type === 'Reference') {
        return accumulator;
      }

      const { generate, requiresFallback } = mapFieldToCopycat(field);
      if (requiresFallback) {
        usedFallback = true;
      }
      accumulator[field.name] = generate({ baseSeed, rowIndex });
      return accumulator;
    }, {});

    return row;
  });

  return { rows: applyReferenceFields(rows, fields), usedFallback };
};

export const supportsCopycat = (fields: FieldDefinition[]): boolean =>
  fields.every((field) => !mapFieldToCopycat(field).requiresFallback);

const applyReferenceFields = (
  rows: Array<Record<string, unknown>>,
  fields: FieldDefinition[],
) =>
  rows.map((row) => {
    const updated = { ...row };
    fields.forEach((field) => {
      if (field.type === 'Reference') {
        const sourceField = typeof field.options.sourceField === 'string' ? field.options.sourceField : '';
        updated[field.name] = sourceField && sourceField in updated ? updated[sourceField] : null;
      }
    });
    return updated;
  });
