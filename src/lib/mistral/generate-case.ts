import { mistralClient, extractContent } from './client';

const DIFFICULTY_CLUES: Record<string, number> = {
  easy: 2, medium: 3, hard: 4, expert: 5,
};

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

export async function generateCase(settingHint?: string, difficulty: string = 'medium') {
  const settingInstruction = settingHint
    ? `- MUST be set in a ${settingHint} — use this exact type of workplace`
    : '- Set in a realistic workplace (tech company, bank, law firm, hospital, etc.)';

  const clueCount = DIFFICULTY_CLUES[difficulty] || 3;
  const difficultyGuide = DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS.medium;

  const response = await mistralClient.chat.complete({
    model: 'mistral-large-latest',
    messages: [{
      role: 'user',
      content: `You are a game designer creating scenarios for a detective interrogation game.

Generate a single interrogation case. The scenario must be:
- A white-collar or corporate crime (theft, fraud, embezzlement, data leak, sabotage, insider trading)
${settingInstruction}
- Simple enough to explain in 3 sentences
- The suspect has a mostly true story with ONE specific lie
- The lie must be catchable through careful questioning — there should be a logical contradiction that emerges under pressure
${difficultyGuide}

Respond ONLY in this exact JSON format:

{
  "case_number": "a random 4-digit number",
  "setting": "where this takes place (company name and type)",
  "crime": "what happened in one sentence",
  "briefing": "3 sentence briefing the detective reads before starting. Written in second person. Direct. No fluff.",
  "detective_leads": ["Exactly 3 first-person detective leads written as inner monologue. One lead points toward the real weak spot (without revealing the lie). The other two are plausible red herrings — they sound suspicious but lead nowhere. Shuffle the order randomly. Example: 'He mentioned a software glitch caused the data loss... but the logs show the system was stable that day. I should press him on that.', 'The security guard said he saw someone near the server room at 2am. Could be worth digging into.', 'His colleague filed a complaint last month — maybe there is bad blood here.'"],
  "suspect_name": "a realistic full name",
  "suspect_gender": "male or female",
  "suspect_role": "their job title",
  "suspect_true_story": "what actually happened — the full truth including what they did",
  "suspect_cover_story": "what the suspect claims happened — their version",
  "the_lie": "the specific false claim in their cover story",
  "the_truth": "what actually happened instead of the lie",
  "the_contradiction": "how the lie can be caught — what detail doesn't add up",
  "stress_triggers": ["list of exactly ${clueCount} topics or questions that would make the suspect nervous"],
  "deflection_tactics": ["list of 3-4 ways the suspect tries to change the subject or avoid the topic"],
  "difficulty": "${difficulty}"
}

Make the contradiction discoverable but not obvious. The player should need ${difficulty === 'easy' ? '2-3' : difficulty === 'medium' ? '3-5' : difficulty === 'hard' ? '5-7' : '7-10'} good questions to find it.

IMPORTANT: All text fields (briefing, stress_triggers, deflection_tactics, suspect_true_story, suspect_cover_story, the_lie, the_truth, the_contradiction) MUST use the correct pronouns matching suspect_gender. If female, use she/her/hers. If male, use he/him/his. Never mix pronouns.

Generate one case now.`,
    }],
    responseFormat: { type: 'json_object' },
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  try {
    return JSON.parse(content || '{}');
  } catch {
    console.error('Failed to parse case generation response:', content);
    return {};
  }
}
