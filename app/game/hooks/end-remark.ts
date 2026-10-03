import { parseEnding } from './ending-result';
import { getUserApiHeaders } from '../../lib/api-keys';
import type { SfxName } from './useSfx';
import type { EndGameDeps } from './endgame-types';

export interface EndRemark {
  transcript: string;
  sound: SfxName;
  extra: Record<string, unknown>;
  key?: string;
}

export const endings: Record<'accusations' | 'time' | 'giveup', EndRemark> = {
  accusations: {
    transcript: '(Out of accusations)', sound: 'wrong', extra: {},
  },
  time: {
    transcript: '(Time’s up)', sound: 'alarm', extra: { timeUp: true }, key: 'timeUpRemark',
  },
  giveup: {
    transcript: '(Gave up)', sound: 'sigh', extra: { gaveUp: true },
  },
};

export class EndRequestError extends Error {
  constructor(message: string, readonly retrySameId: boolean) { super(message); }
}

export async function fetchEndRemark(deps: EndGameDeps, options: EndRemark, signal: AbortSignal, requestId: string) {
  const response = await fetch('/api/session/end', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() },
    body: JSON.stringify({ sessionId: deps.caseData?.sessionId, requestId, reason: options.extra.gaveUp ? 'giveup' : 'time' }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  });
  const data = await response.json();
  if (!response.ok) throw new EndRequestError(data.error || 'Could not confirm the end of the interrogation.',
    ['ACTION_IN_PROGRESS', 'STORAGE_UNAVAILABLE'].includes(data.code));
  return parseEnding(data, deps.caseData!.sessionId);
}

export async function playEndRemark(deps: EndGameDeps, remark: string) {
  deps.setLastTranscript('');
  deps.setLastResponse(remark);
  return deps.speakResponse({ text: remark, stress: 1, suspectName: deps.caseData!.suspect_name,
    onDone: () => {}, enabled: deps.ttsEnabled });
}
