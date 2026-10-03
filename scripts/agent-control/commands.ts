import { ControlError } from './errors';
import { randomUUID } from 'node:crypto';
import { startBody, generatedSettings, difficulties } from './start';

export type Input = Record<string, unknown> & { command: string };
export interface Pending { command: string; route: string; body: Record<string, unknown> }
export const discovery = {
  protocol: 'interrogation-agent-control-v1',
  usage: 'Send one JSON object on stdin. One process performs one action. Use retry after an uncertain response.',
  commands: {
    discover: {}, start: { case: 'authored (default) | generated (uses AI)',
      setting: { requiredFor: 'generated', choices: generatedSettings },
      difficulty: { requiredFor: 'generated', choices: difficulties },
      playMode: 'relaxed (default) | challenge | endurance' }, state: {}, opening: {},
    ask: { question: '1–500 characters; may use AI' }, pin: { turnId: 'from state', quote: 'exact recorded quote' },
    evidence: { statementId: 'from pin/state', exhibitId: 'from state', question: '1–500 characters; uses AI' },
    clarify: { statementId: 'from pin/state', question: '1–500 characters; uses AI' },
    leave_space: { statementId: 'from pin/state', question: '1–500 characters; uses AI' },
    accuse: { accusation: '1–1000 characters; may use AI' }, giveup: {}, result: {}, retry: {},
    'discard-pending': { confirm: true, warning: 'Only after checking state. Does not undo an accepted action.' },
  },
  limits: 'Local cases only. Generated start and its opening use AI. No automatic loops, AI retries, audio generation, or leaderboard submission. Evidence actions require gameplay in state.',
};

function text(input: Input, key: string, max = 500): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ControlError(`${key} must contain 1–${max} characters.`);
  return value;
}

function gameplayBody(input: Input, requestId: string): Record<string, unknown> {
  if (input.command === 'pin') return { kind: 'pin', turnId: text(input, 'turnId', 120), quote: text(input, 'quote', 2000) };
  const action = { id: requestId, kind: input.command === 'evidence' ? 'present_evidence' : input.command,
    statementId: text(input, 'statementId', 120), question: text(input, 'question'),
    ...(input.command === 'evidence' ? { exhibitId: text(input, 'exhibitId', 120) } : {}) };
  return { kind: 'action', action };
}

export function prepare(input: Input, sessionId?: string): Pending {
  const requestId = randomUUID();
  if (input.command === 'start') return { command: input.command, route: 'generate-case', body: { ...startBody(input), requestId } };
  if (!sessionId) throw new ControlError('No saved session. Run start first.');
  let route: string;
  let body: Record<string, unknown>;
  if (['opening', 'ask'].includes(input.command)) {
    route = 'interrogate'; body = { playerQuestion: input.command === 'opening' ? '*Detective opens the file*' : text(input, 'question') };
  } else if (['pin', 'evidence', 'clarify', 'leave_space'].includes(input.command)) {
    route = 'gameplay'; body = gameplayBody(input, requestId);
  } else if (input.command === 'accuse') {
    route = 'accuse'; body = { accusation: text(input, 'accusation', 1000) };
  } else if (input.command === 'giveup') {
    route = 'session/end'; body = { reason: 'giveup' };
  } else throw new ControlError('Unknown command. Run discover.');
  return { command: input.command, route, body: { ...body, sessionId, requestId } };
}
