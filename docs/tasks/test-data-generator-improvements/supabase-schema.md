# Supabase Schema Draft: Test Data Generator

## Date
2025-10-02

## Goals
- Persist reusable schemas and export history per user.
- Support sharing schemas across team members without exposing export records unnecessarily.
- Provide audit fields for versioning and conflict resolution.

## Proposed Tables
### `generator_schemas`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid (default gen_random_uuid()) | Primary key |
| owner_id | uuid | References auth.users.id or workspace user table |
| name | text | Display name |
| description | text | Optional summary |
| schema_definition | jsonb | Stored builder representation (fields, options, relationships) |
| engine | text | e.g., `copycat@1.0.0`, helps with migration |
| seed | text | Optional deterministic seed |
| is_shared | boolean | Default false |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

Indexes: `btree(owner_id)`, `gin(schema_definition)` for search on field names.

### `generator_schema_members`
| Column | Type | Notes |
| --- | --- | --- |
| schema_id | uuid | FK to generator_schemas.id |
| member_id | uuid | User who can view/edit |
| role | text | `viewer` or `editor` |
| added_at | timestamptz | Default now() |

Composite primary key `(schema_id, member_id)`.

### `generator_exports`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| schema_id | uuid | Nullable for ad-hoc exports |
| owner_id | uuid | Who triggered the export |
| format | text | CSV/JSON/SQL/Excel |
| row_count | integer | Requested rows |
| status | text | `pending`, `running`, `succeeded`, `failed`, `cancelled` |
| seed | text | Seed used for deterministic runs |
| job_payload | jsonb | Copy of export config for traceability |
| result_path | text | Storage bucket path once completed |
| error_details | jsonb | Failure info |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |
| completed_at | timestamptz | Nullable |

Indexes on `(owner_id, created_at desc)` and `status`.

### `generator_export_events`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| export_id | uuid | FK to generator_exports.id |
| status | text | Snapshot of job status |
| message | text | Progress update or log |
| metadata | jsonb | Row progress etc. |
| created_at | timestamptz | Default now() |

## Row Level Security
- Enable RLS on all tables.
- `generator_schemas`: owner has `select`, `update`, `delete`; shared members get `select` (and `update` when role = editor). Insert restricted to owner.
- `generator_schema_members`: only owner can `insert` members; both owner and members can `select` their rows; only owner can `delete`.
- `generator_exports`: owner can `select`; admins/service role can `update` status; sharing extends read-only access when schema is shared.
- `generator_export_events`: accessible to export owner and service role.

Use Supabase policies referencing `auth.uid()` or workspace context from JWT.

## Migrations Plan
1. Create tables with timestamps defaulting via `timezone('utc', now())`.
2. Add RLS policies and helper functions for membership checks.
3. Seed default roles/text enums if needed (or use check constraints).
4. Provide index migrations for search queries on schema name/description.

## Open Questions
- Do we need workspace/organization separation beyond single-owner share? Might require linking to `teams` table.
- Storage bucket for export results: use existing `exports` bucket or create `generator-exports` with signed URL support?
- Long-term retention: should exports auto-expire after N days? Add `expires_at` column if needed.
