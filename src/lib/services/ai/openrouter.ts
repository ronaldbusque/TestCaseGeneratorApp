import {
  AIService,
  ModelType,
  TestCaseGenerationRequest,
  TestCaseGenerationResponse,
} from '@/lib/types';
import { JsonCleaner } from '@/lib/utils/jsonCleaner';
import { buildTestCasePrompt, mapModelResponseToTestCases } from './utils';
import { logAIInteraction } from '@/lib/utils/aiLogger';

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? process.env.OPENAI_COMPAT_MODEL ?? 'openrouter/auto';
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? process.env.OPENAI_COMPAT_API_BASE_URL ?? 'https://openrouter.ai/api/v1';
const ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/chat/completions`;

export class OpenRouterService implements AIService {
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_COMPAT_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY (or OPENAI_COMPAT_API_KEY) is not configured');
    }

    this.apiKey = apiKey;
    this.defaultModel = DEFAULT_MODEL;
  }

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    try {
      const prompt = buildTestCasePrompt(request);

      const rawOutput = await this.callOpenRouter(prompt, request.model);

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

      return {
        testCases: mapModelResponseToTestCases(parsed, request.mode),
      };
    } catch (error) {
      return {
        testCases: [],
        error: error instanceof Error ? error.message : 'Failed to generate test cases',
      };
    }
  }

  async generateContent(prompt: string, model?: ModelType): Promise<string> {
    return this.callOpenRouter(prompt, typeof model === 'string' ? model : undefined);
  }

  private async callOpenRouter(prompt: string, model?: string): Promise<string> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://qualityforge.ai',
        'X-Title': 'QualityForge AI Tools',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that MUST return valid JSON when asked. Do not include markdown fences.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    if (!message) {
      throw new Error('OpenRouter response missing content');
    }

    await logAIInteraction({
      provider: 'openrouter',
      model: model ?? this.defaultModel,
      prompt,
      response: message,
      context: { type: 'content-generation' },
    });

    return message;
  }
}
