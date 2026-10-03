-- Optional legacy 1024-dimensional embedding storage. Do not mix embedding models here.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS public.interrogation_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  setting text,
  difficulty text NOT NULL,
  outcome text NOT NULL,
  questions jsonb,
  effective_questions jsonb,
  max_stress integer,
  clues_found integer,
  time_elapsed integer,
  embedding extensions.vector(1024),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interrogation_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert" ON public.interrogation_patterns;
DROP POLICY IF EXISTS "anon_read" ON public.interrogation_patterns;
REVOKE ALL ON public.interrogation_patterns FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.interrogation_patterns TO service_role;

CREATE OR REPLACE FUNCTION public.match_patterns(
  query_embedding extensions.vector(1024),
  match_threshold double precision,
  match_count integer,
  filter_difficulty text
) RETURNS SETOF public.interrogation_patterns
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT p.* FROM public.interrogation_patterns AS p
  WHERE p.difficulty = filter_difficulty
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT greatest(0, least(match_count, 100));
$$;
REVOKE ALL ON FUNCTION public.match_patterns(extensions.vector, double precision, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_patterns(extensions.vector, double precision, integer, text) TO service_role;
COMMIT;
