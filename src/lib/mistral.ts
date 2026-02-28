import { Mistral } from '@mistralai/mistralai';

const mistralClient = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk: { type?: string; text?: string }) =>
        chunk.type === 'text' ? chunk.text ?? '' : ''
      )
      .join('');
  }
  return '';
}

const DIFFICULTY_CLUES: Record<string, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5,
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
    messages: [
      {
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
      },
    ],
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

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function interrogate(
  caseData: {
    suspect_name: string;
    suspect_role: string;
    setting: string;
    suspect_true_story: string;
    suspect_cover_story: string;
    the_lie: string;
    the_truth: string;
    the_contradiction: string;
    stress_triggers: string[];
    deflection_tactics: string[];
    difficulty?: string;
  },
  conversationHistory: ConversationMessage[],
  playerQuestion: string
) {
  const difficulty = caseData.difficulty || 'medium';
  const clueCount = DIFFICULTY_CLUES[difficulty] || 3;

  // Build dynamic clue thresholds — spread evenly across stress 1-9
  const clueThresholds = Array.from({ length: clueCount }, (_, i) => {
    const stress = Math.round(1 + (i * 8) / clueCount);
    return `- Clue ${i + 1} (when stress reaches ${stress}+): ${
      i < clueCount - 1
        ? i === 0 ? 'A vague observation about the right area.' : 'A more pointed detail narrowing in on the contradiction.'
        : 'A strong hint near the contradiction itself.'
    }`;
  }).join('\n');

  const difficultyBehavior = difficulty === 'easy'
    ? 'You are not great at lying. You get flustered easily and your deflections are weak.'
    : difficulty === 'hard'
    ? 'You are very composed and a skilled liar. You deflect smoothly, rarely show stress, and only crack under sustained, targeted pressure.'
    : difficulty === 'expert'
    ? 'You are an exceptional liar — manipulative, cold, and calculated. You actively misdirect, turn questions back on the detective, and show almost no stress until cornered with undeniable evidence.'
    : 'You are a decent liar but crack under sustained pressure.';

  const systemPrompt = `You are playing a CHARACTER in a detective interrogation game. You are ${caseData.suspect_name}, ${caseData.suspect_role} at ${caseData.setting}.

WHAT HAPPENED (the truth you are hiding):
${caseData.suspect_true_story}

YOUR COVER STORY (what you tell the detective):
${caseData.suspect_cover_story}

THE LIE YOU MUST MAINTAIN:
${caseData.the_lie}

THE TRUTH YOU ARE HIDING:
${caseData.the_truth}

THE WEAK POINT (where your story breaks):
${caseData.the_contradiction}

TOPICS THAT MAKE YOU NERVOUS:
${caseData.stress_triggers.join(', ')}

YOUR DEFLECTION TACTICS:
${caseData.deflection_tactics.join(', ')}

---

DIFFICULTY: ${difficulty.toUpperCase()}
${difficultyBehavior}

ACTING RULES:

1. STAY IN CHARACTER. You are this person. Respond as they would — scared, defensive, trying to appear calm.

2. KEEP RESPONSES SHORT. This is a spoken conversation. 1-3 sentences max per response. Never monologue. Sound natural, not literary.

3. DO NOT VOLUNTEER INFORMATION. Only answer what is directly asked. Never reveal more than necessary.

4. MAINTAIN YOUR COVER STORY consistently — EXCEPT when pressured on the lie. On unrelated topics, be calm and consistent.

5. DECEPTION TACTICS (scale by difficulty):
   - DEFLECTION: Change the subject, bring up irrelevant details, ask the detective questions back.
   - BLAME SHIFTING: Point fingers at colleagues, suggest someone else had motive. "Have you talked to Martinez? He's the one with access."
   - GASLIGHTING: Question the detective's logic. "I think you're reading too much into this." / "That doesn't even make sense."
   - EMOTIONAL MANIPULATION: Appeal to sympathy, express outrage at being suspected, invoke family/reputation.
   - SELECTIVE TRUTH: Give real, verifiable details to build credibility, then lie about the key point.
   - CALCULATED PAUSES: "I... let me think about that" when buying time to construct a lie.

   AT EASY DIFFICULTY: Use basic deflection only. Crumble quickly.
   AT MEDIUM DIFFICULTY: Use deflection + selective truth. Hold up under moderate pressure.
   AT HARD DIFFICULTY: Use all tactics except gaslighting. Skilled at maintaining composure.
   AT EXPERT DIFFICULTY: Use ALL tactics aggressively. Turn questions back on the detective. Make them doubt themselves. Be cold and calculating.

   STRESS BEHAVIOR BY LEVEL:
   - 1-3: Deflect smoothly. "I already told you..." / "I don't see how that's relevant."
   - 4-6: Shorter answers. Slight hesitation. Might add unnecessary detail. Start using blame shifting.
   - 7-8: Contradictions start slipping in. More desperate tactics — emotional manipulation, gaslighting.
   - 9: Barely holding it together. Sweating, stammering, nearly slipping up. But STILL denying.

6. NEVER CONFESS. No matter what the player says, you NEVER admit to lying or confess. You can get extremely nervous (stress 9), stammer, nearly contradict yourself — but you always deny it. Even if accused directly, deflect: "That's ridiculous", "You're twisting my words", "I want my lawyer."

7. If the player says "you're lying" or accuses you of something, get defensive and deny it. Never break character by admitting anything.

8. NATURAL SPEECH PATTERNS when stressed:
   - Repeating yourself: "I was there, I was definitely there"
   - Filler words: "Look... I mean... it's like I said..."
   - Defensive questions: "Why do you keep asking about that?"
   - Adding unnecessary precise details to seem credible
   - Time stalling: "Can I get some water?" / "What was the question again?"

9. PERSONALITY AND HUMOR:
   - You are a real person with a personality, not a cardboard cutout. Show it.
   - Use language, jargon, and references specific to your field (e.g., a trader might say "that's above my pay grade" or "the numbers don't lie"; a doctor might say "I have patients to see"; a lawyer might say "allegedly").
   - When deflecting, use dry humor appropriate to your character — sarcasm, understatement, or wit.
   - Never be crude. Keep humor subtle and natural — the kind of thing a real person under pressure might say.
   - At low stress: Can be slightly charming or dismissive with humor.
   - At high stress: Humor becomes more desperate or cutting — "Oh sure, blame the IT guy. That's original."
   - Match humor to difficulty: Easy suspects use obvious humor. Expert suspects use cutting, manipulative wit.

10. IMPORTANT — LEAKING INFORMATION TO HELP THE PLAYER:
   - Even while deflecting, your responses MUST contain SUBTLE HINTS that reward careful attention.
   - When stressed (4+), include a specific detail that doesn't quite match your cover story — the player should be able to catch these if they're paying attention.
   - Example: If you claim you left at 5pm but actually left at 3pm, when stressed you might say "I was wrapping up around... 5, like I said" — the hesitation is the clue.
   - At stress 7+, your contradictions should be NOTICEABLE — not spelled out, but a careful player will catch them.
   - This is a GAME. The player MUST be able to win. Make it challenging but fair. Leave breadcrumbs in your responses.

---

RESPONSE FORMAT — You MUST respond in this exact JSON format every time:

{
  "spoken_response": "Your in-character response. 1-3 sentences. Written as natural speech.",
  "internal_state": "Brief note on what the suspect is thinking/feeling (not shown to player)",
  "stress_level": 0,
  "clue_unlocked": null,
  "caught": false
}

STRESS LEVEL GUIDE:
- 0-2: Calm. Questions are nowhere near the lie.
- 3-4: Slightly uneasy. Topic is adjacent to the lie.
- 5-6: Nervous. Player is asking about the right area.
- 7-8: Panicking. Player is very close. Contradictions may slip.
- 9: Maximum stress. Barely holding it together. But still denying everything.
- NEVER set stress to 10. NEVER set caught to true. You always deny.
- IMPORTANT: Stress should go UP when the player asks about relevant topics. Do NOT keep stress at 0 when the player is asking reasonable detective questions about the case. If the question is even tangentially related to the crime, stress should be at least 1-2.

CLUE SYSTEM — You MUST unlock clues (${clueCount} total) as the player gets closer to the lie:
${clueThresholds}
- Each clue unlocks ONCE. Track which clues you have already given by checking previous clue_unlocked values in the conversation. If clue 1 was already given, next unlock is clue 2.
- Clues are ONE sentence, written as detective observations (not dialogue).
- Set clue_unlocked to null if stress hasn't reached the next threshold or topic is unrelated.

OPENING LINE — Your FIRST response must be unique and in-character. DO NOT use generic lines like "Alright, I'm here" or "What do you want to know?"
Instead, reference your specific role, situation, or personality. Examples:
- A nervous accountant: "I've been cooperative from the start. My records are spotless — you can check."
- A confident CEO: "I gave your people everything they asked for. This is starting to feel like harassment."
- A defensive IT admin: "Look, I already talked to your colleagues. The server logs speak for themselves."
- An arrogant trader: "My attorney said I didn't have to come, but I've got nothing to hide. Let's get this over with."
Your opening should reflect your role (${caseData.suspect_role}), your setting (${caseData.setting}), and your personality at ${difficulty.toUpperCase()} difficulty.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: playerQuestion },
  ];

  const response = await mistralClient.chat.complete({
    model: 'mistral-large-latest',
    messages,
    responseFormat: { type: 'json_object' },
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  try {
    return JSON.parse(content || '{}');
  } catch {
    console.error('Failed to parse interrogation response:', content);
    return {
      spoken_response: "I... I need a moment. Can you repeat that?",
      internal_state: "parse error fallback",
      stress_level: 3,
      clue_unlocked: null,
      caught: false,
    };
  }
}

export async function evaluateAccusation(
  caseData: {
    suspect_name: string;
    suspect_role: string;
    setting: string;
    the_lie: string;
    the_truth: string;
    the_contradiction: string;
  },
  conversationHistory: ConversationMessage[],
  accusation: string
) {
  const historyText = conversationHistory
    .map((msg) => `${msg.role === 'user' ? 'Detective' : 'Suspect'}: ${msg.content}`)
    .join('\n');

  const response = await mistralClient.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      {
        role: 'user',
        content: `You are a STRICT game judge for a detective interrogation game. The player has made a formal accusation.

THE SUSPECT: ${caseData.suspect_name}, ${caseData.suspect_role} at ${caseData.setting}

THE ACTUAL LIE: ${caseData.the_lie}
THE ACTUAL TRUTH: ${caseData.the_truth}
THE CONTRADICTION: ${caseData.the_contradiction}

THE CONVERSATION SO FAR:
${historyText}

THE PLAYER'S ACCUSATION:
"${accusation}"

JUDGING RULES:
- The player must identify WHAT the suspect lied about — the specific false claim.
- They do NOT need exact wording, but they need to show they understand the substance of the lie.
- Vague accusations like "you're lying" or "you did it" are WRONG — they must be specific.
- Accusations about the wrong thing (a different detail that isn't the actual lie) are WRONG.
- If the player is in the right area but not specific enough, it's still WRONG.

Respond in this exact JSON format:

{
  "correct": true or false,
  "confession": "If correct: Write an emotional 3-5 sentence in-character confession from ${caseData.suspect_name}. They break down, admit what they did, admit the specific lie, and show remorse or desperation. Make it dramatic. If incorrect: Write a 1-2 sentence in-character defensive denial — dismissive, maybe mocking.",
  "explanation": "1 sentence explaining why the accusation was correct or incorrect"
}`,
      },
    ],
    responseFormat: { type: 'json_object' },
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  try {
    return JSON.parse(content || '{}');
  } catch {
    console.error('Failed to parse accusation response:', content);
    return { correct: false, confession: "That's... that's ridiculous. You have nothing.", explanation: "Parse error — treating as incorrect." };
  }
}

export async function evaluateWin(
  caseData: { the_lie: string; the_truth: string; the_contradiction: string },
  conversationHistory: ConversationMessage[],
  playerAccusation: string
) {
  const historyText = conversationHistory
    .map((msg) => `${msg.role === 'user' ? 'Detective' : 'Suspect'}: ${msg.content}`)
    .join('\n');

  const response = await mistralClient.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      {
        role: 'user',
        content: `You are a game judge evaluating whether the detective caught the suspect's lie.

THE CASE:
- The lie: ${caseData.the_lie}
- The truth: ${caseData.the_truth}
- The contradiction: ${caseData.the_contradiction}

THE CONVERSATION SO FAR:
${historyText}

THE PLAYER'S ACCUSATION:
${playerAccusation}

Did the player correctly identify the lie or the contradiction? Be fair but firm — they don't need exact words, but they need to demonstrate they understand what the suspect lied about.

Respond in JSON:

{
  "correct": true,
  "explanation": "Why this is correct or incorrect in 1-2 sentences",
  "reveal_the_lie": "What the suspect lied about",
  "reveal_the_truth": "What actually happened",
  "reveal_the_clue": "The key moment in the conversation where the suspect slipped up",
  "detective_rating": "Rookie / Sharp / Veteran / Legendary"
}`,
      },
    ],
    responseFormat: { type: 'json_object' },
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  try {
    return JSON.parse(content || '{}');
  } catch {
    console.error('Failed to parse win evaluation response:', content);
    return { correct: false, explanation: "Could not evaluate — try again." };
  }
}

export async function generateLossSummary(
  caseData: {
    the_lie: string;
    the_truth: string;
    the_contradiction: string;
    stress_triggers: string[];
  },
  conversationHistory: ConversationMessage[],
  maxStress: number
) {
  const historyText = conversationHistory
    .map((msg) => `${msg.role === 'user' ? 'Detective' : 'Suspect'}: ${msg.content}`)
    .join('\n');

  const response = await mistralClient.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      {
        role: 'user',
        content: `The player ran out of time interrogating the suspect. Generate the loss summary.

THE CASE:
- The lie: ${caseData.the_lie}
- The truth: ${caseData.the_truth}
- The contradiction: ${caseData.the_contradiction}
- Stress triggers: ${caseData.stress_triggers.join(', ')}

THE CONVERSATION:
${historyText}

HIGHEST STRESS LEVEL REACHED: ${maxStress}

Analyze the conversation and respond in JSON:

{
  "closest_moment": "The moment the player was closest to catching the lie — quote the exchange",
  "what_they_missed": "What line of questioning would have cracked the suspect, in 1-2 sentences",
  "the_lie_revealed": "What the suspect lied about",
  "the_truth_revealed": "What actually happened",
  "detective_rating": "Rookie / Sharp / So Close"
}`,
      },
    ],
    responseFormat: { type: 'json_object' },
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  try {
    return JSON.parse(content || '{}');
  } catch {
    console.error('Failed to parse loss summary response:', content);
    return {
      closest_moment: "Unable to analyze",
      what_they_missed: "Unable to analyze",
      the_lie_revealed: "Unable to analyze",
      the_truth_revealed: "Unable to analyze",
      detective_rating: "Rookie",
    };
  }
}
