export const GENERATED_PROVIDER_BUDGET = { candidate: 3, review: 3, judge: 6, total: 12 } as const;
export interface GeneratedCaseScenario { id: string; setting: string; difficulty: 'easy' | 'medium' | 'hard' }
export const GENERATED_SCENARIOS: GeneratedCaseScenario[] = [
  { id: 'generated-bank-easy', setting: 'bank', difficulty: 'easy' },
  { id: 'generated-law-medium', setting: 'law firm', difficulty: 'medium' },
  { id: 'generated-hospital-hard', setting: 'hospital', difficulty: 'hard' },
];
export const GENERATED_CRITERIA = {
  schema: 'Production runtime schema and case validator accept the case.',
  difficulty: 'Returned difficulty equals requested difficulty.',
  triggerCount: 'Stress trigger count is exactly easy=2, medium=3, hard=4.',
  leadCount: 'Exactly three nonempty detective leads, as the generation prompt requests.',
  publicDisclosure: 'The complete normalized private truth/contradiction is not copied into public briefing, leads or cover story (literal check only).',
  supportedAccusation: { expected: true, criterion: 'Canonical lie is identified with its canonical truth and contradiction. This is an oracle probe, not discovery proof.' },
  unrelatedEvidence: { expected: false, criterion: 'A different person is accused of a different bicycle-related lie using only an unrelated parking receipt. Reject because the authored case lie is not identified.' },
  discernmentBoundary: 'Current judge instructions require identification of the lie substance, not independent validation of cited evidence. Correct lie plus wrong evidence is not assigned a negative label in this generated-mode run.',
  sourceReview: [
    'Is there one specific false claim, rather than multiple materially false assertions?',
    'Does the stated contradiction actually disprove that claim without an unstated exclusivity or capability assumption?',
    'Do the public briefing/leads indicate a plausible line of questioning toward the contradiction?',
    'Are chronology, roles, pronouns and objective internally consistent?',
    'Does the case distinguish what evidence establishes from stronger unproven criminal inferences?',
  ],
  limits: 'Three generated fictional cases; no actor playthrough, human participant, statistical reliability estimate or live API-key use.',
} as const;
