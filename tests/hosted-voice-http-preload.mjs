import { bridge } from './hosted-http-transport.mjs';

const controlledFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const request = input instanceof Request ? input : new Request(input, options);
  const url = new URL(request.url);
  if (url.origin === 'https://http-fixture.supabase.co' && url.pathname.startsWith('/storage/v1/')) {
    return bridge({ kind: 'storage', path: url.pathname, method: request.method,
      headers: Object.fromEntries(request.headers),
      body: request.method === 'GET' ? null : Buffer.from(await request.arrayBuffer()).toString('base64') });
  }
  if (url.origin === 'https://api.elevenlabs.io') {
    const body = url.pathname === '/v1/speech-to-text'
      ? { model_id: (await request.formData()).get('model_id') } : await request.json();
    return bridge({ kind: 'voice', path: url.pathname, body });
  }
  return controlledFetch(input, options);
};
