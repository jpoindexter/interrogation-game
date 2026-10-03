import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseClient } from '../../../src/lib/db';
import { getClientIp } from '../../../src/lib/rate-limit';
import { readLocalExports, exportStorageMode } from '../../../src/lib/session/exports/storage';
import { parseExportQuery, type ExportQuery } from '../../../src/lib/session/exports/query';

function authorized(request: NextRequest): boolean {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  const expected = process.env.EXPORT_SECRET;
  if (!expected || !request.headers.get('authorization')?.startsWith('Bearer ')) return false;
  const left = Buffer.from(supplied), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
async function readRows(options: ExportQuery) {
  if (exportStorageMode() === 'local') {
    return readLocalExports().filter(row => (!options.outcome || row.outcome === options.outcome)
      && (!options.difficulty || row.difficulty === options.difficulty) && (!options.setting || row.setting === options.setting))
      .slice(options.offset, options.offset + options.limit);
  }
  let query = getSupabaseClient().from('game_exports').select('*').order('created_at', { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);
  if (options.outcome) query = query.eq('outcome', options.outcome);
  if (options.difficulty) query = query.eq('difficulty', options.difficulty);
  if (options.setting) query = query.eq('setting', options.setting);
  const { data, error } = await query;
  if (error) throw new Error('Export storage unavailable');
  return data ?? [];
}
export async function GET(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(`export:${getClientIp(request)}`, 10);
  if (budgetFailure) return budgetFailure;
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let options: ExportQuery;
  try { options = parseExportQuery(request.nextUrl.searchParams); }
  catch { return NextResponse.json({ error: 'Invalid export filters or pagination' }, { status: 400 }); }
  try {
    const rows = await readRows(options);
    const body = rows.map(row => JSON.stringify(row)).join('\n');
    return new Response(body ? `${body}\n` : '', { headers: {
      'Content-Type': 'application/x-ndjson', 'Content-Disposition': 'attachment; filename="game_exports.jsonl"',
    } });
  } catch { return NextResponse.json({ error: 'Export storage unavailable. Please retry.' }, { status: 503 }); }
}
