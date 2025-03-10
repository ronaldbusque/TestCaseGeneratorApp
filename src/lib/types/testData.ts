export interface TestDataType {
  name: string;
  category: string;
  description?: string;
}

export interface TestDataGenerationRequest {
  types: TestDataType[];
  configuration: Record<string, any>;
  count: number;
  aiEnhancement?: string;
}

export type GeneratedTestData = Record<string, any>;

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
}

export interface FakerTypeDefinition {
  fakerMethod: string | null;
  options: TypeOption[];
} 