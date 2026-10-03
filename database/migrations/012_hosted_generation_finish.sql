-- Generation recovery and provider admission. Requires 006,007,011; no route selection here.
BEGIN;
CREATE FUNCTION public.interrogation_generation_finish(
  p_key text,p_fingerprint text,p_owner uuid,p_fence bigint,p_record jsonb,p_response jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row interrogation_private.game_generation_requests%ROWTYPE;
  v_created jsonb;
  v_session_key text;
  v_success boolean;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_owner IS NULL OR p_fence IS NULL OR p_fence<1
    OR NOT coalesce(jsonb_typeof(p_response)='object' AND jsonb_typeof(p_response->'body')='object'
      AND jsonb_typeof(p_response->'status')='number' AND p_response->>'status' ~ '^(200|[45][0-9]{2})$'
      AND pg_column_size(p_response)<=2097152,false) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO v_row FROM interrogation_private.game_generation_requests WHERE request_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','stale'); END IF;
  IF v_row.fingerprint<>p_fingerprint THEN RETURN jsonb_build_object('kind','conflict'); END IF;
  IF v_row.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('kind','expired'); END IF;
  IF v_row.state='complete' THEN RETURN jsonb_build_object('kind','replay','response',v_row.response); END IF;
  IF v_row.state<>'pending' OR v_row.owner<>p_owner OR v_row.fence<>p_fence OR v_row.lease_until<=clock_timestamp() THEN
    RETURN jsonb_build_object('kind','stale');
  END IF;
  v_success := p_response->>'status'='200';
  IF v_success THEN
    v_session_key := encode(sha256(convert_to(v_row.session_id,'UTF8')),'hex');
    IF v_row.checkpoint IS NULL OR NOT interrogation_private.valid_session_record(p_record,v_session_key,0)
      OR p_record#>>'{session,status}' IS DISTINCT FROM 'briefing'
      OR p_record#>'{session,caseData}' IS DISTINCT FROM v_row.checkpoint->'data'
      OR p_record#>'{session,createdAt}' IS DISTINCT FROM to_jsonb(floor(extract(epoch FROM v_row.created_at)*1000))
      OR p_response#>>'{body,sessionId}' IS DISTINCT FROM v_row.session_id
      OR p_record->'token' IS NOT NULL THEN
      RETURN jsonb_build_object('kind','conflict');
    END IF;
    v_created := public.interrogation_session_create(v_session_key,p_record);
    IF v_created->>'kind' NOT IN ('created','exists') THEN RETURN jsonb_build_object('kind','conflict'); END IF;
  ELSIF p_record IS NOT NULL OR v_row.checkpoint IS NOT NULL THEN
    RETURN jsonb_build_object('kind','conflict');
  END IF;
  -- Session creation may wait on an existing row. Raising rolls back any insert as well
  -- as this receipt; a plain stale return here would leave a partially committed case.
  IF v_row.expires_at<=clock_timestamp() OR v_row.lease_until<=clock_timestamp() THEN
    RAISE EXCEPTION 'Generation authority expired during materialization' USING ERRCODE='40001';
  END IF;
  UPDATE interrogation_private.game_generation_requests SET state='complete',response=p_response,
    phase=CASE WHEN v_success THEN 'ready' ELSE phase END WHERE request_key=p_key;
  RETURN jsonb_build_object('kind','committed','response',p_response);
END;
$$;

CREATE FUNCTION public.interrogation_generation_reserve_work(
  p_deployment text,p_session_key text,p_operation_key text,p_fingerprint text,p_scope text,p_units bigint,
  p_session_max_calls bigint,p_session_max_units bigint,p_deployment_max_calls bigint,p_deployment_max_units bigint,
  p_window_seconds integer,p_generation_key text,p_generation_fingerprint text,p_owner uuid,p_fence bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row interrogation_private.game_generation_requests%ROWTYPE;
BEGIN
  IF p_deployment IS NULL OR p_deployment !~ '^[A-Za-z0-9_.:-]{1,96}$'
    OR p_scope IS NULL OR p_scope <> 'ai'
    OR p_generation_key IS NULL OR p_generation_key !~ '^[a-f0-9]{64}$'
    OR p_generation_fingerprint IS NULL OR p_generation_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_owner IS NULL OR p_fence IS NULL OR p_fence<1 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  SELECT * INTO v_row FROM interrogation_private.game_generation_requests WHERE request_key=p_generation_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','stale'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('interrogation:work:' || p_deployment,0));
  IF v_row.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('kind','expired'); END IF;
  IF v_row.fingerprint<>p_generation_fingerprint
    OR p_session_key IS DISTINCT FROM encode(sha256(convert_to(v_row.session_id,'UTF8')),'hex') THEN
    RETURN jsonb_build_object('kind','conflict');
  END IF;
  IF v_row.state<>'pending' OR v_row.owner<>p_owner OR v_row.fence<>p_fence
    OR v_row.lease_until<=clock_timestamp() OR v_row.checkpoint IS NOT NULL THEN
    RETURN jsonb_build_object('kind','stale');
  END IF;
  RETURN public.interrogation_reserve_work(p_deployment,p_session_key,p_operation_key,p_fingerprint,p_scope,p_units,
    p_session_max_calls,p_session_max_units,p_deployment_max_calls,p_deployment_max_units,p_window_seconds);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_generation_finish(text,text,uuid,bigint,jsonb,jsonb),
  public.interrogation_generation_reserve_work(text,text,text,text,text,bigint,bigint,bigint,bigint,bigint,integer,text,text,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_generation_finish(text,text,uuid,bigint,jsonb,jsonb),
  public.interrogation_generation_reserve_work(text,text,text,text,text,bigint,bigint,bigint,bigint,bigint,integer,text,text,uuid,bigint)
  TO service_role;
COMMIT;
