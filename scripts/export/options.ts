export interface ExportOptions {
  url: URL;
  secret: string;
  output: string;
}

const allowedArguments = new Set(['output', 'limit', 'offset', 'outcome', 'difficulty', 'setting']);

function parseArguments(argv: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const argument of argv) {
    const match = /^--([^=]+)=(.+)$/.exec(argument);
    if (!match || !allowedArguments.has(match[1])) {
      throw new Error('Use --name=value with output, limit, offset, outcome, difficulty, or setting.');
    }
    values.set(match[1], match[2]);
  }
  return values;
}

function numericArgument(values: Map<string, string>, name: string, fallback: string, minimum: number): string {
  const raw = values.get(name) ?? fallback;
  const number = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(number) || number < minimum) {
    throw new Error(`${name} must be an integer of at least ${minimum}.`);
  }
  if (name === 'limit' && number > 1000) throw new Error('limit cannot exceed 1000.');
  return raw;
}

function exportUrl(base: string): URL {
  let url: URL;
  try { url = new URL(base); } catch { throw new Error('EXPORT_BASE_URL must be a valid URL.'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('EXPORT_BASE_URL must use HTTPS, except on localhost.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('EXPORT_BASE_URL must not contain credentials, query parameters, or a fragment.');
  }
  url.pathname = `${url.pathname.replace(/\/$/, '')}/api/export`;
  return url;
}

export function readExportOptions(argv: string[], env: NodeJS.ProcessEnv): ExportOptions {
  const secret = env.EXPORT_SECRET;
  if (!secret || /[\r\n]/.test(secret)) throw new Error('A valid EXPORT_SECRET env var is required.');
  const values = parseArguments(argv);
  const url = exportUrl(env.EXPORT_BASE_URL || 'http://localhost:3000');
  url.searchParams.set('limit', numericArgument(values, 'limit', '1000', 1));
  url.searchParams.set('offset', numericArgument(values, 'offset', '0', 0));
  for (const name of ['outcome', 'difficulty', 'setting']) {
    const value = values.get(name);
    if (value) url.searchParams.set(name, value);
  }
  return { url, secret, output: values.get('output') || 'data/export.jsonl' };
}
