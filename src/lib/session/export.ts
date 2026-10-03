import { getSupabaseClient } from '../db';
import { getSession } from './store';
import { getSessionStats } from './stats';
import { readExport, saveExport, exportStorageMode, type ExportEnvelope, type GameExport } from './exports/storage';
import type { GameSession, Outcome } from './types';

function snapshot(session: GameSession): GameExport {
  return { session_id: session.id, case_data: structuredClone(session.caseData),
    conversation: structuredClone(session.conversationHistory), outcome: session.outcome!,
    difficulty: String(session.caseData.difficulty || 'medium'), setting: String(session.caseData.setting || '') || null,
    stats: { ...getSessionStats(session.id), maxStress: session.currentStress, cluesCollected: session.cluesCollected },
    accusation_text: session.acceptedAccusation?.text ?? null,
    accusation_correct: session.outcome === 'win', created_at: new Date(session.endedAt!).toISOString() };
}
async function deliver(envelope: ExportEnvelope): Promise<ExportEnvelope['delivery']> {
  saveExport(envelope);
  if (envelope.delivery.destination === 'local') return envelope.delivery;
  try {
    const { error } = await getSupabaseClient().from('game_exports').upsert(envelope.record, { onConflict: 'session_id' });
    if (error) throw error;
    const confirmed: ExportEnvelope = { ...envelope, delivery: { ...envelope.delivery, state: 'saved' } };
    saveExport(confirmed);
    return confirmed.delivery;
  } catch { /* The durable pending record remains retryable through evaluation. */ }
  return envelope.delivery;
}
function prepareEnvelope(session: GameSession, previous: ExportEnvelope | null,
  destination: 'local' | 'supabase'): ExportEnvelope {
  return { record: previous?.record ?? snapshot(session), delivery: {
    state: destination === 'local' ? 'saved' : 'pending', destination, attempts: (previous?.delivery.attempts ?? 0) + 1,
  } };
}
export async function exportSession(sessionId: string, outcome: Outcome,
  accusationText?: string, accusationCorrect?: boolean): Promise<ExportEnvelope['delivery']> {
  void accusationText; void accusationCorrect;
  const session = getSession(sessionId);
  if (!session?.outcome || session.outcome !== outcome) throw new Error('Only a completed canonical session can be exported');
  const destination = exportStorageMode();
  const previous = readExport(sessionId);
  if (previous?.delivery.state === 'saved' && previous.delivery.destination === destination) return previous.delivery;
  return deliver(prepareEnvelope(session, previous, destination));
}
