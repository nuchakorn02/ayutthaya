# Implementation Plan: 2. Remove / Prune Unnecessary & Risky Code

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unnecessary, risky, and redundant code: (1) Prune `'unsafe-eval'` from Content Security Policy in `next.config.ts`, (2) Remove stray `workspace.code-workspace` and clean up `src/middleware.ts`, (3) Remove hardcoded rank milestone numbers from `PlayerRow.tsx` by centralizing rank progression in `src/lib/positionUtils.ts`.

**Tech Stack:** Next.js 16, TypeScript, React 19.

---

### Task 1: Prune `'unsafe-eval'` from Content Security Policy

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Remove `'unsafe-eval'`**
  - In `next.config.ts`, change `"script-src 'self' 'unsafe-inline' 'unsafe-eval'"` to `"script-src 'self' 'unsafe-inline'"` to harden XSS protection.

---

### Task 2: Remove Stray Workspace File & Clean Up Middleware

**Files:**
- Delete: `src/app/api/players/[id]/history/workspace.code-workspace`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Delete stray `workspace.code-workspace`**
  - Remove accidental IDE workspace file in API routes.

- [ ] **Step 2: Clean up deprecated route checks in `src/middleware.ts`**
  - Verify and tidy up `DISABLED_ROUTES`.

---

### Task 3: Prune Hardcoded Rank Milestones in `PlayerRow.tsx`

**Files:**
- Modify: `src/lib/positionUtils.ts`
- Modify: `src/components/PlayerRow.tsx`

- [ ] **Step 1: Add `getRankProgression(score, division, thresholds)` in `src/lib/positionUtils.ts`**
  - Accepts score, division, and optional dynamic thresholds.
  - Returns `{ isMaxRank: boolean, isSpecialDivision: boolean, nextRankName?: string, pointsNeeded?: number, percent?: number }`.

- [ ] **Step 2: Update `src/components/PlayerRow.tsx`**
  - Replace the 30-line hardcoded `milestones` array in `PlayerRow.tsx` with `getRankProgression`.

---

### Task 4: Verification & Production Build

- [ ] **Step 1: TypeScript typecheck**
  - Run `npx tsc --noEmit`
- [ ] **Step 2: Next.js production build**
  - Run `npm run build`
