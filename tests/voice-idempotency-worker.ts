import { readFileSync } from 'node:fs';
import { requestSpeech } from '../src/lib/voice/requests';
import { voiceResponse } from '../src/lib/voice/receipt-types';

async function main() {
  globalThis.fetch = async () => { throw new Error('A replay must not call the provider'); };
  const result = await requestSpeech(JSON.parse(readFileSync(0, 'utf8')), new AbortController().signal);
  const response = voiceResponse(result);
  process.stdout.write(JSON.stringify({ status: response.status, audio: await response.text() }));
}
void main();
