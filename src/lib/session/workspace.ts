import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionRecord } from './repository-types';
import type { GameExport } from './exports/storage';

export interface SessionWorkspace { record: SessionRecord; terminalExport?: GameExport }
const workspaces = new AsyncLocalStorage<SessionWorkspace>();

/** One claimed snapshot per async action; never a process-global source of authority. */
export function withSessionWorkspace<T>(workspace: SessionWorkspace, action: () => T): T {
  if (workspaces.getStore()) throw new Error('A session workspace cannot be nested');
  return workspaces.run(workspace, action);
}
export function currentSessionWorkspace(): SessionWorkspace | undefined { return workspaces.getStore(); }
export function workspaceRecord(id: string): SessionRecord | null | undefined {
  const workspace = workspaces.getStore();
  if (!workspace) return undefined;
  return workspace.record.session.id === id ? workspace.record : null;
}
export function requireLocalSessionMutation(): void {
  if (workspaces.getStore()) throw new Error('Claimed session persistence must use its shared transaction');
}
