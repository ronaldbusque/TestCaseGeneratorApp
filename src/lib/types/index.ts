export type AIModel = 'O1-Mini' | 'Gemini';

export type ModelType = 
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'gemini-2.0-flash-thinking-exp-01-21';

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

export interface AIModelConfig {
  id: AIModel;
  name: string;
  description: string;
  isAvailable: boolean;
}

export type TestCaseMode = 'high-level' | 'detailed';
export type TestPriorityMode = 'comprehensive' | 'core-functionality';

export interface TestCaseGenerationRequest {
  requirements: string;
  files?: File[];
  mode: TestCaseMode;
  selectedScenarios?: HighLevelTestCase[];
  priorityMode?: TestPriorityMode;
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
  generateContent?(prompt: string, model: ModelType): Promise<string>;
}

export interface TestCaseResponse {
  testCases: TestCase[];
  error?: string;
}

export type GenerationStep = 'idle' | 'analyzing' | 'generating' | 'complete'; 