import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.EXPORT_SECRET || secret !== process.env.EXPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role key to bypass RLS (no public read policy on game_exports)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 100, 1000);
  const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;

  let query = serviceClient
    .from('game_exports')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const outcome = req.nextUrl.searchParams.get('outcome');
  if (outcome) query = query.eq('outcome', outcome);

  const difficulty = req.nextUrl.searchParams.get('difficulty');
  if (difficulty) query = query.eq('difficulty', difficulty);

  const setting = req.nextUrl.searchParams.get('setting');
  if (setting) query = query.eq('setting', setting);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return JSONL (one JSON object per line)
  const lines = (data ?? []).map(row => JSON.stringify(row)).join('\n');
  return new Response(lines + (lines ? '\n' : ''), {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': 'attachment; filename="game_exports.jsonl"',
    },
  });
}
