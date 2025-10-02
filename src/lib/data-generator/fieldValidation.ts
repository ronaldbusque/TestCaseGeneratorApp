import type { FieldDefinition, FieldOptionValue } from '@/lib/data-generator/types';

const parseNumber = (value: FieldOptionValue) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const parseDate = (value: FieldOptionValue) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  return null;
};

export const validateFieldDefinition = (
  field: FieldDefinition,
  index: number,
  allFields: FieldDefinition[],
): string[] => {
  const errors: string[] = [];
  const { type, options } = field;

  const trimmedName = field.name.trim();
  if (!trimmedName) {
    errors.push('Field name is required.');
  } else {
    const duplicate = allFields.find((candidate, candidateIndex) =>
      candidateIndex !== index && candidate.name.trim() === trimmedName
    );
    if (duplicate) {
      errors.push('Field name must be unique.');
    }
  }

  if (type === 'Number' || type === 'Decimal Number' || type === 'Car Model Year') {
    const min = parseNumber(options.min);
    const max = parseNumber(options.max);

    if (options.min !== undefined && min === null) {
      errors.push('Min value must be a number.');
    }
    if (options.max !== undefined && max === null) {
      errors.push('Max value must be a number.');
    }
    if (min !== null && max !== null && min > max) {
      errors.push('Min value cannot exceed Max value.');
    }

    if (type === 'Decimal Number') {
      const multipleOf = parseNumber(options.multipleOf);
      if (multipleOf !== null && multipleOf <= 0) {
        errors.push('Multiple Of must be greater than 0.');
      }
    }
  }

  if (type === 'Character Sequence') {
    const length = parseNumber(options.length);
    if (length !== null && length <= 0) {
      errors.push('Length must be greater than 0.');
    }
  }

  if (type === 'Date' || type === 'Future Date' || type === 'Past Date') {
    const from = parseDate(options.fromDate);
    const to = parseDate(options.toDate);

    if (options.fromDate && from === null) {
      errors.push('From date is invalid.');
    }
    if (options.toDate && to === null) {
      errors.push('To date is invalid.');
    }
    if (from && to && from > to) {
      errors.push('From date cannot be after To date.');
    }
  }

  if (type === 'Date of Birth') {
    const minAge = parseNumber(options.minAge);
    const maxAge = parseNumber(options.maxAge);

    if (options.minAge !== undefined && minAge === null) {
      errors.push('Min Age must be a number.');
    }
    if (options.maxAge !== undefined && maxAge === null) {
      errors.push('Max Age must be a number.');
    }
    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      errors.push('Min Age cannot exceed Max Age.');
    }
  }

  if (type === 'Custom List') {
    const raw = typeof options.values === 'string' ? options.values.trim() : '';
    if (!raw) {
      errors.push('Provide at least one value.');
    } else {
      const entries = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (entries.length === 0) {
        errors.push('Provide at least one value.');
      }
    }
  }

  if (type === 'Phone Number') {
    const format = typeof options.format === 'string' ? options.format.trim() : '';
    if (format && !format.includes('#')) {
      errors.push('Custom phone formats must include # placeholders.');
    }
  }

  if (type === 'Reference') {
    const sourceField = typeof options.sourceField === 'string' ? options.sourceField : '';
    if (!sourceField) {
      errors.push('Select a source field to reference.');
    } else {
      const sourceExists = allFields.some((candidate, candidateIndex) =>
        candidateIndex !== index && candidate.name === sourceField
      );
      if (!sourceExists) {
        errors.push(`Source field "${sourceField}" not found.`);
      }
    }
  }

  return errors;
};

export const hasValidationErrors = (
  field: FieldDefinition,
  index: number,
  allFields: FieldDefinition[],
) => validateFieldDefinition(field, index, allFields).length > 0;
