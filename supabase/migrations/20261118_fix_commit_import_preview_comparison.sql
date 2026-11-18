-- Fix commit_import_preview state comparison.
--
-- The original function built a snapshot of locked players using to_jsonb(p.*),
-- which includes every table column, and compared that snapshot against the
-- full p_expected_state players array. This caused two classes of failures:
--
-- 1. Schema drift: the JS expected state only selects a subset of columns, so
--    the JSON objects had different keys and never matched.
-- 2. Scope drift: only players referenced by update/retire actions are locked,
--    but the expected state contains every existing player (including retired
--    players not touched by the plan). When retired players were present, the
--    locked snapshot was a strict subset of the expected state and the
--    comparison raised a false-positive PZ003 stale-state error.
--
-- This revision:
-- - Builds the locked snapshot using the same column projection as the JS
--   expected state.
-- - Compares each locked player only with its matching expected player by id,
--   ignoring players that are not part of the import plan.
-- - Treats an empty position in the plan as "no change" for existing players.

CREATE OR REPLACE FUNCTION public.commit_import_preview(
  p_expected_state jsonb,
  p_import_plan jsonb,
  p_filename text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_row jsonb;
  v_existing_id uuid;
  v_import_id uuid;
  v_imported integer := 0;
  v_updated integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_persistence_errors jsonb := '[]'::jsonb;
  v_sequence_no integer := 0;
  v_expected_players jsonb;
  v_locked_player jsonb;
  v_current_state jsonb := '[]'::jsonb;
  v_new_player_record public.players%ROWTYPE;
  v_score_diff double precision;
  v_position text;
  v_snapshot jsonb;
BEGIN
  -- 1. Validate inputs.
  IF jsonb_typeof(p_expected_state) <> 'object' OR NOT p_expected_state ? 'players' THEN
    RAISE EXCEPTION 'Expected state must contain a players array';
  END IF;

  IF jsonb_typeof(p_import_plan) <> 'object' OR NOT p_import_plan ? 'rows' THEN
    RAISE EXCEPTION 'Import plan must contain a rows array';
  END IF;

  v_expected_players := p_expected_state->'players';

  -- 2. Lock all players referenced by update/retire actions and build a current
  --    snapshot that uses the same column projection as the JS expected state.
  FOR v_plan_row IN SELECT * FROM jsonb_array_elements(p_import_plan->'rows')
  LOOP
    IF (v_plan_row->>'action') IN ('update', 'retire') THEN
      v_existing_id := (v_plan_row->>'player_id')::uuid;

      SELECT jsonb_build_object(
        'id', p.id,
        'player_name', p.player_name,
        'division', p.division,
        'total_score', p.total_score,
        'position', p.position,
        'starting_score', p.starting_score,
        'latest_change', p.latest_change
      )
      INTO v_locked_player
      FROM public.players p
      WHERE id = v_existing_id
      FOR UPDATE;

      IF v_locked_player IS NULL THEN
        RAISE EXCEPTION 'Player % was not found while applying import plan', v_plan_row->>'player_name'
          USING ERRCODE = 'PZ002';
      END IF;

      v_current_state := v_current_state || jsonb_build_array(v_locked_player);
    END IF;
  END LOOP;

  -- 3. Compare each locked player only with its matching expected player.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_current_state) AS current_elem
    LEFT JOIN LATERAL (
      SELECT elem AS expected_elem
      FROM jsonb_array_elements(v_expected_players) elem
      WHERE (elem->>'id') = (current_elem->>'id')
    ) exp ON true
    WHERE exp.expected_elem IS NULL
       OR current_elem IS DISTINCT FROM exp.expected_elem
  ) THEN
    RAISE EXCEPTION 'Database state has changed since preview; please review again'
      USING ERRCODE = 'PZ003';
  END IF;

  -- 4. Create the import session.
  INSERT INTO public.imports (filename, imported_count, updated_count)
  VALUES (p_filename, 0, 0)
  RETURNING id INTO v_import_id;

  -- 5. Apply each plan row.
  FOR v_plan_row IN SELECT * FROM jsonb_array_elements(p_import_plan->'rows')
  LOOP
    v_sequence_no := v_sequence_no + 1;

    CASE v_plan_row->>'action'
      WHEN 'new' THEN
        BEGIN
          v_position := COALESCE(NULLIF(v_plan_row->>'position', ''), '');

          INSERT INTO public.players (
            player_name,
            division,
            total_score,
            position,
            starting_score,
            latest_change
          )
          VALUES (
            v_plan_row->>'player_name',
            v_plan_row->>'division',
            (v_plan_row->>'proposed_score')::double precision,
            v_position,
            (v_plan_row->>'proposed_score')::double precision,
            (v_plan_row->>'proposed_score')::double precision
          )
          RETURNING * INTO v_new_player_record;

          -- Snapshot after insert for rollback (reflects inserted state).
          v_snapshot := to_jsonb(v_new_player_record);

          IF (v_plan_row->>'proposed_score')::double precision > 0 THEN
            INSERT INTO public.score_history (
              player_id,
              old_score,
              new_score,
              score_diff,
              import_id
            )
            VALUES (
              v_new_player_record.id,
              0,
              (v_plan_row->>'proposed_score')::double precision,
              (v_plan_row->>'proposed_score')::double precision,
              v_import_id
            );
          END IF;

          INSERT INTO public.import_logs (
            import_id,
            player_id,
            player_name,
            division,
            old_score,
            new_score,
            score_diff,
            is_new,
            player_snapshot,
            sequence_no
          )
          VALUES (
            v_import_id,
            v_new_player_record.id,
            v_plan_row->>'player_name',
            v_plan_row->>'division',
            0,
            (v_plan_row->>'proposed_score')::double precision,
            (v_plan_row->>'proposed_score')::double precision,
            TRUE,
            v_snapshot,
            v_sequence_no
          );

          v_imported := v_imported + 1;
        EXCEPTION WHEN OTHERS THEN
          v_persistence_errors := v_persistence_errors || jsonb_build_array(
            jsonb_build_object('row', v_plan_row, 'message', SQLERRM)
          );
        END;

      WHEN 'update' THEN
        BEGIN
          v_existing_id := (v_plan_row->>'player_id')::uuid;
          v_score_diff := (v_plan_row->>'score_diff')::double precision;

          -- Capture pre-update snapshot for rollback.
          SELECT to_jsonb(p.*)
          INTO v_snapshot
          FROM public.players p
          WHERE p.id = v_existing_id;

          UPDATE public.players
          SET total_score = (v_plan_row->>'proposed_score')::double precision,
              position = COALESCE(NULLIF(v_plan_row->>'position', ''), position),
              division = COALESCE(v_plan_row->>'division', division),
              latest_change = CASE
                WHEN (v_plan_row->>'current_score')::double precision IS DISTINCT FROM (v_plan_row->>'proposed_score')::double precision
                THEN v_score_diff
                ELSE latest_change
              END
          WHERE id = v_existing_id
          RETURNING * INTO v_new_player_record;

          IF (v_plan_row->>'current_score')::double precision IS DISTINCT FROM (v_plan_row->>'proposed_score')::double precision THEN
            INSERT INTO public.score_history (
              player_id,
              old_score,
              new_score,
              score_diff,
              import_id
            )
            VALUES (
              v_existing_id,
              (v_plan_row->>'current_score')::double precision,
              (v_plan_row->>'proposed_score')::double precision,
              v_score_diff,
              v_import_id
            );
          END IF;

          INSERT INTO public.import_logs (
            import_id,
            player_id,
            player_name,
            division,
            old_score,
            new_score,
            score_diff,
            is_new,
            player_snapshot,
            sequence_no
          )
          VALUES (
            v_import_id,
            v_existing_id,
            v_plan_row->>'player_name',
            v_plan_row->>'division',
            (v_plan_row->>'current_score')::double precision,
            (v_plan_row->>'proposed_score')::double precision,
            v_score_diff,
            FALSE,
            v_snapshot,
            v_sequence_no
          );

          v_updated := v_updated + 1;
        EXCEPTION WHEN OTHERS THEN
          v_persistence_errors := v_persistence_errors || jsonb_build_array(
            jsonb_build_object('row', v_plan_row, 'message', SQLERRM)
          );
        END;

      WHEN 'retire' THEN
        BEGIN
          v_existing_id := (v_plan_row->>'player_id')::uuid;

          -- Capture pre-retirement snapshot for rollback.
          SELECT to_jsonb(p.*)
          INTO v_snapshot
          FROM public.players p
          WHERE p.id = v_existing_id;

          UPDATE public.players
          SET division = 'ปลดประจำการ',
              total_score = -999
          WHERE id = v_existing_id;

          INSERT INTO public.import_logs (
            import_id,
            player_id,
            player_name,
            division,
            old_score,
            new_score,
            score_diff,
            is_new,
            player_snapshot,
            sequence_no
          )
          VALUES (
            v_import_id,
            v_existing_id,
            v_plan_row->>'player_name',
            v_plan_row->>'division',
            (v_plan_row->>'current_score')::double precision,
            -999,
            0,
            FALSE,
            v_snapshot,
            v_sequence_no
          );
        EXCEPTION WHEN OTHERS THEN
          v_persistence_errors := v_persistence_errors || jsonb_build_array(
            jsonb_build_object('row', v_plan_row, 'message', SQLERRM)
          );
        END;

      ELSE
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object('row', v_plan_row, 'message', 'Unknown plan action')
        );
    END CASE;
  END LOOP;

  -- 6. Update import session counts.
  UPDATE public.imports
  SET imported_count = v_imported,
      updated_count = v_updated
  WHERE id = v_import_id;

  -- 7. Return result.
  RETURN jsonb_build_object(
    'import_id', v_import_id,
    'imported', v_imported,
    'updated', v_updated,
    'errors', v_errors,
    'persistence_errors', v_persistence_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_import_preview(jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_import_preview(jsonb, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_import_preview(jsonb, jsonb, text) TO service_role;
