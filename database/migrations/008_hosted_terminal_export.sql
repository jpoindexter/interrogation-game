-- Hosted terminal commit: apply after 001,004,006,007. Staged, not route-selected.
-- interrogation_action_commit takes complete's eight arguments plus p_export jsonb
-- DEFAULT NULL. Same result kinds. First terminal commit requires its GameExport;
-- replay returns the exact original response without another export. Nonterminal
-- commits reject exports. The wrapper atomically commits record/receipt/export.
-- SQL binds exports to canonical fields; the TypeScript domain layer owns scoring.
BEGIN;
CREATE FUNCTION interrogation_private.valid_terminal_export(p_record jsonb,p_export jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  s jsonb := p_record->'session';
  stats jsonb := p_export->'stats';
  mode text;
  elapsed numeric;
BEGIN
  IF NOT coalesce(jsonb_typeof(p_export)='object' AND jsonb_typeof(stats)='object'
    AND jsonb_typeof(s->'caseData')='object' AND jsonb_typeof(s->'conversationHistory')='array'
    AND jsonb_typeof(s->'endedAt')='number' AND jsonb_typeof(s->'startTime')='number'
    AND jsonb_typeof(stats->'score')='number' AND (stats->>'score') ~ '^[0-9]+$'
    AND jsonb_typeof(stats->'detectiveRating')='string',false) THEN RETURN false; END IF;
  mode := CASE WHEN s#>>'{caseData,playMode}' IN ('challenge','relaxed','endurance')
    THEN s#>>'{caseData,playMode}' WHEN s->>'timerMode'='unlimited' THEN 'relaxed' ELSE 'challenge' END;
  elapsed := CASE WHEN (s->>'startTime')::numeric=0 THEN 0
    ELSE greatest(0,((s->>'endedAt')::numeric-(s->>'startTime')::numeric)/1000) END;
  IF NOT coalesce(stats->'hintsUsed'=s->'hintsUsed' AND stats->'accusationsUsed'=s->'accusationsUsed'
    AND stats->'questionsAsked'=s->'questionsAsked' AND stats->'maxStress'=s->'currentStress'
    AND stats->'cluesCollected'=s->'cluesCollected' AND stats->'timeElapsed'=to_jsonb(elapsed)
    AND stats->>'difficulty'=coalesce(nullif(s#>>'{caseData,difficulty}',''),'medium')
    AND stats->>'playMode'=mode AND stats->'ranked'=to_jsonb(mode='challenge'),false) THEN RETURN false; END IF;
  IF p_record ? 'token' AND p_record#>'{token,snapshot,stats}' IS DISTINCT FROM
    stats-'maxStress'-'cluesCollected' THEN RETURN false; END IF;
  IF jsonb_typeof(s#>'{evaluation,stats}')='object' AND s#>'{evaluation,stats}' IS DISTINCT FROM
    stats-'maxStress'-'cluesCollected' THEN RETURN false; END IF;
  RETURN coalesce(p_export=jsonb_build_object('session_id',s->'id','case_data',s->'caseData',
    'conversation',s->'conversationHistory','outcome',s->'outcome',
    'difficulty',coalesce(nullif(s#>>'{caseData,difficulty}',''),'medium'),
    'setting',nullif(s#>>'{caseData,setting}',''),'stats',stats,
    'accusation_text',s#>'{acceptedAccusation,text}','accusation_correct',s->>'outcome'='win',
    'created_at',p_export->'created_at') AND jsonb_typeof(p_export->'created_at')='string'
    AND (p_export->>'created_at')::timestamptz=to_timestamp((s->>'endedAt')::double precision/1000),false);
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow
  OR numeric_value_out_of_range THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.valid_terminal_export(jsonb,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.interrogation_action_commit(
  p_key text,p_request_key text,p_fingerprint text,p_owner uuid,p_fence bigint,
  p_revision bigint,p_record jsonb,p_response jsonb,p_export jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  result jsonb;
  existing_export jsonb;
  terminal boolean;
BEGIN
  result := public.interrogation_session_complete(p_key,p_request_key,p_fingerprint,p_owner,
    p_fence,p_revision,p_record,p_response);
  IF result->>'kind'<>'committed' THEN RETURN result; END IF;
  terminal := p_record#>>'{session,status}' IN ('won','lost');
  IF NOT terminal THEN
    IF p_export IS NOT NULL AND p_export<>'null'::jsonb THEN
      RAISE EXCEPTION USING ERRCODE='P1001',MESSAGE='Invalid hosted export';
    END IF;
    RETURN result;
  END IF;
  SELECT to_jsonb(e)-'id' INTO existing_export FROM public.game_exports e
    WHERE session_id=p_record#>>'{session,id}';
  IF p_export IS NULL OR p_export='null'::jsonb THEN
    IF existing_export IS NULL THEN RAISE EXCEPTION USING ERRCODE='P1001',MESSAGE='Terminal export required'; END IF;
    p_export := existing_export;
  END IF;
  IF NOT interrogation_private.valid_terminal_export(p_record,p_export) THEN
    RAISE EXCEPTION USING ERRCODE='P1001',MESSAGE='Invalid hosted export';
  END IF;
  IF existing_export IS NOT NULL THEN
    IF (existing_export-'created_at') IS DISTINCT FROM (p_export-'created_at')
      OR (existing_export->>'created_at')::timestamptz IS DISTINCT FROM (p_export->>'created_at')::timestamptz THEN
      RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Hosted export conflict';
    END IF;
  ELSE
    INSERT INTO public.game_exports(session_id,case_data,conversation,outcome,difficulty,setting,stats,
      accusation_text,accusation_correct,created_at)
    VALUES(p_export->>'session_id',p_export->'case_data',p_export->'conversation',p_export->>'outcome',
      p_export->>'difficulty',p_export->>'setting',p_export->'stats',p_export->>'accusation_text',
      (p_export->>'accusation_correct')::boolean,(p_export->>'created_at')::timestamptz);
  END IF;
  RETURN result;
EXCEPTION WHEN SQLSTATE 'P1001' THEN RETURN jsonb_build_object('kind','invalid');
  WHEN SQLSTATE 'P1002' THEN RETURN jsonb_build_object('kind','conflict');
END;
$$;

-- Preserve legacy local export upserts, but never overwrite/delete a hosted export.
CREATE FUNCTION interrogation_private.protect_hosted_export()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(OLD.session_id,'UTF8')),'hex')) THEN
    RAISE EXCEPTION 'Hosted exports are immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.protect_hosted_export() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER protect_hosted_export BEFORE UPDATE OR DELETE ON public.game_exports
  FOR EACH ROW EXECUTE FUNCTION interrogation_private.protect_hosted_export();
REVOKE ALL ON FUNCTION public.interrogation_session_complete(text,text,text,uuid,bigint,bigint,jsonb,jsonb)
  FROM service_role;
REVOKE ALL ON FUNCTION public.interrogation_action_commit(text,text,text,uuid,bigint,bigint,jsonb,jsonb,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_action_commit(text,text,text,uuid,bigint,bigint,jsonb,jsonb,jsonb)
  TO service_role;
-- Service-only receipt projection for deterministic conversation-path reconstruction.
-- Interrupted receipts map to pending: neither state authorizes another execution.
CREATE FUNCTION public.interrogation_session_receipts(p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE receipts jsonb;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  PERFORM 1 FROM interrogation_private.game_sessions
    WHERE session_key=p_key AND expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  SELECT coalesce(jsonb_object_agg(request_key,jsonb_build_object('hash',fingerprint,
    'state',CASE WHEN state='complete' THEN 'complete' ELSE 'pending' END,
    'startedAt',floor(extract(epoch FROM started_at)*1000))
    || CASE WHEN state='complete' THEN jsonb_build_object('response',response) ELSE '{}'::jsonb END),'{}'::jsonb)
    INTO receipts FROM interrogation_private.game_requests WHERE session_key=p_key;
  RETURN jsonb_build_object('kind','loaded','requests',receipts);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_session_receipts(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_session_receipts(text) TO service_role;
COMMIT;
