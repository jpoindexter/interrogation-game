const PUBLIC_FIELDS = ['case_number', 'setting', 'crime', 'objective', 'briefing', 'detective_leads',
  'mode', 'playMode', 'requiredClues', 'portraitId', 'suspect_name', 'suspect_gender', 'suspect_role',
  'suspect_cover_story', 'difficulty', 'verbal_tics'] as const;

/** New internal case fields stay private unless intentionally added to this projection. */
export function sanitizeCaseForClient(caseData: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(PUBLIC_FIELDS.filter(key => key in caseData).map(key => [key, caseData[key]]));
}
