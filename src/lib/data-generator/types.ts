export type ExportFormat = 'CSV' | 'JSON' | 'SQL' | 'Excel';

export type LineEnding = 'Unix (LF)' | 'Windows (CRLF)';

export type FieldOptionValue = string | number | boolean | null;

export type FieldOptions = Partial<Record<string, FieldOptionValue>>;

export interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  options: FieldOptions;
}

export interface ExportConfig {
  rowCount: number;
  format: ExportFormat;
  lineEnding: LineEnding;
  includeHeader: boolean;
  includeBOM: boolean;
  applyAIEnhancement: boolean;
  enhancementPrompt: string;
  useDeterministicSeed: boolean;
  seedValue: string;
}

export interface SchemaValidationResult {
  ok: boolean;
  message?: string;
  error?:
    | { type: 'empty' }
    | { type: 'missingType'; fields: string[] }
    | { type: 'invalid'; fields: string[] };
}

export interface ExportValidationResult {
  ok: boolean;
  message?: string;
  error?: { type: 'missingAIPrompt' } | { type: 'missingSeed' };
}

export interface GenerateDataPayload {
  fields: Array<{
    name: string;
    type: string;
    options: FieldOptions;
  }>;
  count?: number;
  format?: ExportFormat;
  options?: {
    lineEnding: LineEnding;
    includeHeader: boolean;
    includeBOM: boolean;
  };
  aiEnhancement?: string;
  provider?: string;
  model?: string;
  seed?: string;
}
