-- Preserve original public retry IDs while retaining private hashed lookup keys.
BEGIN;
ALTER TABLE interrogation_private.game_requests ADD COLUMN public_id text
  CHECK (public_id IS NULL OR (public_id ~ '^[a-zA-Z0-9_-]{8,128}$'
    AND encode(sha256(convert_to(public_id,'UTF8')),'hex')=request_key));

CREATE FUNCTION public.interrogation_action_claim(
  p_key text,p_request_key text,p_fingerprint text,p_owner uuid,p_request_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF p_request_id IS NULL OR p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
    OR p_request_key IS DISTINCT FROM encode(sha256(convert_to(p_request_id,'UTF8')),'hex') THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  result := public.interrogation_session_claim(p_key,p_request_key,p_fingerprint,p_owner);
  IF result->>'kind' IN ('claimed','replay','busy','interrupted') THEN
    UPDATE interrogation_private.game_requests SET public_id=p_request_id
      WHERE session_key=p_key AND request_key=p_request_key AND fingerprint=p_fingerprint AND public_id IS NULL;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_session_claim(text,text,text,uuid,integer) FROM service_role;
REVOKE ALL ON FUNCTION public.interrogation_action_claim(text,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_action_claim(text,text,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.interrogation_session_receipts(p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE receipts jsonb;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  PERFORM 1 FROM interrogation_private.game_sessions
    WHERE session_key=p_key AND expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  SELECT coalesce(jsonb_object_agg(request_key,jsonb_build_object('hash',fingerprint,'publicId',public_id,
    'state',CASE WHEN state='complete' THEN 'complete' ELSE 'pending' END,
    'startedAt',floor(extract(epoch FROM started_at)*1000))
    || CASE WHEN state='complete' THEN jsonb_build_object('response',response) ELSE '{}'::jsonb END),'{}'::jsonb)
    INTO receipts FROM interrogation_private.game_requests WHERE session_key=p_key
      AND request_key<>encode(sha256(convert_to('interrogation:transient-read:v1','UTF8')),'hex');
  RETURN jsonb_build_object('kind','loaded','requests',receipts);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_session_receipts(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_session_receipts(text) TO service_role;
COMMIT;
