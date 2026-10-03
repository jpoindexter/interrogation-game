import type { GameSession } from './types';
import type { WinSnapshot } from './tokens';
export interface RequestRecord {
  /** Shared storage keeps lookup hashes; null means an older receipt has no recoverable public ID. */
  publicId?: string | null;
  hash: string;
  state: 'pending' | 'complete';
  startedAt: number;
  response?: { status: number; body: Record<string, unknown> };
}
export interface SessionRecord {
  version: 1;
  revision: number;
  session: GameSession;
  requests: Record<string, RequestRecord>;
  token?: { issuedAt: number; consumed: boolean; snapshot: WinSnapshot };
}
export interface SessionRepository {
  load: (id: string) => SessionRecord | null;
  save: (record: SessionRecord) => void;
  remove: (id: string) => void;
  acquire: (id: string) => boolean;
  release: (id: string) => void;
}
