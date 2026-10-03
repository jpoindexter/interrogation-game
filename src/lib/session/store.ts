import { randomBytes } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { GameSession } from './types';
import type { SessionRecord } from './repository-types';
import { getSessionRepository, sessionRepositoryKey } from './repository';
import { workspaceRecord, requireLocalSessionMutation } from './workspace';
import { createSessionRecord, type CreateSessionOptions } from './create-record';
export type { CreateSessionOptions } from './create-record';

interface RuntimeStore { records: Map<string, SessionRecord>; locks: Set<string> }
const runtime = globalThis as typeof globalThis & { __durableSessionStores?: Map<string, RuntimeStore> };
const stores = runtime.__durableSessionStores ??= new Map();
const SESSION_TTL = 60 * 60 * 1000;
function currentStore(): RuntimeStore {
  const key = sessionRepositoryKey();
  if (!stores.has(key)) stores.set(key, { records: new Map(), locks: new Set() });
  return stores.get(key)!;
}
export function getSessionRecord(id: string): SessionRecord | null {
  const scoped = workspaceRecord(id);
  if (scoped !== undefined) return scoped;
  if (typeof id !== 'string' || !/^[a-f0-9]{48}$/.test(id)) return null;
  const { records, locks } = currentStore();
  // An unlocked read must observe other processes before checking idle expiry.
  // While locked, keep this action's working snapshot until its atomic save.
  if (!locks.has(id)) {
    const record = getSessionRepository().load(id);
    if (!record) { records.delete(id); return null; }
    const cached = records.get(id);
    if (!cached || record.revision > cached.revision) cacheRecord(record);
  }
  return records.get(id) ?? null;
}
export function persistSession(id: string): void {
  requireLocalSessionMutation();
  const record = getSessionRecord(id);
  if (!record) throw new Error('Cannot persist missing session');
  record.revision += 1;
  try { getSessionRepository().save(record); } catch (error) { record.revision -= 1; throw error; }
}
function validateCreation(session: GameSession, options: CreateSessionOptions): void {
  if (!isDeepStrictEqual(session.caseData, options.caseData)
    || !isDeepStrictEqual(session.learnedTactics, options.learnedTactics ?? [])
    || session.totalPriorGames !== (options.totalPriorGames ?? 0)
    || session.timerMode !== (options.timerMode ?? 'countdown')) throw new Error('Reserved session already has different case data');
}
function cacheRecord(record: SessionRecord): void {
  const cached = currentStore().records.get(record.session.id);
  if (!cached) { currentStore().records.set(record.session.id, record); return; }
  Object.assign(cached.session, record.session);
  Object.assign(cached, { ...record, session: cached.session });
}
/** Materialize a reserved generation ID once; retries preserve its existing progress. */
export function createSessionAt(options: CreateSessionOptions): string {
  return createSessionFromRecord(createSessionRecord(options));
}

/** Save a complete initial record once, preserving already accepted recovery progress. */
export function createSessionFromRecord(initial: SessionRecord): string {
  requireLocalSessionMutation();
  const id = initial.session.id;
  if (!/^[a-f0-9]{48}$/.test(id)) throw new Error('Invalid reserved session ID');
  const repository = getSessionRepository();
  if (currentStore().locks.has(id) || !repository.acquire(id)) throw new Error('Reserved session is busy');
  try {
    let record = repository.load(id);
    if (record) {
      const { caseData, learnedTactics, totalPriorGames, timerMode } = initial.session;
      validateCreation(record.session, { sessionId: id, caseData, learnedTactics, totalPriorGames, timerMode });
      restoreInitialMetadata(record.session, initial.session);
      record.session.lastActivity = Date.now();
      record.revision++;
    } else record = structuredClone(initial);
    repository.save(record);
    cacheRecord(record);
    return id;
  } finally { repository.release(id); }
}
function restoreInitialMetadata(session: GameSession, initial: GameSession): void {
  if (initial.caseProvenance && !session.caseProvenance) session.caseProvenance = structuredClone(initial.caseProvenance);
  if (initial.gameplay && !session.gameplay) session.gameplay = structuredClone(initial.gameplay);
}
export function createSession(caseData: Record<string, unknown>, learnedTactics: string[] = [], totalPriorGames = 0,
  timerMode: 'countdown' | 'unlimited' = 'countdown'): string {
  return createSessionAt({ sessionId: randomBytes(24).toString('hex'), caseData, learnedTactics, totalPriorGames, timerMode });
}
export function getSession(id: string): GameSession | null {
  const scoped = workspaceRecord(id);
  if (scoped !== undefined) return scoped?.session ?? null;
  const record = getSessionRecord(id);
  if (!record) return null;
  if (Date.now() - record.session.lastActivity > SESSION_TTL && !currentStore().locks.has(id)) return null;
  record.session.lastActivity = Date.now();
  return record.session;
}
export function deleteSession(id: string): void {
  requireLocalSessionMutation();
  getSessionRepository().remove(id);
  currentStore().records.delete(id);
}
export function acquireSessionLock(id: string): boolean {
  requireLocalSessionMutation();
  const store = currentStore();
  if (store.locks.has(id) || !getSessionRepository().acquire(id)) return false;
  try {
    const disk = getSessionRepository().load(id);
    const cached = store.records.get(id);
    if (disk && cached && disk.revision > cached.revision) {
      Object.assign(cached.session, disk.session);
      Object.assign(cached, { ...disk, session: cached.session });
    } else if (disk && !cached) store.records.set(id, disk);
    store.locks.add(id);
    return true;
  } catch (error) { getSessionRepository().release(id); throw error; }
}
export function releaseSessionLock(id: string): void {
  requireLocalSessionMutation();
  try { if (currentStore().locks.has(id)) persistSession(id); }
  catch (error) {
    const disk = getSessionRepository().load(id);
    const cached = currentStore().records.get(id);
    if (disk && cached) { Object.assign(cached.session, disk.session); Object.assign(cached, { ...disk, session: cached.session }); }
    throw error;
  }
  finally { currentStore().locks.delete(id); getSessionRepository().release(id); }
}
