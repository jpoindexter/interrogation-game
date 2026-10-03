import { CASES, DIFFICULTY_CONFIG } from '../../app/data/cases';
import { ControlError } from './errors';

export const generatedSettings = CASES.map(item => item.setting);
export const difficulties = Object.keys(DIFFICULTY_CONFIG);

function timingOptions(value: unknown) {
  const playMode = value ?? 'relaxed';
  if (typeof playMode !== 'string' || !['relaxed', 'challenge', 'endurance'].includes(playMode)) {
    throw new ControlError('Invalid playMode.');
  }
  return { playMode, timerMode: playMode === 'challenge' ? 'countdown' : 'unlimited' };
}

function generatedOptions(input: Record<string, unknown>) {
  if (typeof input.setting !== 'string' || !generatedSettings.includes(input.setting)) {
    throw new ControlError('Choose a generated setting from discover.');
  }
  if (typeof input.difficulty !== 'string' || !difficulties.includes(input.difficulty)) {
    throw new ControlError('Choose a generated difficulty from discover.');
  }
  return { setting: input.setting, difficulty: input.difficulty };
}

export function startBody(input: Record<string, unknown>): Record<string, unknown> {
  const kind = input.case === undefined ? 'authored' : input.case;
  if (kind !== 'authored' && kind !== 'generated') throw new ControlError('case must be authored or generated.');
  const timing = timingOptions(input.playMode);
  if (kind === 'authored') {
    if (input.setting !== undefined || input.difficulty !== undefined) {
      throw new ControlError('setting and difficulty apply only to case:generated.');
    }
    return { mode: 'redteam', ...timing };
  }
  return { ...generatedOptions(input), ...timing };
}
