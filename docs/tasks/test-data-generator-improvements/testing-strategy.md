# Testing Strategy: Test Data Generator Revamp

## Date
2025-10-02

## Test Layers
### Unit Tests
- Hooks (`useSchemaBuilder`, `useExportConfig`, `useDataGeneration`) with faker/copycat adapters using Jest + React Testing Library hooks utilities.
- Validation utilities for field options, AI prompt requirements, and schema serialization.
- Copycat mapping helpers to ensure deterministic outputs given a seed.
- `schemaTemplateStore` local/remote/hybrid fallbacks and async refresh guards.
- References utilities to flag unresolved dependencies and missing sources.

### Integration Tests
- API routes (`/api/data-generator/generate`, `/api/data-generator/export`) using Next.js route testing harness (supertest or Next test utils).
- Ensure `generate` endpoint enforces validation errors and integrates with Copycat mock.
- Export enqueue route to confirm queue writes + Supabase persistence.
- `/api/data-generator/templates` route with Supabase + middleware auth harness (mock out Supabase client + user header).

### E2E / UI Tests
- Playwright specs covering:
  - Schema creation workflow (add fields, validation errors, save schema).
  - Preview regeneration with seed toggles.
  - Export job creation + progress polling, including failure surface.
- Use Supabase test project or mocked service worker to isolate side effects.

### Background Job Tests
- Worker-level tests run in Node (jest environment) to validate chunked export logic, progress emission, retry logic.
- Smoke test for integration with Redis queue using local test container (or mocked ioredis with fake timers).

## Tooling
- Extend Jest config with `setupFilesAfterEnv` for Copycat seeding resets.
- Add Playwright project config for data-generator suite; run on CI nightly + PR tag.
- Use MSW (Mock Service Worker) for simulating API responses in component tests when needed.

## Automation
- Update CI workflow to include unit + integration tests on PRs; add optional Playwright job gated behind label until stable.
- Nightly job executes full Playwright and worker smoke tests to catch regression without slowing PRs.

## Metrics & Reporting
- Track coverage for hooks and API modules (target 80%+).
- Record Playwright failures with trace viewer artifacts.
- Surface queue worker test results in CI summary for visibility.
