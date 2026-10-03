-- Bounded payload retention only. Identity tombstones, allowances, exports and TTS
-- object metadata remain. No storage-object deletion or scheduler is installed.
BEGIN;
CREATE FUNCTION public.interrogation_retention_batch(
  p_apply boolean DEFAULT false, p_limit integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  candidate record;
  sessions integer := 0;
  requests integer := 0;
  generations integer := 0;
  voices integer := 0;
  exports_deferred integer;
  sessions_deferred integer;
  voices_deferred integer;
BEGIN
  IF p_apply IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  -- Generation finish acquires its generation row before its session row.
  -- All candidate reads skip locks and recheck database time after acquisition.
  FOR candidate IN SELECT g.request_key FROM interrogation_private.game_generation_requests g
    WHERE g.expires_at<=clock_timestamp() AND g.lease_until<=clock_timestamp()
      AND (g.state<>'interrupted' OR g.checkpoint IS NOT NULL OR g.response IS NOT NULL)
    ORDER BY g.expires_at,g.request_key LIMIT p_limit FOR UPDATE SKIP LOCKED
  LOOP
    IF p_apply THEN
      UPDATE interrogation_private.game_generation_requests SET checkpoint=NULL,response=NULL,state='interrupted'
        WHERE request_key=candidate.request_key AND expires_at<=clock_timestamp() AND lease_until<=clock_timestamp();
    END IF;
    generations := generations+1;
  END LOOP;
  FOR candidate IN SELECT s.session_key FROM interrogation_private.game_sessions s
    WHERE s.expires_at<=clock_timestamp() AND coalesce(s.lease_until,'-infinity'::timestamptz)<=clock_timestamp()
      AND s.record<>'{}'::jsonb
      AND NOT EXISTS(SELECT 1 FROM public.game_exports e WHERE e.session_id=s.record#>>'{session,id}')
      AND NOT EXISTS(SELECT 1 FROM public.leaderboard l WHERE l.session_id=s.record#>>'{session,id}')
      AND NOT EXISTS(SELECT 1 FROM interrogation_private.voice_requests v
        WHERE v.session_key=s.session_key AND v.lease_until>clock_timestamp())
    ORDER BY s.expires_at,s.session_key LIMIT p_limit FOR UPDATE SKIP LOCKED
  LOOP
    IF p_apply THEN
      UPDATE interrogation_private.game_sessions SET record='{}'::jsonb,lease_owner=NULL,lease_until=NULL
        WHERE session_key=candidate.session_key AND expires_at<=clock_timestamp();
      DELETE FROM interrogation_private.read_claims WHERE session_key=candidate.session_key;
    END IF;
    sessions := sessions+1;
  END LOOP;
  -- Parent tombstones still reject create/claim/complete, so expired action payloads
  -- can be deleted without reopening their request IDs as paid work.
  FOR candidate IN SELECT r.session_key,r.request_key FROM interrogation_private.game_sessions s
    JOIN interrogation_private.game_requests r USING(session_key)
    WHERE s.expires_at<=clock_timestamp() AND coalesce(s.lease_until,'-infinity'::timestamptz)<=clock_timestamp()
    ORDER BY s.expires_at,r.session_key,r.request_key LIMIT p_limit FOR UPDATE OF s,r SKIP LOCKED
  LOOP
    IF p_apply THEN
      DELETE FROM interrogation_private.game_requests
        WHERE session_key=candidate.session_key AND request_key=candidate.request_key;
    END IF;
    requests := requests+1;
  END LOOP;
  -- STT expiry is independent of session expiry. Keep TTS metadata until bucket
  -- provenance and retryable object erasure exist; it contains no transcript.
  FOR candidate IN SELECT v.session_key,v.request_key FROM interrogation_private.game_sessions s
    JOIN interrogation_private.voice_requests v USING(session_key)
    WHERE v.kind='stt' AND (v.expires_at<=clock_timestamp() OR s.expires_at<=clock_timestamp())
      AND v.lease_until<=clock_timestamp()
      AND coalesce(s.lease_until,'-infinity'::timestamptz)<=clock_timestamp()
      AND (v.state<>'interrupted' OR v.response IS NOT NULL)
    ORDER BY v.expires_at,v.session_key,v.request_key LIMIT p_limit FOR UPDATE OF s,v SKIP LOCKED
  LOOP
    IF p_apply THEN
      UPDATE interrogation_private.voice_requests SET response=NULL,state='interrupted'
        WHERE session_key=candidate.session_key AND kind='stt' AND request_key=candidate.request_key;
    END IF;
    voices := voices+1;
  END LOOP;
  -- These are capped observations, not a full database census or erasure claim.
  SELECT count(*) INTO exports_deferred FROM (SELECT 1 FROM public.game_exports e
    JOIN interrogation_private.game_sessions s
      ON s.session_key=encode(sha256(convert_to(e.session_id,'UTF8')),'hex')
    WHERE s.expires_at<=clock_timestamp() LIMIT p_limit) bounded;
  SELECT count(*) INTO sessions_deferred FROM (SELECT 1 FROM interrogation_private.game_sessions s
    WHERE s.expires_at<=clock_timestamp() AND s.record<>'{}'::jsonb
      AND (EXISTS(SELECT 1 FROM public.game_exports e WHERE e.session_id=s.record#>>'{session,id}')
        OR EXISTS(SELECT 1 FROM public.leaderboard l WHERE l.session_id=s.record#>>'{session,id}'))
    LIMIT p_limit) bounded;
  SELECT count(*) INTO voices_deferred FROM (SELECT 1 FROM interrogation_private.voice_requests v
    JOIN interrogation_private.game_sessions s USING(session_key)
    WHERE v.kind='tts' AND (v.expires_at<=clock_timestamp() OR s.expires_at<=clock_timestamp())
    LIMIT p_limit) bounded;
  RETURN jsonb_build_object('kind',CASE WHEN p_apply THEN 'applied' ELSE 'preview' END,
    'sessions',sessions,'requests',requests,'generations',generations,'voices',voices,'exports',0,
    'exportsDeferred',exports_deferred,'sessionsDeferred',sessions_deferred,'voicesDeferred',voices_deferred);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_retention_batch(boolean,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_retention_batch(boolean,integer) TO service_role;
COMMIT;
