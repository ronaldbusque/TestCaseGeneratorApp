import { LLMProvider } from './providers';
import type { FieldOptions } from '@/lib/data-generator/types';

export interface TestDataType {
  name: string;
  category: string;
  description?: string;
}

export interface TestDataGenerationRequest {
  types: TestDataType[];
  configuration: Record<string, FieldOptions>;
  count: number;
  aiEnhancement?: string;
  provider?: LLMProvider;
  model?: string;
}

export type GeneratedTestData = Record<string, unknown>;

export interface TestDataGenerationResponse {
  data: GeneratedTestData[];
  count: number;
  error?: string;
  aiExplanation?: string;
  debug?: {
    rawResponse?: string;
    parseError?: string;
    stack?: string;
  };
}

export interface FakerCategory {
  name: string;
  types: {
    name: string;
    description?: string;
    example?: string;
  }[];
}

export interface TypeOption {
  name: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'select';
  default?: any;
  min?: number;
  max?: number;
  options?: Array<{value: string, label: string}>;
  placeholder?: string;
}

export interface FakerTypeDefinition {
  fakerMethod: string | null;
  options: TypeOption[];
} 
