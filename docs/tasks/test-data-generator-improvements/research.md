# Research: Test Data Generator Enhancements

## Date
2025-10-01

## Context
Assessing the Test Data Generator page (`src/app/data-generator/page.tsx`) to surface UX, workflow, and technical limitations. Goal is to propose upgrades that make complex schema-driven data generation easier, faster, and more reliable.

## Observations
- **Monolithic state**: Page manages schema, export config, preview state, and generation logic directly. Business rules (validation, AI enhancement requirements, format handling) live inline, making reuse/testing difficult.
- **Schema authoring friction**: `SchemaBuilder` only supports flat field definitions. No grouping, foreign keys, or nesting. Option inputs are cramped, horizontal scrolling is required, and there’s no validation feedback (e.g., invalid min/max combos).
- **Type discovery**: Users must click a dialog per field to see available types; no search, recently used, or recommended presets.
- **AI enhancement UX gap**: `applyAIEnhancement` flag exists in state but UI expects users to infer when to provide prompts. No prompt templates, preview of AI-generated content, or explanation of how prompts affect fields.
- **Lack of saved schemas**: Fields reset on refresh. No way to store/load schema templates or import from existing JSON/SQL, limiting return usage.
- **Preview/Export coupling**: Preview reuses the same API endpoint as export with hard-coded count=10 and format JSON. If the API changes, both paths break; there’s no caching or diff between preview and final export.
- **Exports**: CSV/JSON/SQL generated client-side; Excel requires extra round-trip. No progress feedback beyond spinner, and large exports risk blocking the UI thread.
- **No history/audit**: After exporting, configuration is lost unless user saves a file. No version control or quick comparisons of schema changes.
- **Access token dependency**: Uses `fetchApi`, so the page fails silently if middleware denies the token; errors surface only via console logs unless toast triggers.

## Existing strengths
- `SchemaBuilder` already integrates Faker-type definitions, giving a broad range of field types.
- Preview tab toggles between table and raw formats; `RawDataPreview` shares formatting logic with export configuration.
- QuickModelSwitcher ensures provider/model alignment with overall settings.

## Opportunities to Explore
- Abstraction: move generation/export logic into hooks/services, enabling unit tests and future CLI/API reuse.
- Schema UX: introduce nested structures, reference fields, and batch operations (duplicate fields, reorder via drag-and-drop). Provide inline validation and contextual help on options.
- AI guidance: dedicated panel for AI prompt instructions, with examples per dataset domain (e.g., ecommerce, finance) and ability to see AI-generated sample values before full export.
- Templates & library: allow saving/loading schemas to Supabase, including sharing across team members; complement with import from JSON Schema or CSV header.
- Preview enhancements: enable pagination, random seed locking, diff between preview and export, and ability to regenerate selected rows only.
- Export pipeline: offload heavy generation to a background job with progress updates and email/webhook delivery for large datasets.
- Collaboration: add comments/notes per schema, track last modified, and surface who edited what using usage tracking.

## Library Evaluation (2025-10-01)
- Current builder leans on our own option map wired to `@faker-js/faker`. Faker is easy for primitive fields but struggles with relational consistency, temporal logic (e.g., matching start/end dates), and unit-aware values. Configuration also stays code-driven rather than schema-driven.
- Alternatives considered:
  - **`mocker-data-generator`**: Declarative JSON schemas with relationships, incremental IDs, and Faker under the hood. Supports asynchronous hooks and could replace most of our manual mapping. Downsides: API is callback-heavy and project activity has slowed, but still works for Node 18+.
  - **`json-schema-faker`**: Generates data from JSON Schema, with plugins for Faker, Chance, and custom formats. Works well when we want to ingest JSON Schema (e.g., OpenAPI). Requires careful schema sanitisation and can be slower for large datasets without seeding.
  - **`@snaplet/copycat`**: Focuses on realistic, deterministic data generation with referential integrity helpers. Strong for seeding/testing, integrates with Prisma, and exposes composable generators that we could map to UI types. Smaller ecosystem but active maintenance.
  - **External services (Mockaroo API, GenerateData.com)**: Provide rich templates and relationships but add cost, latency, and dependency on external availability, plus complications around auth and rate limits.
- Recommendation: keep Faker for simple primitives but introduce a layered approach—use Copycat or mocker-data-generator as the “engine” behind our schema builder so we get relationships, deterministic seeding, and composable generators. Expose JSON Schema import to tap into json-schema-faker for advanced cases. This hybrid keeps compatibility while unlocking richer datasets without rewriting UI from scratch.

## 2025-10-02 – Repo survey
- Hooks exist for schema, export, generation; SchemaBuilder duplicates validation logic already present in hook.
- Copycat mapping currently covers only a handful of types (number, decimal, boolean, names, email, city/country, phone, uuid, address). Any AI-generated or custom types force full faker fallback.
- TestDataGeneratorService still contains large faker-based switch with dynamic paths; copycat path only runs when every field is supported.
- UI exposes deterministic seed toggle; API forwards seed to service correctly. Additional copycat mappings would unlock deterministic coverage for more schemas.

## 2025-10-02 – Implementation notes
- Moved schema field validation rules into shared helper for hooks and components.
- Added Copycat support for Date/Time, location, and network field types plus deterministic address line 2 + company samples.
- Expanded unit coverage for new generators including range formatting and locale-specific options.
- Introduced seeded date/time anchors so Copycat keeps future/past/DOB outputs stable when a seed is provided.
- Added schemaActions helpers so add/duplicate/move logic is reusable outside SchemaBuilder.
- SchemaBuilder consumes hook actions so other surfaces can reuse add/remove/duplicate/reorder logic without reimplementing array math.
- Expanded Copycat support to car/app/product fields so seeded runs avoid faker fallback.
- Introduced useSchemaTemplates hook to centralize saved schema CRUD ahead of Supabase sync.
- Added templates API + HTTP store scaffold so Supabase-backed sync can slot in once credentials are configured.
- Hybrid template store prefers Supabase when enabled but falls back to local storage automatically.
- Type catalog search now ranks results, supports keyboard navigation, and highlights matches.
- Inline validation now surfaces contextual hints for number/date/custom list/phone fields plus reference warnings.
