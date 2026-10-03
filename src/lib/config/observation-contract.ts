/** A past request result, never a promise that the next request will work. */
export const OBSERVATION_MAX_AGE_MS = 5 * 60 * 1000;
export type ProviderOperation = 'case' | 'case-review' | 'suspect' | 'judge' | 'debrief' | 'speech' | 'transcription';
export interface ProviderObservation {
  status: 'succeeded' | 'authentication_failed' | 'unavailable' | 'rate_limited' | 'failed';
  observedAt: string;
  operation: ProviderOperation;
  stale: boolean;
}
