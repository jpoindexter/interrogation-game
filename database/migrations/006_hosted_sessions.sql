-- Staged hosted foundation; not selected by the application or sufficient for Vercel.
-- PostgreSQL 14+. Apply as a trusted migration owner. No raw capability in RPC keys.
-- Sources: https://www.postgresql.org/docs/14/explicit-locking.html
-- https://supabase.com/docs/guides/database/functions (definer search path and grants).
-- RPC JSON kinds: create=created/exists/conflict/unavailable/invalid; load=loaded/unavailable/invalid;
-- claim=claimed/replay/busy/conflict/interrupted/limit/unavailable/invalid;
-- complete=committed/replay/stale/conflict/unavailable/invalid.
-- Records are version 1 SessionRecord, requests={}; receipts live in game_requests.
-- create takes revision 0; complete takes the claimed revision; DB increments on commit.
-- claimed includes record, revision, fence, leaseUntil (epoch ms). Replay includes exact
-- response {status,body}; created/exists/loaded include record; committed includes both.
-- Pending claims never authorize a second effect, even for the same owner. No heartbeat.
-- Service-only JSON snapshots contain private game data; do not log RPC payloads.
BEGIN;
CREATE SCHEMA IF NOT EXISTS interrogation_private;
REVOKE ALL ON SCHEMA interrogation_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE interrogation_private.game_sessions (
  session_key text PRIMARY KEY CHECK (session_key ~ '^[a-f0-9]{64}$'),
  creation_hash text NOT NULL,
  record jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  expires_at timestamptz NOT NULL,
  lease_owner uuid,
  lease_until timestamptz,
  fence bigint NOT NULL DEFAULT 0 CHECK (fence >= 0),
  CHECK ((lease_owner IS NULL) = (lease_until IS NULL))
);
CREATE TABLE interrogation_private.game_requests (
  session_key text NOT NULL REFERENCES interrogation_private.game_sessions(session_key),
  request_key text NOT NULL CHECK (request_key ~ '^[a-f0-9]{64}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK (state IN ('pending','complete','interrupted')),
  fence bigint NOT NULL,
  response jsonb,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (session_key, request_key),
  CHECK ((state = 'complete') = (response IS NOT NULL))
);
ALTER TABLE interrogation_private.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interrogation_private.game_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.game_sessions, interrogation_private.game_requests
  FROM PUBLIC, anon, authenticated, service_role;

-- SQL validates storage invariants, not the full gameplay schema. Future route
-- integration must validate domain data before using this staged storage foundation.
CREATE FUNCTION interrogation_private.valid_session_record(p_record jsonb, p_key text, p_revision bigint)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_typeof(p_record) = 'object'
    AND p_record->'version' = '1'::jsonb AND p_record->'revision' = to_jsonb(p_revision)
    AND p_record->'requests' = '{}'::jsonb AND jsonb_typeof(p_record->'session') = 'object'
    AND jsonb_typeof(p_record#>'{session,id}') = 'string'
    AND p_record#>>'{session,id}' ~ '^[a-f0-9]{48}$'
    AND encode(sha256(convert_to(p_record#>>'{session,id}', 'UTF8')), 'hex') = p_key
    AND p_record#>>'{session,status}' IN ('briefing','active','won','lost')
    AND CASE p_record#>>'{session,status}'
      WHEN 'won' THEN p_record#>>'{session,outcome}' = 'win'
      WHEN 'lost' THEN p_record#>>'{session,outcome}' IN ('lose_accusations','lose_time','lose_giveup','lose_lawyer')
      ELSE p_record#>'{session,outcome}' = 'null'::jsonb END
    AND pg_column_size(p_record) <= 2097152, false);
$$;
REVOKE ALL ON FUNCTION interrogation_private.valid_session_record(jsonb,text,bigint)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.interrogation_session_create(p_key text, p_record jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_session interrogation_private.game_sessions%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_hash text;
  v_record jsonb;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$'
    OR NOT interrogation_private.valid_session_record(p_record,p_key,0) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  v_hash := encode(sha256(convert_to(p_record::text,'UTF8')),'hex');
  v_record := jsonb_set(p_record,'{session,lastActivity}',to_jsonb(floor(extract(epoch FROM v_now)*1000)));
  INSERT INTO interrogation_private.game_sessions(session_key,creation_hash,record,expires_at)
    VALUES(p_key,v_hash,v_record,v_now + interval '1 hour') ON CONFLICT DO NOTHING
    RETURNING * INTO v_session;
  IF FOUND THEN RETURN jsonb_build_object('kind','created','record',v_session.record); END IF;
  SELECT * INTO v_session FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  IF v_session.expires_at <= clock_timestamp() THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  IF v_session.creation_hash <> v_hash THEN RETURN jsonb_build_object('kind','conflict'); END IF;
  RETURN jsonb_build_object('kind','exists','record',v_session.record);
END;
$$;

CREATE FUNCTION public.interrogation_session_load(p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_record jsonb;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  SELECT record INTO v_record FROM interrogation_private.game_sessions
    WHERE session_key=p_key AND expires_at > clock_timestamp();
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  RETURN jsonb_build_object('kind','loaded','record',v_record);
END;
$$;

CREATE FUNCTION public.interrogation_session_claim(
  p_key text, p_request_key text, p_fingerprint text, p_owner uuid, p_lease_seconds integer DEFAULT 180
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_session interrogation_private.game_sessions%ROWTYPE;
  v_request interrogation_private.game_requests%ROWTYPE;
  v_now timestamptz;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_request_key IS NULL
    OR p_request_key !~ '^[a-f0-9]{64}$' OR p_fingerprint IS NULL
    OR p_fingerprint !~ '^[a-f0-9]{64}$' OR p_owner IS NULL
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 1 AND 300 THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO v_session FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR v_session.expires_at <= v_now THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  SELECT * INTO v_request FROM interrogation_private.game_requests
    WHERE session_key=p_key AND request_key=p_request_key;
  IF FOUND THEN
    IF v_request.fingerprint <> p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    IF v_request.state = 'complete' THEN
      RETURN jsonb_build_object('kind','replay','response',v_request.response);
    END IF;
    IF v_request.state = 'interrupted' THEN RETURN jsonb_build_object('kind','interrupted'); END IF;
    IF v_session.lease_until > v_now AND v_request.fence = v_session.fence THEN
      RETURN jsonb_build_object('kind','busy');
    END IF;
    UPDATE interrogation_private.game_requests SET state='interrupted'
      WHERE session_key=p_key AND request_key=p_request_key;
    RETURN jsonb_build_object('kind','interrupted');
  END IF;
  IF v_session.lease_until > v_now THEN RETURN jsonb_build_object('kind','busy'); END IF;
  IF (SELECT count(*) FROM interrogation_private.game_requests WHERE session_key=p_key) >= 500 THEN
    RETURN jsonb_build_object('kind','limit');
  END IF;
  UPDATE interrogation_private.game_requests SET state='interrupted'
    WHERE session_key=p_key AND state='pending';
  UPDATE interrogation_private.game_sessions
    SET lease_owner=p_owner, lease_until=v_now + make_interval(secs=>p_lease_seconds), fence=fence+1
    WHERE session_key=p_key RETURNING * INTO v_session;
  INSERT INTO interrogation_private.game_requests(session_key,request_key,fingerprint,state,fence,started_at)
    VALUES(p_key,p_request_key,p_fingerprint,'pending',v_session.fence,v_now);
  RETURN jsonb_build_object('kind','claimed','record',v_session.record,'revision',v_session.revision,
    'fence',v_session.fence,'leaseUntil',floor(extract(epoch FROM v_session.lease_until)*1000));
END;
$$;

CREATE FUNCTION public.interrogation_session_complete(
  p_key text, p_request_key text, p_fingerprint text, p_owner uuid, p_fence bigint,
  p_revision bigint, p_record jsonb, p_response jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_session interrogation_private.game_sessions%ROWTYPE;
  v_request interrogation_private.game_requests%ROWTYPE;
  v_now timestamptz;
  v_record jsonb;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_request_key IS NULL
    OR p_request_key !~ '^[a-f0-9]{64}$' OR p_fingerprint IS NULL
    OR p_fingerprint !~ '^[a-f0-9]{64}$' OR p_owner IS NULL OR p_fence IS NULL OR p_fence < 1
    OR p_revision IS NULL OR p_revision < 0
    OR NOT interrogation_private.valid_session_record(p_record,p_key,p_revision)
    OR NOT coalesce(jsonb_typeof(p_response)='object' AND jsonb_typeof(p_response->'body')='object'
      AND jsonb_typeof(p_response->'status')='number'
      AND p_response->>'status' ~ '^[1-5][0-9]{2}$' AND pg_column_size(p_response)<=2097152,false) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO v_session FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR v_session.expires_at <= v_now THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  SELECT * INTO v_request FROM interrogation_private.game_requests
    WHERE session_key=p_key AND request_key=p_request_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','stale'); END IF;
  IF v_request.fingerprint <> p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
  IF v_request.state='complete' THEN RETURN jsonb_build_object('kind','replay','response',v_request.response); END IF;
  IF v_request.state <> 'pending' OR v_request.fence <> p_fence OR v_session.fence <> p_fence
    OR v_session.lease_owner IS DISTINCT FROM p_owner OR v_session.lease_until IS NULL
    OR v_session.lease_until <= v_now OR v_session.revision <> p_revision THEN
    RETURN jsonb_build_object('kind','stale');
  END IF;
  -- Facts and creation identity are immutable even while the game is active.
  IF v_session.record#>'{session,caseData}' IS DISTINCT FROM p_record#>'{session,caseData}'
    OR v_session.record#>'{session,createdAt}' IS DISTINCT FROM p_record#>'{session,createdAt}'
    OR v_session.record#>'{session,timerMode}' IS DISTINCT FROM p_record#>'{session,timerMode}' THEN
    RETURN jsonb_build_object('kind','conflict');
  END IF;
  -- A terminal game and its outcome/evaluation cannot be reopened or rewritten.
  -- Token redemption is a later transaction boundary, not granted by this RPC.
  IF v_session.record#>>'{session,status}' IN ('won','lost') AND
    ((v_session.record->'session')-'lastActivity' IS DISTINCT FROM (p_record->'session')-'lastActivity'
      OR v_session.record->'token' IS DISTINCT FROM p_record->'token') THEN
    RETURN jsonb_build_object('kind','conflict');
  END IF;
  v_record := jsonb_set(p_record,'{revision}',to_jsonb(p_revision+1));
  v_record := jsonb_set(v_record,'{session,lastActivity}',to_jsonb(floor(extract(epoch FROM v_now)*1000)));
  UPDATE interrogation_private.game_sessions SET record=v_record,revision=p_revision+1,
    expires_at=v_now + interval '1 hour',lease_owner=NULL,lease_until=NULL WHERE session_key=p_key;
  UPDATE interrogation_private.game_requests SET state='complete',response=p_response,completed_at=v_now
    WHERE session_key=p_key AND request_key=p_request_key;
  RETURN jsonb_build_object('kind','committed','record',v_record,'response',p_response);
END;
$$;

REVOKE ALL ON FUNCTION public.interrogation_session_create(text,jsonb),
  public.interrogation_session_load(text), public.interrogation_session_claim(text,text,text,uuid,integer),
  public.interrogation_session_complete(text,text,text,uuid,bigint,bigint,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_session_create(text,jsonb),
  public.interrogation_session_load(text), public.interrogation_session_claim(text,text,text,uuid,integer),
  public.interrogation_session_complete(text,text,text,uuid,bigint,bigint,jsonb,jsonb) TO service_role;
COMMIT;
