BEGIN;

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  case_number text,
  case_setting text,
  suspect_name text,
  time_remaining double precision,
  stress_level integer,
  clues_found integer,
  hints_used integer,
  accusations_used integer,
  detective_rating text,
  score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS redemption_hash text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS questions_asked integer;
ALTER TABLE public.leaderboard ALTER COLUMN time_remaining TYPE double precision;
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_session_id_unique ON public.leaderboard (session_id);
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert" ON public.leaderboard;
DROP POLICY IF EXISTS "Public read" ON public.leaderboard;
REVOKE ALL ON public.leaderboard FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leaderboard TO service_role;

CREATE TABLE IF NOT EXISTS public.game_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  case_data jsonb NOT NULL,
  conversation jsonb NOT NULL,
  outcome text NOT NULL,
  difficulty text NOT NULL,
  setting text,
  stats jsonb NOT NULL,
  accusation_text text,
  accusation_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert" ON public.game_exports;
DROP POLICY IF EXISTS "no_public_read" ON public.game_exports;
REVOKE ALL ON public.game_exports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.game_exports TO service_role;

-- Close the documented anonymous pattern policies when this optional table already exists.
DO $$
DECLARE function_name text;
BEGIN
  IF to_regclass('public.interrogation_patterns') IS NOT NULL THEN
    ALTER TABLE public.interrogation_patterns ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon_insert" ON public.interrogation_patterns;
    DROP POLICY IF EXISTS "anon_read" ON public.interrogation_patterns;
    REVOKE ALL ON public.interrogation_patterns FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.interrogation_patterns TO service_role;
  END IF;
  FOR function_name IN
    SELECT p.oid::regprocedure::text FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'match_patterns'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', function_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_name);
  END LOOP;
END $$;

COMMIT;
