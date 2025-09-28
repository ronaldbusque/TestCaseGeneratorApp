import { generateText } from 'ai';
import {
  AIService,
  AgenticProgressEvent,
  LLMProvider,
  ModelType,
  TestCaseGenerationRequest,
  TestCaseGenerationResponse,
} from '@/lib/types';
import { TestCaseAgenticPipeline } from './pipeline/testCasePipeline';
import { canResolveModel, resolveLanguageModel } from './vercelClient';
import { logAIInteraction } from '@/lib/utils/aiLogger';

export class VercelAIService implements AIService {
  private readonly pipeline = new TestCaseAgenticPipeline();

  constructor(private readonly defaultProvider: LLMProvider = 'openai') {}

  async generateTestCases(
    request: TestCaseGenerationRequest,
    progressCallback?: (event: AgenticProgressEvent) => void
  ): Promise<TestCaseGenerationResponse> {
    const provider = request.provider ?? this.defaultProvider;

    if (!canResolveModel(provider)) {
      return {
        testCases: [],
        error: `Provider ${provider} is not configured. Please supply the appropriate API key in environment variables.`,
      };
    }

    const normalizedRequest: TestCaseGenerationRequest = {
      ...request,
      provider,
    };

    return this.pipeline.generate(normalizedRequest, progressCallback);
  }

  async generateContent(prompt: string, model?: ModelType): Promise<string> {
    const provider = this.defaultProvider;
    if (!canResolveModel(provider)) {
      throw new Error(`Provider ${provider} is not configured.`);
    }

    const languageModel = resolveLanguageModel({ provider, model });
    const result = await generateText({ model: languageModel, prompt });

    logAIInteraction({
      provider,
      model: model ?? 'default',
      prompt,
      response: result.text,
      context: { type: 'content-generation' },
    });

    return result.text;
  }
}
