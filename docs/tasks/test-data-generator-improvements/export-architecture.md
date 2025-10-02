# Export Job Architecture Draft

## Date
2025-10-02

## Objectives
- Decouple long-running export generation from API requests.
- Provide progress updates and retries without blocking the UI or API route.
- Support future delivery channels (download, email, webhook).

## Components
1. **Job Queue**
   - Use BullMQ backed by Redis (already part of infra via other queues; if not, add managed Redis instance).
   - Queue name: `test-data-exports`.
   - Concurrency: start with 5 workers, configurable.
   - Jobs store payload: schema snapshot, export config, seed, requester ID, AI prompt context.

2. **Worker Service**
   - Node worker (can run via `npm run worker:exports`).
   - Pulls jobs, uses new Copycat-driven generator to produce data in chunks (e.g., 1k rows per batch).
   - Streams results to temporary storage (Supabase storage or S3-compatible bucket).
   - Emits progress events after each chunk via Redis pub/sub channel `test-data-exports-progress`.

3. **API Endpoints**
   - `POST /api/data-generator/export` enqueues job, returns `{ jobId }`.
   - `GET /api/data-generator/export/:id` returns job metadata + signed download URL when ready.
   - `GET /api/data-generator/export/:id/events` (SSE) or `GET .../status` for polling progress (% complete, rows written, estimated time).

4. **Progress Updates**
   - Store incremental updates in `generator_export_events` with `progress_percent`, `rows_generated`.
   - For real-time UI, start with polling (every 3s). Consider SSE when infra allows.

5. **Failure Handling**
   - BullMQ retry strategy: retry 2 times with exponential backoff (base 30s).
   - On final failure, mark export record `status = 'failed'`, capture `error_details`.
   - Notify user via toast and optional email webhook if configured.

6. **Security**
   - Jobs validated against Supabase schema permissions before enqueue.
   - Workers use service role key; only export owner (and shared editors) can fetch download URL.
   - Generated files stored under `generator-exports/{owner}/{jobId}.{ext}` with signed URL expiry (default 24h).

7. **Observability**
   - Log structured events (job start, chunk completion, success/failure).
   - Track metrics (jobs queued, duration) via existing logging stack or add lightweight Prometheus exporter.

## Open Issues
- Confirm Redis availability in current deployment (Fly.io). If absent, evaluate Cloudflare Queues or Supabase Functions alternative.
- Determine storage size limits and clean-up policy to prevent bucket bloat.
- Align email/webhook notification system with existing notification service (if any).
