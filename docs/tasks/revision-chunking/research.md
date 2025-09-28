# Research Notes

## Current behavior
- Reviewer collects all feedback for the current pass and triggers a single revision call if any item is `major` or `critical`.
- Revision prompt contains every feedback item and expects the writer to return all updated cases in one go.
- Progress events only expose `revision:start` and `revision:complete`, so the UI can’t show chunk-level progress.

## Constraints
- Keep the default path simple: small feedback sets should remain a single revision run.
- When many cases need fixes, chunk the feedback to avoid oversized prompts and optionally fan out to limited parallel writer calls.
- Progress telemetry must communicate chunk counts so the client can show “n of m” progress.

## Proposed knobs
- Soft chunk target ~12 detailed cases (higher for high-level cases).
- Hard chunk cap ~15 detailed / 24 high-level to avoid prompt bloat.
- Revision concurrency cap derived from writer concurrency but clamped (e.g., max 3).
