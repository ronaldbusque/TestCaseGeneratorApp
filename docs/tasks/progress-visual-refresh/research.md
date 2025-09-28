# Research Notes

## Current progress card behavior
- `ProgressCard` in `src/app/page.tsx` re-renders on each streaming event and uses `AnimatePresence` with enter transitions, which causes a brief fade/jump whenever counts change.
- The top-left status indicator always renders a pulsing blue dot because the markup keeps the `animate-ping` span active regardless of completion or error state.
- Stage rows report counts but have no progress bars; users only see numbers update after events land.

## State available for progress metrics
- Planner stage exposes `plannerProgress` (started/completed/planItems) and final telemetry includes `planItemCount`.
- Writer stage tracks `writerProgress` (completedSlices, totalSlices, totalCases) plus telemetry slices.
- Reviewer stage uses `reviewProgress` and telemetry `reviewPasses`; we can compute ratios against `maxPasses`.
- Revision stage has `revisionProgress` (runs, lastUpdatedCases) and telemetry indicates blocking counts, so we can mark it completed or skipped.

## Visual goals
- Introduce an overall progress bar plus per-stage bars with smooth transitions.
- Stop re-running the entrance animation on every update by dropping the `initial/exit` props and the surrounding `AnimatePresence` wrapper.
- Swap the pulsing dot for a stateful indicator: animated while running, green when complete, red if an error occurs.
