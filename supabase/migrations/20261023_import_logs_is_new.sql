-- Track whether an import_log entry corresponds to a newly inserted player,
-- so rollback can safely distinguish new players from existing ones whose
-- score happened to start at 0 (avoids deleting real players on rollback).
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;
