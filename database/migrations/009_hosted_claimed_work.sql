-- Provider work requires a current session claim. This remains staged until routes use it.
-- Global lock order is session row -> deployment advisory lock; never reverse it.
BEGIN;
CREATE FUNCTION public.interrogation_reserve_claimed_work(
  p_deployment text, p_session_key text, p_operation_key text, p_fingerprint text,
  p_scope text, p_units bigint, p_session_max_calls bigint, p_session_max_units bigint,
  p_deployment_max_calls bigint, p_deployment_max_units bigint, p_window_seconds integer,
  p_request_key text, p_action_fingerprint text, p_owner uuid, p_fence bigint, p_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_session interrogation_private.game_sessions%ROWTYPE;
  v_request interrogation_private.game_requests%ROWTYPE;
  v_now timestamptz;
BEGIN
  IF p_deployment IS NULL OR p_deployment !~ '^[A-Za-z0-9_.:-]{1,96}$'
    OR p_session_key IS NULL OR p_session_key !~ '^[a-f0-9]{64}$'
    OR p_request_key IS NULL OR p_request_key !~ '^[a-f0-9]{64}$'
    OR p_action_fingerprint IS NULL OR p_action_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_owner IS NULL OR p_fence IS NULL OR p_fence < 1
    OR p_revision IS NULL OR p_revision < 0 THEN
    RETURN jsonb_build_object('kind', 'invalid');
  END IF;
  SELECT * INTO v_session FROM interrogation_private.game_sessions
    WHERE session_key = p_session_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind', 'unavailable'); END IF;
  -- Wait for the deployment lock BEFORE checking the lease clock. A queued reservation
  -- must not spend quota if its authority expires while another reservation holds it.
  PERFORM pg_advisory_xact_lock(hashtextextended('interrogation:work:' || p_deployment, 0));
  v_now := clock_timestamp();
  IF v_session.expires_at <= v_now THEN RETURN jsonb_build_object('kind', 'unavailable'); END IF;
  SELECT * INTO v_request FROM interrogation_private.game_requests
    WHERE session_key = p_session_key AND request_key = p_request_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind', 'stale'); END IF;
  IF v_request.fingerprint <> p_action_fingerprint THEN RETURN jsonb_build_object('kind', 'conflict'); END IF;
  IF v_request.state <> 'pending' OR v_request.fence <> p_fence OR v_session.fence <> p_fence
    OR v_session.lease_owner IS DISTINCT FROM p_owner OR v_session.lease_until IS NULL
    OR v_session.lease_until <= v_now OR v_session.revision <> p_revision THEN
    RETURN jsonb_build_object('kind', 'stale');
  END IF;
  RETURN public.interrogation_reserve_work(p_deployment, p_session_key, p_operation_key,
    p_fingerprint, p_scope, p_units, p_session_max_calls, p_session_max_units,
    p_deployment_max_calls, p_deployment_max_units, p_window_seconds);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_reserve_claimed_work(
  text, text, text, text, text, bigint, bigint, bigint, bigint, bigint, integer,
  text, text, uuid, bigint, bigint
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_reserve_claimed_work(
  text, text, text, text, text, bigint, bigint, bigint, bigint, bigint, integer,
  text, text, uuid, bigint, bigint
) TO service_role;
-- The underlying transaction is now callable only through the claim-checking definer.
REVOKE ALL ON FUNCTION public.interrogation_reserve_work(
  text, text, text, text, text, bigint, bigint, bigint, bigint, bigint, integer
) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
