// Export SQL types
export * from './sql';
export * from './providers';

import { LLMProvider } from './providers';

export type AIModel = 'VercelAI';

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
export type ReviewSeverity = 'info' | 'minor' | 'major' | 'critical';

export interface GenerationPlanItem {
  id: string;
  title: string;
  area: string;
  focus?: string;
  estimatedCases?: number;
  chunkRefs?: string[];
  notes?: string;
}

export interface ReviewFeedbackItem {
  caseId: string;
  issueType?: string;
  severity: ReviewSeverity;
  summary: string;
  suggestion?: string;
}

export interface AgenticGenerationOptions {
  enableAgentic?: boolean;
  plannerProvider?: LLMProvider;
  plannerModel?: string;
  writerProvider?: LLMProvider;
  writerModel?: string;
  reviewerProvider?: LLMProvider;
  reviewerModel?: string;
  maxReviewPasses?: number;
  chunkStrategy?: 'auto' | 'fixed' | 'none';
  streamProgress?: boolean;
  writerConcurrency?: number;
}

export interface WriterSliceTelemetry {
  planId: string;
  durationMs: number;
  caseCount: number;
  warnings?: string[];
}

export interface ReviewPassTelemetry {
  pass: number;
  durationMs: number;
  feedbackCount: number;
  blockingCount: number;
}

export interface AgenticTelemetry {
  totalDurationMs: number;
  plannerDurationMs?: number;
  writerDurationMs?: number;
  writerConcurrency?: number;
  reviewerDurationMs?: number;
  planItemCount?: number;
  testCaseCount?: number;
  writerSlices?: WriterSliceTelemetry[];
  reviewPasses?: ReviewPassTelemetry[];
  provider?: LLMProvider;
  models?: {
    planner?: string;
    writer?: string;
    reviewer?: string;
  };
  warnings?: string[];
}

export type AgenticProgressEvent =
  | { type: 'planner:start' }
  | { type: 'planner:complete'; planItems: number }
  | { type: 'writer:start'; totalSlices: number; concurrency: number }
  | { type: 'writer:slice-start'; planId: string; index: number; totalSlices: number }
  | { type: 'writer:slice-complete'; planId: string; index: number; totalSlices: number; cases: number }
  | { type: 'writer:complete'; totalSlices: number; totalCases: number }
  | { type: 'review:pass-start'; pass: number; maxPasses: number }
  | { type: 'review:pass-complete'; pass: number; feedbackCount: number; blockingCount: number; maxPasses: number }
  | { type: 'revision:start'; pass: number; totalChunks: number; focusCaseCount: number }
  | { type: 'revision:chunk-start'; pass: number; chunkIndex: number; totalChunks: number; focusCaseCount: number }
  | { type: 'revision:chunk-complete'; pass: number; chunkIndex: number; totalChunks: number; updatedCases: number }
  | { type: 'revision:complete'; pass: number; updatedCases: number; totalChunks: number }
  | { type: 'final'; result: TestCaseGenerationResponse }
  | { type: 'error'; message: string };

export interface UploadedFilePayload {
  name: string;
  type: string;
  preview: string;
  data?: string; // base64 encoded without data URL prefix
  size?: number;
}

export interface FileTokenBreakdown {
  name?: string;
  type?: string;
  size?: number;
  tokens: number;
  characters: number;
}

export interface FileTokenSummary {
  files: FileTokenBreakdown[];
  totals: {
    fileTokens: number;
    requirementsTokens: number;
    combinedTokens: number;
    contextLimit: number | null;
  };
  provider: LLMProvider;
  model?: string;
}

export interface TestCaseGenerationRequest {
  requirements: string;
  files?: UploadedFilePayload[];
  mode: TestCaseMode;
  selectedScenarios?: HighLevelTestCase[];
  priorityMode?: TestPriorityMode;
  provider?: LLMProvider;
  model?: string;
  agenticOptions?: AgenticGenerationOptions;
  userIdentifier?: string;
}

export interface TestCaseGenerationResponse {
  testCases: TestCase[];
  error?: string;
  plan?: GenerationPlanItem[];
  reviewFeedback?: ReviewFeedbackItem[];
  passesExecuted?: number;
  warnings?: string[];
  telemetry?: AgenticTelemetry;
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
  generateTestCases(
    request: TestCaseGenerationRequest,
    progressCallback?: (event: AgenticProgressEvent) => void
  ): Promise<TestCaseGenerationResponse>;
  generateContent(prompt: string, model?: ModelType): Promise<string>;
}

export interface TestCaseResponse {
  testCases: TestCase[];
  error?: string;
}

export type GenerationStep = 'idle' | 'analyzing' | 'generating' | 'complete'; 
