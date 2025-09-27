import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import {
  AIService,
  ModelType,
  TestCaseGenerationRequest,
  TestCaseGenerationResponse,
} from '@/lib/types';
import { JsonCleaner } from '@/lib/utils/jsonCleaner';
import { buildTestCasePrompt, mapModelResponseToTestCases } from './utils';
import { logAIInteraction } from '@/lib/utils/aiLogger';

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-pro-latest';

export class GeminiService implements AIService {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    try {
      const prompt = buildTestCasePrompt(request);
      const parts = this.buildParts(prompt, request);
      const requestedModel = request.model ?? DEFAULT_MODEL;
      const modelToUse = this.normalizeModelId(requestedModel);
      const modelInstance = this.getModel(modelToUse);

      const result = await modelInstance.generateContent({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
      });

      const rawOutput = result.response.text() ?? '';

      logAIInteraction({
        provider: 'gemini',
        model: modelToUse,
        prompt,
        response: rawOutput,
        context: { type: 'test-case-generation', mode: request.mode },
      });

      if (!rawOutput) {
        return {
          testCases: [],
          error: 'Received an empty response from Gemini',
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
    const requestedModel = typeof model === 'string' ? model : DEFAULT_MODEL;
    const modelToUse = this.normalizeModelId(requestedModel);
    const result = await this.getModel(modelToUse).generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    const rawOutput = result.response.text() ?? '';

    logAIInteraction({
      provider: 'gemini',
      model: modelToUse,
      prompt,
      response: rawOutput,
      context: { type: 'content-generation' },
    });

    return rawOutput;
  }

  private getModel(model?: string): GenerativeModel {
    return this.client.getGenerativeModel({ model: model ?? DEFAULT_MODEL });
  }

  private normalizeModelId(id: string): string {
    return id.startsWith('models/') ? id.slice('models/'.length) : id;
  }

  private buildParts(prompt: string, request: TestCaseGenerationRequest): Part[] {
    const parts: Part[] = [];

    if (request.files?.length) {
      request.files.forEach((file) => {
        const supportsInlineData = this.supportsInlineAttachment(file.type);

        if (supportsInlineData && file.data) {
          parts.push({
            inlineData: {
              data: file.data,
              mimeType: file.type || 'application/octet-stream',
            },
          });
        }

        if (file.preview) {
          parts.push({ text: `Preview for ${file.name}:\n${file.preview}` });
        }
      });
    }

    parts.push({ text: prompt });
    return parts;
  }

  private supportsInlineAttachment(mimeType?: string): boolean {
    if (!mimeType) {
      return false;
    }

    const normalized = mimeType.toLowerCase();
    if (normalized.startsWith('image/')) {
      // Gemini accepts common web image formats for inline analysis
      return ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(normalized);
    }

    // Other document formats (pdf, docx, etc.) are not reliably supported as inline data
    return false;
  }
}
