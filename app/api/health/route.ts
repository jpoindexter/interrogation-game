import { NextResponse } from 'next/server';
import { readReadiness } from '@/lib/config/readiness';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(readReadiness(), { headers: { 'Cache-Control': 'no-store' } });
}
