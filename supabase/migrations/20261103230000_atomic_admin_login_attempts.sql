CREATE OR REPLACE FUNCTION public.process_admin_login_attempt(
  p_ip_address text,
  p_password_valid boolean,
  p_max_attempts integer,
  p_lockout_minutes integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_attempts integer;
  v_locked_until timestamptz;
  v_now timestamptz := clock_timestamp();
  v_authenticated boolean := false;
BEGIN
  IF p_ip_address IS NULL OR btrim(p_ip_address) = '' THEN
    RAISE EXCEPTION 'IP address is required';
  END IF;

  IF p_max_attempts < 1 OR p_lockout_minutes < 1 THEN
    RAISE EXCEPTION 'Rate-limit settings must be positive';
  END IF;

  INSERT INTO public.login_attempts (ip_address, attempts, locked_until)
  VALUES (p_ip_address, 0, NULL)
  ON CONFLICT (ip_address) DO NOTHING;

  SELECT COALESCE(attempts, 0), locked_until
  INTO v_attempts, v_locked_until
  FROM public.login_attempts
  WHERE ip_address = p_ip_address
  FOR UPDATE;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN jsonb_build_object(
      'attempts', v_attempts,
      'locked_until', v_locked_until,
      'is_locked', true,
      'authenticated', false
    );
  END IF;

  IF v_locked_until IS NOT NULL THEN
    v_attempts := 0;
  END IF;

  IF p_password_valid THEN
    UPDATE public.login_attempts
    SET attempts = 0, locked_until = NULL
    WHERE ip_address = p_ip_address;
    v_authenticated := true;
  ELSE
    v_attempts := v_attempts + 1;
    IF v_attempts >= p_max_attempts THEN
      v_locked_until := v_now + make_interval(mins => p_lockout_minutes);
    ELSE
      v_locked_until := NULL;
    END IF;

    UPDATE public.login_attempts
    SET attempts = v_attempts, locked_until = v_locked_until
    WHERE ip_address = p_ip_address;
  END IF;

  RETURN jsonb_build_object(
    'attempts', v_attempts,
    'locked_until', v_locked_until,
    'is_locked', v_locked_until IS NOT NULL,
    'authenticated', v_authenticated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_admin_login_attempt(text, boolean, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_admin_login_attempt(text, boolean, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_admin_login_attempt(text, boolean, integer, integer) TO service_role;
