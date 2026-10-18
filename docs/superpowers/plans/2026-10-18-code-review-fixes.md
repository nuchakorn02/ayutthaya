# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical consistency, persistence, and security issues identified in the Leaderboard codebase review (C1, C2, C3, C4, M6, m1).

**Architecture:**
- Centralize rank calculation into `@/lib/positionUtils.ts` so rollback, add-player modal, and score updater share the exact same logic and dynamic thresholds.
- Enhance `/api/settings/ranks` with Supabase `app_settings` persistence while maintaining graceful fallback to `rankSettings.json`.
- Separate Supabase public server client from admin client to prevent unnecessary service-role elevation on `GET /api/players`.
- Replace dynamic `require()` calls with top-level ES module imports and centralize shared constants into `@/lib/constants.ts`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase JS, React 19, Tailwind CSS v4.

---

### Task 1: Deduplicate `calculateDefaultPosition` and fix `AddPlayerModal` & `Rollback` (C2 & C3)

**Files:**
- Modify: `src/app/api/admin/imports/[id]/rollback/route.ts`
- Modify: `src/components/AddPlayerModal.tsx`
- Reference: `src/lib/positionUtils.ts`

- [ ] **Step 1: Update `src/app/api/admin/imports/[id]/rollback/route.ts`**
  - Remove duplicate local `calculateDefaultPosition()`
  - Import `calculateDefaultPosition` from `@/lib/positionUtils`
  - Fetch dynamic rank settings from `app_settings` or `/api/settings/ranks` or use fallback thresholds cleanly

- [ ] **Step 2: Update `src/components/AddPlayerModal.tsx`**
  - Fetch thresholds from `/api/settings/ranks` on mount (matching `ScoreUpdater.tsx`)
  - Remove duplicate local `calculateDefaultPosition()`
  - Import `calculateDefaultPosition` from `@/lib/positionUtils`

- [ ] **Step 3: Verification**
  - Verify TypeScript compilation for `rollback/route.ts` and `AddPlayerModal.tsx`

---

### Task 2: Supabase Persistence for Rank Settings with File Fallback (C1)

**Files:**
- Modify: `src/app/api/settings/ranks/route.ts`
- Create: `supabase/migrations/20261018_app_settings.sql`

- [ ] **Step 1: Create SQL migration `supabase/migrations/20261018_app_settings.sql`**
  - Define `app_settings` table (key text primary key, value jsonb not null, updated_at timestamptz)
  - Add default seed data for `rank_thresholds`

- [ ] **Step 2: Update `src/app/api/settings/ranks/route.ts`**
  - Attempt reading from Supabase `app_settings` using `createAdminClient()`. If error or empty, fallback to reading `rankSettings.json`.
  - On POST, upsert to `app_settings` and attempt sync to `rankSettings.json` when filesystem is writable.

- [ ] **Step 3: Verification**
  - Test `/api/settings/ranks` route logic with schema fallback.

---

### Task 3: Public Data Access Separation for `GET /api/players` (C4)

**Files:**
- Modify: `src/lib/supabase/server.ts`
- Modify: `src/app/api/players/route.ts`

- [ ] **Step 1: Add `createPublicServerClient()` in `src/lib/supabase/server.ts`**
  - Export `createPublicServerClient()` using `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 2: Update `GET /api/players`**
  - Use `createPublicServerClient()` instead of `createAdminClient()` for reading public players list and score history.
  - Retain `createAdminClient()` for write operations (POST).

---

### Task 4: Standardize Imports (`require`) & Centralize Constants (M6 & m1)

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/app/api/players/route.ts`
- Modify: `src/app/api/admin/imports/[id]/rollback/route.ts`

- [ ] **Step 1: Create `src/lib/constants.ts`**
  - Define and export `DIVISIONS` list and `DIVISION_COLORS` mapping.

- [ ] **Step 2: Clean up dynamic `require()`**
  - In `src/app/api/players/route.ts`, replace dynamic `require('@/lib/discord')` with top-level imports.
  - In `src/app/api/admin/imports/[id]/rollback/route.ts`, replace dynamic `require('@/lib/discord')` with top-level imports.

---

### Task 5: End-to-End Build & Typecheck Verification

- [ ] **Step 1: Run TypeScript check**
  - Run `npx tsc --noEmit`
- [ ] **Step 2: Run build**
  - Run `npm run build`
- [ ] **Step 3: Report results to user**
