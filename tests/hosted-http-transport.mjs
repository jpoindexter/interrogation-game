// Explicit Node preload for this test's child Next servers only. No production hook.
const pending = new Map();
let nextId = 0;
const nativeFetch = globalThis.fetch;
process.on('message', message => {
  if (message?.type !== 'fixture-reply') return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  clearTimeout(entry.timer);
  if (message.error) entry.reject(new Error('Controlled transport interrupted'));
  else entry.resolve(Response.json(message.value, { status: message.status ?? 200 }));
});

function bridge(payload) {
  if (!process.send) throw new Error('This preload requires a test IPC parent');
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Fixture bridge timeout')); }, 25_000);
    pending.set(id, { resolve, reject, timer });
    process.send({ type: 'fixture-request', id, ...payload });
  });
}

globalThis.fetch = async (input, options) => {
  const request = input instanceof Request ? input : new Request(input, options);
  const url = new URL(request.url);
  const body = options?.body ?? (request.method === 'GET' ? undefined : await request.clone().text());
  if (url.origin === 'https://http-fixture.supabase.co') {
    if (url.pathname.startsWith('/rest/v1/rpc/interrogation_')) {
      return bridge({ kind: 'rpc', name: url.pathname.split('/').at(-1), args: JSON.parse(String(body)) });
    }
    if (url.pathname === '/rest/v1/leaderboard' && request.method === 'GET') {
      return bridge({ kind: 'leaderboard', query: url.search });
    }
    throw new Error('Unexpected controlled database request');
  }
  if (url.origin === 'https://api.openai.com' && url.pathname === '/v1/responses') {
    return bridge({ kind: 'provider', body: JSON.parse(String(body)) });
  }
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return nativeFetch(input, options);
  throw new Error('External network is disabled by this acceptance fixture');
};
