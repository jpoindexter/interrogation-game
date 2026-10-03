import { loadCase } from './case-loader';
import { confirmGeneration, getGenerationReceipt, type GenerationIntent } from './generation-receipt';
import { recoverSession } from './session-recovery';

export async function loadCaseIntent(intent: GenerationIntent, signal: AbortSignal) {
  const receipt = getGenerationReceipt(intent);
  if (receipt.sessionId) {
    const snapshot = await recoverSession(receipt.sessionId, signal);
    return { data: snapshot.caseData, snapshot };
  }
  const data = await loadCase({ ...intent, requestId: receipt.requestId, signal });
  confirmGeneration(intent, { ...receipt, sessionId: data.sessionId });
  return { data, snapshot: undefined };
}
