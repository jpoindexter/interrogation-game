-- Provider-free read projections may expire a game and commit its canonical result.
-- A private one-row marker owns the lease; polling never consumes action receipts.
BEGIN;
CREATE TABLE interrogation_private.read_claims (
  session_key text PRIMARY KEY REFERENCES interrogation_private.game_sessions(session_key),
  owner uuid NOT NULL,
  fence bigint NOT NULL,
  revision bigint NOT NULL
);
ALTER TABLE interrogation_private.read_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.read_claims FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.interrogation_read_claim(p_key text,p_owner uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE game interrogation_private.game_sessions%ROWTYPE; v_now timestamptz;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_owner IS NULL THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO game FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR game.expires_at<=v_now THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  IF game.lease_until>v_now THEN RETURN jsonb_build_object('kind','busy'); END IF;
  UPDATE interrogation_private.game_requests SET state='interrupted' WHERE session_key=p_key AND state='pending';
  UPDATE interrogation_private.game_sessions SET lease_owner=p_owner,lease_until=v_now+interval '30 seconds',fence=fence+1
    WHERE session_key=p_key RETURNING * INTO game;
  INSERT INTO interrogation_private.read_claims(session_key,owner,fence,revision)
    VALUES(p_key,p_owner,game.fence,game.revision) ON CONFLICT(session_key) DO UPDATE
    SET owner=excluded.owner,fence=excluded.fence,revision=excluded.revision;
  RETURN jsonb_build_object('kind','claimed','record',game.record,'revision',game.revision,'fence',game.fence,
    'leaseUntil',floor(extract(epoch FROM game.lease_until)*1000));
END;
$$;
CREATE FUNCTION public.interrogation_read_complete(
  p_key text,p_owner uuid,p_revision bigint,p_fence bigint,p_record jsonb,p_export jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  game interrogation_private.game_sessions%ROWTYPE;
  marker interrogation_private.read_claims%ROWTYPE;
  v_request_key text := encode(sha256(convert_to('interrogation:transient-read:v1','UTF8')),'hex');
  fingerprint text := encode(sha256(convert_to('interrogation:read-projection:v1','UTF8')),'hex');
  result jsonb;
  v_now timestamptz;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_owner IS NULL OR p_revision IS NULL
    OR p_revision<0 OR p_fence IS NULL OR p_fence<1 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  SELECT * INTO game FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR game.expires_at<=v_now THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  SELECT * INTO marker FROM interrogation_private.read_claims WHERE session_key=p_key;
  IF NOT FOUND OR marker.owner IS DISTINCT FROM p_owner OR marker.fence<>p_fence OR marker.revision<>p_revision
    OR game.lease_owner IS DISTINCT FROM p_owner OR game.lease_until IS NULL OR game.lease_until<=v_now
    OR game.fence<>p_fence OR game.revision<>p_revision THEN RETURN jsonb_build_object('kind','stale'); END IF;
  INSERT INTO interrogation_private.game_requests(session_key,request_key,fingerprint,state,fence,started_at)
    VALUES(p_key,v_request_key,fingerprint,'pending',p_fence,v_now);
  result := public.interrogation_action_commit(p_key,v_request_key,fingerprint,p_owner,p_fence,p_revision,
    p_record,'{"status":200,"body":{}}'::jsonb,p_export);
  DELETE FROM interrogation_private.game_requests r WHERE r.session_key=p_key AND r.request_key=v_request_key;
  DELETE FROM interrogation_private.read_claims WHERE session_key=p_key;
  IF result->>'kind'<>'committed' THEN
    UPDATE interrogation_private.game_sessions SET lease_owner=NULL,lease_until=NULL WHERE session_key=p_key;
    RETURN result;
  END IF;
  RETURN jsonb_build_object('kind','committed','record',result->'record');
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_read_claim(text,uuid),
  public.interrogation_read_complete(text,uuid,bigint,bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_read_claim(text,uuid),
  public.interrogation_read_complete(text,uuid,bigint,bigint,jsonb,jsonb) TO service_role;
COMMIT;
