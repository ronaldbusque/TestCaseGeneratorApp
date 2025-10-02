import { v4 as uuidv4 } from 'uuid';

import type { ExportConfig, FieldDefinition, LineEnding } from './types';

export const DEFAULT_SQL_TABLE_NAME = 'test_data';
export const DEFAULT_FILE_PREFIX = 'test-data';
export const PREVIEW_ROW_COUNT = 10;
export const AI_GENERATED_FIELD_TYPE = 'AI-Generated';

export const DEFAULT_LINE_ENDING: LineEnding = 'Unix (LF)';

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  rowCount: 100,
  format: 'CSV',
  lineEnding: DEFAULT_LINE_ENDING,
  includeHeader: true,
  includeBOM: false,
  applyAIEnhancement: false,
  enhancementPrompt: '',
  useDeterministicSeed: false,
  seedValue: '',
};

export const createDefaultField = (): FieldDefinition => ({
  id: uuidv4(),
  name: 'id',
  type: 'Number',
  options: { min: 1, max: 1000, decimals: 0 },
});
