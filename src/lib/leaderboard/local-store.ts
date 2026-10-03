import { randomUUID } from 'node:crypto';
import { mkdir, open, link, readFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { isRankedRow, publicLeaderboardRow, type LeaderboardRow, type LeaderboardStore } from './types';

function recordName(sessionId: string): string {
  if (!/^[a-f0-9]{48}$/.test(sessionId)) throw new Error('Invalid leaderboard session ID');
  return `${sessionId}.json`;
}
function missing(error: unknown): boolean { return error instanceof Error && 'code' in error && error.code === 'ENOENT'; }
function exists(error: unknown): boolean { return error instanceof Error && 'code' in error && error.code === 'EEXIST'; }

/** Each immutable record is published with an atomic exclusive hard link, including across processes. */
export class LocalLeaderboardStore implements LeaderboardStore {
  constructor(private readonly directory: string) {}

  async find(sessionId: string): Promise<LeaderboardRow | null> {
    try {
      const row: LeaderboardRow = JSON.parse(await readFile(join(this.directory, recordName(sessionId)), 'utf8'));
      if (row.session_id !== sessionId || typeof row.redemption_hash !== 'string') throw new Error('Corrupt leaderboard record');
      return row;
    } catch (error) { if (missing(error)) return null; throw error; }
  }

  async insert(row: LeaderboardRow): Promise<LeaderboardRow> {
    const destination = join(this.directory, recordName(row.session_id));
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = join(this.directory, `.${randomUUID()}.tmp`);
    try {
      await this.writeTemporary(temporary, row);
      try { await link(temporary, destination); } catch (error) { if (!exists(error)) throw error; }
      const directoryHandle = await open(this.directory, 'r');
      try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
      const saved = await this.find(row.session_id);
      if (!saved) throw new Error('Leaderboard write was not confirmed');
      return saved;
    } finally { await unlink(temporary).catch(() => undefined); }
  }

  private async writeTemporary(path: string, row: LeaderboardRow): Promise<void> {
    const file = await open(path, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(row)); await file.sync(); } finally { await file.close(); }
  }

  async list() {
    let names: string[];
    try { names = await readdir(this.directory); } catch (error) { if (missing(error)) return []; throw error; }
    const rows = await Promise.all(names.filter(name => /^[a-f0-9]{48}\.json$/.test(name))
      .map(name => this.find(name.slice(0, -5))));
    return rows.filter((row): row is LeaderboardRow => !!row && isRankedRow(row)).sort((a, b) => b.score - a.score)
      .slice(0, 20).map(publicLeaderboardRow);
  }
}
