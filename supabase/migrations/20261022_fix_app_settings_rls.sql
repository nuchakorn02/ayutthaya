-- Fix 1: Restrict public read access to app_settings
-- Previously: All keys were publicly readable (including discord_settings which contains webhook tokens)
-- Now: Only 'rank_thresholds' is publicly readable; all secret keys require service_role

-- Drop the overly-permissive policy
drop policy if exists "Allow public read access to app_settings" on public.app_settings;

-- Replace with a whitelist policy — only safe, non-secret settings keys are publicly readable
create policy "Allow public read access to non-secret app_settings"
  on public.app_settings for select
  using (key in ('rank_thresholds'));
