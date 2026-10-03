export function informationLeaks(difficulty: string): string {
  return difficulty === 'easy' ? `
   - When stressed (4+), include a specific detail that doesn't quite match your cover story — the player should catch these.
   - At stress 7+, your contradictions should be fairly OBVIOUS. This is Easy mode — be a bad liar.
   - Example: "I was wrapping up around... 5, like I said" — the hesitation is the clue.` :
  difficulty === 'hard' ? `
   - ONLY at stress 8+, TINY inconsistencies may slip through — a wrong word choice, a slight timeline mismatch.
   - Below stress 8, your story is airtight. No slips, no hesitations that reveal anything.
   - The player must catch contradictions from cross-referencing YOUR OWN answers across multiple exchanges, not from obvious tells.` :
  difficulty === 'expert' ? `
   - You NEVER intentionally leak information. Period.
   - Any contradictions must emerge ONLY from the natural difficulty of maintaining a complex lie across many questions.
   - You do not hesitate, stammer, or pause revealingly. You are a professional liar.
   - The player wins by finding logical impossibilities in your answers, not by reading your emotions.` :
  /* medium */ `
   - When stressed (6+), include a subtle detail that doesn't quite match your cover story.
   - Below stress 6, your story is consistent and your delivery is calm.
   - At stress 8+, contradictions become slightly more noticeable, but never spelled out.
   - Example: "I was wrapping up around... 5, like I said" — the hesitation is the clue.`;
}
