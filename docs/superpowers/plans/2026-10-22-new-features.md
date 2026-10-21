# Implementation Plan: 3. Add New Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 high-value new features: (1) Brute-force protection enhancements for Admin Login, (2) Export Leaderboard to CSV on the Public view, (3) Discord Webhook settings & test notification panel in Admin Dashboard, (4) Direct Roblox profile quick-link in player rows.

**Architecture:**
- Create `/api/settings/discord` to store Discord configuration in Supabase `app_settings` with fallback to `.env`.
- Build `DiscordSettingsModal.tsx` for Admin UI with test ping functionality.
- Add CSV export function with UTF-8 BOM encoding for Thai language compatibility in `src/app/page.tsx`.
- Enhance Roblox username links across `PlayerRow.tsx` and `AdminPlayerManager.tsx`.
- Add in-memory sliding-window fallback in `/api/admin/login` to supplement DB rate limiting.

**Tech Stack:** Next.js 16, TypeScript, Supabase, React 19, Tailwind CSS v4.

---

### Task 1: In-Memory Multi-Tier Rate Limiting for Admin Login

**Files:**
- Modify: `src/app/api/admin/login/route.ts`

- [ ] **Step 1: Add in-memory sliding window rate limiter fallback**
  - Track IP attempts in-memory as a secondary layer if database table is slow or unavailable.
  - Reject requests when locked out with 429 status and clear retry message.

---

### Task 2: Public Leaderboard CSV Export with UTF-8 BOM

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement `handleExportCSV` in `src/app/page.tsx`**
  - Generates CSV with UTF-8 BOM (`\uFEFF`) to prevent Thai font corruption in Microsoft Excel.
  - Exports currently filtered division or all players with rank, name, division, position, and total score.
- [ ] **Step 2: Add Export button to UI**
  - Place a sleek button next to division/search controls.

---

### Task 3: Discord Webhook Management in Admin Dashboard

**Files:**
- Create: `src/app/api/settings/discord/route.ts`
- Modify: `src/lib/discord.ts`
- Create: `src/components/DiscordSettingsModal.tsx`
- Modify: `src/components/admin/AdminPlayerManager.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create `src/app/api/settings/discord/route.ts`**
  - GET: returns current settings (masking webhook URL for safety, returns enabled status and template).
  - POST: saves webhook URL, enabled toggle, and import template into `app_settings`.
  - POST with action 'test': sends a test notification to verify the webhook.
- [ ] **Step 2: Update `src/lib/discord.ts`**
  - Check `app_settings` for dynamic webhook URL and enabled flag before falling back to `process.env`.
- [ ] **Step 3: Create `DiscordSettingsModal.tsx` & wire up in Admin**
  - Add button in `AdminPlayerManager.tsx` and wire modal in `AdminPage`.

---

### Task 4: Roblox Profile Quick-Link in Player Rows

**Files:**
- Modify: `src/components/PlayerRow.tsx`
- Modify: `src/components/admin/AdminPlayerManager.tsx`

- [ ] **Step 1: Update `PlayerRow.tsx`**
  - Make player name or add an external link icon linking to `https://www.roblox.com/users/profile?username=...` with `target="_blank"`.
- [ ] **Step 2: Update `AdminPlayerManager.tsx`**
  - Add link on player names in the admin table.

---

### Task 5: Verification & Production Build

- [ ] **Step 1: TypeScript typecheck**
  - Run `npx tsc --noEmit`
- [ ] **Step 2: Next.js production build**
  - Run `npm run build`
- [ ] **Step 3: Git commit & push**
