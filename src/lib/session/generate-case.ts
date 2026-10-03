import { normalizeGenderHint } from '../character-identity';
import type { AiProvenance } from '../ai/contracts';
import type { GenerationContext } from './generation-requests';
import type { NextRequest } from 'next/server';
import { generateCase } from '../game-ai';
import { selectPortrait, AUTHORED_PORTRAIT } from '../art/portraits';
import { validateCaseData, validateDifficulty } from '../sanitize';
import { sanitizeCaseForClient } from '../game-session';
import { createSessionAt, getSession, persistSession } from './store';
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

interface CaseCheckpoint extends Record<string, unknown> {
  data: Record<string, unknown>;
  learnedTactics: string[];
  totalPriorGames: number;
  provenance?: AiProvenance[];
}

function restoreCheckpoint(value: Record<string, unknown>): CaseCheckpoint {
  if (!validateCaseData(value.data) || !Array.isArray(value.learnedTactics)
    || !value.learnedTactics.every(item => typeof item === 'string') || typeof value.totalPriorGames !== 'number') {
    throw new Error('The saved case checkpoint is invalid.');
  }
  return value as CaseCheckpoint;
}

async function prepareCase(options: GenerationOptions, request: NextRequest, context: GenerationContext): Promise<CaseCheckpoint> {
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
  return { data, learnedTactics, totalPriorGames, provenance: raw._aiProvenance as AiProvenance[] | undefined };
}

export async function createPlayableCase(options: GenerationOptions, request: NextRequest, context: GenerationContext): Promise<Record<string, unknown>> {
  const checkpoint = context.checkpoint ? restoreCheckpoint(context.checkpoint) : await prepareCase(options, request, context);
  if (!context.checkpoint) context.saveCheckpoint(checkpoint);
  request.signal.throwIfAborted();
  const { data, learnedTactics, totalPriorGames } = checkpoint;
  const sessionId = createSessionAt({ sessionId: context.sessionId, caseData: data, learnedTactics,
    totalPriorGames, timerMode: options.timerMode });
  const session = getSession(sessionId)!;
  if (checkpoint.provenance && !session.caseProvenance) {
    session.caseProvenance = checkpoint.provenance; persistSession(sessionId);
  }
  if (options.authored && !session.gameplay) { attachAuthoredGameplay(session); persistSession(sessionId); }
  return { ...sanitizeCaseForClient(data), sessionId, timerMode: options.timerMode, startedAt: session.startTime,
    priorGames: totalPriorGames, gameplay: gameplayProjection(session) };
}
