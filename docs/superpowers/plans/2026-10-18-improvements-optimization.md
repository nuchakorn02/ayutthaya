# Implementation Plan: 1. Improvements & Optimizations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4 improvements from Section 1: (1) Division Leaderboard sorting toggle & podium, (2) Pagination / Load More for performance, (3) Next.js branded `loading.tsx` and `error.tsx`, (4) Modular refactoring of `src/app/api/import/route.ts`.

**Architecture:**
- Update `src/app/page.tsx` and `src/components/Leaderboard.tsx` to support sorting by score or joined date in division views, with an interactive sort toggle button and podium support.
- Implement incremental chunk rendering (Load More) in `src/components/Leaderboard.tsx` with smooth transitions.
- Create branded `src/app/loading.tsx` and `src/app/error.tsx` matching the Royal Guards dark-crimson/gold theme.
- Extract `autoReconcileScores`, `matchDivisionFuzzy`, and Discord import notification helper into `src/lib/import/`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4.

---

### Task 1: UX Division Leaderboard Sorting & Podium Support

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/Leaderboard.tsx`

- [ ] **Step 1: Update `src/app/page.tsx` state and filter logic**
  - Add `divisionSortBy: 'score' | 'created'` state (default `'score'`).
  - When filtering by division, sort by `total_score` descending if `'score'`, or `created_at` ascending if `'created'`.
  - Pass `isSortedByScore` properly (true when sorting by score, false when sorting by created_at).
  - Add a sleek sort toggle button in the division header area ("🏆 เรียงตามคะแนนสูงสุด" / "📅 เรียงตามลำดับเข้าประจำการ").

- [ ] **Step 2: Update `src/components/Leaderboard.tsx`**
  - Allow Podium display when `division` has at least 3 players and `isSortedByScore` is true.

---

### Task 2: Smooth Pagination / Load More in Leaderboard

**Files:**
- Modify: `src/components/Leaderboard.tsx`

- [ ] **Step 1: Add chunk rendering logic**
  - Default `visibleCount` to 50 players.
  - Reset `visibleCount` to 50 whenever `players`, `searchQuery`, or `isSortedByScore` changes.
  - Render `players.slice(0, visibleCount)` with a "แสดงเพิ่มเติม (+50 นาย / เหลืออีก X นาย)" button and a "แสดงทั้งหมด" button if `players.length > visibleCount`.
  - Display current count indicator e.g. "กำลังแสดง 50 จาก 210 นาย".

---

### Task 3: Royal Guards Themed `loading.tsx` and `error.tsx`

**Files:**
- Create: `src/app/loading.tsx`
- Create: `src/app/error.tsx`

- [ ] **Step 1: Create `src/app/loading.tsx`**
  - Branded skeleton / spinner with Royal Guard logo, gold glow animation, and status text.

- [ ] **Step 2: Create `src/app/error.tsx`**
  - Client component with error message, warning badge, retry button (`reset()`), and home link.

---

### Task 4: Modular Refactor of `src/app/api/import/route.ts`

**Files:**
- Create: `src/lib/import/divisionMatcher.ts`
- Create: `src/lib/import/reconcile.ts`
- Modify: `src/app/api/import/route.ts`

- [ ] **Step 1: Extract `matchDivisionFuzzy` into `src/lib/import/divisionMatcher.ts`**
  - Move normalization and matching logic into a clean, testable module.

- [ ] **Step 2: Extract `autoReconcileScores` into `src/lib/import/reconcile.ts`**
  - Move score gap reconciliation into its own focused helper.

- [ ] **Step 3: Update `src/app/api/import/route.ts`**
  - Import helpers from `@/lib/import/divisionMatcher` and `@/lib/import/reconcile`.
  - Clean up dead comments and ensure zero behavior regression.

---

### Task 5: Verification & Production Build

- [ ] **Step 1: TypeScript typecheck**
  - Run `npx tsc --noEmit`
- [ ] **Step 2: Next.js production build**
  - Run `npm run build`
