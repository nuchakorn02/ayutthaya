-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  division TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter table to ensure position column exists in existing database
ALTER TABLE players ADD COLUMN IF NOT EXISTS position TEXT;

-- Score history table
CREATE TABLE IF NOT EXISTS score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  score_diff INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_division ON players(division);
CREATE INDEX IF NOT EXISTS idx_players_total_score ON players(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_score_history_player_id ON score_history(player_id);
CREATE INDEX IF NOT EXISTS idx_score_history_updated_at ON score_history(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read on score_history" ON score_history FOR SELECT USING (true);

-- Alter table to add starting_score and latest_change columns for tracking score progression
ALTER TABLE players ADD COLUMN IF NOT EXISTS starting_score INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS latest_change INTEGER DEFAULT 0;

-- Service role has full access by default, no need for additional policies

-- Imports table
CREATE TABLE IF NOT EXISTS imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import logs table
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  division TEXT NOT NULL,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  score_diff INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read on imports" ON imports FOR SELECT USING (true);
CREATE POLICY "Allow public read on import_logs" ON import_logs FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_logs_import_id ON import_logs(import_id);

-- Login attempts rate limiter table
CREATE TABLE IF NOT EXISTS login_attempts (
  ip_address TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS (Service role will bypass RLS, no public read/write allowed for security)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
