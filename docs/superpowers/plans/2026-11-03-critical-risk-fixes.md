# Critical Risk Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the reviewed modal, import, remote-fetch, schema, and rollback risks without unrelated behavior changes.

**Architecture:** Keep the UI fix local to `AddPlayerModal`. Extract deterministic import parsing and remote-fetch policy into small helpers that the route and focused Node tests can share. Use a forward-only Supabase migration for decimal/history compatibility and an atomic PostgreSQL rollback RPC; the API route delegates rollback to that RPC. Legacy import sessions without snapshots will be rejected without mutation because their previous player state cannot be reconstructed reliably.

**Tech Stack:** Next.js 16.2.6 Route Handlers, React 19, TypeScript, Node.js 24 built-in test runner, Supabase/PostgreSQL SQL.

**Spec:** `docs/superpowers/specs/2026-11-03-critical-risk-fixes-design.md`

## Global Constraints

- Follow the installed Next.js 16 Route Handler conventions.
- Remote imports accept HTTPS from `1drv.ms`, `onedrive.live.com`, `graph.microsoft.com`, and subdomains of `sharepoint.com` or `1drv.com`; manually validate at most five redirects, enforce a 15-second per-request timeout and a 10 MB streamed-response limit, and redact query strings from logs.
- An import with no valid player rows returns a client error before creating a session or touching players.
- Rollback executes through a `SECURITY DEFINER` PostgreSQL RPC with a fixed `search_path`, and execute permission is limited to `service_role`.
- Do not modify the existing base migration; operators must apply the new migration before deploying dependent application code.
- Do not change the public/admin access policy for player history or import audit endpoints.

## Review Focus

- Blank, partially numeric, `NaN`, or infinite score cells must never become zero; test each in the score parser.
- A file with no valid player rows must not create an import session or soft-retire players; test that validation returns zero accepted rows and verify in the route that the early return precedes `createAdminClient` and all DB writes.
- A redirect to HTTP, a private/unapproved host, or too many redirects must be rejected; test each redirect boundary.
- A remote response larger than 10 MB or slower than the configured timeout must fail without buffering the full response; test oversized `Content-Length` and streamed overflow.
- A rollback with missing logs/player rows or a database RPC error must return failure and retain import evidence; test route error handling, and run a local PostgreSQL integration test if a local Supabase/PostgreSQL instance is available.

---

### Task 1: Keep AddPlayerModal Hook Order Valid

**Files:**
- Modify: `src/components/AddPlayerModal.tsx`

**Interfaces:**
- Consumes: Existing modal props and state.
- Produces: All hooks execute unconditionally before the closed-modal render return.

- [ ] **Step 1: Reproduce the current lint failure**

Run: `npx eslint src/components/AddPlayerModal.tsx`
Expected: FAIL with the React Hook conditional-call diagnostic for the position-recalculation effect.

- [ ] **Step 2: Move the position-recalculation effect above the `if (!isOpen) return null` statement**

Keep its existing dependencies and behavior unchanged.

- [ ] **Step 3: Verify the focused lint result**

Run: `npx eslint src/components/AddPlayerModal.tsx`
Expected: PASS with no hook-order diagnostic.

### Task 2: Validate Import Rows and Bound Remote Downloads

**Files:**
- Create: `src/lib/import/scoreParser.ts`
- Create: `src/lib/import/remoteFile.ts`
- Create: `src/lib/import/scoreParser.test.ts`
- Create: `src/lib/import/remoteFile.test.ts`
- Modify: `src/app/api/import/route.ts`

**Interfaces:**
- Produces: `parseImportScore(value: unknown): number | null`; accept finite numeric values and fully numeric strings with optional valid thousands separators and decimals.
- Produces: `validateImportRows(rows: readonly ImportCandidate[], allowedDivisions: readonly string[]): { validRows: ImportCandidate[]; errors: string[] }`; reject blank names, non-finite scores, and divisions outside the allowed set before the route creates a session.
- Produces: `isAllowedImportUrl(value: string | URL): URL`; accept HTTPS only for `1drv.ms`, `onedrive.live.com`, `graph.microsoft.com`, and subdomains of `sharepoint.com` or `1drv.com`, returning a normalized URL or throwing a validation error.
- Produces: `downloadImportFile(url: string | URL, fetcher?: typeof fetch): Promise<{ buffer: ArrayBuffer; contentDisposition: string; finalUrl: URL }>`; manually follow at most five validated redirects, time out each request, and enforce a 10 MB body limit from both headers and streamed bytes.

- [ ] **Step 1: Write failing score-parser tests**

Test that `parseImportScore` accepts `0`, `12.75`, and `"1,234.5"`; it returns `null` for `""`, whitespace, `"12abc"`, `"1,,234"`, `NaN`, and positive/negative infinity. Test that `validateImportRows` returns no valid rows for blank names, non-finite scores, and invalid divisions, and reports a row error for each.

- [ ] **Step 2: Run the score-parser test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/import/scoreParser.test.ts`
Expected: FAIL because `parseImportScore` is not implemented.

- [ ] **Step 3: Implement `parseImportScore`**

Reject blanks and partial numeric strings instead of silently coercing them to zero.

- [ ] **Step 4: Run the score-parser test to verify it passes**

Run: `node --experimental-strip-types --test src/lib/import/scoreParser.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing remote-URL and response-limit tests**

Test allowed Microsoft sharing hosts; reject HTTP, loopback/private or unapproved hosts, invalid redirects, and a sixth redirect. Test rejection of `Content-Length` over 10 MB and a streamed body that exceeds 10 MB without that header. Verify each request is aborted after 15 seconds.

- [ ] **Step 6: Run the remote-file test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/import/remoteFile.test.ts`
Expected: FAIL because the URL policy/downloader is not implemented.

- [ ] **Step 7: Implement the validated remote downloader**

Use manual redirects, `AbortSignal.timeout(15_000)`, content-length preflight, and a streaming byte counter. Do not include query strings in any log output.

- [ ] **Step 8: Run the remote-file test to verify it passes**

Run: `node --experimental-strip-types --test src/lib/import/remoteFile.test.ts`
Expected: PASS.

- [ ] **Step 9: Integrate strict parsing and download validation into the import route**

Parse and validate player names, divisions, and scores before creating an import session. If the valid row count is zero, return HTTP 400 with row errors before database access. Preserve row-level errors for partially valid files. Do not soft-retire players when no successful player row was processed.

- [ ] **Step 10: Run import-focused tests, lint, and TypeScript validation**

Run: `node --experimental-strip-types --test src/lib/import/scoreParser.test.ts src/lib/import/remoteFile.test.ts`
Run: `npx eslint src/app/api/import/route.ts src/lib/import/scoreParser.ts src/lib/import/remoteFile.ts`
Run: `npx tsc --noEmit`
Expected: All commands pass.

### Task 3: Add Decimal/History Schema and Atomic Rollback

**Files:**
- Create: `supabase/migrations/20261103_decimal_scores_atomic_import_rollback.sql`
- Create: `src/lib/import/rollbackRpc.ts`
- Create: `src/lib/import/rollbackRpc.test.ts`
- Modify: `src/app/api/import/route.ts`
- Modify: `src/app/api/admin/imports/[id]/rollback/route.ts`

**Interfaces:**
- Import route records `player_id`, a monotonically increasing `sequence_no`, and `player_snapshot` for every changed player in `import_logs`.
- Import-created score-history rows record `import_id`.
- PostgreSQL exposes `rollback_import_session(p_import_id uuid) returns void`; the function locks the session, reverses logs in descending `sequence_no`, restores snapshots or deletes newly inserted players, removes history rows for the import, and deletes the session only after successful reversal.
- `rollbackImport(rpc: RollbackRpc, importId: string): Promise<void>` calls `rpc('rollback_import_session', { p_import_id: importId })` and throws a `RollbackRpcError` that preserves the PostgreSQL error code.
- Rollback route calls `rollbackImport`; any RPC error becomes a non-success response and is logged without deleting rollback evidence.

- [ ] **Step 1: Write failing rollback-RPC client tests**

Test that `rollbackImport` calls the RPC exactly once with the requested session ID and rejects with the RPC error code/message when the RPC returns an error.

- [ ] **Step 2: Run the rollback-RPC client test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/import/rollbackRpc.test.ts`
Expected: FAIL because `rollbackImport` is not implemented.

- [ ] **Step 3: Add the forward migration**

Convert `players.total_score`, `starting_score`, `latest_change`, all score fields in `score_history`, and all score fields in `import_logs` to `DOUBLE PRECISION`. Add `score_history.created_at` (backfilled from `updated_at`) and `reason`; add rollback snapshot/order columns and `score_history.import_id`. Create the RPC with `SECURITY DEFINER`, a fixed `search_path`, row locks, reverse-order processing, failure-on-missing/ambiguous targets, and `EXECUTE` granted only to `service_role`. Raise SQLSTATE `PZ001` before mutation if any log lacks a player snapshot.

- [ ] **Step 4: Update import writes to capture reversible state**

For each mutation, include the stable player ID and pre-mutation snapshot in its import log, assign monotonically increasing sequence numbers, and tag import-created history rows with the import ID. Ensure soft-retire logs capture the same snapshot.

- [ ] **Step 5: Replace per-row rollback with the atomic RPC call**

Map SQLSTATE `PZ001` to HTTP 409 and retain logs. For other RPC failures, return HTTP 500; send the success webhook and success response only after the RPC succeeds. Remove the old non-transactional row loop.

- [ ] **Step 6: Implement the rollback-RPC client and wire it into the route**

Run: `node --experimental-strip-types --test src/lib/import/rollbackRpc.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify migration and application checks**

Run: `npx eslint src/app/api/import/route.ts src/app/api/admin/imports/[id]/rollback/route.ts`
Run: `npx tsc --noEmit`
If a local PostgreSQL/Supabase instance is available, apply the migration and test rollback success, rollback failure atomicity, and retained session/logs. Otherwise report that database execution was not verified.
Expected: lint and TypeScript pass; any unavailable database integration test is explicitly reported.

### Task 4: Final Verification

**Files:**
- Verify all changed TypeScript and SQL files.

- [ ] **Step 1: Run all focused Node tests**

Run: `node --experimental-strip-types --test src/lib/import/scoreParser.test.ts src/lib/import/remoteFile.test.ts src/lib/import/rollbackRpc.test.ts`
Expected: All tests pass.

- [ ] **Step 2: Run project TypeScript and production build checks**

Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: Both pass; report any unrelated baseline failures by name.

- [ ] **Step 3: Report deployment requirements**

State that the new Supabase migration must be applied before deploying the matching application code; do not claim production schema compatibility without checking the deployed database.
