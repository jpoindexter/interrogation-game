-- Private, bounded generation intents. Tombstones are retained; no expired ID starts paid work again.
BEGIN;
CREATE TABLE interrogation_private.game_generation_requests (
  request_key text PRIMARY KEY CHECK (request_key ~ '^[a-f0-9]{64}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  session_id text NOT NULL UNIQUE CHECK (session_id ~ '^[a-f0-9]{48}$'),
  owner uuid NOT NULL,
  fence bigint NOT NULL CHECK (fence > 0),
  lease_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  phase text NOT NULL CHECK (phase IN ('preparing','generating','reviewing','ready')),
  state text NOT NULL CHECK (state IN ('pending','complete','interrupted')),
  checkpoint jsonb,
  response jsonb,
  CHECK ((state = 'complete') = (response IS NOT NULL))
);
ALTER TABLE interrogation_private.game_generation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.game_generation_requests FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.interrogation_generation_claim(p_key text, p_fingerprint text, p_owner uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row interrogation_private.game_generation_requests%ROWTYPE;
  v_now timestamptz;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_fingerprint IS NULL
    OR p_fingerprint !~ '^[a-f0-9]{64}$' OR p_owner IS NULL THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('interrogation:generation-admission',0));
  SELECT * INTO v_row FROM interrogation_private.game_generation_requests WHERE request_key=p_key FOR UPDATE;
  v_now := clock_timestamp();
  IF FOUND THEN
    IF v_row.fingerprint <> p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    IF v_row.expires_at <= v_now THEN RETURN jsonb_build_object('kind','expired'); END IF;
    IF v_row.state='complete' THEN RETURN jsonb_build_object('kind','replay','response',v_row.response); END IF;
    IF v_row.state='interrupted' THEN RETURN jsonb_build_object('kind','interrupted'); END IF;
    IF v_row.lease_until > v_now THEN RETURN jsonb_build_object('kind','busy'); END IF;
    IF v_row.checkpoint IS NULL THEN
      UPDATE interrogation_private.game_generation_requests SET state='interrupted' WHERE request_key=p_key;
      RETURN jsonb_build_object('kind','interrupted');
    END IF;
    UPDATE interrogation_private.game_generation_requests SET owner=p_owner,fence=fence+1,
      lease_until=v_now+interval '180 seconds' WHERE request_key=p_key RETURNING * INTO v_row;
  ELSE
    IF (SELECT count(*) FROM interrogation_private.game_generation_requests) >= 1000 THEN
      RETURN jsonb_build_object('kind','limit');
    END IF;
    INSERT INTO interrogation_private.game_generation_requests
      (request_key,fingerprint,session_id,owner,fence,lease_until,created_at,expires_at,phase,state)
      VALUES(p_key,p_fingerprint,substr(encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text,'UTF8')),'hex'),1,48),
        p_owner,1,v_now+interval '180 seconds',v_now,v_now+interval '24 hours','preparing','pending') RETURNING * INTO v_row;
  END IF;
  RETURN jsonb_strip_nulls(jsonb_build_object('kind','claimed','sessionId',v_row.session_id,'fence',v_row.fence,
    'leaseUntil',floor(extract(epoch FROM v_row.lease_until)*1000),
    'startedAt',floor(extract(epoch FROM v_row.created_at)*1000),'checkpoint',v_row.checkpoint));
END;
$$;

CREATE FUNCTION public.interrogation_generation_status(p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row interrogation_private.game_generation_requests%ROWTYPE;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  SELECT * INTO v_row FROM interrogation_private.game_generation_requests WHERE request_key=p_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  RETURN jsonb_build_object('kind','status','phase',v_row.phase,
    'state',CASE WHEN v_row.expires_at<=clock_timestamp() THEN 'expired'
      WHEN v_row.state='pending' AND v_row.lease_until<=clock_timestamp() AND v_row.checkpoint IS NULL THEN 'interrupted'
      ELSE v_row.state END,'startedAt',floor(extract(epoch FROM v_row.created_at)*1000));
END;
$$;

CREATE FUNCTION public.interrogation_generation_write(
  p_key text,p_fingerprint text,p_owner uuid,p_fence bigint,p_phase text,p_checkpoint jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row interrogation_private.game_generation_requests%ROWTYPE;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_owner IS NULL OR p_fence IS NULL OR p_fence<1 OR p_phase IS NULL OR p_phase NOT IN ('generating','reviewing')
    OR (p_checkpoint IS NOT NULL AND NOT coalesce(jsonb_typeof(p_checkpoint)='object'
      AND jsonb_typeof(p_checkpoint->'data')='object' AND pg_column_size(p_checkpoint)<=2097152,false)) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO v_row FROM interrogation_private.game_generation_requests WHERE request_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','stale'); END IF;
  IF v_row.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('kind','expired'); END IF;
  IF v_row.fingerprint<>p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
  IF v_row.state<>'pending' OR v_row.owner<>p_owner OR v_row.fence<>p_fence OR v_row.lease_until<=clock_timestamp() THEN
    RETURN jsonb_build_object('kind','stale');
  END IF;
  IF (v_row.phase='reviewing' AND p_phase='generating')
    OR (v_row.checkpoint IS NOT NULL AND p_checkpoint IS DISTINCT FROM v_row.checkpoint) THEN
    RETURN jsonb_build_object('kind','conflict');
  END IF;
  UPDATE interrogation_private.game_generation_requests SET phase=p_phase,checkpoint=coalesce(p_checkpoint,checkpoint)
    WHERE request_key=p_key;
  RETURN jsonb_build_object('kind','saved');
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_generation_claim(text,text,uuid),
  public.interrogation_generation_status(text), public.interrogation_generation_write(text,text,uuid,bigint,text,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_generation_claim(text,text,uuid),
  public.interrogation_generation_status(text), public.interrogation_generation_write(text,text,uuid,bigint,text,jsonb) TO service_role;
COMMIT;
