import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import {
  AgenticGenerationOptions,
  AgenticTelemetry,
  GenerationPlanItem,
  LLMProvider,
  ReviewFeedbackItem,
  ReviewPassTelemetry,
  TestCaseGenerationRequest,
  TestCaseGenerationResponse,
  TestCaseMode,
  WriterSliceTelemetry,
} from '@/lib/types';
import { resolveLanguageModel } from '../vercelClient';
import {
  buildTestCasePrompt,
  mapModelResponseToTestCases,
  summarizeFiles,
  summarizeScenarios,
} from '../utils';
import { logAIInteraction } from '@/lib/utils/aiLogger';
import { JsonCleaner } from '@/lib/utils/jsonCleaner';

const PlannerItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  area: z.string().min(1),
  focus: z.string().optional(),
  estimatedCases: z.number().int().positive().optional(),
  chunkRefs: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
}).strict();

const PlannerSchema = z.object({
  items: z.array(PlannerItemSchema),
}).strict();

const ReviewFeedbackSchema = z.object({
  caseId: z.string().min(1),
  issueType: z.string(),
  severity: z.enum(['info', 'minor', 'major', 'critical']).default('info'),
  summary: z.string().min(1),
  suggestion: z.string(),
}).strict();

const ReviewResultSchema = z.object({
  feedback: z.array(ReviewFeedbackSchema),
  summary: z.string().optional(),
}).strict();

const DetailedTestCaseItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  area: z.string().min(1),
  description: z.string(),
  preconditions: z.array(z.string()).default([]),
  testData: z.array(z.string()).default([]),
  steps: z
    .array(
      z.object({
        number: z.coerce.number().int().positive(),
        description: z.string().min(1),
      }).strict()
    )
    .default([]),
  expectedResult: z.string().default(''),
}).strict();

const DetailedTestCaseSchema = z.object({
  items: z.array(DetailedTestCaseItemSchema),
}).strict();

const HighLevelTestCaseItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  area: z.string().min(1),
  scenario: z.string().min(1),
  description: z.string(),
}).strict();

const HighLevelTestCaseSchema = z.object({
  items: z.array(HighLevelTestCaseItemSchema),
}).strict();

interface PipelineContext {
  request: TestCaseGenerationRequest;
  agenticOptions: AgenticGenerationOptions | undefined;
  provider: LLMProvider;
  plannerModel: string;
  plannerProvider: LLMProvider;
  writerModel: string;
  writerProvider: LLMProvider;
  reviewerModel: string;
  reviewerProvider: LLMProvider;
}

interface GenerationArtifacts {
  plan: GenerationPlanItem[];
  rawCases: any[];
  reviewFeedback: ReviewFeedbackItem[];
  passesExecuted: number;
  warnings: string[];
  telemetry: AgenticTelemetry;
}

type GenerateObjectOptions<T> = Parameters<typeof generateObject<T>>[0] & {
  schema: z.ZodType<T>;
  retryInstruction?: string;
};

function tryParseCleaned<T>(error: any, schema: z.ZodType<T>) {
  if (error?.name === 'AI_JSONParseError' && typeof error?.text === 'string') {
    try {
      const cleaned = JsonCleaner.cleanJsonResponse(error.text);
      const parsed = JSON.parse(cleaned);
      const validated = schema.parse(parsed);
      return {
        object: validated,
        text: JSON.stringify(validated),
      };
    } catch {
      return null;
    }
  }
  return null;
}

async function safeGenerateObject<T>(options: GenerateObjectOptions<T>) {
  const { retryInstruction, ...baseOptions } = options;
  try {
    return await generateObject<T>(baseOptions);
  } catch (error: any) {
    const parsed = tryParseCleaned(error, options.schema);
    if (parsed) {
      return parsed;
    }

    if (retryInstruction) {
      try {
        const retryResult = await generateObject<T>({
          ...baseOptions,
          prompt: `${baseOptions.prompt}\n\n${retryInstruction}`,
        });
        return retryResult;
      } catch (retryError: any) {
        const retryParsed = tryParseCleaned(retryError, options.schema);
        if (retryParsed) {
          return retryParsed;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

export class TestCaseAgenticPipeline {
  async generate(
    request: TestCaseGenerationRequest
  ): Promise<TestCaseGenerationResponse> {
    const agenticOptions = request.agenticOptions;

    if (!agenticOptions?.enableAgentic) {
      return this.generateSingleShot(request);
    }

    const startTime = Date.now();
    const context = this.buildContext(request, agenticOptions);
    const artifacts = await this.runAgenticWorkflow(context);
    const totalDurationMs = Date.now() - startTime;

    const warnings = artifacts.warnings;

    const telemetry: AgenticTelemetry = {
      totalDurationMs,
      plannerDurationMs: artifacts.telemetry.plannerDurationMs,
      writerDurationMs: artifacts.telemetry.writerDurationMs,
      reviewerDurationMs: artifacts.telemetry.reviewerDurationMs,
      planItemCount: artifacts.plan.length,
      testCaseCount: artifacts.rawCases.length,
      writerSlices: artifacts.telemetry.writerSlices,
      reviewPasses: artifacts.telemetry.reviewPasses,
      provider: context.provider,
      models: {
        planner: context.plannerModel,
        writer: context.writerModel,
        reviewer: context.reviewerModel,
      },
      warnings: warnings.length ? warnings : undefined,
    };

    return {
      testCases: mapModelResponseToTestCases(artifacts.rawCases, request.mode),
      plan: artifacts.plan,
      reviewFeedback: artifacts.reviewFeedback,
      passesExecuted: artifacts.passesExecuted,
      warnings: warnings.length ? warnings : undefined,
      telemetry,
    };
  }

  private buildContext(
    request: TestCaseGenerationRequest,
    options?: AgenticGenerationOptions
  ): PipelineContext {
    const baseProvider = request.provider ?? 'openai';

    const plannerProvider = options?.plannerProvider ?? baseProvider;
    const writerProvider = options?.writerProvider ?? baseProvider;
    const reviewerProvider = options?.reviewerProvider ?? writerProvider;

    const plannerModel = options?.plannerModel ?? this.inferDefaultModel(plannerProvider);
    const writerModel = options?.writerModel ?? (request.model ?? this.inferDefaultModel(writerProvider));
    const reviewerModel = options?.reviewerModel ?? writerModel;

    return {
      request,
      agenticOptions: options,
      provider: baseProvider,
      plannerModel,
      plannerProvider,
      writerModel,
      writerProvider,
      reviewerModel,
      reviewerProvider,
    };
  }

  private inferDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'gemini':
        return process.env.GEMINI_MODEL ?? 'models/gemini-1.5-pro-latest';
      case 'openrouter':
        return process.env.OPENROUTER_MODEL ?? 'openrouter/auto';
      case 'openai':
      default:
        return process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
    }
  }

  private async runAgenticWorkflow(context: PipelineContext): Promise<GenerationArtifacts> {
    const { request } = context;

    const plannerStart = Date.now();
    const plan = await this.runPlanner(context);
    const plannerDurationMs = Date.now() - plannerStart;

    const writerStart = Date.now();
    const writerOutcome = await this.runWriter(context, plan);
    const writerDurationMs = Date.now() - writerStart;

    const reviewerStart = Date.now();
    const reviewOutcome = await this.runReviewer(context, writerOutcome.rawCases, plan);
    const reviewerDurationMs = Date.now() - reviewerStart;

    const warnings = [...writerOutcome.warnings, ...reviewOutcome.warnings];

    return {
      plan,
      rawCases: writerOutcome.rawCases,
      reviewFeedback: reviewOutcome.feedback,
      passesExecuted: reviewOutcome.passesExecuted,
      warnings,
      telemetry: {
        totalDurationMs: 0,
        plannerDurationMs,
        writerDurationMs,
        reviewerDurationMs,
        writerSlices: writerOutcome.slices,
        reviewPasses: reviewOutcome.reviewTelemetry,
      },
    };
  }

  private async runPlanner(context: PipelineContext): Promise<GenerationPlanItem[]> {
    const { request, plannerModel, plannerProvider } = context;
    const requirements = request.requirements ?? '';
    const filesSummary = summarizeFiles(request.files);
    const scenarioSummary = summarizeScenarios(request.selectedScenarios);

    const priorityMode = request.priorityMode ?? 'comprehensive';

    const promptSections = [
      'You are an expert QA strategist. Break the supplied materials into a concise execution plan for generating test cases.',
      `Priority mode: ${priorityMode}. If comprehensive, ensure broad coverage including edge cases. If core-functionality, focus on critical user journeys and regulatory must-haves. Produce a JSON object with an "items" array of plan entries (id, title, area, focus, estimatedCases, chunkRefs when applicable).`,
      'Keep each focus under 160 characters and notes under 220 characters. Do not enumerate every acceptance criterion; summarize only the key goals for coverage.',
      requirements ? `Requirements:\n${requirements}` : 'No requirements provided.',
      filesSummary ? `Reference documents:\n${filesSummary}` : '',
      scenarioSummary,
    ].filter(Boolean);

    const prompt = promptSections.join('\n\n');

    const model = resolveLanguageModel({
      provider: plannerProvider,
      model: plannerModel,
    });

    const result = await safeGenerateObject({
      model,
      schema: PlannerSchema,
      prompt,
      retryInstruction: 'Return ONLY a JSON object with an "items" array of plan entries matching the schema. Do not repeat phrases or include commentary.',
    });

    logAIInteraction({
      provider: plannerProvider,
      model: plannerModel,
      prompt,
      response: result.text ?? JSON.stringify(result.object),
      context: { type: 'test-case-generation', stage: 'planner' },
    });

    const planItems = (result.object.items ?? []).map((item, index) => ({
      ...item,
      id: item.id || `PLAN-${index + 1}`,
    }));

    return planItems;
  }

  private async runWriter(
    context: PipelineContext,
    plan: GenerationPlanItem[]
  ): Promise<{ rawCases: any[]; warnings: string[]; slices: WriterSliceTelemetry[] }> {
    const { request, writerModel, writerProvider } = context;
    const warnings: string[] = [];
    const casesById = new Map<string, any>();
    const slices: WriterSliceTelemetry[] = [];

    const schema = this.getCaseSchema(request.mode);

    for (const planItem of plan) {
      const prompt = this.buildWriterPrompt(request, planItem, Array.from(casesById.values()));
      const model = resolveLanguageModel({ provider: writerProvider, model: writerModel });
      const sliceStart = Date.now();
      const sliceWarnings: string[] = [];

      let result;
      try {
        result = await safeGenerateObject({
          model,
          schema,
          prompt,
          retryInstruction: 'Return ONLY a JSON object with an "items" array of test cases that matches the schema. Do not include any explanation or repeated sentences.',
        });
      } catch (error) {
        const durationMs = Date.now() - sliceStart;
        const message = error instanceof Error ? error.message : 'Unknown generation error';
        const warning = `Failed to generate cases for plan ${planItem.id}: ${message}`;
        warnings.push(warning);
        slices.push({
          planId: planItem.id,
          durationMs,
          caseCount: 0,
          warnings: [warning],
        });
        continue;
      }

      logAIInteraction({
        provider: writerProvider,
        model: writerModel,
        prompt,
        response: result.text ?? JSON.stringify(result.object),
        context: {
          type: 'test-case-generation',
          stage: 'writer',
          planId: planItem.id,
        },
      });

      (result.object.items ?? []).forEach((testCase, index) => {
        const caseId = testCase.id || this.generateCaseId(request.mode, casesById.size + index + 1);
        if (casesById.has(caseId)) {
          const duplicateWarning = `Duplicate case id ${caseId} detected. Latest slice overwrote the previous version.`;
          warnings.push(duplicateWarning);
          sliceWarnings.push(duplicateWarning);
        }
        casesById.set(caseId, { ...testCase, id: caseId });
      });

      const durationMs = Date.now() - sliceStart;
      slices.push({
        planId: planItem.id,
        durationMs,
        caseCount: result.object.items?.length ?? 0,
        warnings: sliceWarnings.length ? sliceWarnings : undefined,
      });
    }

    return { rawCases: Array.from(casesById.values()), warnings, slices };
  }

  private async runReviewer(
    context: PipelineContext,
    rawCases: any[],
    plan: GenerationPlanItem[]
  ): Promise<{ feedback: ReviewFeedbackItem[]; passesExecuted: number; reviewTelemetry: ReviewPassTelemetry[]; warnings: string[] }> {
    const { request, reviewerModel, reviewerProvider, writerModel, writerProvider, agenticOptions } = context;
    const maxPasses = agenticOptions?.maxReviewPasses ?? 0;

    if (maxPasses <= 0 || rawCases.length === 0) {
      return { feedback: [], passesExecuted: 0, reviewTelemetry: [], warnings: [] };
    }

    const feedbackAccumulator: ReviewFeedbackItem[] = [];
    let passesExecuted = 0;
    let mutableCases = [...rawCases];
    const reviewTelemetry: ReviewPassTelemetry[] = [];
    const warnings: string[] = [];

    const reviewSchema = ReviewResultSchema;
    const caseSchema = this.getCaseSchema(request.mode);

    for (let pass = 1; pass <= maxPasses; pass += 1) {
      const prompt = this.buildReviewerPrompt(request, plan, mutableCases, pass);
      const model = resolveLanguageModel({ provider: reviewerProvider, model: reviewerModel });
      const passStart = Date.now();

      let reviewResult;
      try {
        reviewResult = await safeGenerateObject({
          model,
          schema: reviewSchema,
          prompt,
          retryInstruction: 'Respond with JSON matching the schema (feedback array + summary). Do not add commentary outside the JSON.',
        });
      } catch (error) {
        const durationMs = Date.now() - passStart;
        const message = error instanceof Error ? error.message : 'Unknown review error';
        const warning = `Reviewer pass ${pass} failed: ${message}`;
        warnings.push(warning);
        reviewTelemetry.push({
          pass,
          durationMs,
          feedbackCount: 0,
          blockingCount: 0,
        });
        break;
      }

      logAIInteraction({
        provider: reviewerProvider,
        model: reviewerModel,
        prompt,
        response: reviewResult.text ?? JSON.stringify(reviewResult.object),
        context: {
          type: 'test-case-generation',
          stage: 'reviewer',
          pass,
        },
      });

      const feedback = reviewResult.object.feedback ?? [];
      const normalizedFeedback = feedback.map((entry) => ({
        ...entry,
        issueType: entry.issueType?.trim() || 'general',
        suggestion: entry.suggestion?.trim() || 'No additional suggestion provided.',
      }));
      const durationMs = Date.now() - passStart;
      feedbackAccumulator.push(...normalizedFeedback.map((entry) => ({
        ...entry,
        severity: entry.severity ?? 'info',
      })));

      const blocking = normalizedFeedback.filter((entry) => entry.severity === 'critical' || entry.severity === 'major');
      reviewTelemetry.push({
        pass,
        durationMs,
        feedbackCount: feedback.length,
        blockingCount: blocking.length,
      });

      passesExecuted = pass;

      if (!blocking.length) {
        break;
      }

      const revisionPrompt = this.buildRevisionPrompt(request, mutableCases, blocking, pass);
      const writerModelInstance = resolveLanguageModel({ provider: writerProvider, model: writerModel });

      let revisionResult;
      try {
        revisionResult = await safeGenerateObject({
          model: writerModelInstance,
          schema: caseSchema,
          prompt: revisionPrompt,
          retryInstruction: 'Return ONLY a JSON object with an "items" array of updated cases. No additional text.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown revision error';
        warnings.push(`Revision pass ${pass} failed: ${message}`);
        break;
      }

      logAIInteraction({
        provider: writerProvider,
        model: writerModel,
        prompt: revisionPrompt,
        response: revisionResult.text ?? JSON.stringify(revisionResult.object),
        context: {
          type: 'test-case-generation',
          stage: 'writer-revision',
          pass,
        },
      });

      const revisions = revisionResult.object.items ?? [];
      const revisedCases = new Map(mutableCases.map((item) => [item.id, item] as const));
      revisions.forEach((updated) => {
        if (!updated.id) {
          return;
        }
        revisedCases.set(updated.id, updated);
      });
      mutableCases = Array.from(revisedCases.values());
    }

    rawCases.splice(0, rawCases.length, ...mutableCases);

    return { feedback: feedbackAccumulator, passesExecuted, reviewTelemetry, warnings };
  }

  private getCaseSchema(mode: TestCaseMode) {
    return mode === 'high-level' ? HighLevelTestCaseSchema : DetailedTestCaseSchema;
  }

  private generateCaseId(mode: TestCaseMode, index: number): string {
    const prefix = mode === 'high-level' ? 'TS' : 'TC';
    return `${prefix}-${String(index).padStart(3, '0')}`;
  }

  private buildWriterPrompt(
    request: TestCaseGenerationRequest,
    planItem: GenerationPlanItem,
    existingCases: any[]
  ): string {
    const requirements = request.requirements ?? '';
    const filesSummary = summarizeFiles(request.files);
    const scenarioSummary = summarizeScenarios(request.selectedScenarios);
    const priorityMode = request.priorityMode ?? 'comprehensive';

    const sections = [
      'You are a senior QA engineer. Generate additional test cases for the provided plan item.',
      `Plan item: ${planItem.id} - ${planItem.title} (${planItem.area}). Focus: ${planItem.focus ?? 'General coverage'} `,
      `Mode: ${request.mode}. Priority: ${priorityMode}. If comprehensive, include happy, alternate, and negative flows. If core-functionality, concentrate on essential success paths and blockers.`,
      'Group closely-related validations into the same test case when they belong to one workflow. Only split cases when outcomes or personas differ materially (e.g., happy vs negative vs edge). Use the description to summarize key checks in a single paragraph separated by semicolons.',
      requirements ? `Requirements:\n${requirements}` : '',
      filesSummary ? `Reference documents:\n${filesSummary}` : '',
      scenarioSummary,
      existingCases.length
        ? `Existing cases (avoid duplicates):\n${JSON.stringify(existingCases, null, 2)}`
        : 'No cases generated yet. Begin fresh coverage for this plan item.',
      'Return a JSON object with an "items" array where each entry matches the required schema for the requested mode. Do not include markdown.',
    ].filter(Boolean);

    return sections.join('\n\n');
  }

  private buildReviewerPrompt(
    request: TestCaseGenerationRequest,
    plan: GenerationPlanItem[],
    cases: any[],
    passNumber: number
  ): string {
    const sections = [
      `You are reviewing generated ${request.mode} test cases. Pass number: ${passNumber}.`,
      'Assess coverage completeness, edge cases, and alignment with the plan. Identify missing or incorrect validations.',
      `Plan:\n${JSON.stringify(plan, null, 2)}`,
      `Current test cases:\n${JSON.stringify(cases, null, 2)}`,
      'Return JSON with a "feedback" array of issues (caseId, issueType, severity, summary, suggestion). Always supply issueType (e.g., coverage-gap, duplication, formatting) and a suggestion string (use "No suggestion" if none). Severity must be one of info, minor, major, critical.',
    ];

    return sections.join('\n\n');
  }

  private buildRevisionPrompt(
    request: TestCaseGenerationRequest,
    cases: any[],
    feedback: ReviewFeedbackItem[],
    passNumber: number
  ): string {
    const sections = [
      'Revise the following test cases to resolve the reviewer feedback. Only return cases that change.',
      `Pass number: ${passNumber}. Mode: ${request.mode}.`,
      `Current cases:\n${JSON.stringify(cases, null, 2)}`,
      `Feedback to address:\n${JSON.stringify(feedback, null, 2)}`,
      'Return a JSON array of updated cases adhering to the required schema. Include all referenced caseIds exactly once.',
    ];

    return sections.join('\n\n');
  }

  private async generateSingleShot(
    request: TestCaseGenerationRequest
  ): Promise<TestCaseGenerationResponse> {
    const provider = request.provider ?? 'openai';
    const modelId = request.model ?? this.inferDefaultModel(provider);
    const startTime = Date.now();

    const prompt = buildTestCasePrompt({
      requirements: request.requirements,
      files: request.files,
      selectedScenarios: request.selectedScenarios,
      mode: request.mode,
      priorityMode: request.priorityMode,
    });

    const model = resolveLanguageModel({ provider, model: modelId });

    const result = await generateText({
      model,
      prompt,
    });

    const rawOutput = result.text.trim();
    const totalDurationMs = Date.now() - startTime;

    logAIInteraction({
      provider,
      model: modelId,
      prompt,
      response: rawOutput,
      context: { type: 'test-case-generation', stage: 'single-shot' },
    });

    if (!rawOutput) {
      return {
        testCases: [],
        error: 'Received an empty response from the model',
      };
    }

    let parsed: any[];
    try {
      parsed = JSON.parse(rawOutput);
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

    const testCases = mapModelResponseToTestCases(parsed, request.mode);

    return {
      testCases,
      telemetry: {
        totalDurationMs,
        provider,
        models: { writer: modelId },
        testCaseCount: testCases.length,
      },
    };
  }
}
