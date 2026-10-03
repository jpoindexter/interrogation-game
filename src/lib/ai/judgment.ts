interface Judgment extends Record<string, unknown> { correct: boolean; confession: string; explanation: string }
const DEFENSIVE_REACTIONS = [
  "That's not what happened. I stand by the account I gave you.",
  "You're drawing the wrong conclusion, detective. Look at what I actually said.",
  "You haven't shown that my account is false. I have nothing more to add to that accusation.",
];

/** A privileged judge's unsuccessful verdict must never disclose the hidden answer. */
export function publicJudgment(result: Judgment, previousAccusations: number): Judgment {
  if (result.correct) return result;
  return {
    correct: false,
    confession: DEFENSIVE_REACTIONS[Math.max(0, previousAccusations) % DEFENSIVE_REACTIONS.length],
    explanation: 'Your accusation must identify a specific false claim and the evidence that contradicts it.',
  };
}
