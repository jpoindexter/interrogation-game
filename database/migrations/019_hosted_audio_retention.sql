-- Immutable first-claim bucket provenance and retryable private-audio deletion.
-- No object-store calls, scheduler, refunds, or inference for legacy receipts.
BEGIN;
ALTER TABLE interrogation_private.voice_requests ADD COLUMN audio_bucket text
  CHECK (audio_bucket IS NULL OR (kind='tts' AND audio_bucket ~ '^[a-z0-9][a-z0-9-]{2,62}$'));
CREATE FUNCTION interrogation_private.protect_audio_bucket() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.audio_bucket IS NOT NULL AND NEW.audio_bucket IS DISTINCT FROM OLD.audio_bucket THEN
    RAISE EXCEPTION 'audio bucket is immutable';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.protect_audio_bucket() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER protect_audio_bucket BEFORE UPDATE ON interrogation_private.voice_requests
  FOR EACH ROW EXECUTE FUNCTION interrogation_private.protect_audio_bucket();

CREATE FUNCTION public.interrogation_voice_claim_in_bucket(
  p_session_key text,p_request_key text,p_kind text,p_fingerprint text,p_revision bigint,p_owner uuid,
  p_deployment text,p_units bigint,p_session_max_calls bigint,p_session_max_units bigint,
  p_deployment_max_calls bigint,p_deployment_max_units bigint,p_window_seconds integer,p_bucket text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt interrogation_private.voice_requests%ROWTYPE; result jsonb;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('tts','stt')
    OR (p_kind='tts' AND (p_bucket IS NULL OR p_bucket !~ '^[a-z0-9][a-z0-9-]{2,62}$'))
    OR (p_kind='stt' AND p_bucket IS NOT NULL) THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  -- Same parent-first lock order as 017: existence check and initial binding are atomic.
  PERFORM 1 FROM interrogation_private.game_sessions WHERE session_key=p_session_key FOR UPDATE;
  SELECT * INTO receipt FROM interrogation_private.voice_requests
    WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key FOR UPDATE;
  IF FOUND AND p_kind='tts' AND receipt.audio_bucket IS DISTINCT FROM p_bucket THEN
    RETURN jsonb_build_object('kind','conflict');
  END IF;
  result := public.interrogation_voice_claim(p_session_key,p_request_key,p_kind,p_fingerprint,p_revision,p_owner,
    p_deployment,p_units,p_session_max_calls,p_session_max_units,p_deployment_max_calls,p_deployment_max_units,p_window_seconds);
  IF result->>'kind'='claimed' AND p_kind='tts' THEN
    UPDATE interrogation_private.voice_requests SET audio_bucket=p_bucket
      WHERE session_key=p_session_key AND kind=p_kind AND request_key=p_request_key;
  END IF;
  RETURN result;
END;
$$;
-- The old entry point is callable only by the SECURITY DEFINER wrapper's owner.
REVOKE ALL ON FUNCTION public.interrogation_voice_claim(text,text,text,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,integer)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.interrogation_voice_claim_in_bucket(text,text,text,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,integer,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_voice_claim_in_bucket(text,text,text,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,integer,text)
  TO service_role;

CREATE TABLE interrogation_private.audio_deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL, request_key text NOT NULL, kind text NOT NULL DEFAULT 'tts' CHECK(kind='tts'),
  owner uuid NOT NULL, fence bigint NOT NULL CHECK(fence>0), lease_until timestamptz NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','deleted')),
  created_at timestamptz NOT NULL, deleted_at timestamptz,
  UNIQUE(session_key,kind,request_key),
  FOREIGN KEY(session_key,kind,request_key) REFERENCES interrogation_private.voice_requests(session_key,kind,request_key),
  CHECK((state='deleted')=(deleted_at IS NOT NULL))
);
ALTER TABLE interrogation_private.audio_deletion_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.audio_deletion_jobs FROM PUBLIC,anon,authenticated,service_role;

-- Preview takes transient row locks but changes no rows. Jobs remain retryable if
-- object removal or finish has an uncertain response. Only the fence can finalize.
CREATE FUNCTION interrogation_private.audio_retention_batch(p_owner uuid,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE candidate record; job interrogation_private.audio_deletion_jobs%ROWTYPE;
  v_now timestamptz; eligible integer := 0; deferred integer; jobs jsonb := '[]'::jsonb;
BEGIN
  FOR candidate IN SELECT s.session_key,v.request_key,v.audio_bucket,v.expires_at,v.lease_until,
      s.expires_at AS session_expires,s.lease_until AS session_lease
    FROM interrogation_private.game_sessions s JOIN interrogation_private.voice_requests v USING(session_key)
    LEFT JOIN interrogation_private.audio_deletion_jobs j
      ON j.session_key=v.session_key AND j.kind=v.kind AND j.request_key=v.request_key
    WHERE v.kind='tts' AND v.audio_bucket IS NOT NULL
      AND (v.expires_at<=clock_timestamp() OR s.expires_at<=clock_timestamp())
      AND v.lease_until<=clock_timestamp()-interval '5 minutes'
      AND coalesce(s.lease_until,'-infinity'::timestamptz)<=clock_timestamp()
      AND (j.id IS NULL OR (j.state='pending' AND j.lease_until<=clock_timestamp()))
    ORDER BY v.expires_at,v.session_key,v.request_key LIMIT p_limit FOR UPDATE OF s,v SKIP LOCKED
  LOOP
    v_now := clock_timestamp();
    IF candidate.expires_at>v_now AND candidate.session_expires>v_now
      OR candidate.lease_until>v_now-interval '5 minutes'
      OR candidate.session_lease>v_now THEN CONTINUE; END IF;
    SELECT * INTO job FROM interrogation_private.audio_deletion_jobs
      WHERE session_key=candidate.session_key AND kind='tts' AND request_key=candidate.request_key FOR UPDATE;
    IF FOUND AND (job.state='deleted' OR job.lease_until>v_now) THEN CONTINUE; END IF;
    eligible := eligible+1;
    IF p_owner IS NULL THEN CONTINUE; END IF;
    UPDATE interrogation_private.voice_requests SET state='interrupted',response=NULL,expires_at=least(expires_at,v_now)
      WHERE session_key=candidate.session_key AND kind='tts' AND request_key=candidate.request_key;
    INSERT INTO interrogation_private.audio_deletion_jobs
      (session_key,request_key,owner,fence,lease_until,state,created_at)
      VALUES(candidate.session_key,candidate.request_key,p_owner,1,v_now+interval '5 minutes','pending',v_now)
      ON CONFLICT(session_key,kind,request_key) DO UPDATE SET owner=p_owner,
        fence=interrogation_private.audio_deletion_jobs.fence+1,lease_until=v_now+interval '5 minutes'
      RETURNING * INTO job;
    jobs := jobs||jsonb_build_array(jsonb_build_object('id',job.id,'bucket',candidate.audio_bucket,
      'objectKey',candidate.session_key||'/tts/'||candidate.request_key||'.mp3',
      'fence',job.fence,'leaseUntil',floor(extract(epoch FROM job.lease_until)*1000)));
  END LOOP;
  -- Unknown buckets stay untouched. This capped count is not a full census.
  SELECT count(*) INTO deferred FROM (SELECT 1 FROM interrogation_private.voice_requests v
    JOIN interrogation_private.game_sessions s USING(session_key)
    WHERE v.kind='tts' AND v.audio_bucket IS NULL
      AND (v.expires_at<=clock_timestamp() OR s.expires_at<=clock_timestamp()) LIMIT p_limit) bounded;
  IF p_owner IS NULL THEN RETURN jsonb_build_object('kind','preview','eligible',eligible,'deferred',deferred); END IF;
  RETURN jsonb_build_object('kind','claimed','jobs',jobs,'deferred',deferred);
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.audio_retention_batch(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.interrogation_audio_retention_preview(p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  RETURN interrogation_private.audio_retention_batch(NULL,p_limit);
END;
$$;
CREATE FUNCTION public.interrogation_audio_retention_claim(p_owner uuid,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_owner IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  RETURN interrogation_private.audio_retention_batch(p_owner,p_limit);
END;
$$;
CREATE FUNCTION public.interrogation_audio_retention_finish(p_job_id uuid,p_owner uuid,p_fence bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job interrogation_private.audio_deletion_jobs%ROWTYPE;
BEGIN
  IF p_job_id IS NULL OR p_owner IS NULL OR p_fence IS NULL OR p_fence<1 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  SELECT * INTO job FROM interrogation_private.audio_deletion_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR job.owner<>p_owner OR job.fence<>p_fence THEN RETURN jsonb_build_object('kind','stale'); END IF;
  IF job.state='deleted' THEN RETURN jsonb_build_object('kind','replay'); END IF;
  IF job.lease_until<=clock_timestamp() THEN RETURN jsonb_build_object('kind','stale'); END IF;
  UPDATE interrogation_private.audio_deletion_jobs SET state='deleted',deleted_at=clock_timestamp() WHERE id=p_job_id;
  RETURN jsonb_build_object('kind','deleted');
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_audio_retention_preview(integer),
  public.interrogation_audio_retention_claim(uuid,integer),public.interrogation_audio_retention_finish(uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_audio_retention_preview(integer),
  public.interrogation_audio_retention_claim(uuid,integer),public.interrogation_audio_retention_finish(uuid,uuid,bigint)
  TO service_role;
COMMIT;
