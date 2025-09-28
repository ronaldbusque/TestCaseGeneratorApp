import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import {
  AgenticGenerationOptions,
  AgenticTelemetry,
  GenerationPlanItem,
  LLMProvider,
  ReviewFeedbackItem,
  ReviewPassTelemetry,
  ReviewSeverity,
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

const ReviewFeedbackSchema = z
  .object({
    caseId: z.string().min(1),
    issueType: z.string().min(1),
    severity: z.enum(['info', 'minor', 'major', 'critical']),
    summary: z.string().min(1),
    suggestion: z.string().min(1),
  })
  .strict()
  .transform((entry) => ({
    ...entry,
    issueType: entry.issueType.trim() || 'general',
    suggestion: entry.suggestion.trim() || 'No suggestion provided.',
  }));

const ReviewResultSchema = z
  .object({
    feedback: z.array(ReviewFeedbackSchema),
    summary: z
      .string()
      .min(1)
      .transform((value) => value.trim() || 'Review summary not provided.'),
  })
  .strict();

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
    request: TestCaseGenerationRequest,
    progressCallback?: (event: AgenticProgressEvent) => void
  ): Promise<TestCaseGenerationResponse> {
    const agenticOptions = request.agenticOptions;

    if (!agenticOptions?.enableAgentic) {
      return this.generateSingleShot(request);
    }

    const startTime = Date.now();
    const context = this.buildContext(request, agenticOptions);
    progressCallback?.({ type: 'planner:start' });
    const artifacts = await this.runAgenticWorkflow(context, progressCallback);
    const totalDurationMs = Date.now() - startTime;

    const warnings = artifacts.warnings;

    const telemetry: AgenticTelemetry = {
      totalDurationMs,
      plannerDurationMs: artifacts.telemetry.plannerDurationMs,
      writerDurationMs: artifacts.telemetry.writerDurationMs,
      writerConcurrency: artifacts.telemetry.writerConcurrency,
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

    const result: TestCaseGenerationResponse = {
      testCases: mapModelResponseToTestCases(artifacts.rawCases, request.mode),
      plan: artifacts.plan,
      reviewFeedback: artifacts.reviewFeedback,
      passesExecuted: artifacts.passesExecuted,
      warnings: warnings.length ? warnings : undefined,
      telemetry,
    };

    progressCallback?.({ type: 'final', result });

    return result;
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

  private async runAgenticWorkflow(
    context: PipelineContext,
    progressCallback?: (event: AgenticProgressEvent) => void
  ): Promise<GenerationArtifacts> {
    const { request } = context;

    const plannerStart = Date.now();
    const plan = await this.runPlanner(context, progressCallback);
    const plannerDurationMs = Date.now() - plannerStart;

    const writerStart = Date.now();
    const writerOutcome = await this.runWriter(context, plan, progressCallback);
    const writerDurationMs = Date.now() - writerStart;

    const reviewerStart = Date.now();
    const reviewOutcome = await this.runReviewer(context, writerOutcome.rawCases, plan, progressCallback);
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
        writerConcurrency: writerOutcome.concurrencyUsed,
        reviewerDurationMs,
        writerSlices: writerOutcome.slices,
        reviewPasses: reviewOutcome.reviewTelemetry,
      },
    };
  }

  private async runPlanner(
    context: PipelineContext,
    progressCallback?: (event: AgenticProgressEvent) => void
  ): Promise<GenerationPlanItem[]> {
    const { request, plannerModel, plannerProvider } = context;
    const requirements = request.requirements ?? '';
    const filesSummary = summarizeFiles(request.files);
    const scenarioSummary = summarizeScenarios(request.selectedScenarios);

    const priorityMode = request.priorityMode ?? 'comprehensive';

    console.log('[Agentic] Planner started', {
      provider: plannerProvider,
      model: plannerModel,
      priorityMode,
    });

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

    console.log('[Agentic] Planner completed', {
      provider: plannerProvider,
      model: plannerModel,
      planItems: planItems.length,
    });

    progressCallback?.({ type: 'planner:complete', planItems: planItems.length });

    return planItems;
  }

  private async runWriter(
    context: PipelineContext,
    plan: GenerationPlanItem[],
    progressCallback?: (event: AgenticProgressEvent) => void
  ): Promise<{ rawCases: any[]; warnings: string[]; slices: WriterSliceTelemetry[]; concurrencyUsed: number }> {
    const { request, writerModel, writerProvider, agenticOptions } = context;
    const warnings: string[] = [];
    const casesById = new Map<string, any>();
    const slices: WriterSliceTelemetry[] = [];

    const schema = this.getCaseSchema(request.mode);
    const requestedConcurrency = agenticOptions?.writerConcurrency ?? 1;
    const concurrency = Math.max(1, Math.min(requestedConcurrency, plan.length));

    console.log('[Agentic] Writer stage started', {
      provider: writerProvider,
      model: writerModel,
      totalSlices: plan.length,
      requestedConcurrency,
      concurrencyUsed: concurrency,
    });

    progressCallback?.({ type: 'writer:start', totalSlices: plan.length, concurrency });

    const runSlice = async (
      planItem: GenerationPlanItem,
      existingCases: any[],
      index: number
    ): Promise<{ planItem: GenerationPlanItem; cases: any[]; durationMs: number; warnings: string[]; index: number }> => {
      console.log('[Agentic] Writer slice started', {
        planId: planItem.id,
      });
      progressCallback?.({
        type: 'writer:slice-start',
        planId: planItem.id,
        index,
        totalSlices: plan.length,
      });
      const prompt = this.buildWriterPrompt(request, planItem, existingCases);
      const model = resolveLanguageModel({ provider: writerProvider, model: writerModel });
      const sliceStart = Date.now();
      const sliceWarnings: string[] = [];

      try {
        const result = await safeGenerateObject({
          model,
          schema,
          prompt,
          retryInstruction: 'Return ONLY a JSON object with an "items" array of test cases that matches the schema. Do not include any explanation or repeated sentences.',
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

        const cases = result.object.items ?? [];
        const durationMs = Date.now() - sliceStart;
        console.log('[Agentic] Writer slice completed', {
          planId: planItem.id,
          cases: cases.length,
          durationMs,
        });
        progressCallback?.({
          type: 'writer:slice-complete',
          planId: planItem.id,
          index,
          totalSlices: plan.length,
          cases: cases.length,
        });
        return { planItem, cases, durationMs, warnings: sliceWarnings, index };
      } catch (error) {
        const durationMs = Date.now() - sliceStart;
        const message = error instanceof Error ? error.message : 'Unknown generation error';
        const warning = `Failed to generate cases for plan ${planItem.id}: ${message}`;
        sliceWarnings.push(warning);
        console.warn('[Agentic] Writer slice failed', {
          planId: planItem.id,
          error: message,
        });
        progressCallback?.({
          type: 'writer:slice-complete',
          planId: planItem.id,
          index,
          totalSlices: plan.length,
          cases: 0,
        });
        return { planItem, cases: [], durationMs, warnings: sliceWarnings, index };
      }
    };

    const mergeSliceResult = (result: { planItem: GenerationPlanItem; cases: any[]; durationMs: number; warnings: string[]; index: number }) => {
      const sliceWarnings = [...result.warnings];
      result.cases.forEach((testCase, index) => {
        const caseId = testCase.id || this.generateCaseId(request.mode, casesById.size + index + 1);
        if (casesById.has(caseId)) {
          const duplicateWarning = `Duplicate case id ${caseId} detected. Latest slice overwrote the previous version.`;
          warnings.push(duplicateWarning);
          sliceWarnings.push(duplicateWarning);
        }
        casesById.set(caseId, { ...testCase, id: caseId });
      });

      if (sliceWarnings.length) {
        warnings.push(...sliceWarnings.filter((w) => !warnings.includes(w)));
      }

      slices.push({
        planId: result.planItem.id,
        durationMs: result.durationMs,
        caseCount: result.cases.length,
        warnings: sliceWarnings.length ? sliceWarnings : undefined,
      });
    };

    if (concurrency <= 1) {
      for (let i = 0; i < plan.length; i += 1) {
        const planItem = plan[i];
        const result = await runSlice(planItem, Array.from(casesById.values()), i);
        mergeSliceResult(result);
      }
    } else {
      const results: Array<{ planItem: GenerationPlanItem; cases: any[]; durationMs: number; warnings: string[]; index: number }> =
        new Array(plan.length);
      let nextIndex = 0;

      const worker = async () => {
        while (true) {
          const current = nextIndex++;
          if (current >= plan.length) {
            break;
          }
          const planItem = plan[current];
          const result = await runSlice(planItem, [], current);
          results[current] = result;
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      results.forEach((result) => {
        if (result) {
          mergeSliceResult(result);
        }
      });
    }

    console.log('[Agentic] Writer stage completed', {
      provider: writerProvider,
      model: writerModel,
      slices: slices.length,
      totalCases: casesById.size,
    });

    progressCallback?.({
      type: 'writer:complete',
      totalSlices: plan.length,
      totalCases: casesById.size,
    });

    return { rawCases: Array.from(casesById.values()), warnings, slices, concurrencyUsed: concurrency };
  }

  private async runReviewer(
    context: PipelineContext,
    rawCases: any[],
    plan: GenerationPlanItem[],
    progressCallback?: (event: AgenticProgressEvent) => void
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
      progressCallback?.({ type: 'review:pass-start', pass, maxPasses });
      console.log('[Agentic] Reviewer pass started', {
        pass,
        provider: reviewerProvider,
        model: reviewerModel,
      });
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
        console.warn('[Agentic] Reviewer pass failed', {
          pass,
          error: message,
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
      progressCallback?.({
        type: 'review:pass-complete',
        pass,
        feedbackCount: normalizedFeedback.length,
        blockingCount: blocking.length,
        maxPasses,
      });
      console.log('[Agentic] Reviewer pass completed', {
        pass,
        durationMs,
        feedbackCount: normalizedFeedback.length,
        blockingCount: blocking.length,
      });

      passesExecuted = pass;

      if (!blocking.length) {
        break;
      }

      const revisionChunks = this.buildRevisionChunks(normalizedFeedback, request, agenticOptions);
      if (!revisionChunks.length) {
        warnings.push(`Revision pass ${pass} skipped: reviewer returned no actionable feedback.`);
        break;
      }
      const writerModelInstance = resolveLanguageModel({ provider: writerProvider, model: writerModel });
      const totalChunks = Math.max(1, revisionChunks.length);
      const focusCaseCount = revisionChunks.reduce((count, chunk) => count + chunk.caseIds.length, 0);

      progressCallback?.({
        type: 'revision:start',
        pass,
        totalChunks,
        focusCaseCount,
      });
      console.log('[Agentic] Revision run started', {
        pass,
        provider: writerProvider,
        model: writerModel,
        totalChunks,
        focusCaseCount,
      });

      const chunkResults: Array<{ updatedCases: any[]; warnings: string[] } | null> = new Array(totalChunks).fill(null);
      let revisionFailed = false;

      const revisionConcurrency = this.resolveRevisionConcurrency(totalChunks, agenticOptions);
      let cursor = 0;

      const runChunk = async (chunkIndex: number) => {
        const chunk = revisionChunks[chunkIndex];
        const chunkWarnings: string[] = [];
        progressCallback?.({
          type: 'revision:chunk-start',
          pass,
          chunkIndex: chunkIndex + 1,
          totalChunks,
          focusCaseCount: chunk.caseIds.length,
        });

        const revisionPrompt = this.buildRevisionPrompt(
          request,
          mutableCases,
          chunk.feedback,
          pass,
          normalizedFeedback,
          chunk.caseIds
        );

        try {
          const revisionResult = await safeGenerateObject({
            model: writerModelInstance,
            schema: caseSchema,
            prompt: revisionPrompt,
            retryInstruction: 'Return ONLY a JSON object with an "items" array of updated cases. No additional text.',
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
              chunk: chunkIndex + 1,
              totalChunks,
            },
          });

          const revisions = revisionResult.object.items ?? [];
          chunkResults[chunkIndex] = { updatedCases: revisions, warnings: chunkWarnings };
          progressCallback?.({
            type: 'revision:chunk-complete',
            pass,
            chunkIndex: chunkIndex + 1,
            totalChunks,
            updatedCases: revisions.length,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown revision error';
          const warning = `Revision chunk ${chunkIndex + 1} (pass ${pass}) failed: ${message}`;
          chunkWarnings.push(warning);
          warnings.push(warning);
          revisionFailed = true;
          console.warn('[Agentic] Revision chunk failed', {
            pass,
            chunk: chunkIndex + 1,
            error: message,
          });
          progressCallback?.({
            type: 'revision:chunk-complete',
            pass,
            chunkIndex: chunkIndex + 1,
            totalChunks,
            updatedCases: 0,
          });
        }
      };

      const workerCount = Math.max(1, revisionConcurrency);
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (true) {
            if (revisionFailed) {
              break;
            }
            const index = cursor;
            if (index >= totalChunks) {
              break;
            }
            cursor += 1;
            await runChunk(index);
            if (revisionFailed) {
              break;
            }
          }
        })
      );

      const revisedCases = new Map(mutableCases.map((item) => [item.id, item] as const));
      let totalUpdatedCases = 0;

      chunkResults.forEach((result) => {
        if (!result) {
          return;
        }
        result.updatedCases.forEach((updated) => {
          if (!updated?.id) {
            return;
          }
          revisedCases.set(updated.id, updated);
          totalUpdatedCases += 1;
        });
      });

      mutableCases = Array.from(revisedCases.values());
      console.log('[Agentic] Revision run completed', {
        pass,
        updatedCases: totalUpdatedCases,
        totalChunks,
      });
      progressCallback?.({
        type: 'revision:complete',
        pass,
        updatedCases: totalUpdatedCases,
        totalChunks,
      });

      if (revisionFailed) {
        break;
      }
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

  private getRevisionChunkLimits(
    request: TestCaseGenerationRequest,
    _options?: AgenticGenerationOptions
  ): { softLimit: number; hardLimit: number } {
    const isDetailed = request.mode === 'detailed';
    const softLimit = isDetailed ? 12 : 20;
    const hardLimit = isDetailed ? 16 : 28;
    return { softLimit, hardLimit };
  }

  private rankRevisionSeverity(severity?: ReviewSeverity): number {
    switch (severity) {
      case 'critical':
        return 3;
      case 'major':
        return 2;
      case 'minor':
        return 1;
      case 'info':
      default:
        return 0;
    }
  }

  private buildRevisionChunks(
    feedback: ReviewFeedbackItem[],
    request: TestCaseGenerationRequest,
    options?: AgenticGenerationOptions
  ): Array<{ feedback: ReviewFeedbackItem[]; caseIds: string[] }> {
    if (feedback.length === 0) {
      return [];
    }

    const generalFeedback: ReviewFeedbackItem[] = [];
    const feedbackByCase = new Map<string, ReviewFeedbackItem[]>();

    feedback.forEach((item) => {
      const caseId = item.caseId?.trim();
      if (!caseId) {
        generalFeedback.push(item);
        return;
      }
      const existing = feedbackByCase.get(caseId);
      if (existing) {
        existing.push(item);
        return;
      }
      feedbackByCase.set(caseId, [item]);
    });

    const caseGroups = Array.from(feedbackByCase.entries()).map(([caseId, items]) => ({
      caseId,
      items,
      weight: Math.max(...items.map((entry) => this.rankRevisionSeverity(entry.severity))),
    }));

    if (caseGroups.length === 0) {
      return [{ feedback: feedback.slice(), caseIds: [] }];
    }

    caseGroups.sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return b.items.length - a.items.length;
    });

    const { softLimit, hardLimit } = this.getRevisionChunkLimits(request, options);

    if (caseGroups.length <= softLimit) {
      return [{
        feedback: feedback.slice(),
        caseIds: caseGroups.map((entry) => entry.caseId),
      }];
    }

    const chunks: Array<{ feedback: ReviewFeedbackItem[]; caseIds: string[] }> = [];
    let currentItems: ReviewFeedbackItem[] = [];
    let currentCaseIds: string[] = [];

    const flushCurrent = () => {
      if (!currentCaseIds.length) {
        return;
      }
      chunks.push({
        feedback: [...currentItems, ...generalFeedback],
        caseIds: currentCaseIds.slice(),
      });
      currentItems = [];
      currentCaseIds = [];
    };

    caseGroups.forEach((group) => {
      const prospectiveCount = currentCaseIds.length + 1;
      const exceedsHard = currentCaseIds.length > 0 && prospectiveCount > hardLimit;
      const exceedsSoft = currentCaseIds.length >= softLimit;
      if (exceedsHard || exceedsSoft) {
        flushCurrent();
      }
      currentItems.push(...group.items);
      currentCaseIds.push(group.caseId);
    });

    flushCurrent();

    if (!chunks.length) {
      return [{
        feedback: feedback.slice(),
        caseIds: caseGroups.map((entry) => entry.caseId),
      }];
    }

    return chunks;
  }

  private resolveRevisionConcurrency(
    chunkCount: number,
    options?: AgenticGenerationOptions
  ): number {
    if (chunkCount <= 1) {
      return 1;
    }
    const configured = options?.writerConcurrency ?? 1;
    const capped = Math.max(1, Math.min(3, configured));
    return Math.min(chunkCount, capped);
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
      'Return JSON with a "feedback" array of issues (caseId, issueType, severity, summary, suggestion) and a top-level "summary" string. Always supply issueType (e.g., coverage-gap, duplication, formatting) and a suggestion string (use "No suggestion provided." if none). Severity must be one of info, minor, major, critical.',
    ];

    return sections.join('\n\n');
  }

  private buildRevisionPrompt(
    request: TestCaseGenerationRequest,
    cases: any[],
    focusFeedback: ReviewFeedbackItem[],
    passNumber: number,
    allFeedback?: ReviewFeedbackItem[],
    focusCaseIds?: string[]
  ): string {
    const targetedFeedbackJson = JSON.stringify(focusFeedback, null, 2);
    const includeFullFeedback =
      allFeedback &&
      (allFeedback !== focusFeedback || allFeedback.length !== focusFeedback.length);
    const fullFeedbackJson = includeFullFeedback
      ? JSON.stringify(allFeedback, null, 2)
      : targetedFeedbackJson;
    const focusCaseSummary = focusCaseIds && focusCaseIds.length
      ? `Targeted caseIds: ${focusCaseIds.join(', ')}`
      : 'Focus on the caseIds referenced in the targeted feedback.';

    const sections = [
      'Revise the following test cases to resolve the reviewer feedback. Only return cases that change.',
      `Pass number: ${passNumber}. Mode: ${request.mode}.`,
      `Current cases:\n${JSON.stringify(cases, null, 2)}`,
      focusCaseSummary,
      `Targeted feedback to address:\n${targetedFeedbackJson}`,
    ];

    if (includeFullFeedback) {
      sections.push(`Complete reviewer feedback for context:\n${fullFeedbackJson}`);
    }

    sections.push('Return a JSON array of updated cases adhering to the required schema. Include all referenced caseIds exactly once.');

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
