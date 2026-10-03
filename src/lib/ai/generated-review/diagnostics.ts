import { resolve } from 'node:path';
import { writePrivateFile } from '../../session/private-files';
import { REVIEW_VERSION } from './contract';
import type { QuoteFailure, ReviewEvidenceError } from './quotes';

/** One replaceable private record, never returned through HTTP or mixed into playable cases. */
export function recordReviewFailure(error: ReviewEvidenceError): void {
  recordFailures(error.code, error.failures);
}
export function recordFailures(code: string, failures: QuoteFailure[]): void {
  const bounded = failures.slice(0, 4).map(failure => ({ path: failure.path,
    quote: failure.quote.slice(0, 600), quoteTruncated: failure.quote.length > 600,
    allowedSources: Object.fromEntries(Object.entries(failure.allowedSources).slice(0, 4)),
    allowedSourceCount: Object.keys(failure.allowedSources).length }));
  const path = resolve(process.env.INTERROGATION_DATA_DIR || '.local', 'diagnostics', 'last-review-quote-failure.json');
  try {
    writePrivateFile(path, { version: 1, reviewVersion: REVIEW_VERSION, recordedAt: new Date().toISOString(),
      code, failureCount: failures.length, failures: bounded });
  } catch {
    // Diagnostics are best effort; a write failure must never admit a rejected case or expose story data.
  }
}
