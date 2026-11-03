# Critical Risk Fixes Design

## Intent

Fix the high-impact bugs and risks identified in the project review without changing unrelated behavior. The goal is to prevent modal crashes, bad or empty imports from corrupting player data, unsafe remote fetches, and incomplete import rollbacks.

## Goals

- Keep all React hooks unconditional in `AddPlayerModal`.
- Reject malformed score cells and stop before database writes when no valid player rows were parsed.
- Bound remote import downloads by protocol, destination, redirect count, response size, and timeout.
- Make rollback all-or-nothing through a PostgreSQL function, using per-operation player snapshots and stable player IDs.
- Add a forward-only migration for decimal score columns and the score-history fields used by the app.

## Non-goals

- Do not change the public/admin access policy for player history or import audit endpoints in this change.
- Do not make the entire import operation transactional; this design prevents empty imports and makes rollback atomic.
- Do not modify already-applied migrations or require access to a production database.

## Approaches

1. **Application-only rollback guard:** retain logs and return failure if a row cannot be reverted. This avoids losing evidence but can still leave rollback partially applied and unsafe to retry.
2. **Database RPC transaction (selected):** store sufficient rollback snapshots and apply all reversions, history cleanup, and session deletion in one PostgreSQL function call. Any error aborts the transaction and preserves the session for retry or investigation. This requires applying a new migration before deploying the matching application code.
3. **Leave rollback as-is and fix only parsing/import guards:** smallest change, but does not address the data-loss risk that motivated the request.

## Design

- The import handler will parse scores strictly, reject rows with missing/non-finite scores, and return a client error before creating a session or touching players if the file yields no valid player rows.
- Remote imports will use HTTPS destinations from an explicit Microsoft file-sharing host allowlist, manually validate each redirect, enforce a short timeout and a 10 MB streamed-response limit, and redact query strings from logs. This intentionally stops accepting arbitrary non-Microsoft URLs; OneDrive and SharePoint links remain supported.
- Import logs will record a stable player ID, operation order, and the affected player's pre-import state. Score-history rows created by an import will carry its import ID.
- A `SECURITY DEFINER` PostgreSQL RPC with a fixed `search_path` will lock the import session, replay logs in reverse order, restore snapshots/delete newly inserted players, remove import-created score history, and delete the import session. It will raise on any unexpected/missing player or failed operation so the call rolls back as one transaction. Execute permission will be limited to `service_role`.
- Import sessions created before snapshot metadata exists cannot be safely reconstructed. Rollback will reject those sessions with a conflict response and preserve their logs rather than guess at previous player state.
- A new migration will convert score-related integer columns to `DOUBLE PRECISION`, add `score_history.created_at` and `reason` compatibly, and add the rollback metadata/function. Existing rows will be preserved and `created_at` will be backfilled from `updated_at`.
- The existing base migration remains unchanged; operators must apply the new migration before deploying the code that depends on it.

## Constraints and validation

- Follow the installed Next.js 16 Route Handler conventions.
- Add focused tests for hook-safe rendering, score parsing/empty import guards, URL validation/download limits, and rollback RPC input/ordering where repository tooling permits.
- Run focused lint, TypeScript validation, and production build. No live Supabase credentials/schema are assumed.
