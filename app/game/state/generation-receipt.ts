export interface GenerationIntent {
  difficulty: string;
  setting?: string | null;
  mode?: string | null;
  timerMode: 'countdown' | 'unlimited';
  playMode?: 'challenge' | 'relaxed' | 'endurance';
}
export interface GenerationReceipt { requestId: string; sessionId?: string }
type ReceiptStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const PREFIX = 'caseGeneration:';

export function generationIntent(intent: GenerationIntent) {
  return { difficulty: intent.difficulty,
    setting: intent.setting && intent.setting !== 'random' ? intent.setting : undefined,
    mode: intent.mode === 'redteam' ? 'redteam' : undefined, timerMode: intent.timerMode,
    playMode: intent.playMode ?? (intent.timerMode === 'unlimited' ? 'relaxed' : 'challenge') };
}
function key(intent: GenerationIntent): string { return PREFIX + JSON.stringify(generationIntent(intent)); }
function storageProblem(): Error {
  return new Error('Case creation needs this tab’s session storage to recover safely. Enable browser storage, then retry. No new case was requested.');
}
function read(store: ReceiptStore, intent: GenerationIntent): GenerationReceipt | null {
  const value = store.getItem(key(intent));
  if (!value) return null;
  const receipt = JSON.parse(value) as GenerationReceipt;
  if (!receipt || typeof receipt.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(receipt.requestId)) throw storageProblem();
  if (receipt.sessionId !== undefined && typeof receipt.sessionId !== 'string') throw storageProblem();
  return receipt;
}
function write(store: ReceiptStore, intent: GenerationIntent, receipt: GenerationReceipt): void {
  const encoded = JSON.stringify(receipt);
  store.setItem(key(intent), encoded);
  if (store.getItem(key(intent)) !== encoded) throw storageProblem();
}
export function getGenerationReceipt(intent: GenerationIntent, store?: ReceiptStore): GenerationReceipt {
  try {
    const activeStore = store ?? sessionStorage;
    const existing = read(activeStore, intent);
    if (existing) return existing;
    const receipt = { requestId: crypto.randomUUID() };
    write(activeStore, intent, receipt);
    return receipt;
  } catch { throw storageProblem(); }
}
export function confirmGeneration(intent: GenerationIntent, receipt: GenerationReceipt, store?: ReceiptStore): void {
  try { write(store ?? sessionStorage, intent, receipt); }
  catch { throw new Error(`Case created, but its recovery receipt could not be saved. Open /game?session=${encodeURIComponent(receipt.sessionId ?? '')} to recover it. Do not create another case yet.`); }
}
export function renewGeneration(intent: GenerationIntent, requestId: string, store?: ReceiptStore): void {
  try {
    const activeStore = store ?? sessionStorage;
    const previous = read(activeStore, intent);
    if (!previous || previous.requestId !== requestId || previous.sessionId) throw storageProblem();
    write(activeStore, intent, { requestId: crypto.randomUUID() });
  } catch { throw storageProblem(); }
}
/** Once the URL identifies the saved session, it becomes the durable recovery link. */
export function acknowledgeGeneration(intent: GenerationIntent, sessionId: string, store?: ReceiptStore): void {
  try { const activeStore = store ?? sessionStorage; if (read(activeStore, intent)?.sessionId === sessionId) activeStore.removeItem(key(intent)); }
  catch { /* Existing session URLs can still recover when browser storage is unavailable. */ }
}
