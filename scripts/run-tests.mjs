import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'interrogation-tests-'));
try {
  const files = (await readdir('tests')).filter(name => /\.test\.tsx?$/.test(name)).map(name => join('tests', name));
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', './scripts/test-worker-env.mjs', '--import', 'tsx', '--test', ...files], {
      stdio: 'inherit', env: { ...process.env, INTERROGATION_TEST_ROOT: directory },
    });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await rm(directory, { recursive: true, force: true });
}
