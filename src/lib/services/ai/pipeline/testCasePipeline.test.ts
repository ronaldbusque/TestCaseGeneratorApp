import { jest } from '@jest/globals';
import { generateObject, generateText } from 'ai';
import { TestCaseAgenticPipeline } from './testCasePipeline';

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  generateText: jest.fn(),
}));

jest.mock('../vercelClient', () => ({
  resolveLanguageModel: jest.fn().mockReturnValue('mock-model'),
}));

const mockedGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;
const mockedGenerateText = generateText as jest.MockedFunction<typeof generateText>;

const baseRequest = {
  requirements: 'Given a user login feature',
  mode: 'detailed' as const,
  priorityMode: 'comprehensive' as const,
};

describe('TestCaseAgenticPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to single shot mode when agentic is disabled', async () => {
    mockedGenerateText.mockResolvedValue({
      text: JSON.stringify([
        {
          id: 'TC-001',
          title: 'Valid login works',
          area: 'Authentication',
          description: 'ensure login works',
          preconditions: [],
          testData: [],
          steps: [{ number: 1, description: 'Step' }],
          expectedResult: 'Success',
        },
      ]),
    });

    const pipeline = new TestCaseAgenticPipeline();
    const result = await pipeline.generate({ ...baseRequest, agenticOptions: { enableAgentic: false } });

    expect(mockedGenerateText).toHaveBeenCalledTimes(1);
    expect(result.testCases).toHaveLength(1);
    expect(result.telemetry?.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.plan).toBeUndefined();
    expect(result.reviewFeedback).toBeUndefined();
  });

  it('runs planner, writer, and reviewer when agentic mode is enabled', async () => {
    mockedGenerateObject.mockImplementation(async ({ prompt }) => {
      if (prompt.includes('expert QA strategist')) {
        const plan = [
          { id: 'PLAN-1', title: 'Happy path', area: 'Auth', estimatedCases: 2 },
          { id: 'PLAN-2', title: 'Edge cases', area: 'Auth' },
        ];
        return { object: { items: plan }, text: JSON.stringify({ items: plan }) };
      }

      if (prompt.includes('Case') && prompt.includes('Feedback to address')) {
        // Revision prompt
        return { object: { items: [] }, text: JSON.stringify({ items: [] }) };
      }

      if (prompt.includes('reviewing generated')) {
        const review = { feedback: [{ caseId: 'TC-002', severity: 'minor', summary: 'Add boundary case' }], summary: 'Minor issues' };
        return { object: review, text: JSON.stringify(review) };
      }

      // Writer stage
      const cases = [
        {
          id: 'TC-001',
          title: 'Happy login path',
          area: 'Auth',
          description: 'Login works with valid credentials',
          preconditions: [],
          testData: [],
          steps: [{ number: 1, description: 'Enter credentials' }],
          expectedResult: 'Access granted',
        },
      ];
      return { object: { items: cases }, text: JSON.stringify({ items: cases }) };
    });

    const pipeline = new TestCaseAgenticPipeline();

    const result = await pipeline.generate({
      ...baseRequest,
      agenticOptions: {
        enableAgentic: true,
        maxReviewPasses: 1,
      },
      provider: 'openai',
    });

    expect(mockedGenerateObject).toHaveBeenCalled();
    expect(result.plan).toHaveLength(2);
    expect(result.testCases).toHaveLength(1);
    expect(result.reviewFeedback).toHaveLength(1);
    expect(result.passesExecuted).toBe(1);
    expect(result.telemetry?.reviewPasses?.[0]?.feedbackCount).toBe(1);
    expect(result.telemetry?.writerSlices?.length).toBe(2);
  });
});
