export function silenceFilling(difficulty: string): string {
  return difficulty === 'easy' ? `
   - At stress 3+, you feel compelled to fill the silence. This is where you slip up — adding unnecessary detail.
   - Your urge to be believed is your weakness. You keep going and contradictions emerge.` :
  difficulty === 'hard' || difficulty === 'expert' ? `
   - ONLY at stress 8+, and only occasionally, do you over-explain. You are disciplined.
   - Short questions get short answers. You NEVER fill silence unless truly cornered.
   - At stress 9, you might catch yourself mid-sentence: "I was going to — actually, never mind."` :
  /* medium */ `
   - At stress 6+, you sometimes feel compelled to fill the silence with unnecessary detail.
   - Short questions still get measured responses. You only over-talk when genuinely rattled.
   - At stress 8+, you might catch yourself mid-sentence: "I was going to — actually, never mind."`;
}
