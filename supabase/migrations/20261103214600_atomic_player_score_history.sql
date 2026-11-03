CREATE OR REPLACE FUNCTION public.update_player_with_score_history(
  p_player_id uuid,
  p_updates jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.players%ROWTYPE;
  v_updated public.players%ROWTYPE;
  v_old_score integer;
  v_new_score integer;
  v_score_diff integer;
BEGIN
  IF jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'Player updates must be a JSON object';
  END IF;

  SELECT *
  INTO STRICT v_existing
  FROM public.players
  WHERE id = p_player_id
  FOR UPDATE;

  v_old_score := v_existing.total_score;
  v_new_score := CASE
    WHEN p_updates ? 'total_score' THEN (p_updates->>'total_score')::integer
    ELSE v_old_score
  END;
  v_score_diff := v_new_score - v_old_score;

  UPDATE public.players
  SET player_name = CASE
        WHEN p_updates ? 'player_name' THEN p_updates->>'player_name'
        ELSE v_existing.player_name
      END,
      division = CASE
        WHEN p_updates ? 'division' THEN p_updates->>'division'
        ELSE v_existing.division
      END,
      position = CASE
        WHEN p_updates ? 'position' THEN p_updates->>'position'
        ELSE v_existing.position
      END,
      total_score = v_new_score,
      latest_change = CASE
        WHEN p_updates ? 'total_score' THEN v_score_diff
        ELSE v_existing.latest_change
      END
  WHERE id = p_player_id
  RETURNING * INTO v_updated;

  IF v_score_diff <> 0 THEN
    INSERT INTO public.score_history (
      player_id,
      old_score,
      new_score,
      score_diff,
      reason
    )
    VALUES (
      p_player_id,
      v_old_score,
      v_new_score,
      v_score_diff,
      p_reason
    );
  END IF;

  RETURN jsonb_build_object(
    'player', to_jsonb(v_updated),
    'old_score', v_old_score,
    'new_score', v_new_score,
    'score_diff', v_score_diff
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_player_with_score_history(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_player_with_score_history(uuid, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_with_score_history(uuid, jsonb, text) TO service_role;
