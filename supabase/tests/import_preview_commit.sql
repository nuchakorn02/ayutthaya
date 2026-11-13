-- Disposable-database assertions for commit_import_preview.
-- Run against a fresh/throwaway Supabase/Postgres instance only;
-- never run this against production data.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_division text := 'กองทัพมหาเสือพิทักษ์';
  v_existing_id uuid;
  v_result jsonb;
  v_import_id uuid;
BEGIN
  -- Clean state for the test.
  DELETE FROM public.score_history;
  DELETE FROM public.import_logs;
  DELETE FROM public.imports;
  DELETE FROM public.players;

  -- Seed an existing player.
  INSERT INTO public.players (player_name, division, total_score, position, starting_score, latest_change)
  VALUES ('Existing', v_division, 100, 'Test Position', 100, 0)
  RETURNING id INTO v_existing_id;

  -- 1. Successful commit of a mixed plan.
  v_result := public.commit_import_preview(
    jsonb_build_object(
      'players', jsonb_build_array(
        jsonb_build_object(
          'id', v_existing_id,
          'player_name', 'Existing',
          'division', v_division,
          'total_score', 100,
          'position', 'Test Position',
          'starting_score', 100,
          'latest_change', 0
        )
      )
    ),
    jsonb_build_object(
      'rows', jsonb_build_array(
        jsonb_build_object(
          'action', 'new',
          'player_name', 'Newbie',
          'division', v_division,
          'proposed_score', 121.75,
          'position', ''
        ),
        jsonb_build_object(
          'action', 'update',
          'player_id', v_existing_id,
          'player_name', 'Existing',
          'division', v_division,
          'current_score', 100,
          'new_score', 150,
          'score_diff', 50,
          'position', ''
        )
      )
    ),
    'test.xlsx'
  );

  v_import_id := (v_result->>'import_id')::uuid;

  ASSERT (v_result->>'imported')::integer = 1, 'Expected 1 imported';
  ASSERT (v_result->>'updated')::integer = 1, 'Expected 1 updated';

  -- Decimal score round-trips exactly.
  ASSERT EXISTS (
    SELECT 1 FROM public.players WHERE player_name = 'Newbie' AND total_score = 121.75
  ), 'New player should have exact decimal score 121.75';

  -- Existing player updated.
  ASSERT EXISTS (
    SELECT 1 FROM public.players WHERE id = v_existing_id AND total_score = 150
  ), 'Existing player should be updated to 150';

  -- Score history tagged with import_id.
  ASSERT EXISTS (
    SELECT 1 FROM public.score_history WHERE import_id = v_import_id
  ), 'Score history rows should be tagged with import_id';

  -- Import logs have snapshots and sequence numbers.
  ASSERT (
    SELECT COUNT(*) FROM public.import_logs
    WHERE import_id = v_import_id AND player_snapshot IS NOT NULL AND sequence_no IS NOT NULL
  ) = 2, 'Import logs should have snapshots and sequence numbers';

  -- 2. Rollback restores the pre-import state.
  PERFORM public.rollback_import_session(v_import_id);

  ASSERT NOT EXISTS (
    SELECT 1 FROM public.players WHERE player_name = 'Newbie'
  ), 'Rollback should delete the newly inserted player';

  ASSERT EXISTS (
    SELECT 1 FROM public.players WHERE id = v_existing_id AND total_score = 100
  ), 'Rollback should restore existing player score';

  ASSERT NOT EXISTS (
    SELECT 1 FROM public.imports WHERE id = v_import_id
  ), 'Rollback should delete the import session';

  -- 3. Stale state should raise PZ003.
  BEGIN
    PERFORM public.commit_import_preview(
      jsonb_build_object('players', '[]'::jsonb),
      jsonb_build_object('rows', jsonb_build_array(
        jsonb_build_object(
          'action', 'update',
          'player_id', v_existing_id,
          'player_name', 'Existing',
          'division', v_division,
          'current_score', 999,
          'new_score', 200,
          'score_diff', -799,
          'position', ''
        )
      )),
      'stale.xlsx'
    );
    RAISE EXCEPTION 'Expected stale-state error PZ003';
  EXCEPTION WHEN SQLSTATE 'PZ003' THEN
    -- expected
  END;

  -- 4. Empty plan creates no import session.
  v_result := public.commit_import_preview(
    jsonb_build_object('players', '[]'::jsonb),
    jsonb_build_object('rows', '[]'::jsonb),
    'empty.xlsx'
  );

  ASSERT (v_result->>'imported')::integer = 0, 'Empty plan should import 0';
  ASSERT (v_result->>'updated')::integer = 0, 'Empty plan should update 0';

  RAISE NOTICE 'All commit_import_preview assertions passed';
END;
$$;
