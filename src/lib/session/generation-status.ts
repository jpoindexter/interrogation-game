import { GenerationStore, generationDirectory, GENERATION_TTL } from './generation-store';

/** A request capability permits progress only; never expose the private checkpoint. */
export function readGenerationStatus(requestId: string) {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) return null;
  const record = new GenerationStore(generationDirectory(), requestId).load();
  if (!record || Date.now() - record.createdAt >= GENERATION_TTL) return null;
  const fallback = record.state === 'complete' && record.response?.status === 200 ? 'ready' : 'preparing';
  return { phase: record.phase ?? fallback, startedAt: record.createdAt, state: record.state };
}
