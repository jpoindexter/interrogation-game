import type { Case } from '@/lib/game-state';
import { isPortraitId } from '@/lib/art/portraits';
import { parseGameplayProjection } from '../playbook/response-parser';

const requiredFields = ['case_number', 'setting', 'crime', 'objective', 'briefing', 'suspect_name',
  'suspect_gender', 'suspect_role', 'suspect_cover_story', 'difficulty', 'sessionId'] as const;

function invalid(field: string): never {
  throw new Error(`The case ${field} is invalid. Retry the same request to recover it.`);
}
function optionalChoice<T extends string>(value: unknown, choices: readonly T[], field: string): T | undefined {
  if (value === undefined) return undefined;
  if (!choices.includes(value as T)) invalid(field);
  return value as T;
}
function optionalInteger(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) invalid(field);
  return value;
}
function options(record: Record<string, unknown>) {
  const mode = optionalChoice(record.mode, ['redteam'], 'mode');
  const playMode = optionalChoice(record.playMode, ['challenge', 'relaxed', 'endurance'], 'play mode');
  const timerMode = optionalChoice(record.timerMode, ['countdown', 'unlimited'], 'timer mode');
  if (playMode && timerMode && timerMode !== (playMode === 'challenge' ? 'countdown' : 'unlimited')) invalid('timer');
  const requiredClues = optionalInteger(record.requiredClues, 'clue requirement', 1, 5);
  const startedAt = optionalInteger(record.startedAt, 'start time', 0, Number.MAX_SAFE_INTEGER);
  return { ...(mode ? { mode } : {}), ...(playMode ? { playMode } : {}), ...(timerMode ? { timerMode } : {}),
    ...(requiredClues === undefined ? {} : { requiredClues }), ...(startedAt === undefined ? {} : { startedAt }) };
}
function optionalContent(record: Record<string, unknown>) {
  const result: Pick<Case, 'detective_leads' | 'portraitId' | 'gameplay'> = {};
  if (record.detective_leads !== undefined) {
    if (!Array.isArray(record.detective_leads) || !record.detective_leads.every(item => typeof item === 'string' && item.trim())) invalid('leads');
    result.detective_leads = [...record.detective_leads];
  }
  if (record.portraitId !== undefined) {
    if (!isPortraitId(record.portraitId)) invalid('portrait');
    result.portraitId = record.portraitId;
  }
  if (record.gameplay !== undefined) result.gameplay = parseGameplayProjection(record.gameplay);
  return result;
}

/** Validate optional controls as well as copy, and never spread unrecognized server fields into state. */
export function parsePublicCase(value: unknown): Case {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('response');
  const record = value as Record<string, unknown>;
  const fields = {} as Pick<Case, typeof requiredFields[number]>;
  for (const field of requiredFields) {
    const content = record[field];
    if (typeof content !== 'string' || !content.trim()) throw new Error('The case is incomplete. Retry the same request to recover it.');
    fields[field] = content;
  }
  if (!['easy', 'medium', 'hard', 'expert'].includes(fields.difficulty)) invalid('difficulty');
  return { ...fields, ...options(record), ...optionalContent(record) };
}
