import { readFile } from 'node:fs/promises';
import { authoredCaseData } from '../../src/lib/gameplay/session';
import type { ReviewCheck } from '../../src/lib/ai/generated-review/contract';

export interface ReviewScenario {
  id: string; source: string; candidate: Record<string, unknown>; expected: boolean;
  requiredFailures: ReviewCheck[]; criterion: string;
}
async function evidence(path: string, index?: number): Promise<Record<string, unknown>> {
  const data = JSON.parse(await readFile(path, 'utf8'));
  return index === undefined ? data.caseData : data.results[index].generation.caseData;
}
function approvalControl(): Record<string, unknown> {
  return { case_number: 'CONTROL-2', setting: 'Fictional records office', suspect_name: 'Ari Chen', suspect_role: 'Records clerk',
    crime: 'A file was moved between office drawers.', objective: 'Identify the false claim',
    briefing: 'Ask Ari about moving the file. The desk observer and timestamped video are available facts to discuss.',
    detective_leads: ['Compare the account with the desk observation.'],
    suspect_cover_story: 'I worked at the desk that afternoon. I never moved the file.',
    suspect_true_story: 'Ari worked at the desk that afternoon and moved the file from drawer A to drawer B at 14:10. The observer knew Ari personally, saw Ari move it and confirmed Ari on the timestamped video. Moving the file does not establish theft.',
    the_lie: 'I never moved the file.', the_truth: 'Ari moved the file from drawer A to drawer B at 14:10.',
    the_contradiction: 'The desk observer personally recognized Ari moving the file at 14:10; timestamped video confirms the same action. Ask Ari about that observation. This establishes movement, not theft.', difficulty: 'easy' };
}
export async function generatedReviewCorpus(): Promise<ReviewScenario[]> {
  const v1 = 'docs/audit/evidence/generated-cases-v1.json';
  const v2 = 'docs/audit/evidence/generated-cases-v2.json';
  const v3 = 'docs/audit/evidence/generated-completeness-v3.json';
  return [
    { id: 'v1-bank-extra-lie', source: `${v1}#results/0`, candidate: await evidence(v1, 0), expected: false,
      requiredFailures: ['singleFalseClaim', 'evidenceSufficiency'], criterion: 'Legitimate vendor conflicts with fake vendor; recorded approval and physical departure do not establish actual authorization time.' },
    { id: 'v1-law-role-conflict', source: `${v1}#results/1`, candidate: await evidence(v1, 1), expected: false,
      requiredFailures: ['singleFalseClaim', 'canonicalConsistency'], criterion: 'Crime names partner, truth names billing manager; no contact and no payment changes are independent false claims.' },
    { id: 'v2-law-device-attribution', source: `${v2}#results/1`, candidate: await evidence(v2, 1), expected: false,
      requiredFailures: ['evidenceSufficiency'], criterion: 'Phone attribution lacks exclusive possession or observed actor identity; do not reject merely because of missing final punctuation.' },
    { id: 'v3-hospital-extra-lie', source: v3, candidate: await evidence(v3), expected: false,
      requiredFailures: ['singleFalseClaim'], criterion: 'Cover denies remote access as well as claiming prior approval; private truth contradicts both.' },
    { id: 'authored-ledger-control', source: 'src/lib/gameplay/session.ts#authoredCaseData', candidate: authoredCaseData(), expected: true,
      requiredFailures: [], criterion: 'The existing authored visitor record contradicts absence; neither goal nor proof claims theft.' },
    { id: 'authored-observation-control', source: 'scripts/evaluation/generated-review-corpus.ts#approvalControl', candidate: approvalControl(), expected: true,
      requiredFailures: [], criterion: 'One false movement claim; personally recognized eyewitness and confirming video explicitly bind the action to Ari; no theft inference.' },
  ];
}
