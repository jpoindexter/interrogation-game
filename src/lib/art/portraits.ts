/** Existing fictional character art. Legacy filename suffixes are not identity labels. */
export const PORTRAITS = [
  { id: '02-f', wardrobe: 'Navy blazer and cream blouse', agePresentation: 'adult', roles: ['office', 'leadership'] },
  { id: '03-m', wardrobe: 'Black suit and red tie', agePresentation: 'older adult', roles: ['leadership'] },
  { id: '04-f', wardrobe: 'White coat and teal shirt', agePresentation: 'adult', roles: ['clinical', 'laboratory'] },
  { id: '05-m', wardrobe: 'Pinstripe suit and burgundy tie', agePresentation: 'adult', roles: ['legal', 'office'] },
  { id: '06-f', wardrobe: 'Charcoal blazer and blue blouse', agePresentation: 'adult', roles: ['office', 'analysis'] },
  { id: '07-m', wardrobe: 'Dark hoodie and jacket', agePresentation: 'adult', roles: ['technical', 'casual'] },
  { id: '08-f', wardrobe: 'Purple blazer and black top', agePresentation: 'older adult', roles: ['leadership', 'office'] },
  { id: '09-m', wardrobe: 'Tweed jacket and tie', agePresentation: 'adult', roles: ['analysis', 'office'] },
  { id: '10-f', wardrobe: 'Black blazer and white top', agePresentation: 'adult', roles: ['office', 'legal'] },
  { id: '11-m', wardrobe: 'Dark jacket and open collar', agePresentation: 'adult', roles: ['office', 'security'] },
  { id: '12-m', wardrobe: 'Green jacket and cream turtleneck', agePresentation: 'older adult', roles: ['academic'] },
] as const;
export type PortraitId = typeof PORTRAITS[number]['id'];
export const AUTHORED_PORTRAIT: PortraitId = '11-m';
export const DEFAULT_PORTRAIT: PortraitId = '11-m';

export function isPortraitId(value: unknown): value is PortraitId {
  return PORTRAITS.some(portrait => portrait.id === value);
}
export function portraitPath(value: unknown): string {
  const id = isPortraitId(value) ? value : DEFAULT_PORTRAIT;
  return `/suspects/suspect-${id}.png`;
}

const ROLE_CASTING: { pattern: RegExp; female: PortraitId; other: PortraitId }[] = [
  { pattern: /doctor|physician|nurse|surgeon|clinician|laboratory|lab technician/i, female: '04-f', other: '11-m' },
  { pattern: /professor|lecturer|academic/i, female: '08-f', other: '12-m' },
  { pattern: /engineer|developer|programmer|technician|founder/i, female: '02-f', other: '07-m' },
  { pattern: /lawyer|attorney|counsel|solicitor/i, female: '10-f', other: '05-m' },
  { pattern: /accountant|auditor|analyst|bookkeep/i, female: '06-f', other: '09-m' },
  { pattern: /human resources|hr director/i, female: '08-f', other: '03-m' },
  { pattern: /chief|ceo|executive|director|president/i, female: '02-f', other: '03-m' },
];

/** Cast once during case creation, then persist the chosen ID through every view. */
export function selectPortrait({ role, gender }: { role: string; gender?: string }): PortraitId {
  const rule = ROLE_CASTING.find(candidate => candidate.pattern.test(role));
  const presentation = gender?.toLowerCase() === 'female' ? 'female' : 'other';
  if (rule) return rule[presentation];
  return presentation === 'female' ? '02-f' : DEFAULT_PORTRAIT;
}
