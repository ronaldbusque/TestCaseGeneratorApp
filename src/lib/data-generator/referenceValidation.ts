import type { FieldDefinition } from '@/lib/data-generator/types';

export interface ReferenceIssue {
  fieldId: string;
  fieldName: string;
  missing: string[];
}

export const collectReferenceIssues = (fields: FieldDefinition[]): ReferenceIssue[] =>
  fields
    .map((field) => {
      if (field.type !== 'Reference') {
        return null;
      }
      const sourceField = typeof field.options.sourceField === 'string'
        ? field.options.sourceField.trim()
        : '';
      if (!sourceField) {
        return null;
      }
      const sourceExists = fields.some((candidate) => candidate.name === sourceField);
      if (sourceExists) {
        return null;
      }
      return {
        fieldId: field.id,
        fieldName: field.name,
        missing: [sourceField],
      } satisfies ReferenceIssue;
    })
    .filter((issue): issue is ReferenceIssue => Boolean(issue));
