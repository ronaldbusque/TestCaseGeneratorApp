import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import {
  AgenticGenerationOptions,
  GenerationPlanItem,
  LLMProvider,
  ReviewFeedbackItem,
  TestCaseGenerationRequest,
  TestCaseGenerationResponse,
  TestCaseMode,
  TestPriorityMode,
} from '@/lib/types';
import { resolveLanguageModel } from '../vercelClient';
import {
  buildTestCasePrompt,
  mapModelResponseToTestCases,
  summarizeFiles,
  summarizeScenarios,
} from '../utils';
import { logAIInteraction } from '@/lib/utils/aiLogger';

const PlannerSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    area: z.string().min(1),
    focus: z.string().optional(),
    estimatedCases: z.number().int().positive().optional(),
    chunkRefs: z.array(z.string().min(1)).optional(),
    notes: z.string().optional(),
  })
);

const ReviewFeedbackSchema = z.object({
  caseId: z.string().min(1),
  issueType: z.string().optional(),
  severity: z.enum(['info', 'minor', 'major', 'critical']).default('info'),
  summary: z.string().min(1),
  suggestion: z.string().optional(),
});

const ReviewResultSchema = z.object({
  feedback: z.array(ReviewFeedbackSchema),
  summary: z.string().optional(),
});

const DetailedTestCaseSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    area: z.string().min(1),
    description: z.string().default(''),
    preconditions: z.array(z.string()).default([]),
    testData: z.array(z.string()).default([]),
    steps: z
      .array(
        z.object({
          number: z.coerce.number().int().positive(),
          description: z.string().min(1),
        })
      )
      .default([]),
    expectedResult: z.string().default(''),
  })
);

const HighLevelTestCaseSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    area: z.string().min(1),
    scenario: z.string().min(1),
    description: z.string().optional(),
  })
);

interface PipelineContext {
  request: TestCaseGenerationRequest;
  agenticOptions: AgenticGenerationOptions | undefined;
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
}

export class TestCaseAgenticPipeline {
  async generate(
    request: TestCaseGenerationRequest
  ): Promise<TestCaseGenerationResponse> {
    const agenticOptions = request.agenticOptions;

    if (!agenticOptions?.enableAgentic) {
      return this.generateSingleShot(request);
    }

    const context = this.buildContext(request, agenticOptions);
    const artifacts = await this.runAgenticWorkflow(context);

    return {
      testCases: mapModelResponseToTestCases(artifacts.rawCases, request.mode),
      plan: artifacts.plan,
      reviewFeedback: artifacts.reviewFeedback,
      passesExecuted: artifacts.passesExecuted,
      warnings: artifacts.warnings.length ? artifacts.warnings : undefined,
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

    const plan = await this.runPlanner(context);
    const { rawCases, warnings } = await this.runWriter(context, plan);
    const reviewOutcome = await this.runReviewer(context, rawCases, plan);

    return {
      plan,
      rawCases,
      reviewFeedback: reviewOutcome.feedback,
      passesExecuted: reviewOutcome.passesExecuted,
      warnings,
    };
  }

  private async runPlanner(context: PipelineContext): Promise<GenerationPlanItem[]> {
    const { request, plannerModel, plannerProvider } = context;
    const requirements = request.requirements ?? '';
    const filesSummary = summarizeFiles(request.files);
    const scenarioSummary = summarizeScenarios(request.selectedScenarios);

    const promptSections = [
      'You are an expert QA strategist. Break the supplied materials into a concise execution plan for generating test cases.',
      `Priority mode: ${request.priorityMode ?? 'comprehensive'}.` +
        ' Produce a JSON array of plan items with id, title, area, focus, estimatedCases, and chunkRefs when applicable.',
      requirements ? `Requirements:\n${requirements}` : 'No requirements provided.',
      filesSummary ? `Reference documents:\n${filesSummary}` : '',
      scenarioSummary,
    ].filter(Boolean);

    const prompt = promptSections.join('\n\n');

    const model = resolveLanguageModel({
      provider: plannerProvider,
      model: plannerModel,
    });

    const result = await generateObject({
      model,
      schema: PlannerSchema,
      prompt,
    });

    logAIInteraction({
      provider: plannerProvider,
      model: plannerModel,
      prompt,
      response: result.text ?? JSON.stringify(result.object),
      context: { type: 'test-case-generation', stage: 'planner' },
    });

    const planItems = result.object.map((item, index) => ({
      ...item,
      id: item.id || `PLAN-${index + 1}`,
    }));

    return planItems;
  }

  private async runWriter(
    context: PipelineContext,
    plan: GenerationPlanItem[]
  ): Promise<{ rawCases: any[]; warnings: string[] }> {
    const { request, writerModel, writerProvider } = context;
    const warnings: string[] = [];
    const casesById = new Map<string, any>();

    const schema = this.getCaseSchema(request.mode);

    for (const planItem of plan) {
      const prompt = this.buildWriterPrompt(request, planItem, Array.from(casesById.values()));
      const model = resolveLanguageModel({ provider: writerProvider, model: writerModel });

      const result = await generateObject({
        model,
        schema,
        prompt,
      });

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

      result.object.forEach((testCase, index) => {
        const caseId = testCase.id || this.generateCaseId(request.mode, casesById.size + index + 1);
        if (casesById.has(caseId)) {
          warnings.push(`Duplicate case id ${caseId} detected. Latest slice overwrote the previous version.`);
        }
        casesById.set(caseId, { ...testCase, id: caseId });
      });
    }

    return { rawCases: Array.from(casesById.values()), warnings };
  }

  private async runReviewer(
    context: PipelineContext,
    rawCases: any[],
    plan: GenerationPlanItem[]
  ): Promise<{ feedback: ReviewFeedbackItem[]; passesExecuted: number }> {
    const { request, reviewerModel, reviewerProvider, writerModel, writerProvider, agenticOptions } = context;
    const maxPasses = agenticOptions?.maxReviewPasses ?? 0;

    if (maxPasses <= 0 || rawCases.length === 0) {
      return { feedback: [], passesExecuted: 0 };
    }

    const feedbackAccumulator: ReviewFeedbackItem[] = [];
    let passesExecuted = 0;
    let mutableCases = [...rawCases];

    const reviewSchema = ReviewResultSchema;
    const caseSchema = this.getCaseSchema(request.mode);

    for (let pass = 1; pass <= maxPasses; pass += 1) {
      const prompt = this.buildReviewerPrompt(request, plan, mutableCases, pass);
      const model = resolveLanguageModel({ provider: reviewerProvider, model: reviewerModel });

      const reviewResult = await generateObject({
        model,
        schema: reviewSchema,
        prompt,
      });

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
      feedbackAccumulator.push(
        ...feedback.map((entry) => ({
          ...entry,
          severity: entry.severity ?? 'info',
        }))
      );

      passesExecuted = pass;

      const blocking = feedback.filter((entry) => entry.severity === 'critical' || entry.severity === 'major');
      if (!blocking.length) {
        break;
      }

      const revisionPrompt = this.buildRevisionPrompt(request, mutableCases, blocking, pass);
      const writerModelInstance = resolveLanguageModel({ provider: writerProvider, model: writerModel });

      const revisionResult = await generateObject({
        model: writerModelInstance,
        schema: caseSchema,
        prompt: revisionPrompt,
      });

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

      const revisions = revisionResult.object;
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

    return { feedback: feedbackAccumulator, passesExecuted };
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

    const sections = [
      'You are a senior QA engineer. Generate additional test cases for the provided plan item.',
      `Plan item: ${planItem.id} - ${planItem.title} (${planItem.area}). Focus: ${planItem.focus ?? 'General coverage'} `,
      `Mode: ${request.mode}. Priority: ${request.priorityMode ?? 'comprehensive'}.`,
      requirements ? `Requirements:\n${requirements}` : '',
      filesSummary ? `Reference documents:\n${filesSummary}` : '',
      scenarioSummary,
      existingCases.length
        ? `Existing cases (avoid duplicates):\n${JSON.stringify(existingCases, null, 2)}`
        : 'No cases generated yet. Begin fresh coverage for this plan item.',
      'Return a JSON array where each object matches the required schema for the requested mode. Do not include markdown.',
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
      'Return JSON with a "feedback" array of issues (caseId, severity, summary, suggestion). Severity must be one of info, minor, major, critical.',
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

    return {
      testCases: mapModelResponseToTestCases(parsed, request.mode),
    };
  }
}
