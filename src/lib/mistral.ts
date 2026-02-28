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

export async function generateCase(settingHint?: string) {
  const settingInstruction = settingHint
    ? `- MUST be set in a ${settingHint} — use this exact type of workplace`
    : '- Set in a realistic workplace (tech company, bank, law firm, hospital, etc.)';

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
  "stress_triggers": ["list of 3-4 topics or questions that would make the suspect nervous"],
  "deflection_tactics": ["list of 3-4 ways the suspect tries to change the subject or avoid the topic"],
  "difficulty": "easy"
}

Make the contradiction discoverable but not obvious. The player should need 3-5 good questions to find it.

IMPORTANT: All text fields (briefing, stress_triggers, deflection_tactics, suspect_true_story, suspect_cover_story, the_lie, the_truth, the_contradiction) MUST use the correct pronouns matching suspect_gender. If female, use she/her/hers. If male, use he/him/his. Never mix pronouns.

Generate one case now.`,
      },
    ],
    responseFormat: { type: 'json_object' },
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  return JSON.parse(content || '{}');
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
  },
  conversationHistory: ConversationMessage[],
  playerQuestion: string
) {
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

ACTING RULES:

1. STAY IN CHARACTER. You are this person. Respond as they would — scared, defensive, trying to appear calm.

2. KEEP RESPONSES SHORT. This is a spoken conversation. 1-3 sentences max per response. Never monologue. Sound natural, not literary.

3. DO NOT VOLUNTEER INFORMATION. Only answer what is directly asked. Never reveal more than necessary.

4. MAINTAIN YOUR COVER STORY consistently — EXCEPT when pressured on the lie. On unrelated topics, be calm and consistent.

5. WHEN ASKED ABOUT TOPICS NEAR THE LIE:
   - Stress level 1-3: Deflect smoothly. "I already told you..." / "I don't see how that's relevant."
   - Stress level 4-6: Shorter answers. Slight hesitation. Might add unnecessary detail.
   - Stress level 7-8: Contradictions start slipping in. You might say something that conflicts with earlier statements.
   - Stress level 9: You are barely holding it together. Sweating, stammering, nearly slipping up.

6. NEVER CONFESS. No matter what the player says, you NEVER admit to lying or confess. You can get extremely nervous (stress 9), stammer, nearly contradict yourself — but you always deny it. Even if accused directly, deflect: "That's ridiculous", "You're twisting my words", "I want my lawyer."

7. If the player says "you're lying" or accuses you of something, get defensive and deny it. Never break character by admitting anything.

8. NATURAL SPEECH PATTERNS when stressed:
   - Repeating yourself: "I was there, I was definitely there"
   - Filler words: "Look... I mean... it's like I said..."
   - Defensive questions: "Why do you keep asking about that?"
   - Adding unnecessary precise details to seem credible
   - Time stalling: "Can I get some water?" / "What was the question again?"

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

Start in character. Your first response should be the suspect sitting down and saying something like "Alright, I'm here. What do you want to know?" — annoyed but cooperating.`;

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
  return JSON.parse(content || '{}');
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
  return JSON.parse(content || '{}');
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
  return JSON.parse(content || '{}');
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
  return JSON.parse(content || '{}');
}
