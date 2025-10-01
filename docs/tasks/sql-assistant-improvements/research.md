# Research: SQL Assistant UX Improvements

## Date
2025-10-01

## Context
The SQL Assistant page (`src/app/sql/page.tsx`) offers three tools—Generate, Validate, Convert—sharing a single screen. The goal is to identify friction points and recommend enhancements that make the assistant easier to use and more effective.

## Observations
- **Single mega-component**: The page keeps all state inside one component with separate mode-specific state buckets. UI logic is dense, making future changes riskier.
- **Unstructured workflow**: Users must infer the correct order (description → dialect → schema). There is no inline guidance for high-quality prompts or schema formatting beyond placeholder text.
- **Schema friction**: Uploading schema forces manual paste, with no persistence or preview; detecting JSON vs SQL is implicit and error-prone.
- **Model visibility**: QuickModelSwitcher sits apart from the main form. Users might not know which model/dialect is being used or when switching affects results.
- **Results panel**: Renders raw AI response structure. Validation issues/differences appear as bulleted JSON-derived text with limited prioritisation; no ability to run fixes or regenerate.
- **Missing history**: After running multiple prompts, previous outputs vanish, which hinders iteration.
- **No parameter presets**: Generate mode lacks templates (e.g., analytics, CRUD, aggregations). Convert mode doesn’t expose dialect-specific tips before submission.
- **API integration**: Page relies on `fetchApi` with minimal client-side validation. Network errors bubble as generic `Failed to process request`.

## Existing assets worth reusing
- `SchemaExtractionDialog` provides queries per dialect for capturing schemas—good foundation for guided schema import.
- `SQLOutput` already supports copying sections and showing debug info; can be extended to support formatted issue lists or quick fixes.
- Provider settings context gives access to preferred models per domain—can drive preset suggestions.

## Initial ideas to validate
- Introduce guided prompts and templates for common SQL tasks to reduce blank-state anxiety.
- Add inline validation for missing description/query before hitting the API; disable button, surface field-level errors.
- Allow saved schemas per user (persist via Supabase) with dropdown selection, plus quick preview/download.
- Provide result history cards with “reuse”, “improve”, or “convert” actions for iterative workflows.
- Enhance result presentation: highlight issues, show severity badges, offer one-click “suggest fix” AI follow-up.
- For convert mode, show dialect-specific hints (e.g., limit syntax differences) and optionally diff view between source and converted SQL.
- Move QuickModelSwitcher into a “Model & Dialect” panel with explicit context (current provider/model, tokens usage?).
