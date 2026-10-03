import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { parseGenerationOptions, createPlayableCase } from '@/lib/session/generate-case';
import { runGenerationRequest } from '@/lib/session/generation-requests';
import { hostedStores, storageBackend } from '@/lib/storage/backend';
import { runHostedGeneration } from '@/lib/storage/hosted/generate-case';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function GET() {
  return NextResponse.json({ error: 'Use POST with a stable requestId to create a case.' }, { status: 405, headers: { Allow: 'POST' } });
}

export async function POST(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 10);
  if (budgetFailure) return budgetFailure;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
  } catch { return NextResponse.json({ error: 'Provide a JSON request body.' }, { status: 400 }); }
  let options;
  try { options = parseGenerationOptions(body); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid case options.' }, { status: 400 }); }
  try {
    const result = storageBackend() === 'supabase'
      ? await runHostedGeneration({ requestId: body.requestId, options, request }, hostedStores())
      : await runGenerationRequest({ requestId: body.requestId, fingerprint: { ...options },
        generate: context => createPlayableCase(options, request, context) });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Case creation could not be confirmed. Retry the same request.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
