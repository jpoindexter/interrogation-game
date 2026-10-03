import text from './case-text.json';
import { renderText } from './render';
import { DIFFICULTY_CLUES } from '../../game-state';

export const CASE_PROMPT_VERSION = 'one-false-claim-v3';
export const GENERATED_CASE_OBJECTIVE = 'Identify the false claim';

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy: `- EASY difficulty: The lie should be relatively obvious under pressure. The contradiction should be easy to spot.
- The suspect gets nervous quickly and isn't great at deflecting.
- Generate exactly 2 stress_triggers.`,
  medium: `- MEDIUM difficulty: The lie should be catchable but require some careful questioning.
- The suspect is reasonably composed but cracks under sustained pressure.
- Generate exactly 3 stress_triggers.`,
  hard: `- HARD difficulty: The lie should be well-hidden. The contradiction is subtle and requires connecting multiple pieces.
- The suspect is very composed and skilled at deflecting. They have a well-rehearsed cover story.
- Generate exactly 4 stress_triggers.`,
  expert: `- EXPERT difficulty: The lie is deeply buried. The contradiction requires catching very small inconsistencies across multiple answers.
- The suspect is extremely composed, manipulative, and adept at redirecting conversation. They rarely show stress.
- Generate exactly 5 stress_triggers.`,
};


export function buildCasePrompt(setting: string | undefined, difficulty: string): string {
  const ranges: Record<string, string> = { easy: '2-3', medium: '3-5', hard: '5-7', expert: '7-10' };
  return renderText(text.caseInstructions, {
    settingInstruction: setting ? `- MUST be set in a ${setting} — use this exact type of workplace`
      : '- Set in a realistic workplace (tech company, bank, law firm, hospital, etc.)',
    difficultyGuide: DIFFICULTY_INSTRUCTIONS[difficulty] ?? DIFFICULTY_INSTRUCTIONS.medium,
    clueCount: DIFFICULTY_CLUES[difficulty] ?? 3, difficulty, questionRange: ranges[difficulty] ?? '3-5',
    timeSeed: Date.now(), randomSeed: Math.random().toString(36).slice(2),
  });
}
