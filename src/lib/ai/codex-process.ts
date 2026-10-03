import { ensureNotAborted } from './execution';
import { spawn, type ChildProcess } from 'node:child_process';
import { AiError } from './contracts';
import { codexEnvironment } from './codex-version';

interface ProcessOptions {
  binary: string;
  args: string[];
  input: string;
  directory: string;
  signal?: AbortSignal;
  timeoutMs: number;
}

function terminate(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill('SIGKILL');
    else process.kill(-child.pid, 'SIGKILL');
  } catch { /* The process group may already have exited. */ }
}

export async function runCodexProcess(options: ProcessOptions): Promise<string> {
  ensureNotAborted(options.signal);
  return new Promise((resolve, reject) => {
    const child = spawn(options.binary, options.args, { cwd: options.directory, shell: false, detached: process.platform !== 'win32',
      env: codexEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
      if (error) { terminate(child); reject(error); } else resolve(stdout);
    };
    const abort = () => {
      try { ensureNotAborted(options.signal); } catch (error) { finish(error as Error); }
    };
    const timeout = setTimeout(() => finish(new AiError('TIMEOUT', 'The local AI request timed out. Retry the turn.')), options.timeoutMs);
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      if (stdout.length > 1_000_000) finish(new AiError('OUTPUT_LIMIT', 'The local AI response exceeded its limit.'));
      try { stdout.slice(0, stdout.lastIndexOf('\n')).split('\n').filter(Boolean).forEach(parseCodexEvent); }
      catch { finish(new AiError('UNEXPECTED_TOOL', 'The local provider attempted an unexpected operation; request stopped.')); }
    });
    child.stderr.on('data', () => { /* Do not log provider diagnostics containing task data. */ });
    child.once('error', () => finish(new AiError('CODEX_UNAVAILABLE', 'Codex CLI could not start. Check the local installation and sign-in.')));
    child.once('close', code => finish(code === 0 ? undefined : new AiError('CODEX_FAILED', 'Codex could not complete this request. Check local sign-in and usage availability.')));
    child.stdin.on('error', () => { /* Process close/error reports the actual request failure. */ });
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) { abort(); return; }
    child.stdin.end(options.input);
  });
}

function parseCodexEvent(line: string): string | null {
  const event = JSON.parse(line);
  const type = event.item?.type;
  if (type && !['agent_message', 'reasoning', 'error'].includes(type)) {
    throw new AiError('UNEXPECTED_TOOL', 'The local provider attempted a tool operation; response rejected.');
  }
  if (event.type === 'turn.failed' || event.type === 'error') throw new AiError('CODEX_FAILED', 'The local provider did not complete its response.');
  return event.type === 'item.completed' && type === 'agent_message' ? event.item.text : null;
}

export function parseCodexOutput(output: string): Record<string, unknown> {
  const messages = output.split('\n').filter(Boolean).map(parseCodexEvent).filter(Boolean);
  const parsed = JSON.parse(messages.at(-1) ?? 'null');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AiError('INVALID_RESPONSE', 'The AI response was not a JSON object.');
  return parsed;
}
