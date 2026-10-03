-- Apply after 001,004,006,008. Staged adapter only; does not activate hosted routes.
-- RPC hashes capability/token before transport. Success exposes only a public receipt.
-- Existing authenticated receipt replays beyond grant TTL; first redemption does not.
BEGIN;
CREATE FUNCTION interrogation_private.valid_ranked_grant(p_record jsonb,p_export public.game_exports)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  s jsonb := p_record->'session';
  grant_snapshot jsonb := p_record#>'{token,snapshot}';
  stats jsonb := grant_snapshot->'stats';
  field text;
BEGIN
  IF NOT coalesce(s->>'status'='won' AND s->>'outcome'='win'
    AND stats->>'playMode'='challenge' AND stats->'ranked'='true'::jsonb
    AND jsonb_typeof(grant_snapshot)='object' AND jsonb_typeof(stats)='object'
    AND stats=p_export.stats-'maxStress'-'cluesCollected'
    AND p_export.session_id=s->>'id' AND p_export.outcome='win'
    AND p_export.case_data=s->'caseData' AND p_export.conversation=s->'conversationHistory'
    AND grant_snapshot->>'caseNumber'=coalesce(s#>>'{caseData,case_number}','')
    AND grant_snapshot->>'caseSetting'=coalesce(s#>>'{caseData,setting}','')
    AND grant_snapshot->>'suspectName'=coalesce(s#>>'{caseData,suspect_name}','')
    AND grant_snapshot->'stressLevel'=s->'currentStress'
    AND grant_snapshot->'cluesFound'=s->'cluesCollected'
    AND jsonb_typeof(stats->'timeElapsed')='number' AND (stats->>'timeElapsed')::numeric>=0
    AND jsonb_typeof(stats->'detectiveRating')='string'
    AND stats->>'difficulty' IN ('easy','medium','hard','expert'),false) THEN RETURN false; END IF;
  FOREACH field IN ARRAY ARRAY['score','hintsUsed','accusationsUsed','questionsAsked'] LOOP
    IF NOT coalesce(jsonb_typeof(stats->field)='number' AND stats->>field ~ '^[0-9]+$'
      AND (stats->>field)::numeric<=2147483647,false) THEN RETURN false; END IF;
  END LOOP;
  RETURN coalesce(jsonb_typeof(grant_snapshot->'stressLevel')='number'
    AND (grant_snapshot->>'stressLevel') ~ '^[0-9]$'
    AND jsonb_typeof(grant_snapshot->'cluesFound')='number'
    AND grant_snapshot->>'cluesFound' ~ '^[0-9]+$'
    AND (grant_snapshot->>'cluesFound')::numeric<=2147483647,false);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.valid_ranked_grant(jsonb,public.game_exports)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.interrogation_redeem_win(p_key text,p_token_hash text,p_player_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  game interrogation_private.game_sessions%ROWTYPE;
  entry public.leaderboard%ROWTYPE;
  exported public.game_exports%ROWTYPE;
  snapshot jsonb;
  stats jsonb;
  consumed jsonb;
  current_time_ms numeric;
  v_now timestamptz;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_token_hash IS NULL
    OR p_token_hash !~ '^[a-f0-9]{64}$' OR p_player_name IS NULL
    OR p_player_name !~ '^[A-Za-z0-9]{1,3}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  p_player_name := upper(p_player_name);
  SELECT * INTO game FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  v_now := clock_timestamp();
  current_time_ms := floor(extract(epoch FROM v_now)*1000);
  IF NOT coalesce(game.record#>>'{session,winToken}' ~ '^[a-f0-9]{32}$'
    AND encode(sha256(convert_to(game.record#>>'{session,winToken}','UTF8')),'hex')=p_token_hash,false) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO entry FROM public.leaderboard WHERE session_id=game.record#>>'{session,id}';
  IF FOUND THEN
    IF entry.redemption_hash IS DISTINCT FROM p_token_hash THEN RETURN jsonb_build_object('kind','invalid'); END IF;
    IF entry.player_name IS DISTINCT FROM p_player_name THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    IF entry.ranked IS DISTINCT FROM true OR entry.play_mode IS DISTINCT FROM 'challenge' THEN
      RETURN jsonb_build_object('kind','unranked');
    END IF;
    RETURN jsonb_build_object('kind','replay','receipt',jsonb_build_object('success',true,
      'id',entry.id,'score',entry.score,'playerName',entry.player_name));
  END IF;
  IF game.expires_at<=v_now THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  IF game.lease_until>v_now THEN RETURN jsonb_build_object('kind','busy'); END IF;
  IF game.record#>>'{token,snapshot,stats,playMode}' IS DISTINCT FROM 'challenge'
    OR game.record#>'{token,snapshot,stats,ranked}' IS DISTINCT FROM 'true'::jsonb THEN
    RETURN jsonb_build_object('kind','unranked');
  END IF;
  IF NOT coalesce(game.record#>'{token,consumed}'='false'::jsonb
    AND jsonb_typeof(game.record#>'{token,issuedAt}')='number'
    AND (game.record#>>'{token,issuedAt}') ~ '^[0-9]{1,16}$',false) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  IF (game.record#>>'{token,issuedAt}')::numeric>current_time_ms
    OR current_time_ms-(game.record#>>'{token,issuedAt}')::numeric>1800000 THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  SELECT * INTO exported FROM public.game_exports WHERE session_id=game.record#>>'{session,id}';
  IF NOT FOUND OR NOT interrogation_private.valid_ranked_grant(game.record,exported) THEN
    RETURN jsonb_build_object('kind','invalid');
  END IF;
  snapshot := game.record#>'{token,snapshot}'; stats := snapshot->'stats';
  INSERT INTO public.leaderboard(session_id,redemption_hash,player_name,case_number,case_setting,suspect_name,
    time_remaining,difficulty,stress_level,clues_found,hints_used,accusations_used,questions_asked,
    detective_rating,score,play_mode,ranked,created_at)
  VALUES(game.record#>>'{session,id}',p_token_hash,p_player_name,snapshot->>'caseNumber',snapshot->>'caseSetting',
    snapshot->>'suspectName',(stats->>'timeElapsed')::double precision,stats->>'difficulty',
    (snapshot->>'stressLevel')::integer,(snapshot->>'cluesFound')::integer,(stats->>'hintsUsed')::integer,
    (stats->>'accusationsUsed')::integer,(stats->>'questionsAsked')::integer,stats->>'detectiveRating',
    (stats->>'score')::integer,'challenge',true,v_now) RETURNING * INTO entry;
  consumed := jsonb_set(game.record,'{token,consumed}','true'::jsonb);
  consumed := jsonb_set(consumed,'{revision}',to_jsonb(game.revision+1));
  UPDATE interrogation_private.game_sessions SET record=consumed,revision=revision+1,fence=fence+1,
    lease_owner=NULL,lease_until=NULL WHERE session_key=p_key;
  UPDATE interrogation_private.game_requests SET state='interrupted' WHERE session_key=p_key AND state='pending';
  RETURN jsonb_build_object('kind','redeemed','receipt',jsonb_build_object('success',true,
    'id',entry.id,'score',entry.score,'playerName',entry.player_name));
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_redeem_win(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_redeem_win(text,text,text) TO service_role;

CREATE FUNCTION interrogation_private.protect_hosted_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(OLD.session_id,'UTF8')),'hex')) THEN
    RAISE EXCEPTION 'Hosted scores are immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.protect_hosted_score() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER protect_hosted_score BEFORE UPDATE OR DELETE ON public.leaderboard
  FOR EACH ROW EXECUTE FUNCTION interrogation_private.protect_hosted_score();
COMMIT;
