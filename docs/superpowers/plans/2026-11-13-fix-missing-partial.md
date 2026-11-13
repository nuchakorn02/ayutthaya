# Fix Missing / Partial Findings

Continuation of the code review for `HEAD~9...HEAD`. Fixes the Spec-axis Missing/Partial findings in detail.

## Goal

Close the gaps between the existing implementation and the project specs:

- `docs/superpowers/specs/2026-11-03-critical-risk-fixes-design.md`
- `docs/superpowers/specs/2026-11-04-import-preview-design.md`

## Tasks

### Task 1 — Strict score parser + tests ✅
- Create `src/lib/import/scoreParser.ts`
- Create `src/lib/import/scoreParser.test.ts`
- Behavior: accept finite non-negative numbers/decimal numeric strings with valid comma grouping; reject blank, partially numeric, NaN, infinite, negative, and `-999` sentinel.

### Task 2 — Bounded remote file downloader + tests ✅
- Create `src/lib/import/remoteFile.ts`
- Create `src/lib/import/remoteFile.test.ts`
- Behavior: allow HTTPS only from Microsoft sharing hosts (`1drv.ms`, `onedrive.live.com`, `graph.microsoft.com`, and subdomains of `sharepoint.com`/`1drv.com`); manually follow ≤5 redirects; 15 s timeout; 10 MB stream/body limit; redact query strings from logs/errors.

### Task 3 — Rollback RPC client + tests ✅
- Create `src/lib/import/rollbackRpc.ts`
- Create `src/lib/import/rollbackRpc.test.ts`
- Behavior: thin wrapper around `rollback_import_session` RPC; throws `RollbackRpcError` preserving the SQLSTATE/message.

### Task 4 — Harden import route ✅
- Update `src/app/api/import/route.ts`
- Integrate `scoreParser` and `remoteFile`
- Validate all rows before creating an import session or writing to DB
- Return 400 with row-level errors when no valid rows exist
- Reject negative scores and `-999`
- Stop coercing invalid scores to zero

### Task 5 — Complete atomic rollback schema + RPC ✅
- Create `supabase/migrations/20261113120000_complete_atomic_rollback.sql`
- Convert score columns to `DOUBLE PRECISION`
- Add `score_history.created_at`, `reason`, `import_id`
- Add `import_logs.player_id`, `player_snapshot`, `sequence_no`
- Rewrite `rollback_import_session` to restore snapshots/delete new players by `sequence_no DESC`
- Raise SQLSTATE `PZ001` when any log lacks `player_snapshot`
- Update `src/app/api/admin/imports/[id]/rollback/route.ts` to map `PZ001` to HTTP 409

### Task 6 — Import preview foundation ✅
- Create `src/lib/import/scoreParsing.mjs` + test
- Create `src/lib/import/parseSpreadsheet.mjs` + test
- Create `src/lib/import/plan.mjs` + test
- Create `src/lib/import/confirmation.mjs` + test
- Create `src/lib/import/previewService.mjs` + test
- Create `supabase/migrations/20261113130000_atomic_import_preview_commit.sql`
  - `commit_import_preview(p_expected_state jsonb, p_import_plan jsonb, p_filename text)`
  - Locks relevant players, compares locked state with expected snapshot
  - Applies new/update/retire actions atomically
  - Creates import session/logs with snapshots and sequence numbers
  - Returns `{ import_id, imported, updated, errors, persistence_errors }`
  - Raises `PZ003` when database state differs from preview
- Create `supabase/tests/import_preview_commit.sql` disposable-database assertions
- Update `src/app/api/import/route.ts` with `action: "preview"` and `action: "confirm"` branches
- Add short-lived signed confirmation context using HMAC + service-role key
- Update `src/components/CsvImporter.tsx` for preview/confirm flow

### Task 7 — Shared Roblox profile link component ✅
- Create `src/components/RobloxProfileLink.tsx`
- Wire into `src/components/PlayerRow.tsx` (desktop + mobile rows)
- Wire into `src/components/admin/AdminPlayerManager.tsx`
- Remove duplicated `<a>` markup that built the Roblox URL inline

### Task 8 — Replace retired-player `-999` magic number with `RETIRED_SCORE` ✅
- Create `src/lib/constants.mjs` with `export const RETIRED_SCORE = -999`
- Update all source code comparisons/assignments to import the constant:
  - `src/lib/import/plan.mjs`
  - `src/lib/import/scoreParsing.mjs` and `scoreParser.ts`
  - `src/lib/import/reconcile.ts`
  - `src/lib/players/scoreMutation.mjs` + test
  - `src/app/api/admin/top-increases/route.ts`
  - `src/components/ScoreUpdater.tsx`
  - `src/components/ScoreHistoryModal.tsx`
  - `src/components/admin/AdminImportSystem.tsx`
- Update parser tests to use the constant where practical

### Task 9 — Remove duplicated rank-assignment fallback in `ScoreUpdater` ✅
- Replace the hardcoded `if/else` score ladder in `src/components/ScoreUpdater.tsx` with `calculateDefaultPosition(score, division, thresholds)` from `src/lib/positionUtils`
- Preserve special leader/instructor position guard before calling the helper
- Add `src/lib/positionUtils.test.ts` covering special divisions and fallback guard/police titles

### Task 10 — Complete preview UI + deployment docs ✅
- Add shared `ImportPreview`, `ImportPreviewRow`, `ImportValidationError`, `ImportPlan`, `ImportComparisonState` types to `src/lib/types.ts`
- Create `src/lib/import/previewPagination.mjs` + test (25-row pagination, final partial page, clamped page numbers)
- Create `src/components/admin/ImportPreviewTable.tsx` with bounded pagination and all-errors-visible behavior
- Update `src/components/CsvImporter.tsx` to use `ImportPreviewTable` and shared types
- Create `docs/import-preview-deployment.md` with migration order, RPC grants, disposable DB test instructions, and 409/fresh-preview behavior

## Verification ✅

- `node --test "src/lib/import/*.test.mjs" "src/lib/import/*.test.ts" "src/lib/players/*.test.mjs" "scratch/*.test.js"` → 53 tests pass
- `npx tsx --test src/lib/positionUtils.test.ts` → 5 tests pass
- `npx tsc --noEmit` → no errors
- `npm run build` → production build succeeds
- `npx eslint <changed files>` → 0 errors; only pre-existing `<img>` element warnings
