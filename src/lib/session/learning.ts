import type { NextRequest } from 'next/server';
import { retrievePatterns } from '../ai/retrieval/service';

/** Optional historical examples; correlation is not evidence that a tactic caused a win. */
export async function retrieveLearnedTactics(options: {
  request: NextRequest; setting?: string; difficulty: string;
}): Promise<{ learnedTactics: string[]; totalPriorGames: number }> {
  try {
    const result = await retrievePatterns(options.setting || 'any', options.difficulty, options.request.signal);
    return { learnedTactics: [...result.tactics], totalPriorGames: result.totalGames };
  } catch {
    // Optional retrieval must never stop a new game or repeatedly log missing configuration.
    return { learnedTactics: [], totalPriorGames: 0 };
  }
}
