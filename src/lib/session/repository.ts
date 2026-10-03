import { resolve, join, dirname } from 'node:path';
import { LocalSessionRepository } from './local-repository';
import type { SessionRepository } from './repository-types';

const runtime = globalThis as typeof globalThis & { __sessionRepositories?: Map<string, SessionRepository> };
const repositories = runtime.__sessionRepositories ??= new Map();
export function sessionRepositoryKey(): string {
  if (process.env.VERCEL || (process.env.SESSION_STORAGE && process.env.SESSION_STORAGE !== 'local')) {
    throw new Error('Hosted durable session storage is not configured; run this demo locally');
  }
  return process.env.INTERROGATION_DATA_DIR
    ? resolve(process.env.INTERROGATION_DATA_DIR, 'sessions')
    : join(process.cwd(), '.local', 'sessions');
}
export function getSessionRepository(): SessionRepository {
  const key = sessionRepositoryKey();
  if (!repositories.has(key)) repositories.set(key, new LocalSessionRepository(dirname(key)));
  return repositories.get(key)!;
}
