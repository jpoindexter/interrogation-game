-- Additive shared work-reservation foundation; not selected by application routes yet.
-- Requires 006's private schema. One short transaction owns both allowances.
-- Session counters are lifetime totals; deployment counters use database-time windows.
-- Reservation tombstones are intentionally retained: deleting them permits paid replay.
BEGIN;

CREATE TABLE interrogation_private.work_policies (
  deployment text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('ai', 'tts', 'stt')),
  policy jsonb NOT NULL CHECK (jsonb_typeof(policy) = 'object'),
  PRIMARY KEY (deployment, scope)
);
CREATE TABLE interrogation_private.work_usage (
  deployment text NOT NULL,
  scope text NOT NULL,
  session_key text NOT NULL,
  window_start bigint NOT NULL CHECK (window_start >= 0),
  calls bigint NOT NULL DEFAULT 0 CHECK (calls >= 0),
  units bigint NOT NULL DEFAULT 0 CHECK (units >= 0),
  PRIMARY KEY (deployment, scope, session_key, window_start),
  FOREIGN KEY (deployment, scope)
    REFERENCES interrogation_private.work_policies(deployment, scope)
);
CREATE TABLE interrogation_private.work_reservations (
  deployment text NOT NULL,
  operation_key text NOT NULL CHECK (operation_key ~ '^[a-f0-9]{64}$'),
  session_key text NOT NULL CHECK (session_key ~ '^[a-f0-9]{64}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  scope text NOT NULL,
  units bigint NOT NULL CHECK (units >= 0),
  policy jsonb NOT NULL,
  window_start bigint NOT NULL CHECK (window_start >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (deployment, operation_key),
  FOREIGN KEY (deployment, scope)
    REFERENCES interrogation_private.work_policies(deployment, scope)
);

ALTER TABLE interrogation_private.work_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE interrogation_private.work_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE interrogation_private.work_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.work_policies,
  interrogation_private.work_usage, interrogation_private.work_reservations
  FROM PUBLIC, anon, authenticated, service_role;

-- The cohesive transaction exceeds the TS function-size preference to keep reservation,
-- conflict checks and both counters indivisible; no network effect occurs inside it.
CREATE FUNCTION public.interrogation_reserve_work(
  p_deployment text, p_session_key text, p_operation_key text, p_fingerprint text,
  p_scope text, p_units bigint, p_session_max_calls bigint, p_session_max_units bigint,
  p_deployment_max_calls bigint, p_deployment_max_units bigint, p_window_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_policy jsonb;
  v_existing_policy jsonb;
  v_reservation interrogation_private.work_reservations%ROWTYPE;
  v_session interrogation_private.work_usage%ROWTYPE;
  v_deployment interrogation_private.work_usage%ROWTYPE;
  v_window bigint;
BEGIN
  IF p_deployment IS NULL OR p_deployment !~ '^[A-Za-z0-9_.:-]{1,96}$'
    OR p_session_key IS NULL OR p_session_key !~ '^[a-f0-9]{64}$'
    OR p_operation_key IS NULL OR p_operation_key !~ '^[a-f0-9]{64}$'
    OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_scope IS NULL OR p_scope NOT IN ('ai', 'tts', 'stt')
    OR p_units IS NULL OR p_units NOT BETWEEN 0 AND 1000000000000
    OR p_session_max_calls IS NULL OR p_session_max_calls NOT BETWEEN 0 AND 1000000
    OR p_session_max_units IS NULL OR p_session_max_units NOT BETWEEN 0 AND 1000000000000
    OR p_deployment_max_calls IS NULL OR p_deployment_max_calls NOT BETWEEN 0 AND 1000000
    OR p_deployment_max_units IS NULL OR p_deployment_max_units NOT BETWEEN 0 AND 1000000000000
    OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN 60 AND 86400
  THEN
    RETURN jsonb_build_object('kind', 'invalid');
  END IF;
  v_policy := jsonb_build_object(
    'sessionCalls', p_session_max_calls, 'sessionUnits', p_session_max_units,
    'deploymentCalls', p_deployment_max_calls, 'deploymentUnits', p_deployment_max_units,
    'windowSeconds', p_window_seconds);

  -- A stable deployment lock prevents overspend and races across different sessions.
  -- Hash collisions only serialize unrelated deployments; they never grant authority.
  PERFORM pg_advisory_xact_lock(hashtextextended('interrogation:work:' || p_deployment, 0));
  SELECT * INTO v_reservation FROM interrogation_private.work_reservations
    WHERE deployment = p_deployment AND operation_key = p_operation_key;
  IF FOUND THEN
    IF v_reservation.session_key <> p_session_key OR v_reservation.fingerprint <> p_fingerprint
      OR v_reservation.scope <> p_scope OR v_reservation.units <> p_units
      OR v_reservation.policy <> v_policy THEN
      RETURN jsonb_build_object('kind', 'conflict');
    END IF;
    -- This is receipt recovery ONLY. It never authorizes a second provider invocation.
    RETURN jsonb_build_object('kind', 'already_reserved', 'scope', p_scope,
      'units', p_units, 'windowStart', v_reservation.window_start,
      'windowEnd', v_reservation.window_start + p_window_seconds);
  END IF;

  SELECT policy INTO v_existing_policy FROM interrogation_private.work_policies
    WHERE deployment = p_deployment AND scope = p_scope;
  IF FOUND AND v_existing_policy <> v_policy THEN
    RETURN jsonb_build_object('kind', 'policy_conflict');
  END IF;
  INSERT INTO interrogation_private.work_policies(deployment, scope, policy)
    VALUES (p_deployment, p_scope, v_policy) ON CONFLICT DO NOTHING;
  -- Capture time after acquiring the lock: waiting across a boundary spends the new window.
  v_window := floor(extract(epoch FROM clock_timestamp()) / p_window_seconds)::bigint
    * p_window_seconds;
  INSERT INTO interrogation_private.work_usage(deployment, scope, session_key, window_start)
    VALUES (p_deployment, p_scope, p_session_key, 0), (p_deployment, p_scope, '', v_window)
    ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT v_session FROM interrogation_private.work_usage
    WHERE deployment = p_deployment AND scope = p_scope
      AND session_key = p_session_key AND window_start = 0;
  SELECT * INTO STRICT v_deployment FROM interrogation_private.work_usage
    WHERE deployment = p_deployment AND scope = p_scope
      AND session_key = '' AND window_start = v_window;
  IF v_session.calls >= p_session_max_calls OR p_units > p_session_max_units - v_session.units THEN
    RETURN jsonb_build_object('kind', 'exhausted', 'scope', 'session');
  END IF;
  IF v_deployment.calls >= p_deployment_max_calls OR p_units > p_deployment_max_units - v_deployment.units THEN
    RETURN jsonb_build_object('kind', 'exhausted', 'scope', 'deployment');
  END IF;

  INSERT INTO interrogation_private.work_reservations(
    deployment, operation_key, session_key, fingerprint, scope, units, policy, window_start
  ) VALUES (p_deployment, p_operation_key, p_session_key, p_fingerprint, p_scope,
    p_units, v_policy, v_window);
  UPDATE interrogation_private.work_usage SET calls = calls + 1, units = units + p_units
    WHERE deployment = p_deployment AND scope = p_scope
      AND ((session_key = p_session_key AND window_start = 0)
        OR (session_key = '' AND window_start = v_window));
  RETURN jsonb_build_object('kind', 'reserved', 'scope', p_scope, 'units', p_units,
    'windowStart', v_window, 'windowEnd', v_window + p_window_seconds);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_reserve_work(
  text, text, text, text, text, bigint, bigint, bigint, bigint, bigint, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_reserve_work(
  text, text, text, text, text, bigint, bigint, bigint, bigint, bigint, integer
) TO service_role;
COMMIT;
