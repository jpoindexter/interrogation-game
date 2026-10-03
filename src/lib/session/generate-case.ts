import { normalizeGenderHint } from '../character-identity';
import type { AiProvenance } from '../ai/contracts';
import type { GenerationContext } from './generation-requests';
import type { NextRequest } from 'next/server';
import { generateCase } from '../game-ai';
import { selectPortrait, AUTHORED_PORTRAIT } from '../art/portraits';
import { validateCaseData, validateDifficulty } from '../sanitize';
import { sanitizeCaseForClient } from './public-case';
import { createSessionFromRecord, getSession } from './store';
import { createSessionRecord } from './create-record';
import type { SessionRecord } from './repository-types';
import { restoreCaseCheckpoint, type CaseCheckpoint } from './case-checkpoint';
export type { CaseCheckpoint } from './case-checkpoint';
import { authoredCaseData, attachAuthoredGameplay, gameplayProjection } from '../gameplay/session';
import { retrieveLearnedTactics } from './learning';

const SETTINGS = new Set(['tech startup', 'bank', 'law firm', 'hospital', 'trading floor',
  'police station', 'server room', 'startup', 'corporate office', 'hospital or medical facility',
  'bank or financial trading firm', 'tech company', 'police precinct']);
export interface GenerationOptions {
  setting?: string;
  difficulty: string;
  authored: boolean;
  playMode: 'challenge' | 'relaxed' | 'endurance';
  timerMode: 'countdown' | 'unlimited';
}

function parseSetting(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !SETTINGS.has(value.toLowerCase())) throw new Error('Choose a supported setting.');
  return value.toLowerCase();
}

function modeOptions(body: Record<string, unknown>) {
  const mode = body.playMode ?? (body.timerMode === 'unlimited' ? 'relaxed' : 'challenge');
  if (!['challenge', 'relaxed', 'endurance'].includes(String(mode))) throw new Error('Choose a supported play mode.');
  const timerMode = mode === 'challenge' ? 'countdown' as const : 'unlimited' as const;
  if (body.timerMode !== undefined && body.timerMode !== timerMode) throw new Error('The timer and play mode do not match.');
  return { playMode: mode as GenerationOptions['playMode'], timerMode };
}

export function parseGenerationOptions(body: Record<string, unknown>): GenerationOptions {
  const setting = parseSetting(body.setting);
  const difficulty = body.difficulty === undefined ? 'medium' : validateDifficulty(body.difficulty);
  if (!difficulty) throw new Error('Choose a supported difficulty.');
  if (body.mode !== undefined && body.mode !== 'redteam') throw new Error('Choose a supported case mode.');
  return { setting, difficulty: body.mode === 'redteam' ? 'easy' : difficulty,
    authored: body.mode === 'redteam', ...modeOptions(body) };
}

async function prepareCase(options: GenerationOptions, request: Pick<NextRequest, 'signal'>, context: GenerationContext): Promise<CaseCheckpoint> {
  const { setting, difficulty, authored } = options;
  const raw = authored ? authoredCaseData() : await generateCase(setting, difficulty, { signal: request.signal, onProgress: context.reportProgress });
  const data = validateCaseData(raw);
  if (!data || data.difficulty !== difficulty) throw new Error('Generated case failed validation.');
  const { learnedTactics, totalPriorGames } = await retrieveLearnedTactics({ request, setting, difficulty });
  request.signal.throwIfAborted();
  data.playMode = options.playMode;
  // Canonicalize only new cases. Saved checkpoints retain their portrait and voice-receipt identity.
  data.suspect_gender = normalizeGenderHint(data.suspect_gender) ?? data.suspect_gender;
  data.portraitId = authored ? AUTHORED_PORTRAIT : selectPortrait({ role: String(data.suspect_role), gender: String(data.suspect_gender) });
  if (authored) Object.assign(data, { mode: 'redteam', requiredClues: 1 });
  return { data, learnedTactics, totalPriorGames, options: { ...options }, provenance: raw._aiProvenance as AiProvenance[] | undefined };
}

/** Complete and confirm private inputs before either local or shared persistence materializes a session. */
export async function preparePlayableCase(options: GenerationOptions, request: Pick<NextRequest, 'signal'>, context: GenerationContext): Promise<CaseCheckpoint> {
  request.signal.throwIfAborted();
  const checkpoint = restoreCaseCheckpoint(context.checkpoint ?? await prepareCase(options, request, context), options);
  if (!context.checkpoint) await context.saveCheckpoint(checkpoint);
  request.signal.throwIfAborted();
  return checkpoint;
}

/** Stable creation time makes a retried shared materialization byte-for-byte reproducible. */
export function createPlayableRecord(options: GenerationOptions, sessionId: string,
  value: CaseCheckpoint, createdAt = Date.now()): SessionRecord {
  const checkpoint = restoreCaseCheckpoint(value, options);
  const { data, learnedTactics, totalPriorGames } = checkpoint;
  const record = createSessionRecord({ sessionId, caseData: data, learnedTactics, totalPriorGames,
    timerMode: options.timerMode }, createdAt);
  if (checkpoint.provenance) record.session.caseProvenance = structuredClone(checkpoint.provenance);
  if (options.authored) attachAuthoredGameplay(record.session);
  return record;
}

export function projectPlayableCase(record: Pick<SessionRecord, 'session'>): Record<string, unknown> {
  const session = record.session;
  return { ...sanitizeCaseForClient(session.caseData), sessionId: session.id, timerMode: session.timerMode,
    startedAt: session.startTime, priorGames: session.totalPriorGames, gameplay: gameplayProjection(session) };
}

export async function createPlayableCase(options: GenerationOptions, request: NextRequest, context: GenerationContext): Promise<Record<string, unknown>> {
  const checkpoint = await preparePlayableCase(options, request, context);
  const initial = createPlayableRecord(options, context.sessionId, checkpoint);
  const sessionId = createSessionFromRecord(initial);
  const session = getSession(sessionId)!;
  return projectPlayableCase({ session });
}
