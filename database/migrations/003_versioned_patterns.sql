-- Optional, explicit opt-in only. Never copy legacy vectors into this embedding space.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS public.interrogation_patterns_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  setting text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
  outcome text NOT NULL CHECK (outcome IN ('win','lose_accusations','lose_time','lose_giveup','lose_lawyer')),
  questions jsonb NOT NULL,
  final_stress integer NOT NULL CHECK (final_stress BETWEEN 0 AND 9),
  clues_found integer NOT NULL CHECK (clues_found >= 0),
  time_elapsed double precision NOT NULL CHECK (time_elapsed >= 0),
  source text NOT NULL CHECK (source = 'observed_game'),
  embedding_model text NOT NULL CHECK (embedding_model = 'text-embedding-3-small'),
  embedding_version text NOT NULL CHECK (embedding_version = 'openai-text-embedding-3-small-1536-v1'),
  embedding_dimensions integer NOT NULL CHECK (embedding_dimensions = 1536),
  embedding extensions.vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, embedding_version)
);
ALTER TABLE public.interrogation_patterns_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interrogation_patterns_v2 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.interrogation_patterns_v2 TO service_role;
CREATE OR REPLACE FUNCTION public.match_patterns_v2(
  query_embedding extensions.vector(1536), match_threshold double precision,
  match_count integer, filter_difficulty text, filter_version text, filter_model text
) RETURNS SETOF public.interrogation_patterns_v2
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT p.* FROM public.interrogation_patterns_v2 AS p
  WHERE p.difficulty = filter_difficulty AND p.embedding_version = filter_version
    AND p.embedding_model = filter_model AND p.embedding_dimensions = 1536
    AND p.source = 'observed_game'
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT greatest(0, least(match_count, 20));
$$;
REVOKE ALL ON FUNCTION public.match_patterns_v2(extensions.vector, double precision, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_patterns_v2(extensions.vector, double precision, integer, text, text, text) TO service_role;
COMMIT;
