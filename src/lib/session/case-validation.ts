const FIELDS: Record<string, number> = {
  case_number: 20, setting: 200, crime: 500, briefing: 1000,
  suspect_name: 100, suspect_gender: 30, suspect_role: 200,
  suspect_true_story: 1000, suspect_cover_story: 1000,
  the_lie: 500, the_truth: 500, the_contradiction: 500, difficulty: 20,
};

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function validList(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 10
    && value.every(item => validText(item, max));
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return !!data && typeof data === 'object' && !Array.isArray(data);
}

export function validateCaseData(data: unknown): Record<string, unknown> | null {
  if (!isRecord(data)) return null;
  const value = data as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    if (!validText(value[key], max)) return null;
    clean[key] = value[key].trim();
  }
  if (!['easy', 'medium', 'hard', 'expert'].includes(String(clean.difficulty))) return null;
  if (clean.the_lie === clean.the_truth) return null;
  for (const key of ['stress_triggers', 'deflection_tactics']) {
    if (!validList(value[key], 300)) return null;
    clean[key] = value[key].map(item => item.trim());
  }
  return copyOptionalFields(value, clean) ? clean : null;
}

function copyOptionalFields(value: Record<string, unknown>, clean: Record<string, unknown>): boolean {
  for (const [key, max] of Object.entries({ objective: 200, verbal_tics: 300 })) {
    if (value[key] === undefined) continue;
    if (!validText(value[key], max)) return false;
    clean[key] = value[key].trim();
  }
  if (value.detective_leads !== undefined) {
    if (!validList(value.detective_leads, 500)) return false;
    clean.detective_leads = value.detective_leads.map(item => item.trim());
  }
  return true;
}
