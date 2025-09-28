# Agentic Test Case Generator Enhancement Plan (Vercel AI SDK)

## Context and Constraints

Our legacy services (`AgentsService`, `GeminiService`, `OpenRouterService`) each called their provider with a single completion request and expected the model to return the entire JSON payload in one shot. Once requirements grew large, models hit response token ceilings and coverage suffered, particularly for `priorityMode = 'comprehensive'` and `mode = 'detailed'`. State in `src/app/page.tsx` also represented generation as a single phase, so we had no way to surface planning progress, partial slices, or review passes. We now consolidate on the Vercel AI SDK and AI Gateway, which give us a provider-agnostic TypeScript runtime with multi-step orchestration, structured outputs, and unified routing across OpenAI, Gemini, OpenRouter, and future models. As of this iteration the planner/writer/reviewer pipeline, telemetry, and frontend controls are implemented behind the "Agentic Workflow" panel.

## Goals

Deliver broader and more consistent test coverage for large requirement sets without regressing the existing UX. Support optional reviewer loops with configurable pass counts and reviewer models. Keep exports deterministic (stable IDs, areas, ordering) and ensure every provider benefits from the same pipeline. Maintain observability for each stage.

## Vercel AI SDK Architecture Overview

1. **AI Gateway Provider**
   - Configure the AI SDK to route through `@ai-sdk/gateway`, enabling model strings like `openai/gpt-4.1`, `google/gemini-2.5-pro`, or `openrouter/meta-llama-410`. A shared adapter eliminates provider-specific service classes.
   - Use provider options to define fallback order, quotas, and model-specific overrides per user configuration.

2. **Agentic Pipeline**
   - Build a pipeline module (`src/lib/services/ai/pipeline/testCasePipeline.ts`) that composes three orchestrated stages: planner, writer, reviewer. Each stage uses `generateText`, `generateObject`, or `streamObject` with `maxSteps` to allow tool calls and iteration.
   - Persist pipeline state in memory for the request and emit structured events (planning, slice generation, review pass) that the API route can stream to the client.

3. **Tooling and Structured Output**
   - Define tools for chunk retrieval (e.g., `fetchPlanSlice`, `fetchReviewerFeedback`) so the model can call back into the pipeline when `maxSteps` triggers additional turns.
   - Use Zod schemas with `generateObject` or the Array Output Mode helper to validate every slice before merging, preventing invalid JSON and ensuring deterministic IDs.

4. **Review Loop**
   - When `reviewPasses > 0`, invoke a reviewer run with full plan and slice context. Reviewer responses return structured feedback entries (`caseId`, `issueType`, `severity`, `notes`).
   - Feed reviewer output into a revision run that reuses the writer’s prompt plus injected feedback guidance. Stop when passes are exhausted or no blocking issues remain.

## Implementation Plan

1. **Core Pipeline Module**
   - Create `TestCaseAgenticPipeline` exposing `execute(request, options)` and orchestrating planning, generation, review, finalization. Use dependency injection for `modelRouter` (controls provider/model selection) and `telemetry` hooks.

2. **Request and Response Contracts**
   - Extend `TestCaseGenerationRequest` with `agenticOptions` containing `enableAgentic`, `plannerModel`, `writerModel`, `reviewerModel`, `maxReviewPasses`, `chunkStrategy`, and `streamProgress` flags.
   - Extend `TestCaseGenerationResponse` with `plan`, `slices`, `reviewFeedback`, `passesExecuted`, `warnings`, and optional `telemetry`.

3. **Vercel AI SDK Integration**
   - Introduce `src/lib/services/ai/vercelClient.ts` that configures the AI SDK with gateway credentials, default provider ordering, and helper functions `runPlanner`, `runWriterSlice`, `runReviewer`.
   - Remove legacy provider-specific services after parity testing, or wrap them behind the new pipeline for backward compatibility until migration is complete.

4. **Requirement Chunking**
   - Implement `RequirementChunker` using `gpt-tokenizer` to segment requirements, file previews, and previous scenarios. Planner consumes chunk metadata (`chunkId`, `tokenCount`, `highlights`).

5. **API Route Updates**
   - Update `src/app/api/generate/route.ts` to accept agentic options, call the pipeline, and stream progress events via Next.js `ReadableStream`. Fallback to single-shot mode when `enableAgentic` is false.

6. **Frontend Enhancements**
   - Extend `src/app/page.tsx` state machine to include stages `planning`, `generating`, `reviewing`, `finalizing`. Display plan progress, per-slice completion, and reviewer notes inline.
   - Add advanced controls (agentic toggle, model selectors, review pass count) in settings or an expandable section.
   - Show reviewer outcomes per test case with severity badges and allow users to filter or export feedback summaries.

7. **Logging and Telemetry**
   - Enhance `logAIInteraction` to tag entries with stage, slice ID, review pass, and model metadata. Capture token usage and duration per stage for analytics.
   - Optionally forward telemetry to Vercel AI Gateway observability dashboards.

## Planner Stage Details

- Planner prompt summarizes requirements, file chunks, and previously selected scenarios. Target output: array of plan items (`planId`, `title`, `area`, `focus`, `estimatedCases`, `inputs`).
- Use `generateObject` with a strict schema. Introduce deterministic ID seeds (e.g., `PLAN-${hash(chunk)}`) to keep ordering stable between runs.
- Cache planner results keyed by hashed inputs to skip recomputation on identical retries.

## Writer Stage Details

- Iterate plan items. For each, allocate a token budget based on remaining context window. Provide writer prompt with plan item details, accumulated IDs, and priority guidance.
- Use `streamObject` to emit validated JSON arrays per slice; merge into an in-memory map keyed by test case ID.
- Detect duplicate IDs or conflicting areas and apply normalization rules before final merge.

## Reviewer Stage Details

- Reviewer receives full aggregate plus metadata (pass number, unresolved warnings). Use `generateObject` to produce structured feedback.
- Revision runs incorporate reviewer guidance, adjusting only affected cases when possible. Maintain audit trail of changes per pass.

## Testing Strategy

- Unit tests for chunking, planner schema validation, slice merging, reviewer feedback application.
- Integration tests mocking AI SDK calls to simulate staged responses, including failures (invalid JSON, empty slice, conflicting feedback).
- Cypress or Playwright smoke tests verifying UI stage transitions and review feedback display.
- Regression tests ensuring legacy single-shot mode remains functional when agentic mode is disabled.

## Observability and Resilience

- Implement retry policies per stage with exponential backoff and provider fallback via AI Gateway. Record which provider handled each slice.
- Support partial successes: if certain slices fail after retries, surface warnings with options for manual re-run.
- Provide end-user telemetry summary (tokens per stage, providers used, elapsed time) for transparency and future tuning.

## Risks and Mitigations

- **Longer wall-clock time:** Mitigate with configurable review passes and stop-early logic when reviewer issues are informational only.
- **Model schema drift:** Mitigate via Zod validation, auto-correction routines, and fallback to single-shot mode on chronic failures.
- **Provider inconsistencies:** Use AI Gateway provider ordering and instrumentation to monitor success rates and adjust defaults.

## Next Steps

1. Prototype the planner and writer stages with mocked AI SDK responses to validate chunk merging and streaming progress.
2. Layer in reviewer passes and UI updates, gather usability feedback, and adjust chunking heuristics.
3. Deprecate legacy provider services once the AI SDK pipeline reaches feature parity and passes regression tests.
