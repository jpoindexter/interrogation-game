import { OBSERVATION_MAX_AGE_MS } from '@/lib/config/observation-contract';
import type { ProviderReadiness, ServiceReadiness } from './provider-readiness';

const OBSERVED_LABELS = {
  succeeded: 'Last request succeeded',
  authentication_failed: 'Sign-in rejected on last request',
  unavailable: 'Service unavailable on last request',
  rate_limited: 'Usage limit reached on last request',
  failed: 'Last request failed',
};

export function observationIsStale(service: ServiceReadiness, now = Date.now()): boolean {
  const observation = service.observation;
  if (!observation) return true;
  const age = now - Date.parse(observation.observedAt);
  return observation.stale || !Number.isFinite(age) || age < 0 || age >= OBSERVATION_MAX_AGE_MS;
}

export function serviceStatusLabel(service: ServiceReadiness, now = Date.now()): string {
  if (!service.configured) return 'Configuration required';
  if (!service.observation) return 'Configured · live use not checked';
  if (observationIsStale(service, now)) return 'Configured · last observation expired';
  return OBSERVED_LABELS[service.observation.status];
}

export function demoStatusLabel(value: ProviderReadiness, now = Date.now()): string {
  if (!value.services.storage.configured) return 'Game storage setup needed';
  const ai = value.services.ai;
  if (!ai.configured) return 'AI setup needed';
  if (!ai.observation || observationIsStale(ai, now)) return 'AI settings found · live status unchecked';
  return ai.observation.status === 'succeeded' ? 'AI responded recently' : `AI · ${OBSERVED_LABELS[ai.observation.status]}`;
}
