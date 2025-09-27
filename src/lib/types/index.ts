// Export SQL types
export * from './sql';
export * from './providers';

import { LLMProvider } from './providers';

export type AIModel = 'Agents';

export type ModelType = string;

export interface BaseTestCase {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  markdownContent?: string;
  area?: string;
  originalScenarioId?: string;  // Reference to the original scenario this was converted from
}

export interface DetailedTestCase extends BaseTestCase {
  preconditions: string[];
  testData: string[];
  steps: TestStep[];
  expectedResult: string;
}

export interface HighLevelTestCase extends BaseTestCase {
  scenario: string;  // The actual test scenario (what needs to be tested)
  area: string;      // The functional area or module being tested
}

export type TestCase = DetailedTestCase | HighLevelTestCase;

export interface TestData {
  field: string;
  value: string;
  description?: string;
}

export interface TestStep {
  number: number;
  description: string;
}

export type TestCaseMode = 'high-level' | 'detailed';
export type TestPriorityMode = 'comprehensive' | 'core-functionality';

export interface UploadedFilePayload {
  name: string;
  type: string;
  preview: string;
  data?: string; // base64 encoded without data URL prefix
  size?: number;
}

export interface TestCaseGenerationRequest {
  requirements: string;
  files?: UploadedFilePayload[];
  mode: TestCaseMode;
  selectedScenarios?: HighLevelTestCase[];
  priorityMode?: TestPriorityMode;
  provider?: LLMProvider;
  model?: string;
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
  generateContent(prompt: string, model?: ModelType): Promise<string>;
}

export interface TestCaseResponse {
  testCases: TestCase[];
  error?: string;
}

export type GenerationStep = 'idle' | 'analyzing' | 'generating' | 'complete'; 
