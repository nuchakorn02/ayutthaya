-- Complete atomic import rollback schema.
-- Adds reversible snapshots, sequence numbers, import tagging on history,
-- decimal score support, and a PZ001 guard for legacy sessions.

-- 1. Convert score columns to DOUBLE PRECISION for decimal support.
ALTER TABLE public.players
  ALTER COLUMN total_score TYPE DOUBLE PRECISION,
  ALTER COLUMN starting_score TYPE DOUBLE PRECISION,
  ALTER COLUMN latest_change TYPE DOUBLE PRECISION;

ALTER TABLE public.score_history
  ALTER COLUMN old_score TYPE DOUBLE PRECISION,
  ALTER COLUMN new_score TYPE DOUBLE PRECISION,
  ALTER COLUMN score_diff TYPE DOUBLE PRECISION;

ALTER TABLE public.import_logs
  ALTER COLUMN old_score TYPE DOUBLE PRECISION,
  ALTER COLUMN new_score TYPE DOUBLE PRECISION,
  ALTER COLUMN score_diff TYPE DOUBLE PRECISION;

-- 2. Add score_history fields used by rollback and imports.
ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES public.imports(id) ON DELETE SET NULL;

-- Backfill created_at from updated_at for existing rows.
UPDATE public.score_history
SET created_at = updated_at
WHERE created_at IS NULL;

-- 3. Add import_log fields required for reversible rollback.
ALTER TABLE public.import_logs
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS sequence_no INTEGER;

-- 4. Drop and recreate the rollback function with snapshot-based reversal.
DROP FUNCTION IF EXISTS public.rollback_import_session(uuid);

CREATE OR REPLACE FUNCTION public.rollback_import_session(p_import_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.import_logs%ROWTYPE;
  v_snapshot jsonb;
BEGIN
  -- Lock the import session for the duration of the rollback.
  PERFORM 1
  FROM public.imports
  WHERE id = p_import_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import session % was not found', p_import_id;
  END IF;

  -- Guard: refuse to roll back sessions whose logs lack pre-mutation snapshots.
  PERFORM 1
  FROM public.import_logs
  WHERE import_id = p_import_id
    AND (player_snapshot IS NULL OR player_id IS NULL);

  IF FOUND THEN
    RAISE EXCEPTION 'Import session % contains logs without player snapshots; rollback would be unsafe', p_import_id
      USING ERRCODE = 'PZ001';
  END IF;

  -- Reverse every logged operation in the opposite order it was applied.
  FOR v_log IN
    SELECT *
    FROM public.import_logs
    WHERE import_id = p_import_id
    ORDER BY sequence_no DESC NULLS LAST, created_at DESC, id DESC
  LOOP
    v_snapshot := v_log.player_snapshot;

    IF v_log.new_score = -999 THEN
      -- Soft-delete reversal: restore division and score from snapshot.
      UPDATE public.players
      SET division = v_snapshot->>'division',
          total_score = (v_snapshot->>'total_score')::double precision,
          position = v_snapshot->>'position'
      WHERE id = v_log.player_id;
    ELSIF v_log.is_new THEN
      -- New player reversal: delete the inserted player.
      DELETE FROM public.players
      WHERE id = v_log.player_id;
    ELSE
      -- Update reversal: restore pre-import score and position.
      UPDATE public.players
      SET total_score = (v_snapshot->>'total_score')::double precision,
          position = v_snapshot->>'position',
          latest_change = COALESCE((v_snapshot->>'latest_change')::double precision, latest_change)
      WHERE id = v_log.player_id;
    END IF;
  END LOOP;

  -- Remove all score-history rows created by this import.
  DELETE FROM public.score_history
  WHERE import_id = p_import_id;

  -- Remove the per-player logs and the session itself.
  DELETE FROM public.import_logs
  WHERE import_id = p_import_id;

  DELETE FROM public.imports
  WHERE id = p_import_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_import_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollback_import_session(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_import_session(uuid) TO service_role;
