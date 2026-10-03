import { getSession } from '../src/lib/session/store';
import { inspectWinToken } from '../src/lib/session/tokens';
import { runSessionRequest } from '../src/lib/session/request-ledger';

async function main() {
  const [operation, sessionId, requestId, token] = process.argv.slice(2);
  if (operation === 'inspect') {
    const session = getSession(sessionId);
    process.stdout.write(JSON.stringify({ session, tokenValid: token ? !!inspectWinToken(sessionId, token) : false }));
    return;
  }
  const response = await runSessionRequest({ sessionId, requestId, fingerprint: { operation: 'test', question: 'Where?' },
    run: async () => {
      if (operation === 'crash') { process.stdout.write('provider-started'); process.exit(17); }
      throw new Error('A repeated request must not call its provider');
    } });
  process.stdout.write(JSON.stringify(response));
}
void main().catch(() => { process.exitCode = 1; });
