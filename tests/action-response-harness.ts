import type { TestContext } from 'node:test';
import type { GameActionsContext } from '../app/game/controller/action-types';
import type { PlaybackOutcome } from '../app/game/audio/speech-player';
import { RequestLedger } from '../app/game/state/request-ledger';
import { requestGameAction } from '../app/game/controller/action-transport';
import { DEFAULT_SETTINGS } from '../app/settings/settings-model';

export const validTurn = {
  spoken_response: 'I left at six.', stress_level: 2, clues: [{ id: 'one', text: 'Visitor log' }],
  startedAt: 1000, status: 'active', outcome: null,
};
export const validAccusation = {
  correct: false, confession: 'That is not what happened.', accusationsLeft: 2,
  startedAt: 1000, status: 'active', outcome: null,
};

function stateHarness() {
  const state: Record<string, unknown> = {
    caseData: { sessionId: 'test-session', suspect_name: 'Casey' }, phase: 'active',
    stressLevel: 0, maxStress: 0, clues: [], clueRecords: [], conversationHistory: [], accusationsLeft: 3,
    hintsUsed: 0, hintTexts: [], lastResponse: '', lastTranscript: '', isAccusing: false,
  };
  const mutations: string[] = [];
  for (const field of [...Object.keys(state), 'gameplay', 'clueNotification']) {
    state[`set${field[0].toUpperCase()}${field.slice(1)}`] = (value: unknown) => {
      mutations.push(field);
      state[field] = typeof value === 'function' ? value(state[field]) : value;
    };
  }
  return { state, mutations };
}

function runtimeHarness(events: string[]) {
  const playback = { value: 'ended' as PlaybackOutcome };
  const runtime = {
    elapsed: 12, timerRef: { current: null },
    sfx: (sound: string) => events.push(`sfx:${sound}`),
    synchronize: (start: number) => events.push(`timing:${start}`),
    showToast: (message: string) => events.push(`error:${message}`),
    handleLose: async () => { events.push('lose'); },
    handleTimeUp: async () => { events.push('time'); },
    handleLawyerUp: async () => { events.push('lawyer'); },
    storePatterns: () => {}, router: { push: (path: string) => events.push(`navigate:${path}`) },
    speakResponse: async (options: { onDone: () => void }) => {
      events.push('speech');
      if (playback.value !== 'cancelled') options.onDone();
      return playback.value;
    },
    speakConfession: async () => { events.push('confession'); return playback.value; },
  };
  return { runtime, playback };
}

export function actionHarness(t: TestContext, initialResponse: unknown) {
  const { state, mutations } = stateHarness();
  const events: string[] = [];
  const { runtime, playback } = runtimeHarness(events);
  const replies = { body: initialResponse, status: 200 };
  const sent: Record<string, unknown>[] = [];
  const controller = new AbortController();
  const ledger = new RequestLedger();
  const panels = { accuseText: 'Preserve my accusation', setShowAccuseConfirm: () => events.push('confirm') };
  t.mock.method(globalThis, 'fetch', async (_path: string, options: RequestInit) => {
    sent.push(JSON.parse(String(options.body)));
    return new Response(JSON.stringify(replies.body), { status: replies.status });
  });
  const request: GameActionsContext['request'] = (path, body, parse) => requestGameAction({
    path, body, parse, attempt: ledger.begin(path, body), signal: controller.signal,
  });
  const context = { state, runtime, request, difficulty: 'easy', settings: { ...DEFAULT_SETTINGS, ttsEnabled: true },
    panels: { ...panels, setAccuseText: (text: string) => { panels.accuseText = text; } },
  } as unknown as GameActionsContext;
  return { context, state, mutations, events, replies, sent, panels, playback, controller };
}
