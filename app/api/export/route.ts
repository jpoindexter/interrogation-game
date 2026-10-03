import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getClientIp } from '../../../src/lib/rate-limit';
import { exportStorageMode } from '../../../src/lib/session/exports/storage';
import { parseExportQuery } from '../../../src/lib/session/exports/query';
import { storageBackend } from '@/lib/storage/backend';
import { decodeExportCursor, encodeExportCursor, type ExportCursorContext, type ExportKey } from '@/lib/session/exports/cursor';
import { EXPORT_PAGE_BYTES, OversizedExportError, readRemoteExportPage, type ExportPage } from '@/lib/session/exports/page';
import { readLocalExportPage } from '@/lib/session/exports/local-page';

export const runtime = 'nodejs';
function authorized(request: NextRequest): boolean {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const expected = process.env.EXPORT_SECRET;
  if (!expected || !request.headers.get('authorization')?.startsWith('Bearer ')) return false;
  const left = Buffer.from(supplied), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
function download(request: NextRequest, page: ExportPage, context: ExportCursorContext): Response {
  const headers = new Headers({ 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store',
    'Content-Disposition': 'attachment; filename="game_exports.jsonl"', 'X-Export-Count': String(page.count),
    'X-Export-Page-Bytes': String(EXPORT_PAGE_BYTES) });
  if (page.next) {
    const cursor = encodeExportCursor(page.next, context);
    const params = new URLSearchParams(request.nextUrl.searchParams);
    params.delete('offset'); params.set('cursor', cursor);
    headers.set('X-Export-Next-Cursor', cursor);
    headers.set('Link', `</api/export?${params}>; rel="next"`);
  }
  return new Response(page.body, { headers });
}
export async function GET(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(`export:${getClientIp(request)}`, 10);
  if (budgetFailure) return budgetFailure;
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let source: ExportCursorContext['source'];
  try { source = storageBackend() === 'supabase' ? 'supabase' : exportStorageMode(); }
  catch { return NextResponse.json({ error: 'Export storage unavailable. Please retry.' }, { status: 503 }); }
  let context: ExportCursorContext, after: ExportKey | undefined;
  try {
    context = { source, query: parseExportQuery(request.nextUrl.searchParams), secret: process.env.EXPORT_SECRET! };
    after = decodeExportCursor(request.nextUrl.searchParams.get('cursor'), context);
  } catch { return NextResponse.json({ error: 'Invalid export filters, pagination or cursor' }, { status: 400 }); }
  try {
    const page = context.source === 'local' ? readLocalExportPage(context.query, after) : await readRemoteExportPage(context.query, after);
    return download(request, page, context);
  } catch (error) {
    if (error instanceof OversizedExportError) return NextResponse.json({ error: error.message,
      code: 'EXPORT_RECORD_TOO_LARGE', recordBytes: error.bytes, maximumBytes: EXPORT_PAGE_BYTES,
      recovery: 'This record was not skipped. Use a trusted server-side export to retrieve it intact.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Export storage unavailable. Please retry.' }, { status: 503 });
  }
}
