export function sanitizeInterrogationResponse(raw: Record<string, unknown>) {
  return {
    spoken_response: typeof raw.spoken_response === 'string' ? raw.spoken_response.slice(0, 2000) : '',
    stress_level: typeof raw.stress_level === 'number' ? Math.max(0, Math.min(9, Math.floor(raw.stress_level))) : 0,
    clue_unlocked: typeof raw.clue_unlocked === 'string' ? raw.clue_unlocked.slice(0, 500) : null,
    caught: false,
  };
}

export function sanitizeAccusationResponse(raw: Record<string, unknown>) {
  if (!raw || typeof raw.correct !== 'boolean' || typeof raw.confession !== 'string' || !raw.confession.trim()
    || typeof raw.explanation !== 'string' || !raw.explanation.trim()) {
    throw new Error('Invalid accusation judgment');
  }
  return {
    correct: raw.correct,
    confession: typeof raw.confession === 'string' ? raw.confession.slice(0, 2000) : '',
    explanation: typeof raw.explanation === 'string' ? raw.explanation.slice(0, 1000) : '',
  };
}
