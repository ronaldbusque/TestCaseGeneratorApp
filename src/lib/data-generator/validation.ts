import { z } from 'zod';

const fieldOptionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const fieldOptionsSchema = z.record(fieldOptionValueSchema).optional().default({});

const fieldDefinitionSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  type: z.string().min(1, 'Field type is required'),
  options: fieldOptionsSchema,
});

const lineEndingSchema = z.enum(['Unix (LF)', 'Windows (CRLF)']);

const exportFormatSchema = z.enum(['CSV', 'JSON', 'SQL', 'Excel']);

const providerSchema = z.enum(['openai', 'gemini', 'openrouter']);

export const generateDataPayloadSchema = z.object({
  fields: z.array(fieldDefinitionSchema).min(1, 'At least one field is required'),
  count: z.number().int().positive().max(100000).optional(),
  format: exportFormatSchema.optional(),
  options: z
    .object({
      lineEnding: lineEndingSchema,
      includeHeader: z.boolean(),
      includeBOM: z.boolean(),
    })
    .optional(),
  aiEnhancement: z.string().optional(),
  provider: providerSchema.optional(),
  model: z.string().optional(),
  seed: z
    .string()
    .trim()
    .min(1, 'Seed cannot be empty')
    .max(128, 'Seed is too long')
    .optional(),
});

export type GenerateDataPayloadInput = z.infer<typeof generateDataPayloadSchema>;
