import { validateEvaluation } from '../result/validation';
import { snapshotToGameResult } from '../result/recover-result';
import type { Case } from '@/lib/game-state';
import type { SessionSnapshot } from '../state/session-recovery';
import type { RuntimeOptions, GameRuntime } from './useGameRuntime';

interface Context extends RuntimeOptions {
  runtime: GameRuntime;
  query: string;
  needsOnboarding: boolean;
}

function showRecoveredResult(context: Context, snapshot: SessionSnapshot) {
  const kind = snapshot.outcome === 'win' ? 'win' : 'lose';
  const evaluation = validateEvaluation(snapshot.result, kind);
  const result = snapshotToGameResult(snapshot, kind);
  try {
    sessionStorage.setItem(`evaluation:v1:${snapshot.caseData.sessionId}:${kind}`, JSON.stringify(evaluation));
    sessionStorage.setItem('gameResult', JSON.stringify(result));
  } catch { context.runtime.showToast('Your result is saved on the server. Opening its recovery link.', 'info'); }
  context.runtime.router.replace(`/game/${kind}?session=${encodeURIComponent(snapshot.caseData.sessionId)}`);
}

function restoreProgress(state: Context['state'], snapshot: SessionSnapshot) {
  state.setConversationHistory(snapshot.conversationHistory);
  state.setClues(snapshot.clues.map(clue => clue.text));
  state.setClueRecords(snapshot.clues);
  state.setAccusationsLeft(snapshot.accusationsLeft);
  state.setHintsUsed(snapshot.hintsUsed);
  state.setHintTexts(snapshot.hintTexts ?? []);
  state.setStressLevel(snapshot.stressLevel);
  state.setMaxStress(snapshot.stressLevel);
  state.setLastResponse(snapshot.conversationHistory.findLast(message => message.role === 'assistant')?.content || '');
}

export function acceptLoadedCase(context: Context, data: Case, snapshot?: SessionSnapshot) {
  const { state, panels, runtime } = context;
  state.setCaseData(data);
  state.setGameplay(snapshot?.gameplay ?? data.gameplay ?? null);
  if (!snapshot) {
    state.setPhase('briefing');
    runtime.sfx('folderopen');
    const query = new URLSearchParams(context.query);
    query.set('session', data.sessionId);
    runtime.router.replace(`/game?${query}`);
    if (context.needsOnboarding) panels.setShowOnboarding(true);
    return;
  }
  restoreProgress(state, snapshot);
  if (snapshot.outcome) { showRecoveredResult(context, snapshot); return; }
  state.setPhase(snapshot.status === 'briefing' ? 'briefing' : 'active');
  if (snapshot.pendingRequests.length) runtime.showToast('A previous action was interrupted. Review the recovered transcript before trying again.');
}
