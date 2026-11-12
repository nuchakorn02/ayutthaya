# Import Preview and Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only preview and explicit confirmation flow for roster imports from local Excel/CSV files and OneDrive links.

**Architecture:** Extract canonical spreadsheet parsing and a read-only import-plan builder, then expose preview and confirm actions through the existing import route. A short-lived signed context binds the source and comparison fingerprints; a service-role-only Postgres RPC locks and compares the relevant database state in the same transaction that applies the prepared plan, while preserving per-operation partial-failure reporting.

**Tech Stack:** Next.js 16.2.6 Route Handlers, TypeScript, Node.js `node:test`, Supabase JS/Postgres, XLSX.

**Spec:** [2026-11-04-import-preview-design.md](../specs/2026-11-04-import-preview-design.md)

## Global Constraints

- Support local `.csv`, `.xlsx`, `.xls` files and OneDrive/Excel Online URLs.
- Parse and compare imports on the server using the same rules as the eventual write.
- Show counts and row-level details for new players, updates, and players who would be retired because they are absent from the source.
- Require explicit confirmation before writing anything.
- Block the entire import when any source row has a validation error; do not write valid rows from a flawed file.
- Ensure confirmation uses the same source content and database comparison state that the admin reviewed; stale previews must require a new preview.
- Preserve existing import session logs, score history, rollback support, and partial-persistence error reporting.
- Never allow a preview request to create an import session or mutate players, score history, or import logs.
- Never silently coerce invalid or missing score cells into zero.
- Never confirm a source whose bytes or relevant database comparison state changed since preview.
- Do not add a preview-history table or store uploaded files in the database.
- Enforce the final state comparison and import writes in one database transaction; preserve per-operation persistence errors and partial-import reporting.
- Do not change the existing policy that players missing from a confirmed roster import are retired.
- Do not change the public leaderboard, score calculation policy, or how rank thresholds are chosen.
- Follow the installed Next.js 16 Route Handler conventions and the existing Supabase service-role access pattern.
- Do not expose secrets or include raw URL query credentials in logs or responses.
- Authentication/authorization must remain consistent with the current admin import route and must be enforced for both preview and confirmation.
- Run the complete available test suite, lint, TypeScript validation, and production build. Live Supabase credentials are not assumed.

## Review Focus

- **Missing, malformed, non-finite, negative, or `-999` score cells:** reject the entire import and preserve the original spreadsheet row number. Pin with `parseImportScore_rejectsInvalidScores` and `buildImportPlan_blocksAnyInvalidRow` in Task 1.
- **Repeated source names or multiple database matches:** report an actionable validation error rather than silently updating an arbitrary record. Pin with `buildImportPlan_rejectsDuplicateAndAmbiguousNames` in Task 1.
- **Empty/header-only sources and division-banner-only sheets:** produce no retirement operations and no writes. Pin with `buildImportPlan_doesNotRetireRosterWithoutValidPlayers` in Task 1 and the SQL empty-plan assertion in Task 3.
- **Changed or replayed confirmation context:** reject expired/tampered tokens, changed source bytes, and changed player/history/rank state before any write. Pin with token/fingerprint tests in Task 2 and stale-state RPC assertions in Task 3.
- **Large previews and source replacement while reviewing:** keep the table bounded, preserve aggregate counts and all validation messages, and invalidate preview when the selected source changes or is canceled. Pin with the 25-row pagination checks and UI flow in Task 4.

---

### Task 1: Extract strict parsing and build a read-only import plan

**Files:**
- Create: `src/lib/import/parseSpreadsheet.mjs`
- Create: `src/lib/import/parseSpreadsheet.d.mts`
- Create: `src/lib/import/parseSpreadsheet.test.mjs`
- Create: `src/lib/import/scoreParsing.mjs`
- Create: `src/lib/import/scoreParsing.d.mts`
- Create: `src/lib/import/scoreParsing.test.mjs`
- Create: `src/lib/import/plan.mjs`
- Create: `src/lib/import/plan.d.mts`
- Create: `src/lib/import/plan.test.mjs`
- Modify: `src/app/api/import/route.ts`

**Interfaces:**
- Produces `parseImportScore(value) -> number | null`; accept finite, non-negative integer/decimal scores, including comma-grouped strings, and reject blank, partially numeric, non-finite, negative, and the `-999` retirement sentinel.
- Produces `parseSpreadsheet(buffer, extension, matchDivisionFuzzy) -> { rows, errors }`; preserve existing header fallback, division-banner inheritance, position translation, and one-based source row numbers. Each parsed row retains its raw score value for validation. Inject the existing division matcher so the Node-tested parser does not duplicate its rules.
- Produces `buildImportPlan(parsedSpreadsheet, comparisonState, rankThresholds) -> ImportPlan`; it consumes both parsed rows and parser errors. The comparison state contains the player fields used for matching, latest `-999` retirement-history scores, and rank thresholds. Plan row actions are `new`, `update`, `retire`, and `error`; validation errors are structured with source row and reason. Name matching remains exact and case-sensitive, consistent with the current importer.
- The retirement-history snapshot uses the schema's `score_history.updated_at` ordering (also used by rollback), not the stale `created_at` reference in the current import route.
- `ImportPlan` contains `rows`, `counts: { new, updated, retired, errors }`, and `errors`; `counts.errors` counts invalid source rows. Each row contains `action`, `source_row`, `player_name`, `division`, `current_score`, `proposed_score`, `score_diff`, and an optional validation message. Retirement rows use a null source row.
- The plan builder performs no database calls or writes.

- [ ] **Step 1: Write failing tests** named `parseImportScore_acceptsDecimalsAndCommaGroupedNumbers`, `parseImportScore_rejectsInvalidScores`, `parseSpreadsheet_preservesBannerDivisionAndSourceRow`, `buildImportPlan_reportsNewUpdateAndRetireActions`, `buildImportPlan_rejectsDuplicateAndAmbiguousNames`, `buildImportPlan_usesPreRetirementScoreWhenRestoringPlayer`, `buildImportPlan_blocksAnyInvalidRow`, and `buildImportPlan_doesNotRetireRosterWithoutValidPlayers`.
- [ ] **Step 2: Run the focused tests** with `node --test src/lib/import/scoreParsing.test.mjs src/lib/import/parseSpreadsheet.test.mjs src/lib/import/plan.test.mjs`; confirm they fail for the missing helpers or behavior.
- [ ] **Step 3: Implement the score parser, canonical spreadsheet parser, declaration files, and pure plan builder** and replace the corresponding inline parse/compare logic in `src/app/api/import/route.ts` with calls to them. Do not retain the current fallback that turns an invalid score into zero or the duplicate-row warning that permits overwrite.
- [ ] **Step 4: Run the focused tests** with `node --test src/lib/import/scoreParsing.test.mjs src/lib/import/parseSpreadsheet.test.mjs src/lib/import/plan.test.mjs`; confirm all cases pass.
- [ ] **Step 5: Commit** as `feat: extract validated import planning`.

### Task 2: Add signed fingerprints and a read-only preview API

**Files:**
- Create: `src/lib/import/confirmation.mjs`
- Create: `src/lib/import/confirmation.d.mts`
- Create: `src/lib/import/confirmation.test.mjs`
- Create: `src/lib/import/source.ts`
- Create: `src/lib/import/previewService.mjs`
- Create: `src/lib/import/previewService.d.mts`
- Create: `src/lib/import/previewService.test.mjs`
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/import/route.ts`

**Interfaces:**
- Produces `readImportSource(request) -> { bytes, extension, filename }` for both multipart files and OneDrive JSON requests; preserve the 10 MB local-file limit and supported extensions.
- Produces `createImportPreview(source, comparisonState, matchDivisionFuzzy, secret, now) -> ImportPreview`; returns `source_name`, `source_fingerprint`, `comparison_fingerprint`, `rows`, `counts`, `errors`, and a signed `confirmation_token` only when validation succeeds.
- Produces `fingerprintSource(bytes)`, `fingerprintComparisonState(state)`, `signConfirmationContext(sourceFingerprint, comparisonFingerprint, expiresAt, secret)`, and `verifyConfirmationContext(token, secret, sourceFingerprint, comparisonFingerprint, now)` in `confirmation.mjs`. Verification returns false for a bad signature, expiry, or either mismatched fingerprint. Tokens expire 15 minutes after preview and use HMAC with the server-only Supabase service-role key.
- Adds typed `ImportPreview`, `ImportPreviewRow`, `ImportValidationError`, `ImportPlan`, and comparison-state definitions in `src/lib/types.ts`.
- POST accepts explicit `action: "preview"` for local-file and URL sources. Preview reads players, relevant retirement history, and rank thresholds only; it creates no import session and makes no writes.

- [ ] **Step 1: Write failing tests** named `fingerprintComparisonState_isDeterministic`, `confirmationContext_rejectsTamperingAndExpiry`, `confirmationContext_rejectsChangedSourceOrComparisonFingerprint`, and `createImportPreview_returnsRowsCountsErrorsAndFingerprints`.
- [ ] **Step 2: Run the focused tests** with `node --test src/lib/import/confirmation.test.mjs src/lib/import/previewService.test.mjs`; confirm they fail before implementation.
- [ ] **Step 3: Read the installed Next.js Route Handler guide** under `node_modules/next/dist/docs/` before modifying the route, then implement the source reader, fingerprint/token helpers, typed preview response, and read-only `preview` branch. Keep the existing `src/proxy.ts` authorization in force for the POST route. Remove full source URLs, query credentials, and raw spreadsheet rows from logs and responses.
- [ ] **Step 4: Add `createImportPreview_doesNotIssueTokenForInvalidPlan`** to `previewService.test.mjs`; run `node --test src/lib/import/confirmation.test.mjs src/lib/import/previewService.test.mjs` and confirm all cases pass.
- [ ] **Step 5: Commit** as `feat: add read-only import preview API`.

### Task 3: Commit imports through a state-checked database RPC

**Files:**
- Create: `supabase/migrations/20261104120000_atomic_import_preview_commit.sql`
- Create: `supabase/tests/import_preview_commit.sql`
- Modify: `src/app/api/import/route.ts`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Adds `public.commit_import_preview(p_expected_state jsonb, p_import_plan jsonb, p_filename text) returns jsonb`. The function locks `players`, `score_history`, and `app_settings`, compares the locked state with `p_expected_state`, and raises a recognizable stale-state exception before writing if they differ.
- The RPC applies new, update/transfer, and retirement actions; preserves score-history, import-session, import-log, rollback, and retirement-sentinel semantics. It handles per-operation failures and returns `{ import_id, imported, updated, errors, persistence_errors }` so the route retains partial-persistence reporting. Preserve decimal score values end-to-end; the SQL test asserts a score such as `121.75` is not rounded.
- `supabase/migration.sql` declares score columns as integers while the import code supports decimal scores. In this migration, safely convert `players.total_score`, `starting_score`, and `latest_change`, plus `score_history` and `import_logs` old/new/diff columns, to `double precision`; verify existing integer values are preserved and `121.75` round-trips exactly.
- Preserve current count/log semantics: new players count as imported; existing players count as updated only when score or division changes; unchanged rows do not create score-history/import-log entries; new-player history is written only for positive scores.
- RPC execution is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`; use a fixed `search_path`.
- `action: "confirm"` re-reads and re-parses the submitted file/link, verifies the signed context and source fingerprint, freshly loads and fingerprints comparison state, rebuilds the plan, and calls the RPC with that state. It never trusts a client-submitted plan. A stale fingerprint/RPC conflict returns HTTP 409 without applying the plan; row validation errors return HTTP 422.
- On a successful RPC result, preserve the existing score reconciliation and Discord notification behavior. Reconciliation failures continue to surface as partial-persistence errors.

- [ ] **Step 1: Write the disposable-database SQL assertions** in `supabase/tests/import_preview_commit.sql` for: a matching snapshot commits a new player with exact decimal score `121.75`, a score update/history/log, and an absent-player retirement; the existing rollback RPC restores the pre-import state and removes the newly imported player; a stale player/history/rank snapshot raises conflict and leaves all tables unchanged; an empty plan creates no import session and never retires the roster; and an injected per-operation failure is reported as partial rather than silently successful.
- [ ] **Step 2: Add the migration/function signature and restricted grants, then apply it to a disposable Supabase/Postgres database** and run `psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase\tests\import_preview_commit.sql`; confirm the assertions fail against the unimplemented function. Never run this test against production data.
- [ ] **Step 3: Implement the transactional RPC** with locked-state comparison, restricted execution grants, and per-operation error collection. Keep the existing rollback RPC and its schema contract unchanged.
- [ ] **Step 4: Implement the `confirm` route branch** with source/token/state checks and RPC error mapping; verify mismatch paths return 409 before an import session or player mutation is created. Rebuild the plan from server-parsed source and freshly read state; never accept an operation list from the browser. Reject requests without an explicit `preview` or `confirm` action so the legacy direct-write path cannot bypass review.
- [ ] **Step 5: Re-run the SQL assertions and focused Node tests**; confirm successful commit, stale-state no-write behavior, rollback compatibility, and partial error response.
- [ ] **Step 6: Commit** as `feat: atomically confirm import previews`.

### Task 4: Add the preview, review, and explicit confirmation UI

**Files:**
- Create: `src/components/admin/ImportPreviewTable.tsx`
- Create: `src/lib/import/previewPagination.mjs`
- Create: `src/lib/import/previewPagination.test.mjs`
- Modify: `src/components/CsvImporter.tsx`
- Modify: `src/lib/types.ts`
- Create: `docs/import-preview-deployment.md`

**Interfaces:**
- `ImportPreviewTable` consumes `ImportPreview`; display action, player, division, current/proposed score, and score difference; paginate table rows at 25 per page while showing all validation errors and aggregate counts.
- `CsvImporter` submits both local files and OneDrive URLs to `action: "preview"`, shows preview state, and submits the same source plus signed token to `action: "confirm"` only after explicit confirmation. Canceling, replacing the file, or editing the URL clears the preview.
- The UI does not render a confirmation control when validation errors exist; stale (409), expired-context, preview, and final-import errors are shown distinctly. Preserve existing partial-import result details and `onImportComplete` behavior.
- Deployment documentation explains applying the migration before deploying confirmation code, running the SQL test only against a disposable database, and the 409/fresh-preview behavior.

- [ ] **Step 1: Write pagination tests** named `paginatePreviewRows_boundsRowsToTwentyFive` and `paginatePreviewRows_keepsFinalPartialPage`; run `node --test src/lib/import/previewPagination.test.mjs` and confirm they fail before implementation.
- [ ] **Step 2: Implement the bounded pagination helper and `ImportPreviewTable`**; keep every validation error available regardless of current page.
- [ ] **Step 3: Update `CsvImporter`** to split preview and confirm for both source types, clear preview when source inputs change, disable confirmation for invalid plans, and retain partial-result reporting.
- [ ] **Step 4: Add migration/deployment instructions** to `docs/import-preview-deployment.md`, then run pagination tests and `npm run lint`; confirm both pass without introducing new lint errors.
- [ ] **Step 5: Run `npx tsc --noEmit` and `npm run build`**; confirm the admin route and both import source types compile.
- [ ] **Step 6: Smoke-check the UI flow** with an admin session when environment credentials are available: preview a valid local file and OneDrive link, block an invalid file, cancel/replace the source, page through more than 25 rows, and confirm only after explicit approval.
- [ ] **Step 7: Commit** as `feat: add import preview confirmation UI`.

## Final Verification

- [ ] Run all Node tests with `node --test "src/**/*.test.mjs"`; confirm all pass.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`; confirm no errors.
- [ ] Run `supabase/tests/import_preview_commit.sql` against a disposable database with the documented command; confirm stale-state tests produce no writes and the matching-state test preserves import/rollback semantics.
- [ ] Verify the final diff contains no preview storage table, raw URL query credentials, or direct-write path reachable without confirmation.
