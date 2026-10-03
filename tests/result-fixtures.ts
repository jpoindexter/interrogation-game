import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { TestContext } from 'node:test';
import { ResultClient } from '../app/game/result/result-client';
import type { Evaluation, GameResult } from '../app/game/result/types';

export const result: GameResult = {
  sessionId: 'session-1', winToken: 'synthetic-win-token',
  caseData: { case_number: '123', suspect_name: 'Ada', suspect_role: 'Technician', setting: 'Tech company', crime: 'Theft' },
  conversationHistory: [{ role: 'user', content: 'Where were you?' }], timeElapsed: 1,
};
export const evaluation: Evaluation = {
  outcome: 'win', detective_rating: 'Sharp', reveal_the_lie: 'A lie', reveal_the_truth: 'A fact', reveal_the_clue: 'A contradiction',
  stats: { timeElapsed: 123, difficulty: 'medium', hintsUsed: 1, accusationsUsed: 2, questionsAsked: 5, score: 876, detectiveRating: 'Sharp' },
};
export function resultStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}
export async function resultFixture(context: TestContext, handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No local server address');
  const storage = resultStorage();
  const environment = {
    fetch: ((input: string | URL | Request, init?: RequestInit) => fetch(new URL(String(input), `http://127.0.0.1:${address.port}`), init)) as typeof fetch,
    headers: () => ({ 'x-test-provider': 'synthetic' }), storage,
  };
  return { client: new ResultClient(environment), environment, storage };
}
