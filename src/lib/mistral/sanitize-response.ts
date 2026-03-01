export function sanitizeInterrogationResponse(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    spoken_response: typeof raw.spoken_response === 'string' ? raw.spoken_response.slice(0, 2000) : '',
    stress_level: typeof raw.stress_level === 'number' ? Math.max(0, Math.min(9, Math.floor(raw.stress_level))) : 0,
    clue_unlocked: typeof raw.clue_unlocked === 'string' ? raw.clue_unlocked.slice(0, 500) : null,
    caught: false,
  };
}

export function sanitizeAccusationResponse(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    correct: raw.correct === true,
    confession: typeof raw.confession === 'string' ? raw.confession.slice(0, 2000) : '',
    explanation: typeof raw.explanation === 'string' ? raw.explanation.slice(0, 1000) : '',
  };
}

export function sanitizeWinResponse(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    correct: raw.correct === true,
    explanation: typeof raw.explanation === 'string' ? raw.explanation.slice(0, 1000) : '',
    reveal_the_lie: typeof raw.reveal_the_lie === 'string' ? raw.reveal_the_lie.slice(0, 1000) : '',
    reveal_the_truth: typeof raw.reveal_the_truth === 'string' ? raw.reveal_the_truth.slice(0, 1000) : '',
    reveal_the_clue: typeof raw.reveal_the_clue === 'string' ? raw.reveal_the_clue.slice(0, 1000) : '',
    detective_rating: typeof raw.detective_rating === 'string' ? raw.detective_rating.slice(0, 50) : 'Rookie',
  };
}

export function sanitizeLossResponse(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    closest_moment: typeof raw.closest_moment === 'string' ? raw.closest_moment.slice(0, 2000) : '',
    what_they_missed: typeof raw.what_they_missed === 'string' ? raw.what_they_missed.slice(0, 1000) : '',
    the_lie_revealed: typeof raw.the_lie_revealed === 'string' ? raw.the_lie_revealed.slice(0, 1000) : '',
    the_truth_revealed: typeof raw.the_truth_revealed === 'string' ? raw.the_truth_revealed.slice(0, 1000) : '',
    detective_rating: typeof raw.detective_rating === 'string' ? raw.detective_rating.slice(0, 50) : 'Rookie',
  };
}
