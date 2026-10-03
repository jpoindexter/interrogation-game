-- Private voice receipts and atomic work admission. Audio objects live in separate private storage.
BEGIN;
CREATE TABLE interrogation_private.voice_requests (
  session_key text NOT NULL REFERENCES interrogation_private.game_sessions(session_key),
  request_key text NOT NULL CHECK (request_key ~ '^[a-f0-9]{64}$'),
  kind text NOT NULL CHECK (kind IN ('tts','stt')),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  owner uuid NOT NULL, fence bigint NOT NULL CHECK (fence>0), lease_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
  reserved_bytes bigint NOT NULL CHECK (reserved_bytes BETWEEN 32768 AND 8421376),
  state text NOT NULL CHECK (state IN ('pending','complete','interrupted')),
  response jsonb,
  PRIMARY KEY (session_key,kind,request_key),
  CHECK ((state='complete')=(response IS NOT NULL))
);
ALTER TABLE interrogation_private.voice_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.voice_requests FROM PUBLIC,anon,authenticated,service_role;

-- Mirrors TIME_LIMITS in src/lib/game-state.ts; acceptance exercises every difficulty.
CREATE FUNCTION interrogation_private.voice_recording_active(p_record jsonb,p_now timestamptz)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE seconds integer;
BEGIN
  IF p_record#>>'{session,status}' IS DISTINCT FROM 'active' THEN RETURN false; END IF;
  IF p_record#>>'{session,timerMode}'='unlimited' THEN RETURN true; END IF;
  IF p_record#>>'{session,timerMode}' IS DISTINCT FROM 'countdown'
    OR NOT coalesce(p_record#>>'{session,startTime}' ~ '^[0-9]{1,16}$',false) THEN RETURN false; END IF;
  seconds := CASE p_record#>>'{session,caseData,difficulty}'
    WHEN 'easy' THEN 300 WHEN 'hard' THEN 540 WHEN 'expert' THEN 600 ELSE 420 END;
  RETURN extract(epoch FROM p_now)*1000 < (p_record#>>'{session,startTime}')::bigint+seconds*1000;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.voice_recording_active(jsonb,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION interrogation_private.voice_response_valid(p_kind text,p_response jsonb,p_object_key text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE body jsonb;
BEGIN
  IF NOT coalesce(jsonb_typeof(p_response)='object' AND jsonb_typeof(p_response->'status')='number',false) THEN RETURN false; END IF;
  IF p_kind='tts' AND p_response->>'status'='200' THEN
    RETURN coalesce(p_response->>'contentType'='audio/mpeg' AND p_response->>'objectKey'=p_object_key
      AND jsonb_typeof(p_response->'bytes')='number' AND p_response->>'bytes' ~ '^[0-9]{1,7}$'
      AND (p_response->>'bytes')::bigint BETWEEN 1 AND 8388608
      AND p_response->>'sha256' ~ '^[a-f0-9]{64}$'
      AND p_response-ARRAY['status','contentType','objectKey','bytes','sha256']='{}'::jsonb,false);
  END IF;
  IF NOT coalesce(p_response->>'contentType'='application/json' AND jsonb_typeof(p_response->'body')='string'
    AND octet_length(p_response->>'body')<=32768 AND p_response-ARRAY['status','contentType','body']='{}'::jsonb,false) THEN RETURN false; END IF;
  body := (p_response->>'body')::jsonb;
  IF jsonb_typeof(body)<>'object' THEN RETURN false; END IF;
  IF p_response->>'status' ~ '^[45][0-9]{2}$' THEN RETURN true; END IF;
  RETURN coalesce(p_kind='stt' AND p_response->>'status'='200' AND jsonb_typeof(body->'text')='string'
    AND length(btrim(body->>'text'))>0,false);
EXCEPTION WHEN data_exception THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.voice_response_valid(text,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;

-- Session row -> deployment advisory lock -> voice row. No session lease spans provider work.
CREATE FUNCTION public.interrogation_voice_claim(
  p_session_key text,p_request_key text,p_kind text,p_fingerprint text,p_revision bigint,p_owner uuid,
  p_deployment text,p_units bigint,p_session_max_calls bigint,p_session_max_units bigint,
  p_deployment_max_calls bigint,p_deployment_max_units bigint,p_window_seconds integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  game interrogation_private.game_sessions%ROWTYPE;
  receipt interrogation_private.voice_requests%ROWTYPE;
  v_now timestamptz;
  budget jsonb;
  reserved bigint;
  object_key text;
  result_kind text := 'claimed';
BEGIN
  IF p_session_key IS NULL OR p_session_key !~ '^[a-f0-9]{64}$' OR p_request_key IS NULL OR p_request_key !~ '^[a-f0-9]{64}$'
    OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$' OR p_owner IS NULL OR p_revision IS NULL OR p_revision<0
    OR p_kind IS NULL OR p_kind NOT IN ('tts','stt') OR p_deployment IS NULL OR p_deployment !~ '^[A-Za-z0-9_.:-]{1,96}$'
    OR p_units IS NULL OR p_units<1 OR (p_kind='tts' AND p_units>6000) OR (p_kind='stt' AND p_units>3145728) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO game FROM interrogation_private.game_sessions WHERE session_key=p_session_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('interrogation:work:'||p_deployment,0));
  v_now := clock_timestamp();
  IF game.expires_at<=v_now THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  IF game.revision<>p_revision OR (p_kind='stt' AND NOT interrogation_private.voice_recording_active(game.record,v_now)) THEN
    RETURN jsonb_build_object('kind','stale');
  END IF;
  object_key := CASE WHEN p_kind='tts' THEN p_session_key||'/tts/'||p_request_key||'.mp3' ELSE NULL END;
  SELECT * INTO receipt FROM interrogation_private.voice_requests
    WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key FOR UPDATE;
  IF FOUND THEN
    IF receipt.fingerprint<>p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    IF receipt.expires_at<=v_now THEN RETURN jsonb_build_object('kind','expired'); END IF;
    IF receipt.state='complete' THEN RETURN jsonb_build_object('kind','replay','response',receipt.response); END IF;
    IF receipt.state='interrupted' THEN RETURN jsonb_build_object('kind','interrupted'); END IF;
    IF receipt.lease_until>v_now THEN RETURN jsonb_build_object('kind','busy'); END IF;
    IF p_kind='stt' THEN
      UPDATE interrogation_private.voice_requests SET state='interrupted'
        WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key;
      RETURN jsonb_build_object('kind','interrupted');
    END IF;
    UPDATE interrogation_private.voice_requests SET owner=p_owner,fence=fence+1,lease_until=v_now+interval '90 seconds'
      WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key RETURNING * INTO receipt;
    result_kind := 'recover';
  ELSE
    IF game.lease_until>v_now THEN RETURN jsonb_build_object('kind','busy'); END IF;
    reserved := CASE WHEN p_kind='tts' THEN 8421376 ELSE 32768 END;
    IF (SELECT count(*) FROM interrogation_private.voice_requests WHERE session_key=p_session_key)>=256
      OR reserved>(67108864-(SELECT coalesce(sum(reserved_bytes),0) FROM interrogation_private.voice_requests WHERE session_key=p_session_key)) THEN
      RETURN jsonb_build_object('kind','limit');
    END IF;
    budget := public.interrogation_reserve_work(p_deployment,p_session_key,
      encode(sha256(convert_to('voice:'||p_session_key||':'||p_kind||':'||p_request_key,'UTF8')),'hex'),
      p_fingerprint,p_kind,p_units,p_session_max_calls,p_session_max_units,p_deployment_max_calls,p_deployment_max_units,p_window_seconds);
    IF budget->>'kind'='already_reserved' THEN RETURN jsonb_build_object('kind','interrupted'); END IF;
    IF budget->>'kind'<>'reserved' THEN RETURN budget; END IF;
    INSERT INTO interrogation_private.voice_requests
      (session_key,request_key,kind,fingerprint,owner,fence,lease_until,created_at,expires_at,reserved_bytes,state)
      VALUES(p_session_key,p_request_key,p_kind,p_fingerprint,p_owner,1,v_now+interval '90 seconds',v_now,
        v_now+interval '24 hours',reserved,'pending') RETURNING * INTO receipt;
  END IF;
  RETURN jsonb_build_object('kind',result_kind,'fence',receipt.fence,
    'leaseUntil',floor(extract(epoch FROM receipt.lease_until)*1000),'objectKey',object_key);
END;
$$;

CREATE FUNCTION public.interrogation_voice_finish(
  p_session_key text,p_request_key text,p_kind text,p_fingerprint text,p_owner uuid,p_fence bigint,p_response jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt interrogation_private.voice_requests%ROWTYPE; object_key text;
BEGIN
  IF p_session_key IS NULL OR p_session_key !~ '^[a-f0-9]{64}$' OR p_request_key IS NULL OR p_request_key !~ '^[a-f0-9]{64}$'
    OR p_kind IS NULL OR p_kind NOT IN ('tts','stt') OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_owner IS NULL OR p_fence IS NULL OR p_fence<1 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  object_key := p_session_key||'/tts/'||p_request_key||'.mp3';
  IF NOT interrogation_private.voice_response_valid(p_kind,p_response,object_key) THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  SELECT * INTO receipt FROM interrogation_private.voice_requests
    WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','stale'); END IF;
  IF receipt.fingerprint<>p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
  IF receipt.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('kind','expired'); END IF;
  IF receipt.state='complete' THEN
    IF receipt.response IS DISTINCT FROM p_response THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    RETURN jsonb_build_object('kind','replay','response',receipt.response);
  END IF;
  IF receipt.state<>'pending' OR receipt.owner<>p_owner OR receipt.fence<>p_fence OR receipt.lease_until<=clock_timestamp() THEN
    RETURN jsonb_build_object('kind','stale');
  END IF;
  UPDATE interrogation_private.voice_requests SET state='complete',response=p_response,
    reserved_bytes=CASE WHEN p_kind='tts' AND p_response->>'status'='200' THEN (p_response->>'bytes')::bigint+32768 ELSE reserved_bytes END
    WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key;
  RETURN jsonb_build_object('kind','committed','response',p_response);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_voice_claim(text,text,text,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,integer),
  public.interrogation_voice_finish(text,text,text,text,uuid,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_voice_claim(text,text,text,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,integer),
  public.interrogation_voice_finish(text,text,text,text,uuid,bigint,jsonb) TO service_role;
COMMIT;
