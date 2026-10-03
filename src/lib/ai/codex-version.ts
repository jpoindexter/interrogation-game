import { ensureNotAborted } from './execution';
import { execFile } from 'node:child_process';
import { AiError } from './contracts';

const checked = new Set<string>();
export function codexEnvironment(): NodeJS.ProcessEnv {
  return { NODE_ENV: process.env.NODE_ENV ?? 'production', HOME: process.env.HOME,
    PATH: process.env.PATH, TMPDIR: process.env.TMPDIR,
    ...(process.env.CODEX_HOME ? { CODEX_HOME: process.env.CODEX_HOME } : {}) };
}

/** Fail closed when the binary differs from the version whose isolation flags were checked. */
export async function verifyCodexVersion(binary: string, signal?: AbortSignal): Promise<void> {
  ensureNotAborted(signal);
  if (checked.has(binary)) return;
  await new Promise<void>((resolve, reject) => {
    execFile(binary, ['--version'], { signal, timeout: 5000, maxBuffer: 4096, env: codexEnvironment() }, (error, stdout) => {
      if (signal?.aborted) {
        try { ensureNotAborted(signal); } catch (cancelled) { reject(cancelled); }
        return;
      }
      if (error || !/^codex-cli 0\.160\.0\s*$/.test(stdout)) {
        checked.delete(binary);
        reject(new AiError('CODEX_VERSION', 'Use the project-pinned Codex CLI 0.160.0. Run npm install or correct CODEX_BIN.'));
      } else resolve();
    });
  });
  ensureNotAborted(signal);
  checked.add(binary);
}
