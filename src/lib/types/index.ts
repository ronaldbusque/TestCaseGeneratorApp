export type AIModel = 'O1-Mini' | 'GPT-4-Turbo' | 'GPT-4-Stable' | 'Gemini';

export type ModelType = 
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'gemini-2.0-flash-thinking-exp-01-21';

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions?: string[];
  testData?: string[];
  steps: TestStep[];
  expectedResult: string;
  createdAt: Date;
  markdownContent?: string;
}

export interface TestData {
  field: string;
  value: string;
  description?: string;
}

export interface TestStep {
  number: number;
  description: string;
}

export interface AIModelConfig {
  id: AIModel;
  name: string;
  description: string;
  isAvailable: boolean;
}

export interface TestCaseGenerationRequest {
  model: AIModel;
  requirements: string;
}

export interface TestCaseGenerationResponse {
  testCases: TestCase[];
  error?: string;
  debug?: {
    rawResponse?: string;
    parsedResponse?: any;
    content?: string;
    cleanedContent?: string;
    parseError?: string;
    startIdx?: number;
    endIdx?: number;
    parsedType?: string;
    stack?: string;
  };
}

export interface AIService {
  generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse>;
  generateContent(prompt: string, model: ModelType): Promise<string>;
}

export interface TestCaseResponse {
  testCases: TestCase[];
  error?: string;
}

export type GenerationStep = 'idle' | 'analyzing' | 'generating' | 'complete'; 