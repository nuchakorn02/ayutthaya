ALTER TABLE public.import_logs
ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.rollback_import_session(p_import_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.import_logs%ROWTYPE;
  v_player public.players%ROWTYPE;
  v_target_division text;
  v_history_id uuid;
  v_reverted_score numeric;
  v_position text;
  v_threshold jsonb;
BEGIN
  PERFORM 1
  FROM public.imports
  WHERE id = p_import_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import session % was not found', p_import_id;
  END IF;

  FOR v_log IN
    SELECT *
    FROM public.import_logs
    WHERE import_id = p_import_id
    ORDER BY created_at DESC, id DESC
  LOOP
    v_target_division := CASE
      WHEN v_log.new_score = -999 THEN 'ปลดประจำการ'
      ELSE v_log.division
    END;

    BEGIN
      SELECT *
      INTO STRICT v_player
      FROM public.players
      WHERE player_name = v_log.player_name
        AND division = v_target_division
      FOR UPDATE;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Player % in division % was not found during rollback', v_log.player_name, v_target_division;
      WHEN TOO_MANY_ROWS THEN
        RAISE EXCEPTION 'Player % in division % is ambiguous during rollback', v_log.player_name, v_target_division;
    END;

    IF v_log.new_score = -999 THEN
      UPDATE public.players
      SET division = v_log.division,
          total_score = v_log.old_score
      WHERE id = v_player.id;
    ELSIF v_log.is_new THEN
      DELETE FROM public.players
      WHERE id = v_player.id;
    ELSE
      v_history_id := NULL;
      SELECT id
      INTO v_history_id
      FROM public.score_history
      WHERE player_id = v_player.id
        AND score_diff = v_log.score_diff
        AND new_score = v_log.new_score
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      FOR UPDATE;

      IF v_history_id IS NOT NULL THEN
        DELETE FROM public.score_history
        WHERE id = v_history_id;
      END IF;

      v_reverted_score := GREATEST(0, v_player.total_score - v_log.score_diff);

      CASE v_player.division
        WHEN 'คณะผู้บริหาร' THEN
          v_position := 'คณะผู้บริหารส่วนกลาง';
        WHEN 'กองทัพมหาเสือพิทักษ์' THEN
          v_position := 'ทหารเสือประจำพระองค์';
        WHEN 'กองทัพธรณินพิทักษ์' THEN
          v_position := 'ทหารธรณินพิทักษ์';
        WHEN 'กองทัพอาทมาต' THEN
          v_position := 'หมื่นอาทมาต';
        ELSE
          SELECT threshold
          INTO v_threshold
          FROM public.app_settings,
               jsonb_array_elements(value->'thresholds') AS threshold
          WHERE key = 'rank_thresholds'
            AND (threshold->>'score')::numeric <= v_reverted_score
          ORDER BY (threshold->>'score')::numeric DESC
          LIMIT 1;

          IF v_threshold IS NULL THEN
            SELECT threshold
            INTO v_threshold
            FROM public.app_settings,
                 jsonb_array_elements(value->'thresholds') AS threshold
            WHERE key = 'rank_thresholds'
            ORDER BY (threshold->>'score')::numeric ASC
            LIMIT 1;
          END IF;

          IF v_threshold IS NOT NULL THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN v_threshold->>'policeTitle'
              ELSE v_threshold->>'guardTitle'
            END;
          ELSIF v_reverted_score >= 600 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'พันตำรวจหลวง | Royal Police Colonel'
              ELSE 'นายพันเวร | Battalion Commander of Guardsmen'
            END;
          ELSIF v_reverted_score >= 315 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'นายกองตำรวจหลวง | Royal Police Battalion Commander'
              ELSE 'นายกองเวร | Company Head Guardsmen'
            END;
          ELSIF v_reverted_score >= 210 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer'
              ELSE 'นายหมวดเวร | Platoon Head Guardsmen'
            END;
          ELSIF v_reverted_score >= 110 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader'
              ELSE 'นายหมู่เวร | Squad Head Guardsmen'
            END;
          ELSIF v_reverted_score >= 60 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper'
              ELSE 'พลทหารยามอาวุโส | Senior Guardsmen'
            END;
          ELSIF v_reverted_score >= 45 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper'
              ELSE 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen'
            END;
          ELSIF v_reverted_score >= 20 THEN
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'พลประจำการตำรวจหลวง | Active Royal Police Trooper'
              ELSE 'พลทหารยาม | Guardsmen'
            END;
          ELSE
            v_position := CASE
              WHEN v_player.division = 'กองพระตำรวจหลวง' THEN 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)'
              ELSE 'พลอาสาสมัครทหารยาม | Junior Guardsmen'
            END;
          END IF;
      END CASE;

      UPDATE public.players
      SET total_score = v_reverted_score,
          position = v_position
      WHERE id = v_player.id;
    END IF;
  END LOOP;

  DELETE FROM public.imports
  WHERE id = p_import_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_import_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollback_import_session(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_import_session(uuid) TO service_role;
