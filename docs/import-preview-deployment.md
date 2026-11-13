# Import Preview / Confirmation Deployment Notes

This document covers the database and runtime steps required to deploy the import preview/confirmation feature safely.

## Required environment variables

- `SUPABASE_SERVICE_ROLE_KEY` — used by the import route to sign preview confirmation tokens and to call the service-role-only Postgres RPCs.
- `ADMIN_PASSWORD` — used by `src/proxy.ts` to protect `/api/import` and other admin routes.
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server) — standard Supabase client configuration.

## Database migrations

Apply the following migrations **in this order** against the target Supabase/Postgres instance before deploying the new application code:

1. `supabase/migrations/20261113120000_complete_atomic_rollback.sql`
   - Converts score columns to `DOUBLE PRECISION`.
   - Adds `score_history.created_at`, `reason`, `import_id`.
   - Adds `import_logs.player_id`, `player_snapshot`, `sequence_no`.
   - Rewrites `rollback_import_session` to restore per-row snapshots and delete newly inserted players in reverse `sequence_no` order.

2. `supabase/migrations/20261113130000_atomic_import_preview_commit.sql`
   - Creates `public.commit_import_preview(p_expected_state jsonb, p_import_plan jsonb, p_filename text)`.
   - Locks referenced players, compares the locked state with the expected snapshot, and applies new/update/retire actions atomically.
   - Raises SQLSTATE `PZ003` when the database state differs from the preview snapshot.

> Do **not** run the older `20261103213000_atomic_import_rollback.sql` after `20261113120000_complete_atomic_rollback.sql`; the newer migration supersedes it.

## Verify RPC grants

`commit_import_preview` is restricted to `service_role`:

```sql
REVOKE ALL ON FUNCTION public.commit_import_preview(jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_import_preview(jsonb, jsonb, text) TO service_role;
```

Confirm the grants match the migration after it is applied.

## Disposable-database SQL assertions

`supabase/tests/import_preview_commit.sql` contains destructive `DELETE` statements and must **only** be run against a fresh/throwaway database:

```powershell
psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase\tests\import_preview_commit.sql
```

Never run this file against production data.

The assertions verify:

- A matching snapshot commits a new player with the exact decimal score `121.75`.
- Existing player updates create `score_history` rows tagged with `import_id`.
- `import_logs` receive `player_snapshot` and `sequence_no`.
- Rollback restores the pre-import state and removes newly inserted players.
- A stale player snapshot raises `PZ003` and leaves all tables unchanged.
- An empty plan creates no import session and never retires the roster.

## Application behavior after deploy

- Admins must click **"ตรวจสอบก่อนนำเข้า"** to generate a preview.
- The preview is paginated at **25 rows per page**; validation errors are shown regardless of the current page.
- Confirmation is disabled while validation errors exist.
- If player data changes between preview and confirmation, the API returns **HTTP 409** with the message asking for a fresh preview.
- If the source file or OneDrive URL is changed, the preview is cleared and must be regenerated.

## Rollback

If a confirmed import is partially applied or needs to be undone, use the existing admin import session list and its **Rollback** action. The rollback RPC uses the per-row snapshots written to `import_logs` to restore the previous state.
