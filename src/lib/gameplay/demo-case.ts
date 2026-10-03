import type { GameplayCase } from './types';

/** Authored fictional candidate; graph-tested, awaiting player/browser review. */
export const LEDGER_DEMO_CASE: GameplayCase = {
  id: 'ledger-after-hours',
  title: 'The after-hours ledger',
  briefing: 'A ledger disappeared from a fictional trading office. Ask Casey Vale about the evening, compare the available records, and identify the specific false claim.',
  opening: 'I left at six and did not return to the building that evening.',
  accusationClaimId: 'departure',
  claims: [{
    id: 'departure', assertion: 'I left at six and did not return to the building that evening.',
    alternateAssertions: ['I was out of the building from six onwards.', 'Once I left at 18:00, I never came back that night.'],
    truth: 'Casey returned to the building at 18:42. The visitor record establishes presence, not who took the ledger.',
  }],
  exhibits: [
    { id: 'visitor-log', title: 'Visitor record · 18:42', kind: 'document', initiallyDisclosed: true,
      text: 'The desk visitor record has a signed entry: Casey Vale, arrival 18:42, that same evening.' },
    { id: 'badge-record', title: 'Badge record · 19:10', kind: 'timeline', initiallyDisclosed: true,
      text: 'A badge assigned to Morgan Reed opened the stairwell at 19:10. This record does not name Casey Vale.' },
    { id: 'sealed-note', title: 'Sealed case note', kind: 'document', initiallyDisclosed: false,
      text: 'Internal case note: the ledger was later found behind the filing cabinet.' },
  ],
  contradictions: [{
    id: 'return-after-six', claimId: 'departure', exhibitId: 'visitor-log',
    explanation: 'The statement says there was no return after six, but the visitor record names Casey arriving at 18:42. These accounts conflict about returning to the building.',
  }],
};
