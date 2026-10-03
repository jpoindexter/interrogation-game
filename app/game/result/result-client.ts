import { getUserApiHeaders } from '../../lib/api-keys';
import { validateEvaluation, validateReceipt } from './validation';
import type { Evaluation, GameResult, LeaderboardReceipt, ResultKind } from './types';

interface StoragePort { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
interface ResultEnvironment { fetch: typeof fetch; storage: StoragePort; headers: () => Record<string, string> }

/** Session-scoped caches make remounts and refreshes reads instead of repeated mutations. */
export class ResultClient {
  private readonly pending = new Map<string, Promise<unknown>>();
  constructor(private readonly environment: ResultEnvironment) {}

  evaluate(result: GameResult, kind: ResultKind): Promise<Evaluation> {
    if (!result.sessionId) return Promise.reject(new Error('This saved game has no session ID. Its transcript is still available.'));
    const key = `evaluation:v1:${result.sessionId}:${kind}`;
    return this.once(key, () => this.request('/api/evaluate', { type: kind, sessionId: result.sessionId }),
      value => validateEvaluation(value, kind));
  }

  submit(result: GameResult, initials: string): Promise<LeaderboardReceipt> {
    if (!result.sessionId || !result.winToken) return Promise.reject(new Error('This saved game has no valid score token.'));
    const key = `leaderboard:v1:${result.sessionId}`;
    return this.once(key, () => this.request('/api/leaderboard', {
      sessionId: result.sessionId, winToken: result.winToken, playerName: initials,
      caseNumber: result.caseData.case_number, caseSetting: result.caseData.setting,
      suspectName: result.caseData.suspect_name,
    }), value => {
      const receipt = validateReceipt(value);
      return { ...receipt, playerName: receipt.playerName || initials };
    });
  }

  private async request(url: string, body: unknown): Promise<unknown> {
    const response = await this.environment.fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...this.environment.headers() },
      body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(response.status === 401
      ? 'This session is no longer available. The saved transcript remains accessible.'
      : `The server could not finish this request (HTTP ${response.status}). Please retry.`);
    return response.json();
  }

  private once<T>(key: string, request: () => Promise<unknown>, validate: (value: unknown) => T): Promise<T> {
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;
    try {
      const stored = this.environment.storage.getItem(key);
      if (stored) return Promise.resolve(validate(JSON.parse(stored)));
    } catch { /* Invalid cache entries are refreshed from the server. */ }
    const work = request().then(validate).then(value => {
      try { this.environment.storage.setItem(key, JSON.stringify(value)); } catch { /* Keep the in-memory result. */ }
      return value;
    }).catch(error => { this.pending.delete(key); throw error; });
    this.pending.set(key, work);
    return work;
  }
}
export const resultClient = new ResultClient({
  fetch: (...args) => fetch(...args), headers: getUserApiHeaders,
  storage: { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) },
});
