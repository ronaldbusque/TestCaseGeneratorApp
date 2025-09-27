import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import {
  AIService,
  ModelType,
  TestCaseGenerationRequest,
  TestCaseGenerationResponse,
} from '@/lib/types';
import { JsonCleaner } from '@/lib/utils/jsonCleaner';
import {
  buildTestCasePrompt,
  mapModelResponseToTestCases,
} from './utils';

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const TEST_CASE_AGENT_INSTRUCTIONS = `You are an expert QA engineer. Generate thorough and well-structured test scenarios and detailed test cases based on the supplied requirements. Always return a JSON array matching the requested schema without extra commentary. Use the provided files and scenarios as authoritative sources.`;
const GENERAL_AGENT_INSTRUCTIONS = 'You are a helpful assistant. Follow the user prompt precisely and return results in the requested format. If the prompt requests JSON, respond with valid JSON only.';

export class AgentsService implements AIService {
  private readonly testCaseAgent: Agent;
  private readonly generalAgent: Agent;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    setDefaultOpenAIKey(apiKey);
    this.model = DEFAULT_MODEL;

    this.testCaseAgent = new Agent({
      name: 'QualityForge Test Case Generator',
      instructions: TEST_CASE_AGENT_INSTRUCTIONS,
      model: this.model,
    });

    this.generalAgent = new Agent({
      name: 'QualityForge General Generator',
      instructions: GENERAL_AGENT_INSTRUCTIONS,
      model: this.model,
    });
  }

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    try {
      const {
        requirements,
        files,
        selectedScenarios,
        mode,
        priorityMode = 'comprehensive',
      } = request;

      const prompt = buildTestCasePrompt({
        requirements,
        files,
        selectedScenarios,
        mode,
        priorityMode,
      });

      const result = await run(this.testCaseAgent, prompt, {
        maxTurns: 4,
      });

      const rawOutput = result.finalOutput?.trim() ?? '';

      if (!rawOutput) {
        return {
          testCases: [],
          error: 'Received an empty response from the model',
        };
      }

      let parsed: any[];
      try {
        const cleaned = JsonCleaner.cleanJsonResponse(rawOutput);
        parsed = JSON.parse(cleaned);
      } catch (error) {
        return {
          testCases: [],
          error: 'Failed to parse JSON response',
          debug: {
            rawResponse: rawOutput,
            parseError: error instanceof Error ? error.message : 'Unknown parse error',
          },
        };
      }

      if (!Array.isArray(parsed)) {
        return {
          testCases: [],
          error: 'Model response was not an array',
          debug: {
            rawResponse: rawOutput,
            parsedResponse: parsed,
          },
        };
      }

      const testCases = mapModelResponseToTestCases(parsed, mode);

      return {
        testCases,
      };
    } catch (error) {
      return {
        testCases: [],
        error: error instanceof Error ? error.message : 'Failed to generate test cases',
      };
    }
  }

  async generateContent(prompt: string, model?: ModelType): Promise<string> {
    const agent = model && model !== this.model
      ? new Agent({
          name: 'QualityForge General Generator',
          instructions: GENERAL_AGENT_INSTRUCTIONS,
          model,
        })
      : this.generalAgent;

    const result = await run(agent, prompt, {
      maxTurns: 3,
    });

    return result.finalOutput?.trim() ?? '';
  }
}
