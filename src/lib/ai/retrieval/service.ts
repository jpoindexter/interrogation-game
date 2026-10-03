import { getSupabaseClient } from '../../db';
import { retrievalEnabled } from './config';
import { embedTexts } from './embeddings';
import { canonicalPattern, patternSummary, summarizePatterns, type CanonicalPattern } from './patterns';
import { EMBEDDING_SPACE } from './config';
import type { GameSession } from '../../session/types';
import { withAiWorkScope } from '../../limits/ai-scope';

export const DISABLED_RETRIEVAL = { status: 'disabled', stored: false, tactics: [], totalGames: 0 } as const;
const production = {
  embed: async (text: string) => (await embedTexts([text]))[0],
  save: async (pattern: CanonicalPattern, embedding: number[]) => {
    const { error } = await getSupabaseClient().from('interrogation_patterns_v3').upsert({
      ...pattern, embedding: JSON.stringify(embedding),
    }, { onConflict: 'session_id,embedding_version', ignoreDuplicates: true });
    if (error) throw new Error('Pattern storage unavailable');
  },
};

export async function storeSessionPattern(session: GameSession, dependencies = production) {
  if (!retrievalEnabled()) return DISABLED_RETRIEVAL;
  const pattern = canonicalPattern(session);
  const embedding = await withAiWorkScope(session.id, () => dependencies.embed(patternSummary(pattern)));
  await dependencies.save(pattern, embedding);
  return { status: 'stored', stored: true };
}

export async function retrievePatterns(setting: string, difficulty: string, signal?: AbortSignal) {
  if (!retrievalEnabled()) return DISABLED_RETRIEVAL;
  const [embedding] = await embedTexts([JSON.stringify({ setting, difficulty, outcome: 'win' })], { signal });
  const { data, error } = await getSupabaseClient().rpc('match_patterns_v3', {
    query_embedding: JSON.stringify(embedding), match_threshold: 0.5, match_count: 20,
    filter_difficulty: difficulty, filter_version: EMBEDDING_SPACE.version, filter_model: EMBEDDING_SPACE.model,
  }).abortSignal(signal ?? AbortSignal.timeout(20000));
  if (error) throw new Error('Pattern retrieval unavailable');
  return summarizePatterns(Array.isArray(data) ? data : []);
}
