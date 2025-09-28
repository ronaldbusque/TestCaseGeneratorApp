# Research Notes

## Current API behavior
- `src/app/api/generate/route.ts` now supports newline-delimited JSON streaming when `agenticOptions.streamProgress` is true.
- Streaming handler invokes the AI service with a progress callback and writes each event as JSON per line.

## Server pipeline progress events
- `TestCaseAgenticPipeline.generate` accepts optional `progressCallback` and emits planner, writer, review, revision, and final events.
- `AgenticProgressEvent` types are defined in `src/lib/types/index.ts` and already cover granular planner/writer/reviewer stages.

## Client behavior today
- `Home.generateTestCases` currently calls `fetchApi('/api/generate', ...)` and awaits the JSON response.
- Progress UI (`stageRows`, `generationStep`) updates only when local state changes or when telemetry arrives at the end, so stages jump from planning to complete.
- `buildAgenticOptions` does not request streaming; there is no state to track per-slice or per-pass progress while the request runs.

## Gaps to address
- Need authenticated helper for streaming responses that reuses access token logic.
- Client state must mirror server events (planner counts, writer slice progress, review passes, final payload) and reconcile with existing telemetry types.
- Must gracefully handle streaming errors and fall back to JSON if streaming disabled.
