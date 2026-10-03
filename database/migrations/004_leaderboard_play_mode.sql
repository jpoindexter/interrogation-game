BEGIN;
-- Nullable legacy fields are deliberate: prior rows have no verified play mode.
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS play_mode text CHECK (play_mode IN ('challenge', 'relaxed', 'endurance')),
  ADD COLUMN IF NOT EXISTS ranked boolean;
CREATE INDEX IF NOT EXISTS leaderboard_ranked_challenge_score
  ON public.leaderboard (score DESC) WHERE ranked IS TRUE AND play_mode = 'challenge';
COMMIT;
