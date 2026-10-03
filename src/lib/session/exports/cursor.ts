import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { ExportQuery } from './query';

export type ExportSource = 'local' | 'supabase';
export interface ExportKey { createdAt: string; id: string }
export interface ExportCursorContext { source: ExportSource; query: ExportQuery; secret: string }
export function validExportKey(value: unknown, source: ExportSource): value is ExportKey {
  if (!value || typeof value !== 'object') return false;
  const key = value as Record<string, unknown>;
  const id = source === 'local' ? /^[a-f0-9]{48}$/ : /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
  return typeof key.createdAt === 'string' && key.createdAt.length <= 40 && Number.isFinite(Date.parse(key.createdAt))
    && typeof key.id === 'string' && id.test(key.id);
}
function profile({ source, query }: ExportCursorContext): string {
  return createHash('sha256').update(JSON.stringify([source, query.limit, query.outcome ?? null,
    query.difficulty ?? null, query.setting ?? null])).digest('hex');
}
function signature(payload: string, secret: string): string {
  if (!secret) throw new Error('Export authentication is not configured');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
export function encodeExportCursor(after: ExportKey, context: ExportCursorContext): string {
  if (!validExportKey(after, context.source)) throw new Error('Invalid export position');
  const payload = Buffer.from(JSON.stringify({ version: 1, profile: profile(context), after })).toString('base64url');
  return `${payload}.${signature(payload, context.secret)}`;
}
function authenticatedPayload(value: string, secret: string): string {
  const [payload, supplied, extra] = value.split('.');
  if (!payload || !supplied || extra !== undefined) throw new Error('Invalid export cursor');
  const expected = signature(payload, secret);
  const left = Buffer.from(supplied), right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error('Invalid export cursor');
  return payload;
}
export function decodeExportCursor(value: string | null, context: ExportCursorContext): ExportKey | undefined {
  if (value === null) return undefined;
  if (value.length > 1024 || context.query.offset !== 0) throw new Error('Invalid export cursor');
  const payload = authenticatedPayload(value, context.secret);
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decoded?.version !== 1 || decoded.profile !== profile(context) || !validExportKey(decoded.after, context.source)) throw new Error('Invalid export cursor');
  return decoded.after;
}
