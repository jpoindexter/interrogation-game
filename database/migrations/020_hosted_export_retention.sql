-- Explicit bounded retention of expired hosted game/export payloads. No scheduler.
-- Scores, identity tombstones, voice metadata and allowances remain unchanged.
BEGIN;
CREATE TABLE interrogation_private.score_replay_receipts (
  session_key text PRIMARY KEY REFERENCES interrogation_private.game_sessions(session_key),
  token_hash text NOT NULL CHECK(token_hash ~ '^[a-f0-9]{64}$'),
  player_name text NOT NULL CHECK(player_name ~ '^[A-Z0-9]{1,3}$'),
  receipt jsonb NOT NULL CHECK(jsonb_typeof(receipt)='object')
);
ALTER TABLE interrogation_private.score_replay_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON interrogation_private.score_replay_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION interrogation_private.protect_score_replay_receipt() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Score replay receipts are immutable'; END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.protect_score_replay_receipt() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER protect_score_replay_receipt BEFORE UPDATE OR DELETE ON interrogation_private.score_replay_receipts
  FOR EACH ROW EXECUTE FUNCTION interrogation_private.protect_score_replay_receipt();

ALTER FUNCTION public.interrogation_redeem_win(text,text,text) RENAME TO interrogation_redeem_win_legacy;
REVOKE ALL ON FUNCTION public.interrogation_redeem_win_legacy(text,text,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.interrogation_redeem_win(p_key text,p_token_hash text,p_player_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved interrogation_private.score_replay_receipts%ROWTYPE;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-f0-9]{64}$' OR p_token_hash IS NULL
    OR p_token_hash !~ '^[a-f0-9]{64}$' OR p_player_name IS NULL
    OR p_player_name !~ '^[A-Za-z0-9]{1,3}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  PERFORM 1 FROM interrogation_private.game_sessions WHERE session_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('kind','unavailable'); END IF;
  SELECT * INTO saved FROM interrogation_private.score_replay_receipts WHERE session_key=p_key;
  IF FOUND THEN
    IF saved.token_hash<>p_token_hash THEN RETURN jsonb_build_object('kind','invalid'); END IF;
    IF saved.player_name<>upper(p_player_name) THEN RETURN jsonb_build_object('kind','conflict'); END IF;
    RETURN jsonb_build_object('kind','replay','receipt',saved.receipt);
  END IF;
  RETURN public.interrogation_redeem_win_legacy(p_key,p_token_hash,p_player_name);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_redeem_win(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_redeem_win(text,text,text) TO service_role;

-- INSERT locks the parent before creating any child, serializing late inserts with
-- cleanup. Existing UPDATE protection is unchanged; DELETE only admits scrubbed parents.
CREATE OR REPLACE FUNCTION interrogation_private.protect_hosted_export()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE game interrogation_private.game_sessions%ROWTYPE;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT * INTO game FROM interrogation_private.game_sessions
      WHERE session_key=encode(sha256(convert_to(NEW.session_id,'UTF8')),'hex') FOR UPDATE;
    IF FOUND AND game.expires_at<=clock_timestamp() AND game.record='{}'::jsonb THEN
      RAISE EXCEPTION 'Scrubbed hosted exports cannot be recreated';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO game FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(OLD.session_id,'UTF8')),'hex');
  IF FOUND AND NOT (TG_OP='DELETE' AND game.expires_at<=clock_timestamp() AND game.record='{}'::jsonb) THEN
    RAISE EXCEPTION 'Hosted exports are immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.session_id IS DISTINCT FROM OLD.session_id AND EXISTS(SELECT 1 FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(NEW.session_id,'UTF8')),'hex')) THEN
    RAISE EXCEPTION 'Hosted exports are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_hosted_export_insert BEFORE INSERT ON public.game_exports
  FOR EACH ROW EXECUTE FUNCTION interrogation_private.protect_hosted_export();

CREATE FUNCTION interrogation_private.guard_scrubbed_score_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE game interrogation_private.game_sessions%ROWTYPE;
BEGIN
  SELECT * INTO game FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(NEW.session_id,'UTF8')),'hex') FOR UPDATE;
  IF FOUND AND game.expires_at<=clock_timestamp() AND game.record='{}'::jsonb THEN
    RAISE EXCEPTION 'Scrubbed hosted scores cannot be created';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.guard_scrubbed_score_insert() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_scrubbed_score_insert BEFORE INSERT ON public.leaderboard
  FOR EACH ROW EXECUTE FUNCTION interrogation_private.guard_scrubbed_score_insert();
CREATE OR REPLACE FUNCTION interrogation_private.protect_hosted_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(OLD.session_id,'UTF8')),'hex')) THEN
    RAISE EXCEPTION 'Hosted scores are immutable';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.session_id IS DISTINCT FROM OLD.session_id AND EXISTS(SELECT 1 FROM interrogation_private.game_sessions
    WHERE session_key=encode(sha256(convert_to(NEW.session_id,'UTF8')),'hex')) THEN
    RAISE EXCEPTION 'Hosted scores are immutable';
  END IF;
  RETURN NEW;
END;
$$;

-- Exclude invalid bindings before LIMIT so a corrupt oldest row cannot starve
-- later eligible games. Recheck under the parent lock before removing payloads.
CREATE FUNCTION interrogation_private.export_retention_binding(p_key text,p_record jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE score public.leaderboard%ROWTYPE; saved interrogation_private.score_replay_receipts%ROWTYPE;
  v_id text := p_record#>>'{session,id}'; v_hash text; v_receipt jsonb;
BEGIN
  IF NOT coalesce(encode(sha256(convert_to(v_id,'UTF8')),'hex')=p_key,false) THEN RETURN false; END IF;
  SELECT * INTO score FROM public.leaderboard WHERE session_id=v_id;
  IF NOT FOUND THEN RETURN true; END IF;
  v_hash := encode(sha256(convert_to(p_record#>>'{session,winToken}','UTF8')),'hex');
  IF NOT coalesce(p_record#>>'{session,winToken}' ~ '^[a-f0-9]{32}$'
    AND score.redemption_hash=v_hash AND score.player_name ~ '^[A-Z0-9]{1,3}$'
    AND score.ranked=true AND score.play_mode='challenge' AND score.score>=0,false) THEN RETURN false; END IF;
  v_receipt := jsonb_build_object('success',true,'id',score.id,'score',score.score,'playerName',score.player_name);
  SELECT * INTO saved FROM interrogation_private.score_replay_receipts WHERE session_key=p_key;
  RETURN NOT FOUND OR (saved.token_hash=v_hash AND saved.player_name=score.player_name AND saved.receipt=v_receipt);
END;
$$;
REVOKE ALL ON FUNCTION interrogation_private.export_retention_binding(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.interrogation_export_retention_batch(
  p_apply boolean DEFAULT false,p_limit integer DEFAULT 25,p_days integer DEFAULT 30
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  game interrogation_private.game_sessions%ROWTYPE;
  score public.leaderboard%ROWTYPE;
  saved interrogation_private.score_replay_receipts%ROWTYPE;
  v_now timestamptz;
  v_id text;
  v_hash text;
  v_receipt jsonb;
  has_score boolean;
  export_count integer;
  sessions integer := 0;
  exports integer := 0;
  score_receipts integer := 0;
  deferred integer := 0;
BEGIN
  IF p_apply IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR p_days IS NULL OR p_days NOT BETWEEN 1 AND 3650 THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  FOR game IN SELECT s.* FROM interrogation_private.game_sessions s
    WHERE s.record<>'{}'::jsonb AND s.expires_at<=clock_timestamp()-make_interval(days=>p_days)
      AND interrogation_private.export_retention_binding(s.session_key,s.record)
      AND coalesce(s.lease_until,'-infinity'::timestamptz)<=clock_timestamp()
      AND NOT EXISTS(SELECT 1 FROM interrogation_private.voice_requests v
        WHERE v.session_key=s.session_key AND v.lease_until>clock_timestamp())
      AND (EXISTS(SELECT 1 FROM public.game_exports e
        WHERE encode(sha256(convert_to(e.session_id,'UTF8')),'hex')=s.session_key)
        OR EXISTS(SELECT 1 FROM public.leaderboard l
          WHERE encode(sha256(convert_to(l.session_id,'UTF8')),'hex')=s.session_key))
    ORDER BY s.expires_at,s.session_key LIMIT p_limit FOR UPDATE OF s SKIP LOCKED
  LOOP
    v_now := clock_timestamp();
    IF game.expires_at>v_now-make_interval(days=>p_days) OR game.lease_until>v_now
      OR EXISTS(SELECT 1 FROM interrogation_private.voice_requests v
        WHERE v.session_key=game.session_key AND v.lease_until>v_now) THEN CONTINUE; END IF;
    v_id := game.record#>>'{session,id}';
    IF NOT interrogation_private.export_retention_binding(game.session_key,game.record) THEN CONTINUE; END IF;
    SELECT * INTO score FROM public.leaderboard WHERE session_id=v_id;
    has_score := FOUND;
    IF has_score THEN
      v_hash := encode(sha256(convert_to(game.record#>>'{session,winToken}','UTF8')),'hex');
      v_receipt := jsonb_build_object('success',true,'id',score.id,'score',score.score,'playerName',score.player_name);
      SELECT * INTO saved FROM interrogation_private.score_replay_receipts WHERE session_key=game.session_key;
      IF NOT FOUND THEN
        IF p_apply THEN
          INSERT INTO interrogation_private.score_replay_receipts(session_key,token_hash,player_name,receipt)
            VALUES(game.session_key,v_hash,score.player_name,v_receipt);
        END IF;
        score_receipts := score_receipts+1;
      END IF;
    END IF;
    SELECT count(*) INTO export_count FROM public.game_exports WHERE session_id=v_id;
    IF p_apply THEN
      UPDATE interrogation_private.game_sessions SET record='{}'::jsonb,lease_owner=NULL,lease_until=NULL
        WHERE session_key=game.session_key;
      DELETE FROM public.game_exports WHERE session_id=v_id;
      DELETE FROM interrogation_private.read_claims WHERE session_key=game.session_key;
    END IF;
    sessions := sessions+1; exports := exports+export_count;
  END LOOP;
  SELECT count(*) INTO deferred FROM (SELECT 1 FROM interrogation_private.game_sessions s
    WHERE s.record<>'{}'::jsonb AND s.expires_at<=clock_timestamp()-make_interval(days=>p_days)
      AND coalesce(s.lease_until,'-infinity'::timestamptz)<=clock_timestamp()
      AND NOT EXISTS(SELECT 1 FROM interrogation_private.voice_requests v
        WHERE v.session_key=s.session_key AND v.lease_until>clock_timestamp())
      AND (EXISTS(SELECT 1 FROM public.game_exports e
        WHERE encode(sha256(convert_to(e.session_id,'UTF8')),'hex')=s.session_key)
        OR EXISTS(SELECT 1 FROM public.leaderboard l
          WHERE encode(sha256(convert_to(l.session_id,'UTF8')),'hex')=s.session_key))
      AND NOT interrogation_private.export_retention_binding(s.session_key,s.record)
    LIMIT p_limit) bounded;
  RETURN jsonb_build_object('kind',CASE WHEN p_apply THEN 'applied' ELSE 'preview' END,
    'sessions',sessions,'exports',exports,'scoreReceipts',score_receipts,'deferred',deferred);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_export_retention_batch(boolean,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_export_retention_batch(boolean,integer,integer) TO service_role;
COMMIT;
