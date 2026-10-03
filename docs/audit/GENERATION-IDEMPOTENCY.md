# Case generation recovery contract

2026-10-03. The contract below has now been implemented in the POST route, generation receipt store and client intent recovery. It retains the original failure analysis and acceptance checklist. Local route and real child-process crash/restart tests cover the checkpoint windows; browser remount behavior remains unverified. Normalized options also include `playMode`.

## Original failure

`GET /api/generate-case` performs model inference and creates a session each time. A retry after a lost response can spend another inference and produce a different case. Client abort can stop provider work after signal wiring, but cannot retract a case/session already saved. A session-scoped action ledger cannot protect creation because the caller does not know the new session ID yet.

## Proposed smallest durable contract

1. Use `POST /api/generate-case` with `{requestId, setting, difficulty, mode, timerMode}`. Browser creates one random UUID per deliberate new-case intent, stores that pending intent, and reuses it after connection loss/remount/retry. Only an explicit new-case action allocates a different UUID. Normalize and validate all options before fingerprinting.
2. Reserve a private local generation receipt using an exclusive cross-process lock. Receipt stores random request ID, normalized-options hash, state and one reserved random session ID. Same ID/different options returns 409. Concurrent same ID returns `GENERATION_IN_PROGRESS`; it never calls the model twice. Use server directory/mode protections matching durable sessions.
3. Run generation once with the request signal and bounded deadline. Persist the validated case and assigned portrait before materializing its session. These private facts live only in the server receipt, never the public response. An authored mode follows the same receipt contract with zero model calls.
4. Create the reserved session ID idempotently, then save the complete public response on the generation receipt. If interrupted between these writes, recovery uses the persisted case/session ID; it does not regenerate or create a second ID. This requires a small repository API for create-if-absent at a server-reserved ID, checking that the existing record belongs to the same receipt.
5. Repeated completed request returns the same response/session ID. If that session has expired, return `GENERATION_EXPIRED`, not a fresh case. If canceled before any validated case was durably saved, record a canceled/failed receipt; same-ID retry reports that state. A genuinely new attempt uses a new ID after the user sees the prior state.

## Crash and cancellation semantics

Never silently retry a pending receipt left by a process crash when the provider outcome is unknown. Return `GENERATION_INTERRUPTED` with a recovery action. If validated facts already exist, completing session materialization is safe without inference. Cancellation after session commit does not delete or undo it: retrying the same ID recovers it. Pending-lock expiration must not authorize a second inference while the original worker might still run; lease lifetime must exceed the enforced provider deadline plus cleanup margin, and ownership must be checked before any write.

Bound receipt count and retention; never use raw unvalidated request IDs as filenames. Retention must cover the session recovery period. Remove the side-effecting GET after the application migrates; a temporary compatibility GET cannot promise idempotency without a caller-provided key.

## Acceptance proof before claiming complete

- Actual route + deterministic provider fixture: double concurrent same-key submission invokes generation once; later retry returns the exact same session ID and portrait.
- Same key with different normalized settings/mode/timer fails without model work.
- Lost HTTP response followed by replay restores the existing session.
- Restart after validated-case persistence but before session save creates exactly the reserved session, without a second provider call.
- Restart after session save but before receipt completion returns that session, without resetting its game state.
- Cancellation before generation creates no case; cancellation after commit recovers the saved case. No rollback claim.
- Abandoned in-flight receipts report interrupted state, with no automatic inference retry.
- Authored mode uses zero model calls; browser remount and explicit new-game intent use the intended request IDs.

This is a local durable protocol. Vercel requires a transactional durable backend instead of local files before the same claim can be made there.
