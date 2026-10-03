import { VoiceError } from './errors';
import { voiceJson, type VoiceResult } from './receipt-types';
import { HostedVoiceStorage, type HostedVoiceClaim, type HostedVoiceResponse, type VoiceIdentity, type VoiceReservation } from '../storage/hosted/voice';
import { HostedVoiceObjects } from './hosted-objects';

interface HostedVoiceRequest extends VoiceIdentity {
  reservation: VoiceReservation;
  signal: AbortSignal;
  work: (signal: AbortSignal) => Promise<Uint8Array | VoiceResult>;
}
export interface HostedVoiceStores { receipts: HostedVoiceStorage; objects: HostedVoiceObjects }
const unavailable = () => new VoiceError('Voice storage did not confirm this request. Retry the same request or continue with text.', 503, 'VOICE_STORAGE_UNAVAILABLE');
function claimFailure(kind: string): never {
  if (kind === 'exhausted' || kind === 'limit') throw new VoiceError('Voice allowance is exhausted. Continue with text.', 429, 'VOICE_LIMIT');
  if (kind === 'expired') throw new VoiceError('This voice receipt expired. Explicitly start a new attempt.', 410, 'VOICE_EXPIRED');
  if (kind === 'busy') throw new VoiceError('This voice request is still running. Retry the same request.', 409, 'VOICE_IN_PROGRESS');
  if (kind === 'conflict') throw new VoiceError('This request ID belongs to different voice content.', 409, 'REQUEST_CONFLICT');
  if (kind === 'interrupted') throw new VoiceError('The voice request was interrupted and may have consumed usage. Explicitly start a new attempt.', 409, 'VOICE_INTERRUPTED');
  if (kind === 'stale') throw new VoiceError('The game changed. Recover its current state before retrying voice.', 409, 'VOICE_IN_PROGRESS');
  if (kind === 'unavailable') throw new VoiceError('Valid game session required.', 401);
  throw unavailable();
}
function providerFailure(error: unknown): HostedVoiceResponse {
  const status = error instanceof VoiceError ? error.status : 502;
  const code = error instanceof VoiceError ? error.code : 'VOICE_FAILED';
  return { status, contentType: 'application/json', body: JSON.stringify({ code,
    error: 'The voice attempt could not be completed. It may have consumed usage. Continue with text or explicitly start a new attempt.' }) };
}
async function createResponse(request: HostedVoiceRequest, claim: HostedVoiceClaim, stores: HostedVoiceStores): Promise<HostedVoiceResponse> {
  const remaining = Math.min(70_000, claim.leaseUntil - Date.now() - 20_000);
  if (remaining <= 0) throw unavailable();
  const deadline = AbortSignal.timeout(remaining);
  if (claim.kind === 'recover') {
    const recovered = await stores.objects.recover(claim.objectKey!, deadline);
    if (recovered) return { status: 200, contentType: 'audio/mpeg', ...recovered };
    return { status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'VOICE_INTERRUPTED',
      error: 'No saved audio was confirmed after interruption. Explicitly start a new attempt or continue with text.' }) };
  }
  let result: Uint8Array | VoiceResult;
  try {
    deadline.throwIfAborted();
    result = await request.work(AbortSignal.any([deadline, AbortSignal.timeout(30_000)]));
  }
  catch (error) { return providerFailure(error); }
  // Storage uncertainty must leave a recoverable pending receipt, not overwrite it with a provider failure.
  if (result instanceof Uint8Array) return { status: 200, contentType: 'audio/mpeg',
    ...await stores.objects.save(claim.objectKey!, result, deadline) };
  return { status: result.status, contentType: 'application/json', body: result.body };
}
async function project(response: HostedVoiceResponse, objects: HostedVoiceObjects): Promise<VoiceResult> {
  if (response.contentType === 'application/json') return response;
  return voiceJson(200, { ...await objects.sign(response) });
}

/** A recovery claim can inspect saved audio, but can never invoke the provider again. */
export async function runHostedVoice(request: HostedVoiceRequest, stores: HostedVoiceStores): Promise<VoiceResult> {
  try {
    request.signal.throwIfAborted();
    const claim = await stores.receipts.claim(request);
    if (claim.kind === 'replay') return await project(claim.response, stores.objects);
    if (claim.kind !== 'claimed' && claim.kind !== 'recover') return claimFailure(claim.kind);
    const response = await createResponse(request, claim, stores);
    const result = await stores.receipts.finish(claim, response);
    if (result.kind !== 'committed' && result.kind !== 'replay') return claimFailure(result.kind);
    return await project(result.response, stores.objects);
  } catch (error) {
    if (error instanceof VoiceError) throw error;
    throw unavailable();
  }
}
