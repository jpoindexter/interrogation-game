-- Shared endpoint admission. Fixed minute windows are not provider-spend reservations.
-- Expired counters can be removed: every new HTTP attempt must pass admission again.
BEGIN;
CREATE TABLE interrogation_private.endpoint_usage (
  deployment text NOT NULL CHECK (deployment ~ '^[A-Za-z0-9_.:-]{1,96}$'),
  bucket_key text NOT NULL CHECK (bucket_key ~ '^[a-f0-9]{64}$'),
  window_start bigint NOT NULL CHECK (window_start >= 0),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 10000),
  calls integer NOT NULL CHECK (calls BETWEEN 0 AND capacity),
  PRIMARY KEY (deployment,bucket_key)
);
CREATE INDEX endpoint_usage_window ON interrogation_private.endpoint_usage(window_start);
ALTER TABLE interrogation_private.endpoint_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.endpoint_usage FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.interrogation_endpoint_admit(p_deployment text,p_key text,p_max_per_minute integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_window bigint;
  v_row interrogation_private.endpoint_usage%ROWTYPE;
BEGIN
  IF p_deployment IS NULL OR p_deployment !~ '^[A-Za-z0-9_.:-]{1,96}$'
    OR p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$'
    OR p_max_per_minute IS NULL OR p_max_per_minute NOT BETWEEN 1 AND 10000 THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  -- One short admission transaction protects both per-key counters and the table cap.
  PERFORM pg_advisory_xact_lock(hashtextextended('interrogation:endpoint-admission',0));
  v_window := floor(extract(epoch FROM clock_timestamp())/60)::bigint*60;
  DELETE FROM interrogation_private.endpoint_usage WHERE window_start<v_window;
  SELECT * INTO v_row FROM interrogation_private.endpoint_usage
    WHERE deployment=p_deployment AND bucket_key=p_key;
  IF FOUND THEN
    IF v_row.capacity<>p_max_per_minute THEN RETURN jsonb_build_object('kind','policy_conflict'); END IF;
    IF v_row.calls>=v_row.capacity THEN RETURN jsonb_build_object('kind','exhausted'); END IF;
    UPDATE interrogation_private.endpoint_usage SET calls=calls+1
      WHERE deployment=p_deployment AND bucket_key=p_key;
  ELSE
    IF (SELECT count(*) FROM interrogation_private.endpoint_usage)>=10000 THEN
      RETURN jsonb_build_object('kind','limit');
    END IF;
    INSERT INTO interrogation_private.endpoint_usage(deployment,bucket_key,window_start,capacity,calls)
      VALUES(p_deployment,p_key,v_window,p_max_per_minute,1);
  END IF;
  RETURN jsonb_build_object('kind','allowed');
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_endpoint_admit(text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_endpoint_admit(text,text,integer) TO service_role;
COMMIT;
