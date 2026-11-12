# Move Supabase Script Credentials to Environment Variables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove hardcoded Supabase credentials from the 15 audited utility scripts while preserving their existing operations.

**Architecture:** Add one shared helper at `scratch/supabase-env.js` that reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, validates both values, and returns typed-by-JavaScript config fields. Update each affected script to consume the helper; root-level `query_db.js` imports it through `./scratch/`, while scripts under `scratch/` use `./supabase-env`.

**Tech Stack:** Node.js CommonJS, built-in `node:test`, existing `@supabase/supabase-js`.

**Spec:** [2026-11-12-supabase-script-credentials-design.md](../specs/2026-11-12-supabase-script-credentials-design.md)

## Global Constraints

- Do not access or modify Production, run migrations, or modify environment files.
- Do not expose secret values in reports, test output, or chat.
- Keep each utility script's current database operation unchanged.
- Do not run any affected utility script; `query_db.js` contains a `players` deletion.
- Credential rotation/revocation and Git-history cleanup remain owner actions and are not part of this plan.

## Review Focus

- Missing URL must fail before any request: test that `getSupabaseConfig()` throws if `NEXT_PUBLIC_SUPABASE_URL` is unset.
- Missing service-role key must fail before any request: test that it throws if `SUPABASE_SERVICE_ROLE_KEY` is unset.
- Complete placeholder configuration must be accepted without network access: test exact returned fields using fake values.
- All 15 scripts must use the shared environment config and contain no embedded credential literals: run a value-redacting static check.
- Import paths must work from both repository root and `scratch/`: run `node --check` on all affected scripts without executing them.

---

### Task 1: Centralize utility-script Supabase configuration

**Files:**
- Create: `scratch/supabase-env.js`
- Create: `scratch/supabase-env.test.js`
- Modify: `query_db.js`
- Modify: `scratch/check_db.js`
- Modify: `scratch/check_dns.js`
- Modify: `scratch/check_headers.js`
- Modify: `scratch/check_history.js`
- Modify: `scratch/check_spec.js`
- Modify: `scratch/check_timestamps.js`
- Modify: `scratch/fix_chong_db.js`
- Modify: `scratch/get_schema.js`
- Modify: `scratch/inspect_import.js`
- Modify: `scratch/query_all_created_at.js`
- Modify: `scratch/query_chong.js`
- Modify: `scratch/query_logs.js`
- Modify: `scratch/query_players.js`
- Modify: `scratch/test_imports_table.js`

**Interfaces:**
- Produces: `getSupabaseConfig() -> { supabaseUrl: string, supabaseServiceRoleKey: string }`; throws an explicit configuration error if either required environment variable is empty or absent.
- Consumes: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, matching the application's existing names.

- [x] **Step 1: Write the failing helper tests** in `scratch/supabase-env.test.js` using `node:test` and `node:assert/strict`. Assert that missing URL and missing service-role key each throw an explicit error, and that two placeholder environment values are returned under the documented property names. Restore `process.env` after each test.

- [x] **Step 2: Run the tests and confirm they fail before implementation**

Run: `node --test scratch/supabase-env.test.js`
Expected: FAIL because `scratch/supabase-env.js` does not yet exist.

- [x] **Step 3: Implement `getSupabaseConfig()`** in `scratch/supabase-env.js`. Read only the two named environment variables; reject empty/missing values; do not log values or load local files.

- [x] **Step 4: Run helper tests**

Run: `node --test scratch/supabase-env.test.js`
Expected: PASS for missing URL, missing key, and valid placeholder configuration; no network calls.

- [x] **Step 5: Replace hardcoded config in all 15 listed scripts** with `getSupabaseConfig()`. Preserve each script's existing request, database operations, and error handling. Use `require('./scratch/supabase-env')` from `query_db.js` and `require('./supabase-env')` from files under `scratch/`.

- [x] **Step 6: Verify syntax without executing scripts**

Run: `node --check query_db.js` and `node --check` for each listed `scratch/*.js` file.
Expected: every command exits 0; no script is executed and no Supabase request is made.

- [x] **Step 7: Verify credential removal without printing values**

Run a local check over the 15 files that reports only the names of files still matching embedded service-role JWT patterns; do not print matching lines or values.
Expected: no affected file is reported.

- [x] **Step 8: Re-run the helper tests**

Run: `node --test scratch/supabase-env.test.js`
Expected: all tests pass after integrating the helper.
