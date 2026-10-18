-- Create app_settings table for persistent dynamic configurations
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.app_settings enable row level security;

-- Allow public read access to settings
create policy "Allow public read access to app_settings"
  on public.app_settings for select
  using (true);

-- Allow service role full access
create policy "Allow service role full access to app_settings"
  on public.app_settings for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- Initial seed for rank_thresholds
insert into public.app_settings (key, value)
values (
  'rank_thresholds',
  '{
    "thresholds": [
      { "score": 600, "policeTitle": "พันตำรวจหลวง | Royal Police Colonel", "guardTitle": "นายพันเวร | Battalion Commander of Guardsmen" },
      { "score": 315, "policeTitle": "นายกองตำรวจหลวง | Royal Police Battalion Commander", "guardTitle": "นายกองเวร | Company Head Guardsmen" },
      { "score": 210, "policeTitle": "นายหมวดตำรวจหลวง | Royal Police Platoon Officer", "guardTitle": "นายหมวดเวร | Platoon Head Guardsmen" },
      { "score": 110, "policeTitle": "นายหมู่ตำรวจหลวง | Royal Police Squad Leader", "guardTitle": "นายหมู่เวร | Squad Head Guardsmen" },
      { "score": 60, "policeTitle": "พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper", "guardTitle": "พลทหารยามอาวุโส | Senior Guardsmen" },
      { "score": 45, "policeTitle": "พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper", "guardTitle": "พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen" },
      { "score": 20, "policeTitle": "พลประจำการตำรวจหลวง | Active Royal Police Trooper", "guardTitle": "พลทหารยาม | Guardsmen" },
      { "score": 0, "policeTitle": "พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)", "guardTitle": "พลอาสาสมัครทหารยาม | Junior Guardsmen" }
    ]
  }'::jsonb
)
on conflict (key) do nothing;
