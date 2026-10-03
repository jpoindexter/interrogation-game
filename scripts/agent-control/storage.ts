import { ControlError } from './errors';
import { chmod, lstat, mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Pending } from './commands';

export interface SavedSession { version: 1; origin: string; sessionId?: string; pending?: Pending }
export const directory = resolve(process.env.AGENT_CONTROL_DIR ?? '.local/agent-control');
const file = join(directory, 'session.json');
const lock = join(directory, 'session.lock');

async function regularFile(path: string) {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new ControlError('Session storage must be a regular file.');
    await chmod(path, 0o600);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

export async function acquire() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ControlError('Session directory must be a real directory.');
  await chmod(directory, 0o700);
  try {
    const handle = await open(lock, 'wx', 0o600);
    await handle.writeFile(String(process.pid));
    return async () => { await handle.close(); await unlink(lock); };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ControlError('Another agent command holds the session lock. See docs/AGENT-CONTROL.md for crash recovery.');
    throw error;
  }
}

export async function load(origin: string): Promise<SavedSession> {
  await regularFile(file);
  try {
    const saved = JSON.parse(await readFile(file, 'utf8')) as SavedSession;
    if (saved.version !== 1 || saved.origin !== origin) throw new ControlError('Saved session belongs to a different origin or protocol. Choose a separate AGENT_CONTROL_DIR.');
    if (saved.sessionId !== undefined && !/^[a-f0-9]{48}$/.test(saved.sessionId)) throw new ControlError('Invalid saved session.');
    return saved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, origin };
    throw error;
  }
}

export async function save(session: SavedSession) {
  const temporary = join(directory, `session-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(session), { mode: 0o600, flag: 'wx' });
  await rename(temporary, file);
}
