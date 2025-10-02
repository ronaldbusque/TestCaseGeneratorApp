# Plan: Test Data Generator Revamp

## Task
Redesign the Test Data Generator experience to support richer schemas, clearer AI guidance, and more reliable export workflows while cleaning up legacy implementation shortcuts.

## Goals
- Reduce friction when defining complex field schemas (relationships, presets, validation).
- Provide trustworthy previews and exports with progress feedback and history.
- Surface AI enhancement capabilities with clear guardrails and reusable prompts.
- Isolate business logic into testable modules/hooks for easier maintenance.

## Working Status (2025-10-02)
- **Engine spike**: Copycat vs. mocker-data-generator evaluation complete. Decision documented in `docs/tasks/test-data-generator-improvements/engine-evaluation.md`.
- **Supabase schema design**: Draft complete in `docs/tasks/test-data-generator-improvements/supabase-schema.md`; review open questions before migrations.
- **Export job architecture**: Draft recorded in `docs/tasks/test-data-generator-improvements/export-architecture.md`; awaiting infra confirmation.
- **Testing strategy refresh**: Draft available in `docs/tasks/test-data-generator-improvements/testing-strategy.md`; first hook + route tests merged.
- **Type safety audit**: Shared field/option types in place, generate route validated via Zod, and Copycat-backed generation wired into `TestDataGeneratorService` with deterministic coverage (faker fallback still needs cleanup).
- **Copycat engine rollout**: Service prefers Copycat for supported fields; deterministic seed control exposed via export options; fallback path active for unsupported types until mappings expand; new mapping coverage for full names + addresses delivered.
- **Schema authoring UX**: Type picker now tracks “recently used” types and SchemaBuilder supports duplicating/reordering fields inline.

## Pre-Implementation Checklist
1. Review Supabase schema draft + resolve open questions (retention, workspace support).
2. Review export job architecture draft with Ops (queue, worker, observability, retries).
3. Socialise testing strategy draft and confirm CI coverage expectations.
4. Break Phase 1 work into smaller tickets (state hooks, constants module, type tightening, tests).

## Phases & Steps

### Phase 1 – Foundation & Cleanup (In Progress)
1. **Refactor state handling** *(in progress)*: hooks (`useSchemaBuilder`, `useExportConfig`, `useDataGeneration`) landed and page wired to them; shared `fieldValidation` helper and new `schemaActions` utilities back both hook + component, and `SchemaBuilder` now consumes hook-provided actions (add/remove/duplicate/reorder/update) instead of bespoke array transforms.
2. **Centralise constants** *(done)*: defaults now live in `src/lib/data-generator/constants.ts`.
3. **Type safety audit** *(in progress)*: shared generator types + Zod payload validation landed; Copycat-backed generation now covers dates, time, zip/state, URL/IP, address line variants, vehicle fields, and app/product metadata with seeded helpers for deterministic runs; faker fallback paths use typed helpers instead of dynamic require (final Excel/export wiring still pending).
4. **Unit + integration tests** *(done)*: hook unit tests, generate/excel route integration tests, and Copycat determinism coverage in place.

### Phase 2 – Schema Authoring Upgrades (Blocked on checklist)
1. **Type catalog with search** *(done)*: ranked search with keyboard navigation, highlight, and recent-type shortcuts.
2. **Field templates** *(done)*: template library with categories + search, drag-and-drop field reordering, and quick apply flows.
3. **Relationship support** *(in progress)*: reference field type duplicates values from other fields (UI + generator path); next up: lint references, display warnings, preview relational datasets.
4. **Inline validation** *(done)*: numeric/date/custom list/phone validations with contextual hints, reference warnings, and preview-ready feedback in SchemaBuilder.
5. **Schema persistence** *(done)*: `useSchemaTemplates` + hybrid store prefer Supabase when enabled, auto-fallback to local storage, and expose `/api/data-generator/templates` for future Supabase migrations.

### Phase 3 – AI Guidance & Preview Improvements (Pending Phase 1/2)
1. **AI prompt panel** *(in progress)*: prompt suggestions surfaced in UI with quick-apply integration.
2. **Sample AI preview**.
3. **Deterministic generation** *(Copycat seed integration)*.
4. **Preview controller**.

### Phase 4 – Export & History Enhancements (Pending architecture note)
1. **Server-side export jobs** *(requires queue design and worker plan)*.
2. **Result history** *(depends on Supabase schema + RLS)*.
3. **Post-processing hooks**.
4. **Notifications & integrations**.

## Cleanup Completed (2025-10-01)
- Centralised default field/export values and file/table names in `src/app/data-generator/page.tsx`, eliminating inline literals.
- Replaced hardcoded preview row count with `PREVIEW_ROW_COUNT` constant.
- Removed unused imports (`useEffect`, `LoadingAnimation`).

## Next Steps
- Finish Supabase schema + RLS design for schema persistence and export history.
- Document export job architecture (queue, worker, progress updates, failure handling).
- Extend testing plan with integration scenarios and background job coverage.
- Extend remaining Copycat mappings (e.g., domain-specific templates) and surface seed controls in the UI before expanding Phase 2 work.
- Begin Phase 1 implementation once the checklist items above are complete.
