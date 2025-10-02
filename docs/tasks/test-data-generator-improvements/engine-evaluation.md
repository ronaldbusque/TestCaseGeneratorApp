# Engine Evaluation: Copycat vs. mocker-data-generator

## Date
2025-10-02

## Summary
Comparing @snaplet/copycat and mocker-data-generator as the backing engine for the schema builder. Focus areas: relationship modeling, determinism, TypeScript alignment, DX, and extensibility.

## Evaluation Criteria
- **Relationship Modeling**: Field references, cascading updates, consistency across rows.
- **Deterministic Seeding**: Ability to produce repeatable datasets.
- **API Ergonomics**: Promise support, TypeScript typings, ease of composing generators.
- **Extensibility**: Creating custom generators, plugging in AI-enhanced fields.
- **Performance**: Throughput for 10k+ rows, streaming or chunking support.
- **Maintenance & Activity**: Release cadence, community health.

## Findings
### @snaplet/copycat
- Provides referential helpers (`copycat.one`, `copycat.many`, `copycat.intId`) that enforce relationships without manual indexes.
- Built-in seeding and deterministic outputs via `copycat.seed(seedValue)`.
- Modern ESM + TypeScript definitions; works naturally with async/await.
- Exposes composable primitives; creating domain-specific generators is straightforward.
- Performance tuned for large dataset seeding; supports streaming via generators if needed.
- Actively maintained by Snaplet with recent releases (mid-2025), healthy issue responses.

### mocker-data-generator
- Supports relational fields using `values` and `relationships` configs, but APIs are callback-driven and less ergonomic for React hooks.
- Determinism depends on manual `path` seeding or third-party random sources; not as first-class as Copycat.
- TypeScript support via community typings; APIs remain object literal heavy with less IntelliSense.
- Extensibility relies on overriding `mocker.*` functions; harder to inject domain-specific logic.
- Handles large volumes but single-threaded; lacks streaming helpers, so long runs can block the event loop.
- Maintenance slowed (last significant release early 2024). Issues often linger.

## Recommendation
Adopt @snaplet/copycat as the primary engine. Keep mocker-data-generator in reserve for legacy schema imports where its JSON-first format helps, but base new hooks on Copycat for determinism, relationships, and DX.

## Next Steps
1. Prototype Copycat integration inside a new `useDataGeneration` hook returning deterministic sample data.
2. Define compatibility layer to map existing field types onto Copycat primitives (with faker fallbacks for unsupported ones).
3. Document migration path for any legacy schemas that rely on faker-only options.
