import { AiWorkError } from './ai-policy';

/** These failures are saved receipts. Retrying their ID replays the failure, never new inference. */
export function aiWorkFailure(cause: unknown) {
  if (!(cause instanceof AiWorkError)) return null;
  return { status: cause.status, body: { error: `${cause.message} This attempt ended without accepting a new response.`,
    code: cause.code, requestComplete: true } };
}
