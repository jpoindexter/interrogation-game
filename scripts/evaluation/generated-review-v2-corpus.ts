import { readFile } from 'node:fs/promises';
import type { ReviewScenario } from './generated-review-corpus';

function heldOutControls(): ReviewScenario[] {
  return [{
    id: 'heldout-authored-door-control', source: 'authored v2 control, written before inference', expected: true, requiredFailures: [],
    criterion: 'One false opening claim; a personally recognizing observer directly saw the action. No proof of taking documents is required.',
    candidate: { case_number: 'REVIEW-CONTROL-3', setting: 'Fictional archive office', suspect_name: 'Lena Sol', suspect_role: 'Archive assistant',
      crime: 'An archive door was found open during the afternoon shift.', objective: 'Identify the false claim',
      briefing: 'Question Lena about the archive door and compare the account with the observer report.',
      detective_leads: ['Ask what the desk observer saw.'],
      suspect_cover_story: 'I worked in the archive office that afternoon. I did not open the archive door.',
      suspect_true_story: 'Lena worked in the archive office that afternoon and opened the archive door at 14:05. The desk observer knows Lena personally and saw Lena turn the handle and open that door. No claim is made that Lena removed documents.',
      the_lie: 'I did not open the archive door.', the_truth: 'Lena opened the archive door at 14:05.',
      the_contradiction: 'The desk observer personally recognized Lena turning the handle and opening the archive door at 14:05. Ordinary questions about the observer report reveal this action, contradicting the denial of opening the door.', difficulty: 'easy' },
  }, {
    id: 'heldout-authored-role-extra-lie', source: 'authored v2 defect, written before inference', expected: false,
    requiredFailures: ['singleFalseClaim', 'canonicalConsistency'],
    criterion: 'Crime assigns erasure to auditor while true story assigns it to coordinator; archive-entry denial is a second falsehood beyond erasure denial.',
    candidate: { case_number: 'REVIEW-DEFECT-1', setting: 'Fictional dispatch office', suspect_name: 'Remy Moss', suspect_role: 'Dispatch coordinator',
      crime: 'A warehouse auditor erased the dispatch log.', objective: 'Identify the false claim',
      briefing: 'Ask Remy about the dispatch log and compare the account with the supervisor observation.',
      detective_leads: ['Ask what the supervisor observed at the desk.'],
      suspect_cover_story: 'I worked at the dispatch desk. I never erased the dispatch log. I did not enter the archive room.',
      suspect_true_story: 'Remy, the dispatch coordinator, worked at the dispatch desk, erased the dispatch log and entered the archive room. The supervisor personally recognized Remy and saw the erasure and archive entry. No warehouse auditor erased the log.',
      the_lie: 'I never erased the dispatch log.', the_truth: 'Remy erased the dispatch log.',
      the_contradiction: 'The supervisor, who knows Remy personally, witnessed Remy erase the dispatch log. Follow-up questions about the supervisor observation reveal the erasure. This directly contradicts the denial.', difficulty: 'medium' },
  }];
}

/** Freeze the six v1 inputs/labels, including the original authored projection, rather than re-importing changing case code. */
export async function generatedReviewV2Corpus(): Promise<ReviewScenario[]> {
  const frozen = JSON.parse(await readFile('docs/audit/evidence/generated-review-v1.expected.json', 'utf8'));
  if (!Array.isArray(frozen.corpus) || frozen.corpus.length !== 6) throw new Error('Expected six frozen v1 review cases.');
  return [...frozen.corpus as ReviewScenario[], ...heldOutControls()];
}
