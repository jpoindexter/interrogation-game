const text = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength });
const strings = (maxItems: number, maxLength: number) => ({ type: 'array', minItems: 1, maxItems, items: text(maxLength) });
export function objectSchema(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
export const SUSPECT_SCHEMA = objectSchema({
  spoken_response: text(2000), internal_state: text(1000),
  stress_level: { type: 'integer', minimum: 0, maximum: 9 },
  clue_unlocked: { type: ['string', 'null'], maxLength: 500 }, caught: { type: 'boolean', enum: [false] },
});
export const JUDGE_SCHEMA = objectSchema({ correct: { type: 'boolean' }, confession: text(2000), explanation: text(1000) });
export const CASE_SCHEMA = objectSchema({
  case_number: text(20), setting: text(200), crime: text(500), objective: text(200), briefing: text(1000),
  detective_leads: strings(5, 500), suspect_name: text(100), suspect_gender: text(30), suspect_role: text(200),
  suspect_true_story: text(1000), suspect_cover_story: text(1000), the_lie: text(500), the_truth: text(500),
  the_contradiction: text(500), stress_triggers: strings(10, 300), deflection_tactics: strings(10, 300),
  verbal_tics: text(300), difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
});
