import { AiError } from './contracts';

/** Catch observed schema-ceiling fragments; this is not a semantic solvability check. */
export function assertGeneratedContent(caseData: Record<string, unknown>): void {
  const contradiction = caseData.the_contradiction;
  if (typeof contradiction !== 'string') return; // The structured schema validates its type.
  if (contradiction.length === 500 && !/[.!?]["'”’)]?$/u.test(contradiction.trim())) {
    throw new AiError('INVALID_CASE_CONTENT', 'The generated contradiction appears unfinished. Start a new case attempt.');
  }
}
