import { isDeepStrictEqual } from 'node:util';
import type { AiProvenance } from '../ai/contracts';
import { validateCaseData } from './case-validation';
import { isPortraitId } from '../art/portraits';
import { authoredCaseData } from '../gameplay/session';
import type { GenerationOptions } from './generate-case';

export interface CaseCheckpoint extends Record<string, unknown> {
  data: Record<string, unknown>;
  learnedTactics: string[];
  totalPriorGames: number;
  provenance?: AiProvenance[];
  /** Missing only on older local checkpoints already bound by their request receipt. */
  options?: GenerationOptions;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function requireCheckpoint(valid: unknown): asserts valid {
  if (!valid) throw new Error('The saved case checkpoint is invalid or belongs to different case options.');
}
function optionIdentity(value: Record<string, unknown>) {
  return { setting: value.setting ?? null, difficulty: value.difficulty, authored: value.authored,
    playMode: value.playMode, timerMode: value.timerMode };
}
function validateOptions(options: GenerationOptions, saved: unknown): void {
  requireCheckpoint(['easy', 'medium', 'hard', 'expert'].includes(options.difficulty));
  requireCheckpoint(['challenge', 'relaxed', 'endurance'].includes(options.playMode));
  requireCheckpoint(options.timerMode === (options.playMode === 'challenge' ? 'countdown' : 'unlimited'));
  requireCheckpoint(typeof options.authored === 'boolean');
  if (saved === undefined) return;
  requireCheckpoint(object(saved));
  requireCheckpoint(isDeepStrictEqual(optionIdentity({ ...options }), optionIdentity(saved)));
}
function validateCaseBinding(data: Record<string, unknown>, options: GenerationOptions): void {
  requireCheckpoint(validateCaseData(data));
  requireCheckpoint(data.difficulty === options.difficulty && data.playMode === options.playMode);
  if (data.portraitId !== undefined) requireCheckpoint(isPortraitId(data.portraitId));
  if (!options.authored) return requireCheckpoint(data.mode === undefined && data.requiredClues === undefined);
  requireCheckpoint(data.mode === 'redteam' && data.requiredClues === 1);
  // The authored graph must keep its authored facts, not merely its mode label.
  const authored = validateCaseData(authoredCaseData());
  requireCheckpoint(isDeepStrictEqual(validateCaseData(data), authored));
}
function validateProvenance(value: unknown): void {
  if (value === undefined) return;
  requireCheckpoint(Array.isArray(value));
  for (const item of value) {
    requireCheckpoint(object(item) && typeof item.provider === 'string' && typeof item.model === 'string');
    requireCheckpoint(item.provider.length > 0 && item.model.length > 0);
    requireCheckpoint(['case', 'case-review'].includes(String(item.capability)));
    requireCheckpoint(typeof item.promptHash === 'string' && /^[a-f0-9]{64}$/.test(item.promptHash));
  }
}

/** Validate stored inputs again before materializing; never reuse a checkpoint under new options. */
export function restoreCaseCheckpoint(value: unknown, options: GenerationOptions): CaseCheckpoint {
  requireCheckpoint(object(value) && object(value.data));
  validateOptions(options, value.options);
  validateCaseBinding(value.data, options);
  requireCheckpoint(Array.isArray(value.learnedTactics) && value.learnedTactics.every(item => typeof item === 'string'));
  requireCheckpoint(Number.isSafeInteger(value.totalPriorGames) && Number(value.totalPriorGames) >= 0);
  validateProvenance(value.provenance);
  return structuredClone(value) as CaseCheckpoint;
}
